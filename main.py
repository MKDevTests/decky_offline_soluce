## from __future__ import annotations  -- removed: incompatible with Decky sandbox dataclass processing

import hashlib
import json
import os
import re
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

try:
    import ipaddress
except ImportError:
    ipaddress = None  # type: ignore[assignment]

try:
    import socket
except ImportError:
    socket = None  # type: ignore[assignment]

try:
    import ssl
    import urllib.error
    import urllib.request
    _HAS_URLLIB = True
except ImportError:
    _HAS_URLLIB = False

try:
    import urllib.parse as _urllib_parse
except ImportError:
    pass

try:
    from html import unescape as _html_unescape
except ImportError:
    def _html_unescape(text: str) -> str:
        """Minimal HTML entity unescaping fallback."""
        text = text.replace("&amp;", "&")
        text = text.replace("&lt;", "<")
        text = text.replace("&gt;", ">")
        text = text.replace("&quot;", '"')
        text = text.replace("&#39;", "'")
        text = text.replace("&apos;", "'")
        text = text.replace("&nbsp;", " ")
        text = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), text)
        text = re.sub(r"&#x([0-9a-fA-F]+);", lambda m: chr(int(m.group(1), 16)), text)
        return text

try:
    from html.parser import HTMLParser as _StdHTMLParser
    _HAS_HTML_PARSER = True
except ImportError:
    _HAS_HTML_PARSER = False

    class _StdHTMLParser:  # type: ignore[no-redef]
        """Dummy fallback when html.parser is not available."""
        def __init__(self, *, convert_charrefs: bool = False) -> None:
            pass
        def feed(self, data: str) -> None:
            pass
        def close(self) -> None:
            pass
        def handle_starttag(self, tag: str, attrs: list) -> None:
            pass
        def handle_endtag(self, tag: str) -> None:
            pass
        def handle_data(self, data: str) -> None:
            pass

import decky

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
MAX_DOWNLOAD_BYTES = 3_500_000
MAX_CONTENT_CHARS = 700_000
MAX_SECTION_COUNT = 400  # v0.43.22: was 120 — truncating at 120 silently orphaned
# the content past the 120th section (chrono cross lost 65% of its walkthrough).
# _cap_sections now also extends the last kept section to EOF so NOTHING is lost.
# Multi-page guides on RPGSoluce, Neoseeker etc. can easily span 30+ chapters.
# Cap is loose; the real stop signal is the BFS queue draining or content size limit.
MAX_FETCHED_PAGES = 60
# Minimum "content" (non-blank, non-decorative) lines a section must contain to
# survive post-filter. Anything shorter gets merged with the following section.
# Bumped from 4 → 15 in v0.19 to cut down on micro-sections (5-10 line stubs that
# bloat the TOC sidebar). Real chapters have at least 15 content lines.
MIN_SECTION_CONTENT_LINES = 15
# Hard minimum span in raw lines between two consecutive section starts.
MIN_SECTION_SPAN_LINES = 6
ALLOWED_SCHEMES = {"http", "https"}
SEARCH_RESULT_LIMIT = 16
SEARCH_RESULTS_PER_SITE = 4
SEARCH_CACHE_TTL_SEC = 120
EXPORT_ROOT = Path("/home/deck/Documents/OfflineSoluce/exports")
MAX_NAMED_BOOKMARKS = 32
MAX_NOTES_PER_GUIDE = 500
MAX_NOTE_LENGTH = 500

DECK_HOME = Path("/home/deck")

MULTI_DISC_PATTERN = re.compile(
    r"\s*[\(\[]\s*(?:Disc|CD|DVD|Disk)\s*(\d+)\s*[\)\]]",
    re.IGNORECASE,
)

# v0.41: extensions skipped during URL discovery so the crawler doesn't follow
# images / fonts / videos / archives as if they were content pages. Without
# this filter, e.g. rpgsoluce.com FF9 walkthrough has links to
# `images/01.jpg` that the crawler downloaded as HTML, then turned into
# 25 sections of garbage at the tail of the guide.
NON_PAGE_URL_EXTENSIONS: set[str] = {
    # Images
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tif", ".tiff",
    # Videos
    ".mp4", ".webm", ".mov", ".avi", ".mkv",
    # Audio
    ".mp3", ".ogg", ".wav", ".flac",
    # Archives / binaries
    ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".pdf", ".exe", ".dmg", ".iso",
    # Fonts / styles
    ".woff", ".woff2", ".ttf", ".otf", ".css", ".js", ".map",
}

# ---------------------------------------------------------------------------
# v0.41: rpgsoluce.com — site-specific noise patterns
# These survive _html_to_text because rpgsoluce uses older HTML where the
# generic content-region selectors (entry-content / article / main) don't
# match, so the FULL page including nav menu and footer goes through.
# ---------------------------------------------------------------------------

# HTML comment leak: the rpgsoluce template has `<!-- recherche quand campagne -->`
# inside the body. The HTML parser strips `<!--` but the closing `-->` leaks
# through on its own line. This pattern is identical on every page of the site.
_RPGSOLUCE_COMMENT_LEAK_RE = re.compile(
    r"^[ \t]*recherche quand campagne[ \t]*-->[ \t]*$",
    re.MULTILINE,
)

# Page footer: matches both the modern footer and the legacy one.
# Modern: "© 2000-2025 Toute reproduction interdite ..."
# Legacy: "© 2001 RPG Soluce ~ Delldongo ~"
# Followed optionally by a "Partenariats : / Puissance Zelda | / ... / Régie pub" block.
_RPGSOLUCE_FOOTER_RE = re.compile(
    r"^[ \t]*©\s*\d{4}(?:[–—\-]\d{4})?\s+"
    r"(?:Toute reproduction interdite|RPG Soluce)"
    r"[^\n]*\n?"
    r"(?:[ \t]*\n)*"                              # blank lines
    r"(?:^[ \t]*Partenariats[ \t]*:[^\n]*\n"      # optional partner block start
    r"(?:^[ \t]*[^\n\|]{1,80}\|[ \t]*\n)*"        # "Name |" lines
    r"(?:^[ \t]*Régie pub[^\n]*\n)?)?",
    re.MULTILINE,
)

# Random citation widget: "<quote> , <Author> , <GAME_CODE>"
# Example: "On se croirait sur un plateau de cinéma , Margarete , SH"
# Conservative: only line length <= 200 chars (avoid hitting prose with this shape).
_RPGSOLUCE_CITATION_RE = re.compile(
    r"^[ \t]*.+\s*,\s*[^,\n]+\s*,\s*[A-Z]{1,5}[ \t]*$",
)

# Sentence boundary detector: lowercase letter + period + space + uppercase letter.
# Used by the menu-block heuristic to refuse stripping any block that contains
# real prose. Menu items use digit-period (`1. Les Jeux`) which doesn't match.
_RPGSOLUCE_SENTENCE_BOUNDARY_RE = re.compile(r"[a-zà-ÿ]\.[ \t]+[A-ZÀ-Ÿ]")

STEAM_APPS_DIRS: list[Path] = [
    DECK_HOME / ".local/share/Steam/steamapps",
    Path("/run/media/deck/SD/steamapps"),
]
SEARCH_SITES: dict[str, dict[str, Any]] = {
    "gamefaqs": {
        "label": "GameFAQs",
        "domains": ["gamefaqs.gamespot.com"],
        "keywords": "faq walkthrough guide",
    },
    "rpgsoluce": {
        "label": "RPGSoluce",
        "domains": ["rpgsoluce.com"],
        "keywords": "soluce cheminement",
    },
    "ign": {
        "label": "IGN",
        "domains": ["ign.com"],
        "keywords": "walkthrough guide wiki",
    },
    "jeuxvideo": {
        "label": "Jeuxvideo.com",
        "domains": ["jeuxvideo.com"],
        "keywords": "soluce wiki astuces",
    },
    "vally8": {
        "label": "Vally8",
        "domains": ["vally8.free.fr"],
        "keywords": "soluce",
    },
    "neoseeker": {
        "label": "Neoseeker",
        "domains": ["neoseeker.com"],
        "keywords": "walkthrough guide",
    },
    # v0.43.21: darklevel + strategywiki removed — darklevel not useful,
    # strategywiki is Cloudflare-gated and low quality.
}

ROM_FILE_EXTENSIONS = {
    ".iso", ".bin", ".cue", ".img", ".mdf", ".nrg", ".chd", ".cso", ".pbp",
    ".rvz", ".wbfs", ".gcz", ".gcm", ".7z", ".zip", ".rar",
    ".nes", ".sfc", ".smc", ".gba", ".gbc", ".gb",
    ".nds", ".3ds", ".cci", ".cxi", ".cia", ".3dsx",
    ".z64", ".n64", ".v64",
    ".md", ".gen", ".gg", ".sms", ".pce",
    ".ws", ".wsc", ".a26", ".ngp", ".ngc", ".d64",
    ".xci", ".nsp",
    ".vpk",
    ".elf", ".m3u", ".ccd", ".sub",
}

PC_GAME_FILE_EXTENSIONS = {".exe", ".bat", ".cmd", ".ps1", ".sh", ".AppImage"}

PLATFORM_FOLDER_MAP = {
    "ps2": "PS2",
    "psx": "PS1",
    "ps1": "PS1",
    "psp": "PSP",
    "psvita": "PS Vita",
    "vita": "PS Vita",
    "ps3": "PS3",
    "switch": "Switch",
    "n3ds": "3DS",
    "3ds": "3DS",
    "nds": "DS",
    "ds": "DS",
    "gba": "GBA",
    "gbc": "GBC",
    "gb": "GB",
    "gamecube": "GameCube",
    "gc": "GameCube",
    "wii": "Wii",
    "wiiu": "Wii U",
    "dreamcast": "Dreamcast",
    "dc": "Dreamcast",
    "saturn": "Saturn",
    "megadrive": "Mega Drive",
    "genesis": "Mega Drive",
    "xbox": "Xbox",
    "xbox360": "Xbox 360",
    "pc": "PC",
    "snes": "SNES",
    "sfc": "SNES",
    "nes": "NES",
    "famicom": "NES",
    "n64": "N64",
    "segacd": "Sega CD",
    "sega32x": "Sega 32X",
    "mastersystem": "Master System",
    "sms": "Master System",
    "gamegear": "Game Gear",
    "gg": "Game Gear",
    "turbografx": "TurboGrafx-16",
    "turbografx16": "TurboGrafx-16",
    "pcengine": "TurboGrafx-16",
    "pce": "TurboGrafx-16",
    "atari2600": "Atari 2600",
    "a26": "Atari 2600",
    "wonderswan": "WonderSwan",
    "ws": "WonderSwan",
    "wsc": "WonderSwan",
    "neogeo": "Neo Geo",
    "ngp": "Neo Geo Pocket",
    "ngc": "Neo Geo Pocket",
    "msx": "MSX",
    "amstradcpc": "Amstrad CPC",
    "dos": "DOS",
    "scummvm": "ScummVM",
    "pcenginecd": "TurboGrafx-16",
    "saturnjp": "Saturn",
    "snesna": "SNES",
    "easyrpg": "RPG Maker",
    "mame": "Arcade",
    "atomiswave": "Arcade",
    "ports": "PC",
    "fmtowns": "FM Towns",
}

DEFAULT_EMULATOR_BY_PLATFORM = {
    "PS2": "PCSX2",
    "PS1": "DuckStation",
    "PSP": "PPSSPP",
    "PS Vita": "Vita3K",
    "PS3": "RPCS3",
    "Switch": "Ryujinx",
    "GameCube": "Dolphin",
    "Wii": "Dolphin",
    "Wii U": "Cemu",
    "DS": "melonDS",
    "3DS": "Lime3DS",
    "GBA": "mGBA",
    "GBC": "mGBA",
    "GB": "mGBA",
    "Dreamcast": "Flycast",
    "SNES": "Snes9x",
    "NES": "Mesen",
    "N64": "Mupen64Plus",
    "Sega CD": "Genesis Plus GX",
    "Mega Drive": "Genesis Plus GX",
    "Master System": "Genesis Plus GX",
    "Saturn": "Mednafen",
    "TurboGrafx-16": "Mednafen",
    "Neo Geo": "FinalBurn Neo",
    "ScummVM": "ScummVM",
    "DOS": "DOSBox",
}


@dataclass
class GuideSection:
    title: str
    line_start: int
    line_end: int
    heading_level: int = 0  # 0 = auto-detected, 1-6 = from HTML h1-h6
    is_preformatted: bool = False  # True if block looks like ASCII art/table


@dataclass
class NamedBookmark:
    bookmark_id: str
    name: str
    section_index: int
    scroll_fraction: float
    created_at: str


@dataclass
class GuideSectionNote:
    section_index: int
    done: bool = False
    flagged: bool = False
    note: str = ""
    updated_at: str = ""


@dataclass
class ReaderPreferences:
    theme: str = "dark"  # dark | sepia
    font_family: str = "sans"  # sans | serif | mono
    line_height: str = "normal"  # tight | normal | airy
    max_width: str = "normal"  # narrow | normal | full
    highlight_keywords: bool = True
    numbered_sections: bool = True
    # Legacy keyboard hotkey — kept for backward-compat but unused on Steam Deck
    # because SteamOS doesn't deliver keyboard events from Steam Input bindings
    # to Steam UI. Use resume_button instead.
    resume_hotkey: str = ""
    # Controller button index from ControllerInputGamepadButton enum:
    #   32 = LBACK (left back paddle), 33 = RBACK (right back paddle)
    #   30 = LSHOULDER (L1), 31 = RSHOULDER (R1)
    # -1 = defaults (both back paddles accepted, L4/L5 + R4/R5)
    resume_button: int = -1
    # v0.40: master switch — when False the controller listener still receives
    # events but skips the resume action entirely. Lets the user disable
    # auto-resume for games where they want their palettes free for game use.
    resume_enabled: bool = True


@dataclass
class GuideSourcePage:
    title: str
    url: str


@dataclass
class GuideReadingProgress:
    last_section_index: int = -1
    last_opened_at: str = ""
    font_scale: float = 1.0
    bookmark_section_index: int = -1
    bookmark_set_at: str = ""
    last_scroll_fraction: float = 0.0  # 0.0 to 1.0 — position within current section
    bookmark_scroll_fraction: float = 0.0
    named_bookmarks: list[NamedBookmark] = field(default_factory=list)
    section_notes: list[GuideSectionNote] = field(default_factory=list)
    # Titles of sections the user has hidden from the TOC. Stored by title (not
    # index) so the hide-state survives reconstruct_sections / reload_guide_content
    # operations that may renumber sections. Only exact title match counts.
    hidden_section_titles: list[str] = field(default_factory=list)


@dataclass
class GuideGameInfo:
    platform: str = "Autre"
    game_title: str = ""
    normalized_title: str = ""
    aliases: list[str] = field(default_factory=list)
    disc_code: str = ""
    rom_hint: str = ""
    emulator: str = ""
    source: str = "manual"


@dataclass
class GuideFlag:
    """v0.43.33: an auto-detected high-value moment in a guide — a missable/point
    of no return, a key/unique item, or an optional side quest. Powers inline
    highlighting AND the per-guide "À ne pas rater" checklist."""
    category: str            # "missable" | "key_item" | "side_quest"
    section_index: int       # section it belongs to (-1 if before any)
    snippet: str             # the sentence/line carrying the flagged phrase
    matched: str = ""        # the exact phrase that triggered it


@dataclass
class GuideRecord:
    id: str
    title: str
    url: str
    site: str
    extractor: str
    saved_at: str
    word_count: int
    size_bytes: int
    snippet: str
    content: str
    source_charset: str = "utf-8"
    game: GuideGameInfo = field(default_factory=GuideGameInfo)
    sections: list[GuideSection] = field(default_factory=list)
    source_pages: list[GuideSourcePage] = field(default_factory=list)
    progress: GuideReadingProgress = field(default_factory=GuideReadingProgress)
    # Method that produced `sections` — surfaced in the UI so the user knows whether
    # the parser used the explicit TOC, banners, html headings, or fell back to heuristic.
    # Values: "headings" | "toc_codes" | "banners" | "heuristic" | "" (legacy/unknown)
    detection_method: str = ""
    important_flags: list[GuideFlag] = field(default_factory=list)  # v0.43.33


@dataclass
class GuideSearchResult:
    title: str
    url: str
    site: str
    snippet: str
    score: int = 0
    game: str = ""  # v0.43.35: game name derived from the URL slug (shown prominently)


@dataclass
class ShortcutEntry:
    app_name: str
    display_title: str
    platform: str
    emulator: str
    disc_code: str
    rom_hint: str
    source_path: str


@dataclass
class ScanSource:
    id: str
    kind: str
    path: str
    label: str
    enabled: bool
    exists: bool
    storage: str


@dataclass
class LibraryGameEntry:
    id: str
    title: str
    normalized_title: str
    platform: str
    disc_code: str = ""
    emulator: str = ""
    aliases: list[str] = field(default_factory=list)
    source_kinds: list[str] = field(default_factory=list)
    storages: list[str] = field(default_factory=list)
    source_labels: list[str] = field(default_factory=list)
    source_ids: list[str] = field(default_factory=list)
    primary_path: str = ""
    paths: list[str] = field(default_factory=list)
    instance_count: int = 0
    source_count: int = 0
    custom_title: str = ""
    is_favorite: bool = False


class _ReadableTextParser(_StdHTMLParser):
    """HTML → text parser that preserves heading level metadata inline.

    Headings get wrapped as `\x01H{level}\x02title\x01/H\x02` so that later
    section detection can pick real document structure over regex heuristics.
    """

    HEADING_START = "\x01H"
    HEADING_END = "\x01/H\x02"

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._skip_stack: list[str] = []
        self._heading_level: int = 0
        self._heading_buffer: list[str] = []
        self._pre_depth: int = 0
        self._block_tags = {
            "article",
            "aside",
            "blockquote",
            "br",
            "caption",
            "dd",
            "div",
            "dl",
            "dt",
            "fieldset",
            "figcaption",
            "figure",
            "footer",
            "form",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "header",
            "hr",
            "li",
            "main",
            "nav",
            "ol",
            "p",
            "pre",
            "section",
            "table",
            "tbody",
            "td",
            "th",
            "thead",
            "tr",
            "ul",
        }
        self._skip_tags = {"script", "style", "noscript", "svg", "canvas", "iframe"}
        self._heading_tags = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in self._skip_tags:
            self._skip_stack.append(tag)
            return
        if self._skip_stack:
            return
        if tag == "pre":
            self._pre_depth += 1
        if tag in self._heading_tags:
            # Flush any pending buffer, start heading capture
            self._parts.append("\n")
            self._heading_level = self._heading_tags[tag]
            self._heading_buffer = []
            return
        if tag in self._block_tags:
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self._skip_stack and self._skip_stack[-1] == tag:
            self._skip_stack.pop()
            return
        if self._skip_stack:
            return
        if tag == "pre" and self._pre_depth > 0:
            self._pre_depth -= 1
        if tag in self._heading_tags and self._heading_level > 0:
            title = re.sub(r"\s+", " ", "".join(self._heading_buffer)).strip()
            if title:
                self._parts.append(f"{self.HEADING_START}{self._heading_level}\x02{title}{self.HEADING_END}")
                self._parts.append("\n")
            self._heading_level = 0
            self._heading_buffer = []
            return
        if tag in self._block_tags:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_stack:
            return
        if self._heading_level > 0:
            self._heading_buffer.append(data)
            return
        if self._pre_depth > 0:
            # Preserve whitespace inside <pre> — mark with control characters to detect later
            self._parts.append("\x01PRE\x02" + data + "\x01/PRE\x02")
            return
        if data.strip():
            self._parts.append(data)

    def text(self) -> str:
        raw = "".join(self._parts)
        raw = raw.replace("\xa0", " ")
        raw = raw.replace("\r", "")
        # Keep <pre> whitespace intact — only collapse outside markers
        # Simple approach: split by markers, collapse only outside
        segments = re.split(r"(\x01PRE\x02.*?\x01/PRE\x02)", raw, flags=re.DOTALL)
        out: list[str] = []
        for seg in segments:
            if seg.startswith("\x01PRE\x02"):
                inner = seg[len("\x01PRE\x02"):-len("\x01/PRE\x02")]
                inner = inner.strip("\n")
                out.append("\n\x01PRE\x02\n" + inner + "\n\x01/PRE\x02\n")
            else:
                seg = re.sub(r"[ \t]+", " ", seg)
                seg = re.sub(r" ?\n ?", "\n", seg)
                seg = re.sub(r"\n{3,}", "\n\n", seg)
                out.append(seg)
        return "".join(out).strip()


class _LinkParser(_StdHTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[dict[str, str]] = []
        self._current: dict[str, str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        attributes = {key.lower(): (value or "") for key, value in attrs}
        href = attributes.get("href", "").strip()
        if not href:
            return
        self._current = {
            "href": href,
            "text": "",
            "rel": attributes.get("rel", ""),
            "class": attributes.get("class", ""),
            "id": attributes.get("id", ""),
            "title": attributes.get("title", ""),
        }

    def handle_data(self, data: str) -> None:
        if self._current is not None and data.strip():
            self._current["text"] += data

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or self._current is None:
            return
        self._current["text"] = re.sub(r"\s+", " ", self._current["text"]).strip()
        self.links.append(self._current)
        self._current = None


class _DuckDuckGoSearchParser(_StdHTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.results: list[GuideSearchResult] = []
        self._current: GuideSearchResult | None = None
        self._capture: str | None = None

    def _finish_current(self) -> None:
        if self._current is None:
            return
        self._current.title = re.sub(r"\s+", " ", self._current.title).strip()
        self._current.snippet = re.sub(r"\s+", " ", self._current.snippet).strip()
        if self._current.title and self._current.url:
            self.results.append(self._current)
        self._current = None
        self._capture = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): (value or "") for key, value in attrs}
        class_value = attributes.get("class", "").casefold()
        if tag.lower() == "a" and ("result__a" in class_value or "result-link" in class_value):
            self._finish_current()
            href = attributes.get("href", "").strip()
            self._current = GuideSearchResult(title="", url=href, site="", snippet="", score=0)
            self._capture = "title"
            return

        if self._current is None:
            return

        if any(token in class_value for token in ["result__snippet", "result-snippet"]):
            self._capture = "snippet"

    def handle_data(self, data: str) -> None:
        if self._current is None or not data.strip() or not self._capture:
            return
        if self._capture == "title":
            self._current.title += data
        elif self._capture == "snippet":
            self._current.snippet += data

    def handle_endtag(self, tag: str) -> None:
        lowered = tag.lower()
        if lowered == "a" and self._capture == "title":
            self._capture = None
        elif lowered in {"div", "span", "a", "td"} and self._capture == "snippet":
            self._capture = None

    def close(self) -> None:
        super().close()
        self._finish_current()


def _regex_strip_tags(html: str) -> str:
    """Fallback HTML-to-text when html.parser is unavailable."""
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<(?:p|div|h[1-6]|li|tr|dt|dd|blockquote|section|article|header|footer)[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = _html_unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _regex_extract_links(html: str) -> list:
    """Fallback link extractor when html.parser is unavailable."""
    links = []
    for m in re.finditer(r'<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, flags=re.DOTALL | re.IGNORECASE):
        href = m.group(1).strip()
        text = re.sub(r"<[^>]+>", " ", m.group(2))
        text = _html_unescape(text)
        text = re.sub(r"\s+", " ", text).strip()
        attrs_str = m.group(0)[:m.group(0).find(">")]
        rel_m = re.search(r'rel=["\']([^"\']*)["\']', attrs_str, re.IGNORECASE)
        cls_m = re.search(r'class=["\']([^"\']*)["\']', attrs_str, re.IGNORECASE)
        id_m = re.search(r'id=["\']([^"\']*)["\']', attrs_str, re.IGNORECASE)
        title_m = re.search(r'title=["\']([^"\']*)["\']', attrs_str, re.IGNORECASE)
        links.append({
            "href": href,
            "text": text,
            "rel": (rel_m.group(1) if rel_m else ""),
            "class": (cls_m.group(1) if cls_m else ""),
            "id": (id_m.group(1) if id_m else ""),
            "title": (title_m.group(1) if title_m else ""),
        })
    return links


def _regex_parse_ddg_results(html: str) -> list:
    """Multi-engine search result parser.
    
    Strategy: First try engine-specific patterns. If nothing works, fall back to
    extracting every <a href> pointing to a known guide domain — this always works
    because search engines all use <a href="URL"> somewhere in their results.
    """
    # Remove <style> and <script> blocks first — these inject CSS/JS text into link contents
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)

    results: list = []
    seen_urls: set = set()

    known_domains = [
        "gamefaqs.gamespot.com", "rpgsoluce.com", "neoseeker.com",
        "strategywiki.org", "ign.com", "jeuxvideo.com",
        "vally8.free.fr", "darklevel.free.fr",
    ]

    def _is_known(url: str) -> bool:
        return any(d in url.casefold() for d in known_domains)

    def _clean_title(raw: str) -> str:
        raw = re.sub(r"<[^>]+>", "", raw)
        raw = _html_unescape(raw)
        raw = re.sub(r"\s+", " ", raw).strip()
        return raw

    def _extract_title(raw_content: str) -> str:
        """Prefer heading text (h1-h6) when present inside a link, fallback to cleaned inner text."""
        heading = re.search(r'<(h[1-6]|span)[^>]*>(.*?)</\1>', raw_content, flags=re.DOTALL | re.IGNORECASE)
        if heading:
            t = _clean_title(heading.group(2))
            if t and len(t) > 3:
                return t
        return _clean_title(raw_content)

    def _resolve_url(href: str) -> str:
        h = href.strip()
        if h.startswith("/url?") or h.startswith("/url%3F"):
            qm = re.search(r"[?&]q=([^&]+)", h)
            if qm:
                return urllib.parse.unquote(qm.group(1))
        if h.startswith("/l/"):
            qm = re.search(r"uddg=([^&]+)", h)
            if qm:
                return urllib.parse.unquote(qm.group(1))
        if h.startswith("/"):
            qm = re.search(r"[?&](?:url|u|uddg)=([^&]+)", h)
            if qm:
                decoded = urllib.parse.unquote(qm.group(1))
                if decoded.startswith("http"):
                    return decoded
        if h.startswith("//"):
            return "https:" + h
        return h

    # Pass 1: Google — <h3> inside <a href="URL">
    for m in re.finditer(
        r'<a[^>]+href="([^"]+)"[^>]*>(?:(?!</a>).)*?<h3[^>]*>(.*?)</h3>',
        html, flags=re.DOTALL | re.IGNORECASE,
    ):
        url = _resolve_url(m.group(1))
        if not url.startswith("http") or not _is_known(url) or url in seen_urls:
            continue
        title = _clean_title(m.group(2))
        if title and len(title) > 3:
            seen_urls.add(url)
            results.append(GuideSearchResult(title=title, url=url, site="", snippet="", score=0))

    # Pass 2: Bing — <li class="b_algo">
    for m in re.finditer(
        r'<(?:li|div)[^>]+class="[^"]*b_algo[^"]*"[^>]*>.*?<(?:h2|h3)[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)</a></(?:h2|h3)>',
        html, flags=re.DOTALL | re.IGNORECASE,
    ):
        url = _resolve_url(m.group(1))
        if not url.startswith("http") or not _is_known(url) or url in seen_urls:
            continue
        title = _clean_title(m.group(2))
        if title:
            seen_urls.add(url)
            results.append(GuideSearchResult(title=title, url=url, site="", snippet="", score=0))

    # Pass 3: Startpage — <a class="result-title|result-link|w-gl__result-title">
    startpage_patterns = [
        r'<a[^>]+class="[^"]*(?:w-gl__result-title|result-link|result-title|result__title)[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        r'<a[^>]+href="([^"]+)"[^>]+class="[^"]*(?:w-gl__result-title|result-link|result-title|result__title)[^"]*"[^>]*>(.*?)</a>',
        r'<h3[^>]*class="[^"]*result[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
    ]
    for pattern in startpage_patterns:
        for m in re.finditer(pattern, html, flags=re.DOTALL | re.IGNORECASE):
            url = _resolve_url(m.group(1))
            if not url.startswith("http") or url in seen_urls:
                continue
            title = _extract_title(m.group(2))
            if title and len(title) > 3:
                seen_urls.add(url)
                results.append(GuideSearchResult(title=title, url=url, site="", snippet="", score=0))

    # Pass 4: DDG — <a class="result__a">
    for block in re.finditer(
        r'<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
        html, flags=re.DOTALL | re.IGNORECASE,
    ):
        url = _resolve_url(block.group(1))
        if url in seen_urls:
            continue
        title = _clean_title(block.group(2))
        if not title:
            continue
        snippet = ""
        rest = html[block.end():block.end() + 3000]
        snip_m = re.search(
            r'class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</(?:a|div|span)>',
            rest, flags=re.DOTALL | re.IGNORECASE,
        )
        if snip_m:
            snippet = _clean_title(snip_m.group(1))
        seen_urls.add(url)
        results.append(GuideSearchResult(title=title, url=url, site="", snippet=snippet, score=0))

    # Pass 5 (fallback): any <a href="URL"> where URL matches a known domain,
    # with title extracted from heading/span inside it, or link text.
    for m in re.finditer(
        r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
        html, flags=re.DOTALL | re.IGNORECASE,
    ):
        url = _resolve_url(m.group(1))
        if not url.startswith("http") or not _is_known(url) or url in seen_urls:
            continue
        title_text = _extract_title(m.group(2))
        # Reject junk titles
        if not title_text or len(title_text) < 6 or len(title_text) > 200:
            continue
        if title_text.startswith(".") or title_text.startswith("{") or title_text.startswith("@"):
            continue
        if re.search(r"\b(function|var |let |const )\s", title_text):
            continue
        if re.search(r"\{[^}]*\}", title_text):  # Contains { ... } = CSS
            continue
        seen_urls.add(url)
        results.append(GuideSearchResult(title=title_text, url=url, site="", snippet="", score=0))

    return results


class Plugin:
    async def _main(self) -> None:
        self._runtime_dir = Path(decky.DECKY_PLUGIN_RUNTIME_DIR)
        self._guides_dir = self._runtime_dir / "guides"
        self._guides_dir.mkdir(parents=True, exist_ok=True)
        self._config_path = self._runtime_dir / "scan_sources.json"
        self._library_index_path = self._runtime_dir / "library_index.json"
        self._reader_prefs_path = self._runtime_dir / "reader_prefs.json"
        self._favorites_path = self._runtime_dir / "favorites.json"
        # A2 auto-backup config
        self._backup_config_path = self._runtime_dir / "backup_config.json"
        self._search_cache: dict[str, tuple[float, str, str]] = {}
        # v0.43.14: background-import jobs. job_id -> {state, done, total, msg,
        # guide_id, error, title, section_count}. Imports run in a thread pool so
        # the asyncio loop stays free to answer get_import_status polls.
        self._imports: dict[str, dict[str, Any]] = {}
        self._debug_dir = Path("/home/deck/Documents/Plugins/OfflineSoluce")
        try:
            self._debug_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            self._debug_dir = Path("/tmp")
        self._debug_path = self._debug_dir / "main.log"
        self._current_debug_file = "main.log"
        self._debug_log("=== Offline Soluce v0.13 starting ===")
        self._debug_log(f"debug_dir={self._debug_dir}")
        self._debug_log(f"runtime_dir={self._runtime_dir}")
        self._debug_log(f"DECK_HOME={DECK_HOME} exists={DECK_HOME.exists()}")
        self._debug_log(f"Path.home()={Path.home()}")
        for test_path in [
            DECK_HOME / "Emulation" / "roms",
            DECK_HOME / "Games",
            Path("/run/media/deck/SD"),
            Path("/run/media/deck/SD/Emulation/roms"),
            Path("/run/media/deck/SD/Games"),
            DECK_HOME / ".local/share/Steam/steamapps",
            Path("/run/media/deck/SD/steamapps"),
        ]:
            try:
                self._debug_log(f"  {test_path}: exists={test_path.exists()}")
            except Exception as exc:
                self._debug_log(f"  {test_path}: ERROR {exc}")
        self._ensure_scan_config()
        self._debug_log("Backend ready")
        # A2: schedule a delayed auto-backup check (won't block plugin load)
        try:
            import asyncio as _asyncio
            _asyncio.create_task(self._delayed_auto_backup_check())
        except Exception as exc:
            self._debug_log(f"auto-backup scheduling failed: {exc}")

    def _debug_log(self, message: str) -> None:
        try:
            line = f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {message}\n"
            target = self._debug_dir / self._current_debug_file
            with open(target, "a", encoding="utf-8") as fh:
                fh.write(line)
        except Exception:
            pass
        try:
            decky.logger.info(message)
        except Exception:
            pass

    def _switch_debug_file(self, filename: str) -> None:
        """Switch subsequent _debug_log writes to a different file."""
        self._current_debug_file = filename
        try:
            target = self._debug_dir / filename
            target.write_text(
                f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}] === {filename} ===\n",
                encoding="utf-8",
            )
        except Exception:
            pass

    async def debug_info(self) -> dict[str, Any]:
        self._switch_debug_file("debug_info.log")
        self._debug_log("=== debug_info called ===")
        info: dict[str, Any] = {}
        info["has_html_parser"] = _HAS_HTML_PARSER
        info["has_urllib"] = _HAS_URLLIB
        info["has_ipaddress"] = ipaddress is not None
        info["has_socket"] = socket is not None
        info["deck_home"] = str(DECK_HOME)
        info["deck_home_exists"] = DECK_HOME.exists()
        info["path_home"] = str(Path.home())
        info["runtime_dir"] = str(self._runtime_dir)

        path_checks: dict[str, bool] = {}
        for test_path in [
            DECK_HOME / "Emulation" / "roms",
            DECK_HOME / "Games",
            Path("/run/media/deck/SD"),
            Path("/run/media/deck/SD/Emulation/roms"),
            Path("/run/media/deck/SD/Games"),
            DECK_HOME / ".local/share/Steam/steamapps",
        ]:
            try:
                path_checks[str(test_path)] = test_path.exists()
            except Exception as exc:
                path_checks[str(test_path)] = False
                self._debug_log(f"Path check error {test_path}: {exc}")
        info["path_checks"] = path_checks

        sources = self._resolve_scan_sources()
        info["sources"] = [asdict(s) for s in sources]
        self._debug_log(f"Sources found: {len(sources)}")
        for s in sources:
            self._debug_log(f"  {s.kind} {s.path} enabled={s.enabled} exists={s.exists}")

        active = [s for s in sources if s.enabled and s.exists]
        info["active_source_count"] = len(active)

        dir_listings: dict[str, list[str]] = {}
        for s in active:
            root = Path(s.path)
            try:
                if s.kind == "roms" and root.exists():
                    entries = sorted([e.name for e in root.iterdir() if e.is_dir()][:30])
                    dir_listings[str(root)] = entries
                    self._debug_log(f"  ROM dirs in {root}: {entries}")
                    for sub in entries[:5]:
                        sub_path = root / sub
                        try:
                            sub_files = sorted([f.name for f in sub_path.iterdir()][:10])
                            dir_listings[str(sub_path)] = sub_files
                            self._debug_log(f"    {sub}: {sub_files}")
                        except Exception:
                            pass
                elif s.kind == "games" and root.exists():
                    entries = sorted([e.name for e in root.iterdir()][:30])
                    dir_listings[str(root)] = entries
                    self._debug_log(f"  Games entries in {root}: {entries}")
                elif s.kind == "steam" and root.exists():
                    manifests = [f.name for f in root.glob("appmanifest_*.acf")][:20]
                    dir_listings[str(root)] = manifests
                    self._debug_log(f"  Steam manifests in {root}: {len(manifests)} files")
            except Exception as exc:
                dir_listings[str(root)] = [f"ERROR: {exc}"]
                self._debug_log(f"  Listing error for {root}: {exc}")
        info["dir_listings"] = dir_listings

        config = self._load_scan_config()
        info["config"] = config

        self._debug_log(f"debug_info complete")
        info["debug_dir"] = str(self._debug_dir)
        self._switch_debug_file("main.log")
        return info

    async def clear_debug_log(self) -> dict[str, Any]:
        deleted: list[str] = []
        errors: list[str] = []
        # Delete all log files from the debug directory
        try:
            for p in self._debug_dir.glob("*.log"):
                try:
                    p.unlink()
                    deleted.append(p.name)
                except Exception as exc:
                    errors.append(f"{p.name}: {exc}")
        except Exception as exc:
            errors.append(str(exc))
        # Also delete legacy /tmp file if it exists
        try:
            legacy = Path("/tmp/offlinesoluce_debug.txt")
            if legacy.exists():
                legacy.unlink()
                deleted.append(legacy.name)
        except Exception as exc:
            errors.append(f"legacy: {exc}")
        # Recreate main.log empty so subsequent logs keep working
        self._current_debug_file = "main.log"
        try:
            (self._debug_dir / "main.log").write_text(
                f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}] === debug cleared ===\n",
                encoding="utf-8",
            )
        except Exception as exc:
            errors.append(f"recreate: {exc}")
        return {"ok": len(errors) == 0, "deleted": deleted, "errors": errors, "debug_dir": str(self._debug_dir)}

    async def test_search(self, query: str = "Suikoden III PS2 faq walkthrough") -> dict[str, Any]:
        """Perform a real search on each engine and report raw result counts."""
        self._switch_debug_file("test_search.log")
        self._debug_log(f"=== test_search called: query='{query}' ===")
        if not _HAS_URLLIB:
            return {"error": "urllib not available"}

        engines = [
            ("google", "GET", "https://www.google.com/search?" + urllib.parse.urlencode({"q": query, "hl": "fr", "num": "20"}), None),
            ("bing", "GET", "https://www.bing.com/search?" + urllib.parse.urlencode({"q": query, "setlang": "fr"}), None),
            ("startpage", "GET", "https://www.startpage.com/sp/search?" + urllib.parse.urlencode({"query": query, "lui": "french"}), None),
            ("ddg_html_post", "POST", "https://html.duckduckgo.com/html/", urllib.parse.urlencode({"q": query, "kl": "fr-fr"}).encode("utf-8")),
        ]

        context = self._make_ssl_context()
        engine_results: list[dict[str, Any]] = []
        for name, method, url, data in engines:
            entry: dict[str, Any] = {"engine": name, "method": method}
            try:
                headers = {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
                    "Accept-Encoding": "identity",
                }
                if data:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                    headers["Referer"] = url
                    headers["Origin"] = url.rsplit("/", 2)[0]
                request = urllib.request.Request(url, data=data, headers=headers, method=method)
                with urllib.request.urlopen(request, timeout=20, context=context) as response:
                    body = response.read(2_000_000)
                    charset = response.headers.get_content_charset() or "utf-8"
                    try:
                        text = body.decode(charset, errors="replace")
                    except LookupError:
                        text = body.decode("utf-8", errors="replace")
                    entry["body_len"] = len(text)
                    entry["status"] = response.status

                    # Save raw HTML to a separate file for inspection
                    try:
                        safe_q = re.sub(r"[^A-Za-z0-9_-]+", "_", query)[:40]
                        raw_path = self._debug_dir / f"raw_{name}_{safe_q}.html"
                        raw_path.write_text(text, encoding="utf-8")
                        entry["raw_html_file"] = str(raw_path)
                    except Exception as exc:
                        entry["raw_html_error"] = str(exc)

                    # Try parsing
                    parsed = _regex_parse_ddg_results(text)
                    entry["parsed_count"] = len(parsed)
                    entry["first_results"] = [
                        {"title": r.title[:80], "url": r.url[:120]}
                        for r in parsed[:5]
                    ]

                    # Count href by domain for manual diagnosis
                    domain_counts: dict[str, int] = {}
                    for d in ["gamefaqs", "rpgsoluce", "ign.com", "jeuxvideo", "neoseeker", "strategywiki", "vally8", "darklevel"]:
                        domain_counts[d] = len(re.findall(re.escape(d), text, flags=re.IGNORECASE))
                    entry["domain_mentions"] = domain_counts

                    # Extract ALL hrefs to known domains with surrounding context
                    found_links = []
                    for target_domain in ["gamefaqs.gamespot.com", "rpgsoluce.com", "ign.com", "jeuxvideo.com", "vally8.free.fr", "darklevel.free.fr"]:
                        for m in re.finditer(r'href=["\']([^"\']*' + re.escape(target_domain) + r'[^"\']*)["\']', text, flags=re.IGNORECASE):
                            href = m.group(1)
                            if href.startswith("/url?"):
                                q_m = re.search(r'q=([^&]+)', href)
                                if q_m:
                                    href = urllib.parse.unquote(q_m.group(1))
                            if href.startswith("http"):
                                found_links.append(href[:200])
                                if len(found_links) >= 10:
                                    break
                        if len(found_links) >= 10:
                            break
                    entry["sample_links"] = found_links[:10]

                    self._debug_log(f"  [{name}] status={entry['status']} body={entry['body_len']} parsed={entry['parsed_count']} domains={domain_counts}")
                    for lk in found_links[:5]:
                        self._debug_log(f"    link: {lk}")
                    for r in parsed[:3]:
                        self._debug_log(f"    parsed: {r.title[:60]} | {r.url[:100]}")
            except urllib.error.HTTPError as exc:
                entry["error"] = f"HTTP {exc.code}"
                self._debug_log(f"  [{name}] HTTP {exc.code}")
            except Exception as exc:
                entry["error"] = f"{type(exc).__name__}: {exc}"
                self._debug_log(f"  [{name}] {type(exc).__name__}: {exc}")
            engine_results.append(entry)

        self._debug_log("=== test_search done ===")
        self._switch_debug_file("main.log")
        return {"query": query, "engines": engine_results, "debug_dir": str(self._debug_dir)}

    async def test_network(self) -> dict[str, Any]:
        """Test network connectivity by trying multiple URLs and reporting detailed results."""
        self._switch_debug_file("test_network.log")
        self._debug_log("=== test_network called ===")
        results: list[dict[str, Any]] = []

        if not _HAS_URLLIB:
            return {"error": "urllib not available", "results": []}

        test_urls = [
            ("google_home", "GET", "https://www.google.com/", None),
            ("google_search", "GET", "https://www.google.com/search?q=test", None),
            ("bing_home", "GET", "https://www.bing.com/", None),
            ("bing_search", "GET", "https://www.bing.com/search?q=test", None),
            ("ddg_html_get", "GET", "https://html.duckduckgo.com/html/?q=test", None),
            ("ddg_html_post", "POST", "https://html.duckduckgo.com/html/",
             urllib.parse.urlencode({"q": "test"}).encode("utf-8")),
            ("ddg_lite_post", "POST", "https://lite.duckduckgo.com/lite/",
             urllib.parse.urlencode({"q": "test"}).encode("utf-8")),
            ("startpage", "GET", "https://www.startpage.com/sp/search?query=test", None),
            ("gamefaqs_home", "GET", "https://gamefaqs.gamespot.com/", None),
            ("rpgsoluce_home", "GET", "https://www.rpgsoluce.com/", None),
        ]

        context = self._make_ssl_context()
        for name, method, url, data in test_urls:
            entry: dict[str, Any] = {"name": name, "method": method, "url": url}
            try:
                headers = {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
                    "Accept-Encoding": "identity",
                }
                if data:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                request = urllib.request.Request(url, data=data, headers=headers, method=method)
                with urllib.request.urlopen(request, timeout=15, context=context) as response:
                    body = response.read(200_000)
                    entry["status"] = response.status
                    entry["body_len"] = len(body)
                    title_m = re.search(rb"<title[^>]*>(.*?)</title>", body, flags=re.IGNORECASE | re.DOTALL)
                    if title_m:
                        try:
                            entry["title"] = title_m.group(1).decode("utf-8", errors="replace").strip()[:120]
                        except Exception:
                            entry["title"] = ""
                    entry["ok"] = True
            except urllib.error.HTTPError as exc:
                entry["ok"] = False
                entry["status"] = exc.code
                entry["error"] = f"HTTP {exc.code}: {exc.reason}"
            except Exception as exc:
                entry["ok"] = False
                entry["error"] = f"{type(exc).__name__}: {exc}"
            self._debug_log(f"  [{name}] {method} {url[:60]} -> {entry.get('status','ERR')} {entry.get('error','')} body={entry.get('body_len',0)} title='{entry.get('title','')}'")
            results.append(entry)

        self._debug_log("=== test_network done ===")
        self._switch_debug_file("main.log")
        return {"results": results, "debug_dir": str(self._debug_dir)}

    async def _unload(self) -> None:
        decky.logger.info("Offline Soluce backend stopped")

    async def _uninstall(self) -> None:
        decky.logger.info("Offline Soluce uninstall hook")

    async def list_guides(self) -> list[dict[str, Any]]:
        guides = [self._summary_dict(record) for record in self._load_all_records()]
        guides.sort(key=lambda item: item["saved_at"], reverse=True)
        return guides

    async def get_guide(self, guide_id: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        return self._record_to_payload(record)

    async def delete_guide(self, guide_id: str) -> bool:
        path = self._guide_path(guide_id)
        if not path.exists():
            raise ValueError("Guide introuvable")
        path.unlink()
        return True

    async def list_scan_sources(self) -> list[dict[str, Any]]:
        return [asdict(source) for source in self._resolve_scan_sources()]

    async def toggle_scan_source(self, source_id: str) -> dict[str, Any]:
        sources = self._resolve_scan_sources()
        config = self._load_scan_config()
        source_map = config.setdefault("sources", {})
        selected = next((source for source in sources if source.id == source_id), None)
        if selected is None:
            raise ValueError("Source introuvable")
        current = source_map.setdefault(source_id, {"path": selected.path, "kind": selected.kind, "enabled": selected.enabled})
        current["enabled"] = not bool(current.get("enabled", selected.enabled))
        current["path"] = selected.path
        current["kind"] = selected.kind
        self._save_scan_config(config)
        refreshed = next((source for source in self._resolve_scan_sources() if source.id == source_id), None)
        return asdict(refreshed or selected)

    async def get_library_status(self) -> dict[str, Any]:
        self._debug_log("get_library_status called")
        return self._library_status_payload(self._load_library_index())

    async def rescan_library(self) -> dict[str, Any]:
        self._debug_log("=== rescan_library called ===")
        payload = self._scan_library_now()
        status = self._library_status_payload(payload)
        self._debug_log(f"rescan_library returning: {status}")
        return status

    async def list_library_items(self) -> list[dict[str, Any]]:
        self._debug_log("list_library_items called")
        payload = self._load_library_index()
        existing_count = len(payload.get("items", []))
        self._debug_log(f"  loaded index: {existing_count} items, scanned_at={payload.get('scanned_at', '')}")
        if not payload.get("items") and any(source.enabled and source.exists for source in self._resolve_scan_sources()):
            self._debug_log("  index empty + active sources exist -> auto-scanning")
            payload = self._scan_library_now()
        items = payload.get("items", [])
        # Refresh favorite flag from live store (user may have toggled since last scan)
        favorites = self._load_favorites()
        for item in items:
            item["is_favorite"] = item.get("id") in favorites
        self._debug_log(f"  returning {len(items)} items ({len(favorites)} favorites)")
        items.sort(key=lambda item: (
            str(item.get("platform", "")).casefold(),
            str(item.get("custom_title") or item.get("title", "")).casefold(),
        ))
        return items

    async def list_shortcuts(self) -> list[dict[str, Any]]:
        return self._scan_steam_shortcuts()

    async def search_guides(
        self,
        query: str,
        platform: str = "Autre",
        preferred_site: str = "all",
        language: str = "auto",
    ) -> list[dict[str, Any]]:
        if not _HAS_URLLIB:
            raise ValueError("La recherche nécessite le module réseau (indisponible dans cette sandbox)")
        self._switch_debug_file("search.log")
        self._debug_log(f"search_guides: query='{query}' platform='{platform}' site='{preferred_site}' lang='{language}'")
        normalized_query = self._clean_inline_text(query)
        if len(normalized_query) < 2:
            raise ValueError("Entre au moins 2 caractères pour la recherche")

        preferred_key = (preferred_site or "all").strip().casefold()
        normalized_platform = self._normalize_platform(platform)
        normalized_lang = self._normalize_search_language(language, preferred_key)

        # Determine which sites we want to allow through the filter
        if preferred_key in {"", "all", "tous"}:
            allowed_sites = dict(SEARCH_SITES)
        else:
            cfg = SEARCH_SITES.get(preferred_key)
            if cfg is None:
                raise ValueError("Site de recherche non supporté")
            allowed_sites = {preferred_key: cfg}

        # Build query. v0.42: for SINGLE-site searches we prepend `site:DOMAIN`
        # so search engines return only that site (otherwise IGN, Neoseeker etc.
        # are systematically outranked by GameFAQs/Fandom/Reddit and the post-hoc
        # domain filter finds zero matches in the top 20).
        # For "all" mode we keep the generic query — multi-site filtering still
        # works because dominant sites surface naturally.
        platform_token = "" if normalized_platform in {"", "Autre", "Tous"} else normalized_platform
        query_parts: list[str] = []
        if preferred_key not in {"", "all", "tous"}:
            cfg = SEARCH_SITES.get(preferred_key) or {}
            domains = cfg.get("domains") or []
            if domains:
                # Prepend site: filter; rest of the query follows. Most search
                # engines (Startpage, Brave, Google, Bing, DDG) honor this.
                query_parts.append(f"site:{str(domains[0]).strip()}")
        query_parts.append(normalized_query)
        if platform_token:
            query_parts.append(platform_token)
        if normalized_lang == "fr":
            query_parts.append("walkthrough guide soluce")
        else:
            query_parts.append("walkthrough guide faq")
        combined_query = " ".join(part for part in query_parts if part).strip()
        self._debug_log(f"  combined query: '{combined_query}' lang={normalized_lang}")

        # Check cache first
        cache_key = f"{normalized_lang}|{combined_query}"
        cached = self._get_cached_search(cache_key)
        if cached is not None:
            html_text, engine_name = cached
            self._debug_log(f"  cache HIT from {engine_name} ({len(html_text)} chars)")
        else:
            try:
                html_text, _ = self._download_search_page(combined_query, normalized_lang)
                engine_name = getattr(self, '_last_search_engine', '?')
                self._set_cached_search(cache_key, html_text, engine_name)
                self._debug_log(f"  got {len(html_text)} chars from {engine_name} (cached)")
            except Exception as exc:
                self._debug_log(f"  search FAILED: {exc}")
                self._switch_debug_file("main.log")
                raise ValueError(f"La recherche a échoué : {exc}")

        # Check for CAPTCHA in the response
        if self._looks_like_captcha(html_text):
            self._debug_log("  CAPTCHA detected in response")
            self._switch_debug_file("main.log")
            raise ValueError("Le moteur de recherche demande un CAPTCHA. Attends 1-2 minutes et réessaie.")

        # Parse all results (both stdlib and regex parsers)
        all_parsed: list[GuideSearchResult] = self._parse_search_html(html_text)

        # v0.43.9: FR discovery pass. In "all" mode with French requested, the
        # generic SERP is English-dominated (GameFAQs/IGN) and French guide sites
        # never surface — so the FR filter looked "broken". Run a supplementary
        # search restricted to the French guide domains so French results enter
        # the candidate pool; the language-aware scoring below then floats them
        # to the top. Non-fatal: any failure just falls back to the general set.
        if normalized_lang == "fr" and preferred_key in {"", "all", "tous"}:
            fr_domains = ["rpgsoluce.com", "jeuxvideo.com", "vally8.free.fr"]
            fr_clause = " OR ".join(f"site:{d}" for d in fr_domains)
            fr_query = re.sub(r"\s+", " ", f"({fr_clause}) {normalized_query} {platform_token} soluce").strip()
            try:
                fr_cache_key = f"fr-sites|{fr_query}"
                fr_cached = self._get_cached_search(fr_cache_key)
                if fr_cached is not None:
                    fr_html, _fr_engine = fr_cached
                    self._debug_log(f"  FR pass cache HIT ({len(fr_html)} chars)")
                else:
                    fr_html, _ = self._download_search_page(fr_query, "fr")
                    self._set_cached_search(fr_cache_key, fr_html, getattr(self, "_last_search_engine", "?"))
                    self._debug_log(f"  FR pass got {len(fr_html)} chars for '{fr_query}'")
                if not self._looks_like_captcha(fr_html):
                    fr_parsed = self._parse_search_html(fr_html)
                    self._debug_log(f"  FR pass added {len(fr_parsed)} candidates")
                    all_parsed.extend(fr_parsed)
            except Exception as exc:
                self._debug_log(f"  FR pass failed (non-fatal): {exc}")

        # v0.43.15: single-site consistency + fuzz fallback. A `site:DOMAIN` query
        # returns 0 on some engines (observed on neoseeker) even though the plain
        # search finds the site's page — so "filter Neoseeker" gave nothing while
        # "all" gave one result. When ONE site is chosen, ALSO pull the general
        # (no site: prefix) query; the allowed-site filter below keeps only that
        # site, so a filtered search never returns FEWER than all-mode would, and
        # near-miss/typo results still surface (they rank lower, not dropped).
        if preferred_key not in {"", "all", "tous"}:
            gen_parts = [normalized_query]
            if platform_token:
                gen_parts.append(platform_token)
            gen_parts.append("walkthrough guide soluce" if normalized_lang == "fr" else "walkthrough guide faq")
            general_query = re.sub(r"\s+", " ", " ".join(p for p in gen_parts if p)).strip()
            try:
                gen_cache_key = f"gen|{normalized_lang}|{general_query}"
                gen_cached = self._get_cached_search(gen_cache_key)
                if gen_cached is not None:
                    gen_html, _g = gen_cached
                    self._debug_log(f"  single-site fallback cache HIT ({len(gen_html)} chars)")
                else:
                    gen_html, _ = self._download_search_page(general_query, normalized_lang)
                    self._set_cached_search(gen_cache_key, gen_html, getattr(self, "_last_search_engine", "?"))
                    self._debug_log(f"  single-site fallback got {len(gen_html)} chars for '{general_query}'")
                if not self._looks_like_captcha(gen_html):
                    gen_parsed = self._parse_search_html(gen_html)
                    self._debug_log(f"  single-site fallback added {len(gen_parsed)} general candidates")
                    all_parsed.extend(gen_parsed)
            except Exception as exc:
                self._debug_log(f"  single-site fallback failed (non-fatal): {exc}")

        # Dedupe by URL, prefer version with longer title
        by_url: dict[str, GuideSearchResult] = {}
        for r in all_parsed:
            normalized = self._normalize_search_result_url(r.url)
            if not normalized:
                continue
            clean_title = self._clean_inline_text(r.title)
            clean_snippet = self._clean_inline_text(r.snippet)
            existing = by_url.get(normalized)
            if existing is None or len(clean_title) > len(existing.title):
                by_url[normalized] = GuideSearchResult(
                    title=clean_title, url=normalized, site="", snippet=clean_snippet, score=0,
                )
        raw_unique = list(by_url.values())
        self._debug_log(f"  parsed {len(raw_unique)} raw unique results from search")

        # Filter by allowed site + guide-likeness + score
        final_results: list[GuideSearchResult] = []
        final_seen: set[str] = set()
        for parsed in raw_unique:
            hostname = (urlparse(parsed.url).hostname or "").casefold()
            if not hostname:
                continue

            matched_site_key = None
            matched_site_config = None
            for site_key, site_config in allowed_sites.items():
                domains = [str(d).strip().casefold() for d in site_config.get("domains", []) if str(d).strip()]
                if any(hostname == d or hostname.endswith(f".{d}") for d in domains):
                    matched_site_key = site_key
                    matched_site_config = site_config
                    break
            if not matched_site_key:
                continue

            if not self._looks_like_guide_result(matched_site_key, parsed.title, parsed.url, parsed.snippet):
                continue
            if parsed.url in final_seen:
                continue
            final_seen.add(parsed.url)

            site_label = str(matched_site_config.get("label", matched_site_key))
            score = self._score_search_result(matched_site_key, normalized_query, normalized_platform, parsed.title, parsed.url, parsed.snippet, normalized_lang)
            final_results.append(GuideSearchResult(
                title=parsed.title, url=parsed.url, site=site_label,
                snippet=parsed.snippet, score=score,
                game=self._game_name_from_url(parsed.url),  # v0.43.35: "which game?"
            ))

        # v0.43.10: collapse per-chapter fragments of the same guide (rpgsoluce/
        # vally8/darklevel/jeuxvideo) to a single root result before ranking.
        n_before_collapse = len(final_results)
        final_results = self._collapse_guide_fragments(final_results)
        if len(final_results) != n_before_collapse:
            self._debug_log(f"  fragment-collapse: {n_before_collapse} -> {len(final_results)} results")

        final_results.sort(key=lambda item: (-item.score, item.site, item.title.casefold()))
        self._debug_log(f"search_guides: {len(final_results)} final results after filter")
        for r in final_results[:10]:
            self._debug_log(f"  result: {r.title[:60]} ({r.site}) score={r.score}")
        self._switch_debug_file("main.log")
        return [asdict(item) for item in final_results[:SEARCH_RESULT_LIMIT]]

    def _looks_like_captcha(self, html: str) -> bool:
        """Detect CAPTCHA pages from various search engines."""
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip().casefold() if title_match else ""
        if "captcha" in title or "are you a robot" in title:
            return True
        lowered = html.casefold()
        if "g-recaptcha" in lowered:
            return True
        if "detected unusual traffic" in lowered or "unusual traffic from" in lowered:
            return True
        if "startpage captcha" in lowered or "www-startpage-captcha" in lowered:
            return True
        return False

    async def save_guide(
        self,
        url: str,
        game_title: str = "",
        platform: str = "Autre",
        rom_hint: str = "",
        aliases: str = "",
        emulator: str = "",
    ) -> dict[str, Any]:
        """v0.43.14: run the (blocking, possibly multi-page) import in a thread
        pool so the asyncio loop is NOT frozen for the whole crawl. Kept for
        callers wanting a single awaited result; the UI uses start_import +
        get_import_status for progress + background behaviour."""
        if not _HAS_URLLIB:
            raise ValueError("L'import de guides nécessite le module réseau (indisponible dans cette sandbox)")
        import asyncio as _asyncio
        loop = _asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._do_import_sync, url, game_title, platform, rom_hint, aliases, emulator, None,
        )

    def _guide_url_key(self, url: str) -> tuple[str, str]:
        """v0.43.21: (host-without-www, guide-root-path) — the identity of a guide
        regardless of which page (root vs chapter) of it was linked. Reuses the
        per-site root logic from _guide_base_path so anti-duplicate matches the
        same collapsing as search (rpgsoluce /soluces/plat/game, vally8 /jeux/game,
        JV wiki id, else the path)."""
        pu = urlparse(url)
        host = (pu.hostname or "").casefold()
        host_norm = host[4:] if host.startswith("www.") else host
        # Only the fragment-heavy sites collapse to a per-game root. Others
        # (GameFAQs, IGN, Neoseeker) key on the full path so two DIFFERENT FAQs of
        # the same game (…/faqs/111 vs …/faqs/222) stay distinct.
        is_fragment_site = any(host_norm == d or host_norm.endswith(f".{d}") for d in self._FRAGMENT_SITE_HOSTS)
        if is_fragment_site:
            return (host_norm, self._guide_base_path(host, pu.path))
        return (host_norm, pu.path.rstrip("/") or "/")

    def _is_gamefaqs_game_page(self, url: str) -> bool:
        """v0.43.27: True if `url` is a GameFAQs GAME landing page (…/<platform>/
        <id>-<game>) rather than a specific FAQ (…/<platform>/<id>-<game>/faqs/<id>).
        Game pages carry no guide text, only nav chrome."""
        pu = urlparse(url)
        if "gamefaqs.gamespot.com" not in (pu.hostname or "").casefold():
            return False
        parts = [p for p in pu.path.split("/") if p]
        return len(parts) == 2 and "faqs" not in parts and bool(re.match(r"^\d+-", parts[1]))

    def _find_guide_id_by_url_key(self, url_key: tuple[str, str]) -> "str | None":
        """v0.43.21: id of an already-saved guide whose URL maps to the same guide
        root, or None. Scans the guide files' `url` field (cheap for a normal
        library)."""
        if not url_key[0]:
            return None
        try:
            for path in self._guides_dir.glob("*.json"):
                try:
                    payload = json.loads(path.read_text(encoding="utf-8"))
                except Exception:
                    continue
                u = payload.get("url") or ""
                if u and self._guide_url_key(u) == url_key:
                    return payload.get("id") or path.stem
        except Exception:
            return None
        return None

    async def start_import(
        self,
        url: str,
        game_title: str = "",
        platform: str = "Autre",
        rom_hint: str = "",
        aliases: str = "",
        emulator: str = "",
    ) -> dict[str, Any]:
        """v0.43.14: kick off a background import, return a job_id immediately.
        The crawl runs in a thread pool; poll get_import_status(job_id) for live
        progress. Big multi-page guides (Neoseeker) no longer freeze the UI, and
        the import keeps running even if the user closes the reader."""
        if not _HAS_URLLIB:
            raise ValueError("L'import de guides nécessite le module réseau (indisponible dans cette sandbox)")
        import asyncio as _asyncio
        import uuid as _uuid
        if not hasattr(self, "_imports"):
            self._imports = {}
        # v0.43.21: anti-duplicate. Normalise the URL to its guide ROOT so a chapter
        # URL of an already-imported game (rpgsoluce root vs .../chapitre-01.htm) OR
        # a rapid double-click is caught even though the raw URLs differ:
        #   (a) an already-saved guide → return it to OPEN instead of re-importing;
        #   (b) an in-flight import of the same guide → re-use that job.
        try:
            url_key = self._guide_url_key(url)
        except Exception:
            url_key = ("", url)
        existing_id = self._find_guide_id_by_url_key(url_key)
        if existing_id:
            self._debug_log(f"start_import: duplicate of existing guide {existing_id} (url_key={url_key})")
            return {"job_id": "", "duplicate_guide_id": existing_id}
        for jid, job in self._imports.items():
            if job.get("state") == "running" and job.get("url_key") == list(url_key):
                self._debug_log(f"start_import: same guide already importing (job {jid})")
                return {"job_id": jid, "duplicate_guide_id": None}

        job_id = _uuid.uuid4().hex[:12]
        self._imports[job_id] = {
            "state": "running", "done": 0, "total": 0, "msg": "Démarrage…",
            "guide_id": None, "error": None, "title": game_title or url, "section_count": 0,
            "warning": "", "url_key": list(url_key),
        }
        loop = _asyncio.get_event_loop()
        fut = loop.run_in_executor(
            None, self._do_import_sync, url, game_title, platform, rom_hint, aliases, emulator, job_id,
        )

        def _done(f: Any) -> None:
            try:
                res = f.result()
                sc = int(res.get("section_count") or len(res.get("sections") or []))
                wc = int(res.get("word_count") or 0)
                warn = self._guide_quality_warning(sc, wc)
                self._imports[job_id].update(
                    state="done", guide_id=res.get("id"),
                    section_count=sc, warning=warn,
                    msg=("Terminé ⚠️ à vérifier" if warn else "Terminé ✓"),
                )
            except Exception as exc:
                self._imports[job_id].update(state="error", error=str(exc), msg=f"Échec : {exc}")

        fut.add_done_callback(_done)
        return {"job_id": job_id, "duplicate_guide_id": None}

    async def get_import_status(self, job_id: str) -> dict[str, Any]:
        """v0.43.14: poll target for the import-progress UI."""
        if not hasattr(self, "_imports"):
            return {"state": "unknown"}
        return self._imports.get(job_id) or {"state": "unknown"}

    async def list_imports(self) -> list[dict[str, Any]]:
        """v0.43.18: all import jobs (running first, then recently finished), each
        with its job_id, so the Home/Library can show ongoing background imports
        even after the user leaves the search screen."""
        if not hasattr(self, "_imports"):
            return []
        out = [{**job, "job_id": jid} for jid, job in self._imports.items()]
        order = {"running": 0, "error": 1, "done": 2}
        out.sort(key=lambda j: order.get(j.get("state", ""), 3))
        return out

    async def dismiss_import(self, job_id: str) -> bool:
        """v0.43.18: forget a finished import job (clears it from the Home list)."""
        if hasattr(self, "_imports"):
            self._imports.pop(job_id, None)
        return True

    def _sections_from_collected(self, content: str, collected: dict[str, Any]) -> tuple[list[GuideSection], str]:
        """v0.43.20: shared sectioning used by BOTH import and Re-DL/reload.

        MULTI-PAGE guides (Neoseeker, JV, rpgsoluce trees) are sectioned BY PAGE —
        one section per fetched chapter, titled by that page — with NO merge (the
        heuristic path's _merge_small_sections fused small pages into a neighbour
        and left content under the WRONG title). Single-page guides keep the smart
        heuristic detection. Reusing this in reload_guide_content is what makes the
        "retélécharger" button actually re-apply the per-page fix."""
        page_boundaries = collected.get("page_boundaries") or []
        if len(page_boundaries) > 1:
            lines = content.split("\n")
            n = len(lines)
            page_secs: list[GuideSection] = []
            for i, pb in enumerate(page_boundaries):
                start = min(int(pb.get("line_start", 0)), max(0, n - 1))
                end = (int(page_boundaries[i + 1]["line_start"]) - 1) if i + 1 < len(page_boundaries) else n - 1
                end = max(start, min(end, n - 1))
                page_secs.append(GuideSection(title=str(pb.get("title") or f"Page {i + 1}"), line_start=start, line_end=end, heading_level=2))
            # v0.43.32: char_split=False — each page is already a coherent chapter;
            # don't char-paginate it (IGN long-line prose was shredded into parts).
            # Only a genuinely huge chapter (>350 lines) still gets line-split.
            page_secs = self._split_large_sections(page_secs, lines, char_split=False)
            page_secs = self._trim_trailing_title_decoration(page_secs)
            page_secs = self._normalize_gamefaqs_titles(page_secs)
            page_secs = self._number_consecutive_duplicates(page_secs)
            page_secs = self._truncate_long_titles(page_secs)
            page_secs = self._cap_sections(page_secs, lines)
            self._debug_log(f"  per-page sectioning: {len(page_boundaries)} pages -> {len(page_secs)} sections")
            return page_secs, "pages"
        return self._build_sections_with_method(content)

    # v0.43.33: high-value phrase detection. Ordered by priority (first match on a
    # line wins) — missable/point-of-no-return is the most important. Patterns are
    # deliberately SPECIFIC (phrases, not common words like "boss"/"item") so they
    # surface only the ~handful of genuinely critical moments per guide.
    _IMPORTANT_FLAG_RES: list[tuple[str, "re.Pattern[str]"]] = [
        ("missable", re.compile(
            r"\b(?:permanently\s+)?missable\b"
            r"|point\s+of\s+no\s+return"
            r"|do(?:n'?t| not)\s+miss\b"
            r"|\b(?:last|only|one)\s+(?:chance|time)\s+to\b"
            r"|one[-\s]time[-\s]only"
            r"|can(?:'?t|not)\s+(?:be\s+)?(?:obtain|get|acquire|find|buy|purchase)\w*\s+(?:it\s+)?(?:later|again|after|anymore)"
            r"|no\s+longer\s+(?:be\s+)?(?:available|obtainable|accessible)"
            r"|before\s+(?:you\s+)?(?:leave|proceed|continue|move\s+on)"
            r"|\bmanquable"
            r"|[àa]\s+ne\s+pas\s+(?:rater|manquer|louper|oublier)"
            r"|point\s+de\s+non[-\s]retour"
            r"|(?:impossible|ne\s+pourrez\s+plus|plus\s+possible)\b.{0,25}(?:plus\s+tard|par\s+la\s+suite|ensuite|apr[èe]s)"
            r"|derni[èe]re\s+(?:chance|occasion|possibilit[ée])",
            re.IGNORECASE)),
        # v0.43.35: DROPPED bare "key item"/"objet clé" — it matched every inventory
        # listing ("Key Item: MONASTERY MAP") and flooded item-heavy guides (Koudelka
        # 62 flags of pure noise). Keep only genuinely-notable gear you'd seek out.
        # Missable key items are still caught by the "missable" category above.
        ("key_item", re.compile(
            r"\bunique\s+(?:weapon|armou?r|accessor\w+|ring|sword|shield|spear|staff|item|equipment)"
            r"|(?:ultimate|strongest|best|most\s+powerful)\s+(?:weapon|armou?r|sword|spear|shield|staff)\b"
            r"|arme\s+(?:ultime|unique|l[ée]gendaire|la\s+plus\s+puissante)"
            r"|meilleure\s+arme"
            r"|un\s+seul\s+exemplaire",
            re.IGNORECASE)),
        ("side_quest", re.compile(
            r"\bside[-\s]quest"
            r"|\boptional\s+(?:quest|boss|area|dungeon|content|objective|super\s?boss)"
            r"|qu[êe]tes?\s+(?:annexes?|secondaires?|optionnelles?|facultatives?)"
            r"|\b(?:facultati\w+|optionnel\w*)\b",
            re.IGNORECASE)),
    ]

    # v0.43.35: lines that mention a flag word but aren't an actionable moment —
    # tables of contents, cross-references to other pages, and banner/decoration.
    # Dropped before flagging so hub/reference pages don't flood the checklist
    # (IGN Disco Elysium "Side Quests" page went 78 -> ~40 real quest lines).
    _FLAG_NOISE_RE = re.compile(
        r"\.{4,}"                                         # dotted-leader TOC entry
        r"|this\s+page\s+lists"
        r"|(?:are|presented)\s+(?:presented|here|below|alphabetically)"
        r"|(?:please\s+)?see\s+the\b.{0,45}\bpage"
        r"|check\s+the\b.{0,45}\bpages?\b"
        r"|for\s+(?:more|information|general\s+help)\b.{0,45}\b(?:see|page|check)"
        r"|will\s+not\s+cover"
        r"|listed\s+(?:as|below|here|alphabetically)"
        r"|spoiler[-\s]free",
        re.IGNORECASE)

    def _is_flag_noise_line(self, s: str) -> bool:
        if self._FLAG_NOISE_RE.search(s):
            return True
        # ASCII banner / heavy decoration (===, ----, ***, ~~~) or mostly non-letters.
        if re.search(r"[=*_~]{3,}", s) or re.search(r"-{4,}", s):
            return True
        letters = sum(1 for c in s if c.isalpha())
        if letters and letters < 0.4 * len(s):
            return True
        return False

    def _flag_snippet(self, lines: list[str], li: int) -> str:
        """The readable context for a flag: the line, widened to neighbours when
        the source is hard-wrapped (short lines) so the sentence isn't cut."""
        s = lines[li].strip()
        if len(s) < 60 and 0 <= li:
            window = " ".join(
                x.strip() for x in lines[max(0, li - 1):li + 2]
                if x.strip() and "\x01" not in x
            )
            return re.sub(r"\s+", " ", window)[:220].strip()
        return re.sub(r"\s+", " ", s)[:220].strip()

    def _extract_important_flags(self, content: str, sections: list[GuideSection]) -> list[GuideFlag]:
        """v0.43.33: scan the guide for missable / key-item / side-quest phrases."""
        lines = content.split("\n")
        # line -> section index (sections are contiguous line ranges)
        sec_of = [-1] * len(lines)
        for idx, s in enumerate(sections):
            for li in range(max(0, s.line_start), min(s.line_end + 1, len(lines))):
                sec_of[li] = idx
        flags: list[GuideFlag] = []
        seen: set[tuple[str, str]] = set()
        for li, line in enumerate(lines):
            s = line.strip()
            if len(s) < 8 or "\x01" in line:
                continue
            if self._is_flag_noise_line(s):  # v0.43.35: skip TOC/reference/banner lines
                continue
            for cat, rx in self._IMPORTANT_FLAG_RES:
                m = rx.search(s)
                if not m:
                    continue
                snippet = self._flag_snippet(lines, li)
                dedupe_key = (cat, snippet[:60].lower())
                if dedupe_key in seen:
                    break
                seen.add(dedupe_key)
                flags.append(GuideFlag(
                    category=cat,
                    section_index=sec_of[li] if li < len(sec_of) else -1,
                    snippet=snippet,
                    matched=m.group(0),
                ))
                break  # one flag per line; missable (first) wins over key_item
        return flags[:250]

    def _guide_quality_warning(self, section_count: int, word_count: int) -> str:
        """v0.43.37: non-blocking "this import looks like junk" notice. A real guide
        has several sections; 0-1 sections (or near-empty text) means the fetch got a
        stub / nav-chrome page (jeuxvideo fragments, GameFAQs /videos/ pages, etc.).
        We DON'T auto-delete — the user asked to be warned and decide themselves."""
        if section_count < 2 or word_count < 150:
            plural = "s" if section_count > 1 else ""
            return (
                f"⚠️ Ce guide semble vide ou incomplet ({section_count} section{plural}, "
                f"{word_count} mots). Ouvre-le pour vérifier — et supprime-le s'il est inutilisable."
            )
        return ""

    def _do_import_sync(
        self,
        url: str,
        game_title: str = "",
        platform: str = "Autre",
        rom_hint: str = "",
        aliases: str = "",
        emulator: str = "",
        job_id: "str | None" = None,
    ) -> dict[str, Any]:
        """v0.43.14: SYNC import body (validate → crawl → sections → save). Runs
        in a thread. If job_id is given, reports per-page progress into
        self._imports[job_id] through the crawl callback."""
        self._switch_debug_file("save_guide.log")
        self._debug_log(f"_do_import_sync: url='{url}' game='{game_title}' platform='{platform}' job={job_id}")
        try:
            normalized_url = self._validate_url(url)
            self._debug_log(f"  validated url: {normalized_url}")
        except Exception as exc:
            self._debug_log(f"  validate_url FAILED: {exc}")
            raise

        # v0.43.27: reject GameFAQs GAME-PAGE URLs (…/xbox-series-x/409958-metaphor).
        # They have no guide text — only nav chrome (Boards / Q&A / Jump to) — so
        # they'd import as a 0-1 section garbage guide (Metaphor, WORLD END).
        if self._is_gamefaqs_game_page(normalized_url):
            raise ValueError(
                "C'est la PAGE DU JEU GameFAQs, pas un guide. Sur GameFAQs, ouvre "
                "l'onglet « FAQs/Guides » du jeu, choisis un walkthrough, et importe "
                "son URL (elle contient …/faqs/…)."
            )

        def progress_cb(done: int, total: int, current: str) -> None:
            if job_id and job_id in self._imports:
                self._imports[job_id].update(done=done, total=total, msg=f"Téléchargement page {done}/{total}…")

        try:
            collected = self._collect_guide(normalized_url, progress_cb)
            self._debug_log(f"  collected: title='{collected.get('title','')}' extractor='{collected.get('extractor','')}' content_len={len(collected.get('content',''))}")
        except Exception as exc:
            self._debug_log(f"  collect_guide FAILED: {exc}")
            raise
        content = collected["content"]

        if len(content) < 200:
            raise ValueError("Extraction trop pauvre : la page n'a pas fourni assez de contenu lisible")

        if len(content) > MAX_CONTENT_CHARS:
            content = content[:MAX_CONTENT_CHARS] + "\n\n[... contenu tronqué ...]"

        if job_id and job_id in self._imports:
            self._imports[job_id].update(msg="Découpage en sections…")
        sections, detection_method = self._sections_from_collected(content, collected)
        title = str(collected["title"])
        # v0.43.36: fix uninformative titles ("RPG Soluce", "Walkthrough") using the
        # game name from the URL, so the library shows which game each guide is.
        title = self._better_guide_title(title, normalized_url)
        guide_id = self._make_id(title)
        snippet = self._make_snippet(content)
        game = self._build_game_info(
            record_title=title,
            platform=platform,
            game_title=game_title,
            rom_hint=rom_hint,
            aliases_raw=aliases,
            emulator=emulator,
        )
        # v0.42.3: pre-populate hidden_section_titles with auto-detected
        # meta-FAQ sections (AUTEUR / Credits / Disclaimer / Version / TOC).
        auto_hidden = self._detect_meta_faq_section_titles(sections, content)
        record = GuideRecord(
            id=guide_id,
            title=title,
            url=normalized_url,
            site=self._site_name(normalized_url),
            extractor=str(collected["extractor"]),
            saved_at=datetime.now(timezone.utc).isoformat(),
            word_count=len(content.split()),
            size_bytes=len(content.encode("utf-8")),
            snippet=snippet,
            content=content,
            source_charset=str(collected["source_charset"]),
            game=game,
            sections=sections,
            detection_method=detection_method,
            source_pages=list(collected["source_pages"]),
            progress=GuideReadingProgress(hidden_section_titles=auto_hidden),
            important_flags=self._extract_important_flags(content, sections),
        )
        self._write_record(record)
        self._debug_log(f"  _do_import_sync SUCCESS: id={guide_id} title='{title}' sections={len(sections)} words={len(content.split())}")
        self._switch_debug_file("main.log")
        return self._record_to_payload(record)

    async def save_progress(self, guide_id: str, last_section_index: int = -1, font_scale: float = 1.0, scroll_fraction: float = 0.0) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        max_section_index = len(record.sections) - 1
        clamped_index = max(-1, min(int(last_section_index), max_section_index)) if max_section_index >= 0 else -1
        clamped_font_scale = max(0.85, min(float(font_scale), 2.0))
        clamped_scroll = max(0.0, min(float(scroll_fraction), 1.0))
        record.progress.last_section_index = clamped_index
        record.progress.font_scale = round(clamped_font_scale, 2)
        record.progress.last_scroll_fraction = round(clamped_scroll, 4)
        record.progress.last_opened_at = datetime.now(timezone.utc).isoformat()
        self._write_record(record)
        return self._record_to_payload(record)

    async def set_bookmark(self, guide_id: str, section_index: int = -1, scroll_fraction: float = 0.0) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        max_section_index = len(record.sections) - 1
        # Default to section 0 if caller passed -1 but guide has sections
        effective_index = int(section_index)
        if effective_index < 0 and max_section_index >= 0:
            effective_index = 0
        clamped_index = max(-1, min(effective_index, max_section_index)) if max_section_index >= 0 else -1
        clamped_scroll = max(0.0, min(float(scroll_fraction), 1.0))
        record.progress.bookmark_section_index = clamped_index
        record.progress.bookmark_scroll_fraction = round(clamped_scroll, 4)
        record.progress.bookmark_set_at = datetime.now(timezone.utc).isoformat()
        self._write_record(record)
        return self._record_to_payload(record)

    async def clear_bookmark(self, guide_id: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        record.progress.bookmark_section_index = -1
        record.progress.bookmark_scroll_fraction = 0.0
        record.progress.bookmark_set_at = ""
        self._write_record(record)
        return self._record_to_payload(record)

    async def clear_progress(self, guide_id: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        # Preserve named bookmarks + notes on clear_progress: only the resume position resets.
        record.progress.last_section_index = -1
        record.progress.last_opened_at = ""
        record.progress.last_scroll_fraction = 0.0
        record.progress.bookmark_section_index = -1
        record.progress.bookmark_set_at = ""
        record.progress.bookmark_scroll_fraction = 0.0
        record.progress.font_scale = 1.0
        self._write_record(record)
        return self._record_to_payload(record)

    # -------- Named bookmarks --------

    async def add_named_bookmark(
        self,
        guide_id: str,
        name: str,
        section_index: int = -1,
        scroll_fraction: float = 0.0,
    ) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        cleaned_name = self._clean_inline_text(name)[:80] or "Marque-page"
        max_section_index = len(record.sections) - 1
        effective_index = int(section_index)
        if effective_index < 0 and max_section_index >= 0:
            effective_index = 0
        clamped_index = max(-1, min(effective_index, max_section_index)) if max_section_index >= 0 else -1
        clamped_scroll = max(0.0, min(float(scroll_fraction), 1.0))

        bookmark_id = hashlib.sha1(
            f"{guide_id}|{clamped_index}|{clamped_scroll}|{time.time()}".encode("utf-8", errors="ignore")
        ).hexdigest()[:10]
        bookmark = NamedBookmark(
            bookmark_id=bookmark_id,
            name=cleaned_name,
            section_index=clamped_index,
            scroll_fraction=round(clamped_scroll, 4),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        record.progress.named_bookmarks.append(bookmark)
        # Cap total count
        if len(record.progress.named_bookmarks) > MAX_NAMED_BOOKMARKS:
            record.progress.named_bookmarks = record.progress.named_bookmarks[-MAX_NAMED_BOOKMARKS:]
        self._write_record(record)
        return self._record_to_payload(record)

    async def rename_named_bookmark(self, guide_id: str, bookmark_id: str, new_name: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        cleaned = self._clean_inline_text(new_name)[:80] or "Marque-page"
        for bm in record.progress.named_bookmarks:
            if bm.bookmark_id == bookmark_id:
                bm.name = cleaned
                break
        self._write_record(record)
        return self._record_to_payload(record)

    async def delete_named_bookmark(self, guide_id: str, bookmark_id: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        record.progress.named_bookmarks = [
            bm for bm in record.progress.named_bookmarks if bm.bookmark_id != bookmark_id
        ]
        self._write_record(record)
        return self._record_to_payload(record)

    # -------- Section notes --------

    async def set_section_note(
        self,
        guide_id: str,
        section_index: int,
        done: bool = False,
        flagged: bool = False,
        note: str = "",
    ) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        max_section_index = len(record.sections) - 1
        if max_section_index < 0 or section_index < 0 or section_index > max_section_index:
            raise ValueError("Section invalide")
        clean_note = self._clean_inline_text(note)[:MAX_NOTE_LENGTH]
        updated_at = datetime.now(timezone.utc).isoformat()

        found = False
        for n in record.progress.section_notes:
            if n.section_index == section_index:
                n.done = bool(done)
                n.flagged = bool(flagged)
                n.note = clean_note
                n.updated_at = updated_at
                found = True
                break
        if not found:
            if len(record.progress.section_notes) >= MAX_NOTES_PER_GUIDE:
                raise ValueError("Trop de notes sur ce guide")
            record.progress.section_notes.append(GuideSectionNote(
                section_index=int(section_index),
                done=bool(done),
                flagged=bool(flagged),
                note=clean_note,
                updated_at=updated_at,
            ))
        # Drop fully-empty notes
        record.progress.section_notes = [
            n for n in record.progress.section_notes
            if n.done or n.flagged or n.note
        ]
        self._write_record(record)
        return self._record_to_payload(record)

    async def clear_section_note(self, guide_id: str, section_index: int) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        record.progress.section_notes = [
            n for n in record.progress.section_notes if n.section_index != int(section_index)
        ]
        self._write_record(record)
        return self._record_to_payload(record)

    async def toggle_section_hidden(self, guide_id: str, section_index: int) -> dict[str, Any]:
        """Toggle the "hidden" flag on a section. Stored by title (not index) so it
        survives section reconstruction/reload. Hidden sections are filtered out of
        the sidebar unless the "Show hidden" toggle is on."""
        record = self._load_record_or_raise(guide_id)
        idx = int(section_index)
        if idx < 0 or idx >= len(record.sections):
            raise ValueError("Section index hors range")
        title = (record.sections[idx].title or "").strip()
        if not title:
            raise ValueError("Section sans titre — ne peut pas être masquée (titre vide ne survit pas une reconstruction)")
        current = list(record.progress.hidden_section_titles)
        if title in current:
            current.remove(title)
        else:
            current.append(title)
        record.progress.hidden_section_titles = current
        self._write_record(record)
        return self._record_to_payload(record)

    async def show_all_sections(self, guide_id: str) -> dict[str, Any]:
        """Clear all hidden flags for this guide."""
        record = self._load_record_or_raise(guide_id)
        record.progress.hidden_section_titles = []
        self._write_record(record)
        return self._record_to_payload(record)

    async def reconstruct_sections(self, guide_id: str) -> dict[str, Any]:
        """Re-run the section detector on an existing guide's content.
        Preserves progress/notes/bookmarks but remaps their section_index to the
        closest matching new section by title, falling back to clamped index."""
        record = self._load_record_or_raise(guide_id)
        old_sections = list(record.sections)
        new_sections, new_method = self._build_sections_with_method(record.content)
        record.sections = new_sections
        record.detection_method = new_method
        record.important_flags = self._extract_important_flags(record.content, new_sections)

        def remap(old_index: int) -> int:
            if old_index < 0:
                return -1
            if not new_sections:
                return -1
            if not old_sections or old_index >= len(old_sections):
                return min(old_index, len(new_sections) - 1)
            old_title = old_sections[old_index].title.casefold().strip()
            if old_title:
                for i, s in enumerate(new_sections):
                    if s.title.casefold().strip() == old_title:
                        return i
            # Fallback: line-position-based remap
            old_start = old_sections[old_index].line_start
            for i, s in enumerate(new_sections):
                if s.line_start <= old_start <= s.line_end:
                    return i
            return min(old_index, len(new_sections) - 1)

        record.progress.last_section_index = remap(record.progress.last_section_index)
        record.progress.bookmark_section_index = remap(record.progress.bookmark_section_index)
        for bm in record.progress.named_bookmarks:
            bm.section_index = remap(bm.section_index)
        remapped_notes: list[GuideSectionNote] = []
        seen_idx: set[int] = set()
        for note in record.progress.section_notes:
            new_idx = remap(note.section_index)
            if new_idx < 0 or new_idx in seen_idx:
                continue
            seen_idx.add(new_idx)
            note.section_index = new_idx
            remapped_notes.append(note)
        record.progress.section_notes = remapped_notes

        self._write_record(record)
        return self._record_to_payload(record)

    async def polish_all_guides(self) -> dict[str, Any]:
        """v0.42.2: batch reconstruct + polish for every stored guide.

        For each guide:
        1. Apply site-specific chrome strip via `clean_existing_guide`
        2. Section detection runs through `_build_sections_with_method`
           which now includes `_polish_section_titles`
        3. Return per-guide stats so the frontend can show what changed.
        """
        self._switch_debug_file("polish_all.log")
        self._debug_log("=== polish_all_guides called ===")
        results = []
        total_before_chars = 0
        total_after_chars = 0
        total_titles_changed = 0
        for path in sorted(self._guides_dir.glob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                guide_id = payload.get("id") or path.stem
                title = payload.get("title", "")
                site = payload.get("site", "")
                before_chars = len(payload.get("content", "") or "")
                before_sections = payload.get("sections", []) or []
                before_titles = [s.get("title", "") for s in before_sections]

                self._debug_log(f"--- {path.name} ({title}) site={site}")
                # Run the existing clean_existing_guide method
                updated_payload = await self.clean_existing_guide(guide_id)
                after_chars = len(updated_payload.get("content", "") or "")
                after_sections = updated_payload.get("sections", []) or []
                after_titles = [s.get("title", "") for s in after_sections]

                # Count title changes (positional comparison, capped to min length)
                titles_changed = 0
                for b, a in zip(before_titles, after_titles):
                    if b != a:
                        titles_changed += 1
                # If the section count changed, also count length delta
                section_delta = len(after_sections) - len(before_sections)

                total_before_chars += before_chars
                total_after_chars += after_chars
                total_titles_changed += titles_changed

                results.append({
                    "guide_id": guide_id,
                    "title": title,
                    "site": site,
                    "before_chars": before_chars,
                    "after_chars": after_chars,
                    "chars_removed": before_chars - after_chars,
                    "before_sections": len(before_sections),
                    "after_sections": len(after_sections),
                    "section_delta": section_delta,
                    "titles_changed": titles_changed,
                })
                self._debug_log(
                    f"  -> chars {before_chars}->{after_chars}, "
                    f"sections {len(before_sections)}->{len(after_sections)}, "
                    f"titles_changed={titles_changed}"
                )
            except Exception as exc:
                self._debug_log(f"  FAIL {path.name}: {exc}")
                results.append({
                    "guide_id": path.stem,
                    "title": "?",
                    "site": "?",
                    "error": str(exc)[:200],
                })
        summary = {
            "guides_processed": len(results),
            "total_chars_before": total_before_chars,
            "total_chars_after": total_after_chars,
            "total_chars_removed": total_before_chars - total_after_chars,
            "total_titles_changed": total_titles_changed,
            "per_guide": results,
        }
        self._debug_log(f"=== polish_all_guides done: {summary['guides_processed']} guides, "
                       f"{summary['total_chars_removed']} chars removed, "
                       f"{summary['total_titles_changed']} titles changed ===")
        self._switch_debug_file("main.log")
        return summary

    async def clean_existing_guide(self, guide_id: str) -> dict[str, Any]:
        """v0.41+: re-apply site-specific noise stripping to a stored guide.

        Use case: a guide imported with an earlier version was polluted with
        site-specific boilerplate that the new strippers handle. This endpoint
        dispatches by `record.site`:

        - **gamefaqs.gamespot.com**: drops the ~55-line UI noise block at the
          top (sidebar widgets / nav tabs / button labels) by locating the
          author attribution `Guide and Walkthrough (PLAT) by AUTHOR`.
        - **vally8.free.fr**: strips the per-page nav menu (Accueil Vally8
          → Forum) and footer (phpMyVisites, "Voir la suite", forum invite)
          that repeat at every page boundary in multi-page crawls.
        - **rpgsoluce.com**: strips HTML comment leak, sidebar TOC menu,
          page footer, and citation widget. Also truncates content at the
          first image-page section, and filters non-page URLs from
          source_pages.

        Always re-runs section detection on the cleaned content and saves
        with progress/notes/bookmarks remap (mirrors reconstruct_sections).
        For sites without a registered cleaner, this is equivalent to
        reconstruct_sections."""
        record = self._load_record_or_raise(guide_id)
        original_length = len(record.content)
        site = (record.site or "").lower()

        if "gamefaqs" in site:
            # v0.41.1: drop the GameFAQs UI noise (~55 lines per stored guide)
            # that sits at the top before the author attribution.
            record.content = self._strip_gamefaqs_chrome(record.content)
        elif "vally8" in site:
            # v0.41.1: strip per-page nav menu + footer that repeats at every
            # page boundary in vally8 multi-page crawls.
            record.content = self._strip_vally8_chrome(record.content)
        elif "rpgsoluce" in site:
            record.content = self._strip_rpgsoluce_chrome(record.content)
            # Truncate at the first section whose title looks like an image-page
            # leak (just the bare hostname). Find the line position of that section
            # in the OLD section layout, then cut the content there.
            image_section_re = re.compile(
                r"^\s*rpgsoluce\.com\b.*$",
                re.IGNORECASE,
            )
            for sec in record.sections:
                if image_section_re.match(sec.title or ""):
                    # Truncate the content above this section's start line.
                    # Note: line numbers in sections refer to the pre-strip content;
                    # we map roughly by counting lines because strip mostly removes
                    # short menu/footer blocks. Worst case we under-truncate slightly.
                    content_lines = record.content.split("\n")
                    cut_at = max(0, min(sec.line_start - 1, len(content_lines)))
                    record.content = "\n".join(content_lines[:cut_at]).rstrip() + "\n"
                    self._debug_log(
                        f"  clean_existing_guide: truncated at image-page section "
                        f"'{sec.title}' line {sec.line_start} "
                        f"({original_length} → {len(record.content)} chars)"
                    )
                    break

            # Also filter source_pages: remove entries with non-page URL extensions
            kept_pages: list[GuideSourcePage] = []
            removed = 0
            for sp in record.source_pages:
                url_lower = (sp.url or "").lower()
                # crude path-extension check
                path = urlparse(url_lower).path
                if any(path.endswith(ext) for ext in NON_PAGE_URL_EXTENSIONS):
                    removed += 1
                    continue
                kept_pages.append(sp)
            if removed:
                record.source_pages = kept_pages
                self._debug_log(f"  clean_existing_guide: dropped {removed} non-page URLs from source_pages")

        # Re-build sections (mirrors reconstruct_sections logic)
        old_sections = list(record.sections)
        new_sections, new_method = self._build_sections_with_method(record.content)
        record.sections = new_sections
        record.detection_method = new_method
        record.important_flags = self._extract_important_flags(record.content, new_sections)

        def remap(old_index: int) -> int:
            if old_index < 0:
                return -1
            if not new_sections:
                return -1
            if not old_sections or old_index >= len(old_sections):
                return min(old_index, len(new_sections) - 1)
            old_title = old_sections[old_index].title.casefold().strip()
            if old_title:
                for i, s in enumerate(new_sections):
                    if s.title.casefold().strip() == old_title:
                        return i
            old_start = old_sections[old_index].line_start
            for i, s in enumerate(new_sections):
                if s.line_start <= old_start <= s.line_end:
                    return i
            return min(old_index, len(new_sections) - 1)

        record.progress.last_section_index = remap(record.progress.last_section_index)
        record.progress.bookmark_section_index = remap(record.progress.bookmark_section_index)
        for bm in record.progress.named_bookmarks:
            bm.section_index = remap(bm.section_index)
        remapped_notes: list[GuideSectionNote] = []
        seen_idx: set[int] = set()
        for note in record.progress.section_notes:
            new_idx = remap(note.section_index)
            if new_idx < 0 or new_idx in seen_idx:
                continue
            seen_idx.add(new_idx)
            note.section_index = new_idx
            remapped_notes.append(note)
        record.progress.section_notes = remapped_notes

        # v0.42.3: also augment hidden_section_titles with newly-detected
        # meta-FAQ titles (idempotent — only adds, never removes user-set ones).
        try:
            auto_hidden = self._detect_meta_faq_section_titles(record.sections, record.content)
            if auto_hidden:
                existing = set(record.progress.hidden_section_titles or [])
                added = 0
                for t in auto_hidden:
                    if t not in existing:
                        record.progress.hidden_section_titles.append(t)
                        existing.add(t)
                        added += 1
                if added:
                    self._debug_log(f"  clean_existing_guide: auto-hid {added} meta-FAQ sections")
        except Exception as exc:
            try: self._debug_log(f"  clean_existing_guide: auto-hide failed: {exc}")
            except Exception: pass

        self._write_record(record)
        self._debug_log(
            f"clean_existing_guide done: id={guide_id} "
            f"content {original_length}→{len(record.content)} chars, "
            f"sections {len(old_sections)}→{len(new_sections)}"
        )
        return self._record_to_payload(record)

    # ===================== A2: Auto-backup =====================

    DEFAULT_BACKUP_CONFIG = {
        "enabled": False,
        "interval_days": 7,
        "last_backup_at": "",
        "last_backup_path": "",
        "last_backup_size_bytes": 0,
    }

    def _load_backup_config(self) -> dict[str, Any]:
        if not self._backup_config_path.exists():
            return dict(self.DEFAULT_BACKUP_CONFIG)
        try:
            data = json.loads(self._backup_config_path.read_text(encoding="utf-8"))
            merged = dict(self.DEFAULT_BACKUP_CONFIG)
            for k in self.DEFAULT_BACKUP_CONFIG:
                if k in data:
                    merged[k] = data[k]
            return merged
        except Exception as exc:
            self._debug_log(f"backup_config read failed: {exc}")
            return dict(self.DEFAULT_BACKUP_CONFIG)

    def _save_backup_config(self, cfg: dict[str, Any]) -> None:
        try:
            self._backup_config_path.write_text(
                json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception as exc:
            self._debug_log(f"backup_config write failed: {exc}")

    async def get_running_emulator_game_hint(self) -> dict[str, Any]:
        """Detect a running emulator and extract the loaded ROM/ISO as a game-title hint.

        Used by the frontend per-game palette feature for games launched OUTSIDE
        Steam (e.g. via EmulationStation DE → PCSX2 / RetroArch / etc.), where
        Steam's `MainRunningApp` doesn't identify the actual game.

        Returns: {"hint": "<cleaned game title>", "rom_path": "...", "emulator": "..."}
        Empty fields if no emulator is detected.
        """
        try:
            import subprocess
            result = subprocess.run(
                ["ps", "-eo", "args="],
                capture_output=True, text=True, timeout=3,
            )
            if result.returncode != 0:
                return {"hint": "", "rom_path": "", "emulator": ""}

            EMULATORS = [
                "pcsx2", "rpcs3", "duckstation", "dolphin-emu", "dolphin",
                "ppsspp", "retroarch", "mgba", "vba-m", "snes9x", "fceux",
                "mupen64", "cemu", "ryujinx", "yuzu", "citra", "scummvm",
                "redream", "flycast", "mednafen", "lakka",
            ]
            emulator_re = re.compile(r"\b(" + "|".join(EMULATORS) + r")\b", re.IGNORECASE)

            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                m = emulator_re.search(line)
                if not m:
                    continue
                emulator_name = m.group(1).lower()
                # Reuse the existing ROM-path extractor (handles iso/bin/chd/cso/gba/etc.)
                rom_name = self._extract_rom_hint_from_shortcut(line)
                if not rom_name:
                    continue
                # _extract_rom_hint_from_shortcut returns the filename; clean it
                stem_no_ext = re.sub(
                    r"\.(?:iso|bin|cue|img|mdf|nrg|chd|cso|pbp|rvz|wbfs|gcz|"
                    r"7z|zip|rar|nes|sfc|smc|gba|gbc|gb|nds|3ds|z64|n64|v64|md|gen)$",
                    "", rom_name, flags=re.IGNORECASE,
                )
                game_title = self._clean_game_title(stem_no_ext)
                if not game_title:
                    continue
                self._debug_log(f"emulator hint: {emulator_name} → '{game_title}' (from {rom_name})")
                return {
                    "hint": game_title,
                    "rom_path": rom_name,
                    "emulator": emulator_name,
                }
            return {"hint": "", "rom_path": "", "emulator": ""}
        except Exception as exc:
            try: self._debug_log(f"get_running_emulator_game_hint failed: {exc}")
            except Exception: pass
            return {"hint": "", "rom_path": "", "emulator": ""}

    async def get_backup_config(self) -> dict[str, Any]:
        return self._load_backup_config()

    async def set_backup_config(self, enabled: bool, interval_days: int) -> dict[str, Any]:
        cfg = self._load_backup_config()
        cfg["enabled"] = bool(enabled)
        cfg["interval_days"] = max(1, min(int(interval_days), 365))
        self._save_backup_config(cfg)
        return cfg

    async def run_backup_now(self) -> dict[str, Any]:
        """Trigger an export immediately and stamp last_backup_at."""
        result = await self.export_all_guides()
        cfg = self._load_backup_config()
        cfg["last_backup_at"] = datetime.now(timezone.utc).isoformat()
        cfg["last_backup_path"] = str(result.get("path", ""))
        cfg["last_backup_size_bytes"] = int(result.get("size_bytes", 0))
        self._save_backup_config(cfg)
        return {**result, "config": cfg}

    async def _delayed_auto_backup_check(self) -> None:
        """Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget."""
        import asyncio as _asyncio
        try:
            await _asyncio.sleep(30)
            cfg = self._load_backup_config()
            if not cfg.get("enabled"):
                return
            interval = max(1, int(cfg.get("interval_days", 7)))
            last_at = str(cfg.get("last_backup_at", "")).strip()
            if not last_at:
                self._debug_log("auto-backup: enabled but no last_backup_at — running first backup")
                await self.run_backup_now()
                return
            try:
                last_dt = datetime.fromisoformat(last_at)
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
            except Exception as exc:
                self._debug_log(f"auto-backup: invalid last_backup_at '{last_at}': {exc}")
                return
            delta = datetime.now(timezone.utc) - last_dt
            if delta.total_seconds() >= interval * 86400:
                self._debug_log(f"auto-backup: due (last={last_at}, delta={delta.days}d, interval={interval}d) — running")
                await self.run_backup_now()
            else:
                self._debug_log(f"auto-backup: not due (last={last_at}, delta={delta.days}d, interval={interval}d)")
        except Exception as exc:
            self._debug_log(f"auto-backup check error: {exc}")

    # ============================================================

    async def reload_guide_content(self, guide_id: str) -> dict[str, Any]:
        """Re-fetch the guide from its source URL, refreshing content + sections.

        Preserves: guide id, game info, progress, bookmarks, notes.
        Replaces:   content, sections, source_pages, snippet, sizes, extractor, saved_at.

        Useful after upgrading the crawler (e.g. multi-page support added in
        v0.13) so existing guides can pick up the new logic without losing the
        user's reading state. Throws if the refetch fails — the existing record
        is left untouched in that case.
        """
        if not _HAS_URLLIB:
            raise ValueError("Le re-téléchargement nécessite le module réseau")
        import asyncio as _asyncio
        import uuid as _uuid
        # v0.43.28: register a job so a Re-DL shows in "Imports en cours" (Home)
        # with live progress — same as a search import — and stays visible if the
        # user leaves the fiche (the executor keeps running to completion).
        if not hasattr(self, "_imports"):
            self._imports = {}
        try:
            rec = self._load_record_or_raise(guide_id)
            title = (rec.game.game_title or rec.title or guide_id)
        except Exception:
            title = guide_id
        job_id = "redl-" + _uuid.uuid4().hex[:8]
        self._imports[job_id] = {
            "state": "running", "done": 0, "total": 0, "msg": "Re-téléchargement…",
            "guide_id": guide_id, "error": None, "title": title, "section_count": 0,
        }
        loop = _asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(None, self._reload_guide_sync, guide_id, job_id)
            self._imports[job_id].update(
                state="done", guide_id=result.get("id", guide_id),
                section_count=int(result.get("section_count") or len(result.get("sections") or [])),
                msg="Terminé ✓",
            )
            return result
        except Exception as exc:
            self._imports[job_id].update(state="error", error=str(exc), msg=f"Échec : {exc}")
            raise

    def _reload_guide_sync(self, guide_id: str, job_id: "str | None" = None) -> dict[str, Any]:
        """v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a
        big multi-page guide doesn't freeze the asyncio loop (and thus the UI)."""
        record = self._load_record_or_raise(guide_id)
        if not record.url:
            raise ValueError("Pas d'URL source enregistrée pour ce guide")

        self._switch_debug_file("reload_guide.log")
        self._debug_log(f"reload_guide_content: id={guide_id} url={record.url}")

        def progress_cb(done: int, total: int, current: str) -> None:
            if job_id and job_id in self._imports:
                self._imports[job_id].update(done=done, total=total, msg=f"Re-DL page {done}/{total}…")

        try:
            collected = self._collect_guide(record.url, progress_cb)
        except Exception as exc:
            self._debug_log(f"  refetch FAILED: {exc}")
            self._switch_debug_file("main.log")
            raise

        new_content = collected["content"]
        if len(new_content) < 200:
            self._switch_debug_file("main.log")
            raise ValueError("Extraction trop pauvre : pas assez de contenu, ancienne version conservée")
        if len(new_content) > MAX_CONTENT_CHARS:
            new_content = new_content[:MAX_CONTENT_CHARS] + "\n\n[... contenu tronqué ...]"

        new_sections, new_method = self._sections_from_collected(new_content, collected)

        # Replace content + derived fields, keep id/progress/game. v0.43.36: also
        # upgrade a generic title ("RPG Soluce" → "Chrono Cross") so existing guides
        # get fixed on their next re-DL. User renames are a separate custom_titles
        # overlay, so this never clobbers a manual rename.
        record.title = self._better_guide_title(record.title, record.url)
        record.content = new_content
        record.sections = new_sections
        record.detection_method = new_method
        record.important_flags = self._extract_important_flags(new_content, new_sections)
        record.source_pages = list(collected["source_pages"])
        record.word_count = len(new_content.split())
        record.size_bytes = len(new_content.encode("utf-8"))
        record.snippet = self._make_snippet(new_content)
        record.source_charset = str(collected["source_charset"])
        record.extractor = str(collected["extractor"])
        record.saved_at = datetime.now(timezone.utc).isoformat()

        # Clamp progress indices to the new section range so they don't dangle
        max_section_index = len(new_sections) - 1
        if max_section_index >= 0:
            record.progress.last_section_index = max(-1, min(record.progress.last_section_index, max_section_index))
            record.progress.bookmark_section_index = max(-1, min(record.progress.bookmark_section_index, max_section_index))
            for bm in record.progress.named_bookmarks:
                bm.section_index = max(-1, min(bm.section_index, max_section_index))
            record.progress.section_notes = [n for n in record.progress.section_notes if 0 <= n.section_index <= max_section_index]
        else:
            record.progress.last_section_index = -1
            record.progress.bookmark_section_index = -1
            record.progress.section_notes = []

        self._write_record(record)
        self._debug_log(f"  reload SUCCESS: id={guide_id} pages={len(record.source_pages)} sections={len(new_sections)} method={new_method}")
        self._switch_debug_file("main.log")
        return self._record_to_payload(record)

    # -------- Full-text search inside a guide --------

    async def find_in_guide(self, guide_id: str, pattern: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        raw = (pattern or "").strip()
        if len(raw) < 2:
            return {"matches": [], "total": 0, "pattern": raw}
        # Case-insensitive, accent-insensitive match using casefold + simple accent strip
        def normalize(text: str) -> str:
            text = text.casefold()
            # basic accent stripping for common French chars
            replacements = {
                "à": "a", "â": "a", "ä": "a",
                "é": "e", "è": "e", "ê": "e", "ë": "e",
                "î": "i", "ï": "i",
                "ô": "o", "ö": "o",
                "ù": "u", "û": "u", "ü": "u",
                "ç": "c", "ñ": "n",
            }
            for k, v in replacements.items():
                text = text.replace(k, v)
            return text

        needle = normalize(raw)
        if not needle:
            return {"matches": [], "total": 0, "pattern": raw}

        content = record.content
        lines = content.splitlines()
        normalized_lines = [normalize(line) for line in lines]

        matches: list[dict[str, Any]] = []
        cap = 200
        for line_index, norm_line in enumerate(normalized_lines):
            if needle in norm_line:
                # Find which section contains this line
                section_idx = -1
                for s_i, sec in enumerate(record.sections):
                    if sec.line_start <= line_index <= sec.line_end:
                        section_idx = s_i
                        break
                original = lines[line_index]
                # Find character position of first match on the line
                char_pos = norm_line.find(needle)
                matches.append({
                    "line_index": line_index,
                    "section_index": section_idx,
                    "section_title": record.sections[section_idx].title if section_idx >= 0 else "",
                    "line_text": original[:300],
                    "char_pos": char_pos,
                })
                if len(matches) >= cap:
                    break

        return {"matches": matches, "total": len(matches), "pattern": raw, "capped": len(matches) >= cap}

    # -------- Export / Import --------

    async def export_guide(self, guide_id: str) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        try:
            EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            raise ValueError(f"Impossible de créer le dossier d'export : {exc}")
        safe = re.sub(r"[^A-Za-z0-9_-]+", "_", record.id)[:80]
        if not safe:
            safe = "guide"
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        out = EXPORT_ROOT / f"{safe}-{stamp}.json"
        payload = self._record_to_payload(record)
        payload["_export_schema"] = 1
        payload["_exported_at"] = datetime.now(timezone.utc).isoformat()
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"path": str(out), "size_bytes": out.stat().st_size, "guide_id": record.id}

    async def export_all_guides(self) -> dict[str, Any]:
        try:
            EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            raise ValueError(f"Impossible de créer le dossier d'export : {exc}")
        records = self._load_all_records()
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        out = EXPORT_ROOT / f"offline-soluce-bundle-{stamp}.json"
        bundle = {
            "_export_schema": 1,
            "_exported_at": datetime.now(timezone.utc).isoformat(),
            "guide_count": len(records),
            "guides": [self._record_to_payload(r) for r in records],
        }
        out.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"path": str(out), "size_bytes": out.stat().st_size, "guide_count": len(records)}

    async def list_export_files(self) -> list[dict[str, Any]]:
        try:
            EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
        except Exception:
            return []
        entries = []
        for path in sorted(EXPORT_ROOT.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                stat = path.stat()
                entries.append({
                    "name": path.name,
                    "path": str(path),
                    "size_bytes": stat.st_size,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
            except Exception:
                continue
        return entries[:50]

    async def import_guide_from_path(self, path: str) -> dict[str, Any]:
        source = Path(path)
        # Safety: only accept paths under the export root or ~/Documents
        allowed_roots = [EXPORT_ROOT, DECK_HOME / "Documents", Path("/tmp")]
        resolved = source.resolve(strict=False)
        if not any(str(resolved).startswith(str(root.resolve(strict=False))) for root in allowed_roots):
            raise ValueError("Import autorisé uniquement depuis ~/Documents ou le dossier d'export")
        if not source.exists():
            raise ValueError("Fichier introuvable")
        try:
            raw = json.loads(source.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ValueError(f"JSON invalide : {exc}")

        imported: list[str] = []
        if isinstance(raw, dict) and "guides" in raw:
            for item in raw.get("guides") or []:
                try:
                    rec = self._record_from_payload(item)
                    rec.id = self._ensure_unique_id(rec.id or self._make_id(rec.title))
                    self._write_record(rec)
                    imported.append(rec.id)
                except Exception as exc:
                    self._debug_log(f"import bundle item failed: {exc}")
                    continue
        elif isinstance(raw, dict) and "id" in raw and "content" in raw:
            rec = self._record_from_payload(raw)
            rec.id = self._ensure_unique_id(rec.id or self._make_id(rec.title))
            self._write_record(rec)
            imported.append(rec.id)
        else:
            raise ValueError("Format non reconnu (ni guide unique, ni bundle)")
        return {"imported_count": len(imported), "imported_ids": imported}

    def _ensure_unique_id(self, candidate: str) -> str:
        base = candidate or "guide"
        if not self._guide_path(base).exists():
            return base
        suffix = 2
        while self._guide_path(f"{base}-{suffix}").exists():
            suffix += 1
        return f"{base}-{suffix}"

    # -------- Open URL in external browser --------

    async def open_url_external(self, url: str) -> dict[str, Any]:
        try:
            normalized = self._validate_url(url)
        except Exception as exc:
            raise ValueError(str(exc))
        try:
            import subprocess
            subprocess.Popen(
                ["xdg-open", normalized],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            return {"ok": True, "url": normalized}
        except Exception as exc:
            raise ValueError(f"Impossible d'ouvrir l'URL : {exc}")

    # -------- Reader preferences --------

    async def get_reader_preferences(self) -> dict[str, Any]:
        return asdict(self._load_reader_prefs())

    async def update_reader_preferences(
        self,
        theme: str = "dark",
        font_family: str = "sans",
        line_height: str = "normal",
        max_width: str = "normal",
        highlight_keywords: bool = True,
        numbered_sections: bool = True,
        resume_hotkey: str = "",
        resume_button: int = -1,
        resume_enabled: bool = True,
    ) -> dict[str, Any]:
        try:
            btn = int(resume_button)
        except Exception:
            btn = -1
        if btn < -1 or btn > 200:
            btn = -1
        prefs = ReaderPreferences(
            theme=theme if theme in {"dark", "sepia"} else "dark",
            font_family=font_family if font_family in {"sans", "serif", "mono"} else "sans",
            line_height=line_height if line_height in {"tight", "normal", "airy"} else "normal",
            max_width=max_width if max_width in {"narrow", "normal", "full"} else "normal",
            highlight_keywords=bool(highlight_keywords),
            numbered_sections=bool(numbered_sections),
            resume_hotkey=str(resume_hotkey or "").strip()[:30],
            resume_button=btn,
            resume_enabled=bool(resume_enabled),
        )
        self._save_reader_prefs(prefs)
        return asdict(prefs)

    def _load_reader_prefs(self) -> ReaderPreferences:
        if not self._reader_prefs_path.exists():
            return ReaderPreferences()
        try:
            payload = json.loads(self._reader_prefs_path.read_text(encoding="utf-8"))
        except Exception:
            return ReaderPreferences()
        theme = str(payload.get("theme", "dark"))
        if theme not in {"dark", "sepia"}:
            theme = "dark"
        try:
            btn = int(payload.get("resume_button", -1))
        except Exception:
            btn = -1
        return ReaderPreferences(
            theme=theme,
            font_family=str(payload.get("font_family", "sans")),
            line_height=str(payload.get("line_height", "normal")),
            max_width=str(payload.get("max_width", "normal")),
            highlight_keywords=bool(payload.get("highlight_keywords", True)),
            numbered_sections=bool(payload.get("numbered_sections", True)),
            resume_hotkey=str(payload.get("resume_hotkey", "")).strip()[:30],
            resume_button=btn if -1 <= btn <= 200 else -1,
            # Default to True if key absent — preserves existing behavior for users
            # upgrading from <v0.40 prefs files.
            resume_enabled=bool(payload.get("resume_enabled", True)),
        )

    def _save_reader_prefs(self, prefs: ReaderPreferences) -> None:
        self._reader_prefs_path.write_text(
            json.dumps(asdict(prefs), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    # -------- Search cache helpers --------

    def _get_cached_search(self, key: str) -> tuple[str, str] | None:
        entry = self._search_cache.get(key)
        if not entry:
            return None
        timestamp, html, engine = entry
        if time.time() - timestamp > SEARCH_CACHE_TTL_SEC:
            self._search_cache.pop(key, None)
            return None
        return html, engine

    def _set_cached_search(self, key: str, html: str, engine: str) -> None:
        # Cap cache size: drop oldest entries if over 24
        if len(self._search_cache) > 24:
            oldest = sorted(self._search_cache.items(), key=lambda kv: kv[1][0])[:8]
            for k, _ in oldest:
                self._search_cache.pop(k, None)
        self._search_cache[key] = (time.time(), html, engine)

    def _normalize_search_language(self, requested: str, site_key: str) -> str:
        value = (requested or "auto").strip().lower()
        if value in {"fr", "francais", "français", "french"}:
            return "fr"
        if value in {"en", "english", "anglais"}:
            return "en"
        # Auto: english sites → english, french sites → french, all → french as default
        english_sites = {"gamefaqs", "ign", "neoseeker"}
        french_sites = {"rpgsoluce", "jeuxvideo", "vally8"}
        if site_key in english_sites:
            return "en"
        if site_key in french_sites:
            return "fr"
        return "fr"

    async def update_guide_game(
        self,
        guide_id: str,
        game_title: str = "",
        platform: str = "Autre",
        rom_hint: str = "",
        aliases: str = "",
        emulator: str = "",
    ) -> dict[str, Any]:
        record = self._load_record_or_raise(guide_id)
        record.game = self._build_game_info(
            record_title=record.title,
            platform=platform,
            game_title=game_title,
            rom_hint=rom_hint,
            aliases_raw=aliases,
            emulator=emulator,
        )
        self._write_record(record)
        return self._record_to_payload(record)

    async def rename_library_item(self, item_id: str, custom_title: str) -> dict[str, Any]:
        clean_title = self._clean_inline_text(custom_title)
        titles = self._load_custom_titles()
        if clean_title:
            titles[item_id] = clean_title
        else:
            titles.pop(item_id, None)
        self._save_custom_titles(titles)
        payload = self._load_library_index()
        for item in payload.get("items", []):
            if item.get("id") == item_id:
                item["custom_title"] = clean_title
                break
        self._library_index_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"id": item_id, "custom_title": clean_title}

    def _load_custom_titles(self) -> dict[str, str]:
        path = self._runtime_dir / "custom_titles.json"
        if not path.exists():
            return {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                return {str(k): str(v) for k, v in payload.items()}
        except Exception:
            pass
        return {}

    def _save_custom_titles(self, titles: dict[str, str]) -> None:
        path = self._runtime_dir / "custom_titles.json"
        path.write_text(json.dumps(titles, ensure_ascii=False, indent=2), encoding="utf-8")

    def _load_favorites(self) -> set[str]:
        if not self._favorites_path.exists():
            return set()
        try:
            payload = json.loads(self._favorites_path.read_text(encoding="utf-8"))
            if isinstance(payload, list):
                return {str(item) for item in payload if item}
            if isinstance(payload, dict):
                return {str(k) for k, v in payload.items() if v}
        except Exception:
            pass
        return set()

    def _save_favorites(self, favorites: set[str]) -> None:
        self._favorites_path.write_text(
            json.dumps(sorted(favorites), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    async def toggle_library_favorite(self, item_id: str) -> dict[str, Any]:
        favorites = self._load_favorites()
        if item_id in favorites:
            favorites.discard(item_id)
            is_favorite = False
        else:
            favorites.add(item_id)
            is_favorite = True
        self._save_favorites(favorites)
        # Update cached index
        payload = self._load_library_index()
        for item in payload.get("items", []):
            if item.get("id") == item_id:
                item["is_favorite"] = is_favorite
                break
        self._library_index_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"id": item_id, "is_favorite": is_favorite}

    def _ensure_scan_config(self) -> None:
        if self._config_path.exists():
            config = self._load_scan_config()
            source_map = config.get("sources", {})
            if source_map:
                has_any_enabled = any(bool(v.get("enabled")) for v in source_map.values())
                if not has_any_enabled:
                    self._debug_log("Config exists but all sources disabled, resetting")
                    self._config_path.unlink(missing_ok=True)
                else:
                    self._debug_log(f"Config exists with {len(source_map)} sources")
                    return
            else:
                self._debug_log("Config exists but empty sources, resetting")
                self._config_path.unlink(missing_ok=True)

        self._debug_log("Creating fresh scan config")
        config = {"sources": {}}
        for source in self._discover_scan_source_candidates(existing_only=True):
            config["sources"][source.id] = {
                "path": source.path,
                "kind": source.kind,
                "enabled": source.exists,
            }
            self._debug_log(f"  Init source: {source.kind} {source.path} enabled={source.exists}")
        self._save_scan_config(config)

    def _load_scan_config(self) -> dict[str, Any]:
        if not self._config_path.exists():
            return {"sources": {}}
        try:
            payload = json.loads(self._config_path.read_text(encoding="utf-8"))
        except Exception:
            return {"sources": {}}
        if not isinstance(payload, dict):
            return {"sources": {}}
        if not isinstance(payload.get("sources"), dict):
            payload["sources"] = {}
        return payload

    def _save_scan_config(self, payload: dict[str, Any]) -> None:
        self._config_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _discover_scan_source_candidates(self, existing_only: bool = False) -> list[ScanSource]:
        self._debug_log(f"_discover_scan_source_candidates(existing_only={existing_only})")
        candidates: list[tuple[str, Path]] = []

        base_candidates = [
            ("roms", DECK_HOME / "Emulation" / "roms"),
            ("games", DECK_HOME / "Games"),
            ("roms", Path("/run/media/deck/SD/Emulation/roms")),
            ("games", Path("/run/media/deck/SD/Games")),
            ("steam", DECK_HOME / ".local/share/Steam/steamapps"),
            ("steam", Path("/run/media/deck/SD/steamapps")),
        ]
        candidates.extend(base_candidates)

        home = Path.home()
        if home != DECK_HOME:
            self._debug_log(f"  Path.home()={home} differs from DECK_HOME, adding extra candidates")
            candidates.append(("roms", home / "Emulation" / "roms"))
            candidates.append(("games", home / "Games"))

        sd_scan_roots = [Path("/run/media"), Path("/media")]
        skip_dir_names = {".trash-1000", "lost+found", ".trashes", "$recycle.bin", "system volume information"}
        for root in sd_scan_roots:
            if not root.exists():
                continue
            try:
                for user_dir in root.iterdir():
                    if not user_dir.is_dir() or user_dir.name.startswith("."):
                        continue
                    for mount_dir in user_dir.iterdir():
                        if not mount_dir.is_dir():
                            continue
                        if mount_dir.name.startswith(".") or mount_dir.name.casefold() in skip_dir_names:
                            continue
                        # Only consider actual mount points (directories that contain
                        # Emulation, Games or steamapps directly)
                        has_known_child = False
                        try:
                            child_names = {c.name.casefold() for c in mount_dir.iterdir() if c.is_dir()}
                            has_known_child = bool(child_names & {"emulation", "games", "steamapps"})
                        except Exception:
                            pass
                        if not has_known_child:
                            continue
                        emu_roms = mount_dir / "Emulation" / "roms"
                        games = mount_dir / "Games"
                        steam = mount_dir / "steamapps"
                        candidates.append(("roms", emu_roms))
                        candidates.append(("games", games))
                        candidates.append(("steam", steam))
            except PermissionError:
                decky.logger.warning(f"Permission refusée pour scanner {root}")
            except Exception as exc:
                decky.logger.warning(f"Erreur scan SD sous {root}: {exc}")

        config = self._load_scan_config()
        for source_id, item in (config.get("sources") or {}).items():
            kind = str(item.get("kind", "")).strip()
            raw_path = str(item.get("path", "")).strip()
            if kind and raw_path:
                candidates.append((kind, Path(raw_path)))

        unique: list[ScanSource] = []
        seen: set[tuple[str, str]] = set()
        for kind, candidate in candidates:
            try:
                resolved = candidate.resolve(strict=False)
            except Exception:
                resolved = candidate
            key = (kind, str(resolved))
            if key in seen:
                continue
            seen.add(key)
            try:
                exists = resolved.exists()
            except PermissionError:
                exists = False
            except Exception:
                exists = False
            if existing_only and not exists:
                continue
            source_id = self._make_source_id(kind, str(resolved))
            storage = self._guess_storage_label(resolved)
            label = self._make_source_label(kind, storage, resolved)
            saved = (config.get("sources") or {}).get(source_id, {})
            enabled = bool(saved.get("enabled", exists))
            unique.append(
                ScanSource(
                    id=source_id,
                    kind=kind,
                    path=str(resolved),
                    label=label,
                    enabled=enabled,
                    exists=exists,
                    storage=storage,
                )
            )
            self._debug_log(f"  Source: {kind} {resolved} exists={exists} enabled={enabled}")
        unique.sort(key=lambda item: (item.kind.casefold(), item.storage.casefold(), item.path.casefold()))
        self._debug_log(f"Total candidates: {len(unique)}")
        return unique

    def _resolve_scan_sources(self) -> list[ScanSource]:
        sources = self._discover_scan_source_candidates(existing_only=False)
        config = self._load_scan_config()
        changed = False
        source_map = config.setdefault("sources", {})
        for source in sources:
            entry = source_map.get(source.id)
            if entry is None:
                source_map[source.id] = {"path": source.path, "kind": source.kind, "enabled": source.exists}
                changed = True
            else:
                if entry.get("path") != source.path or entry.get("kind") != source.kind:
                    entry["path"] = source.path
                    entry["kind"] = source.kind
                    changed = True
        if changed:
            self._save_scan_config(config)
            sources = self._discover_scan_source_candidates(existing_only=False)
        return sources

    def _make_source_id(self, kind: str, path: str) -> str:
        digest = hashlib.sha1(f"{kind}|{path}".encode("utf-8", errors="ignore")).hexdigest()[:12]
        return f"{kind}-{digest}"

    def _guess_storage_label(self, path: Path) -> str:
        text = str(path)
        if text.startswith("/run/media/") or text.startswith("/media/"):
            return "SD / externe"
        return "Interne"

    def _make_source_label(self, kind: str, storage: str, path: Path) -> str:
        kind_labels = {"roms": "ROMs", "games": "Games", "steam": "Steam"}
        kind_label = kind_labels.get(kind, kind.capitalize())
        return f"{kind_label} — {storage}"

    def _load_library_index(self) -> dict[str, Any]:
        if not self._library_index_path.exists():
            return {"scanned_at": "", "item_count": 0, "instance_count": 0, "enabled_source_count": 0, "items": []}
        try:
            payload = json.loads(self._library_index_path.read_text(encoding="utf-8"))
        except Exception:
            return {"scanned_at": "", "item_count": 0, "instance_count": 0, "enabled_source_count": 0, "items": []}
        if not isinstance(payload, dict):
            return {"scanned_at": "", "item_count": 0, "instance_count": 0, "enabled_source_count": 0, "items": []}
        if not isinstance(payload.get("items"), list):
            payload["items"] = []
        return payload

    def _library_status_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "scanned_at": str(payload.get("scanned_at", "")),
            "item_count": int(payload.get("item_count", len(payload.get("items", [])))),
            "instance_count": int(payload.get("instance_count", 0)),
            "enabled_source_count": int(payload.get("enabled_source_count", 0)),
        }

    def _scan_library_now(self) -> dict[str, Any]:
        self._debug_log("=== _scan_library_now START ===")
        sources = [source for source in self._resolve_scan_sources() if source.enabled and source.exists]
        self._debug_log(f"Active sources: {len(sources)}")
        for s in sources:
            self._debug_log(f"  -> {s.kind} {s.path}")
        groups: dict[str, dict[str, Any]] = {}

        for source in sources:
            try:
                self._debug_log(f"Scanning: {source.kind} {source.path}")
                if source.kind == "roms":
                    self._scan_rom_source(source, groups)
                elif source.kind == "games":
                    self._scan_games_source(source, groups)
                elif source.kind == "steam":
                    self._scan_steam_source(source, groups)
                self._debug_log(f"  After {source.kind}: {len(groups)} total games")
            except Exception as exc:
                self._debug_log(f"  SCAN ERROR for {source.path}: {exc}")

        custom_titles = self._load_custom_titles()
        favorites = self._load_favorites()
        items: list[dict[str, Any]] = []
        instance_total = 0
        for key, group in groups.items():
            item_id = self._make_source_id("lib", key)
            entry = LibraryGameEntry(
                id=item_id,
                title=group["title"],
                normalized_title=group["normalized_title"],
                platform=group["platform"],
                disc_code=group["disc_code"],
                emulator=group["emulator"],
                aliases=group["aliases"],
                source_kinds=group["source_kinds"],
                storages=group["storages"],
                source_labels=group["source_labels"],
                source_ids=group["source_ids"],
                primary_path=group["primary_path"],
                paths=group["paths"],
                instance_count=group["instance_count"],
                source_count=len(group["source_ids"]),
                custom_title=custom_titles.get(item_id, ""),
                is_favorite=item_id in favorites,
            )
            items.append(asdict(entry))
            instance_total += entry.instance_count

        items.sort(key=lambda item: (str(item.get("platform", "")).casefold(), str(item.get("custom_title") or item.get("title", "")).casefold()))
        payload = {
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "item_count": len(items),
            "instance_count": instance_total,
            "enabled_source_count": len(sources),
            "items": items,
        }
        self._library_index_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        self._debug_log(f"=== _scan_library_now DONE: {len(items)} games, {instance_total} instances ===")
        return payload

    def _scan_rom_source(self, source: ScanSource, groups: dict[str, dict[str, Any]]) -> None:
        source_root = Path(source.path)
        if not source_root.exists():
            self._debug_log(f"ROM source does not exist: {source_root}")
            return

        self._debug_log(f"ROM walk starting: {source_root}")
        m3u_targets: set[str] = set()
        m3u_entries: list[tuple[Path, str]] = []
        rom_entries: list[tuple[Path, str, str]] = []

        for dirpath, dirnames, filenames in os.walk(source_root):
            dirnames[:] = [name for name in dirnames if not name.startswith(".")]
            base_dir = Path(dirpath)
            for filename in filenames:
                if filename.startswith("."):
                    continue
                ext = Path(filename).suffix.casefold()
                file_path = base_dir / filename

                if ext == ".m3u":
                    platform = self._guess_platform_from_rom_path(source_root, file_path)
                    m3u_entries.append((file_path, platform))
                    try:
                        for line in file_path.read_text(encoding="utf-8", errors="replace").splitlines():
                            line = line.strip()
                            if line and not line.startswith("#"):
                                try:
                                    target = (base_dir / line).resolve(strict=False)
                                    m3u_targets.add(str(target))
                                except Exception:
                                    pass
                    except Exception:
                        pass
                elif ext in ROM_FILE_EXTENSIONS:
                    platform = self._guess_platform_from_rom_path(source_root, file_path)
                    rom_entries.append((file_path, platform, filename))

        self._debug_log(f"ROM walk done: {len(m3u_entries)} m3u + {len(rom_entries)} roms")

        for m3u_path, platform in m3u_entries:
            emulator = self._default_emulator_for_platform(platform)
            game = self._build_game_info(
                record_title=m3u_path.stem,
                platform=platform,
                game_title="",
                rom_hint=m3u_path.name,
                aliases_raw="",
                emulator=emulator,
            )
            if game.game_title:
                self._merge_library_instance(groups, source, game, m3u_path)

        multi_disc_seen: dict[str, Path] = {}

        for file_path, platform, filename in rom_entries:
            try:
                resolved_str = str(file_path.resolve(strict=False))
            except Exception:
                resolved_str = str(file_path)
            if resolved_str in m3u_targets:
                continue

            stem = Path(filename).stem
            disc_match = MULTI_DISC_PATTERN.search(stem)
            if disc_match:
                base_name = MULTI_DISC_PATTERN.sub("", stem).strip()
                disc_key = f"{str(file_path.parent)}|{base_name.casefold()}"
                if disc_key in multi_disc_seen:
                    continue
                multi_disc_seen[disc_key] = file_path
                title_stem = base_name
            else:
                title_stem = stem

            emulator = self._default_emulator_for_platform(platform)
            game = self._build_game_info(
                record_title=title_stem,
                platform=platform,
                game_title="",
                rom_hint=file_path.name,
                aliases_raw="",
                emulator=emulator,
            )
            if not game.game_title:
                continue
            self._merge_library_instance(groups, source, game, file_path)

        self._debug_log(f"ROM source {source_root}: {len(m3u_entries)} m3u + {len(rom_entries)} roms found")

    def _scan_games_source(self, source: ScanSource, groups: dict[str, dict[str, Any]]) -> None:
        source_root = Path(source.path)
        if not source_root.exists():
            self._debug_log(f"Games source does not exist: {source_root}")
            return
        try:
            children = sorted(source_root.iterdir(), key=lambda item: item.name.casefold())
        except Exception as exc:
            self._debug_log(f"Cannot list Games dir {source_root}: {exc}")
            return

        self._debug_log(f"Games source {source_root}: {len(children)} entries")
        added = 0
        for child in children:
            if child.name.startswith("."):
                continue
            if child.is_dir():
                game = self._build_game_info(
                    record_title=child.name,
                    platform="PC",
                    game_title=child.name,
                    rom_hint=child.name,
                    aliases_raw="",
                    emulator="",
                )
                if game.game_title:
                    self._merge_library_instance(groups, source, game, child)
                    added += 1
                continue
            if child.suffix.casefold() in PC_GAME_FILE_EXTENSIONS:
                game = self._build_game_info(
                    record_title=child.stem,
                    platform="PC",
                    game_title=child.stem,
                    rom_hint=child.name,
                    aliases_raw="",
                    emulator="",
                )
                if game.game_title:
                    self._merge_library_instance(groups, source, game, child)
                    added += 1
        self._debug_log(f"Games scan done: {added} games added from {source_root}")

    def _scan_steam_source(self, source: ScanSource, groups: dict[str, dict[str, Any]]) -> None:
        steamapps = Path(source.path)
        if not steamapps.exists():
            self._debug_log(f"Steam source does not exist: {steamapps}")
            return

        manifests = list(steamapps.glob("appmanifest_*.acf"))
        self._debug_log(f"Steam source {steamapps}: {len(manifests)} manifests")
        added = 0

        for manifest_path in manifests:
            try:
                data = manifest_path.read_text(encoding="utf-8", errors="replace")
                app_name = self._parse_acf_value(data, "name")
                install_dir = self._parse_acf_value(data, "installdir")
                app_id = self._parse_acf_value(data, "appid")

                if not app_name or not install_dir:
                    self._debug_log(f"  Skip {manifest_path.name}: no name or installdir")
                    continue

                skip_names = {
                    "steamworks common redistributables",
                    "proton experimental",
                    "proton hotfix",
                    "proton easyantichieat runtime",
                    "proton battleye runtime",
                    "steam linux runtime",
                    "steam linux runtime - soldier",
                    "steam linux runtime - sniper",
                }
                if app_name.casefold().strip() in skip_names:
                    continue
                if app_name.casefold().startswith("proton ") and any(c.isdigit() for c in app_name):
                    continue

                game_dir = steamapps / "common" / install_dir
                game = self._build_game_info(
                    record_title=app_name,
                    platform="Steam",
                    game_title=app_name,
                    rom_hint=install_dir,
                    aliases_raw="",
                    emulator="",
                )
                if game.game_title:
                    self._merge_library_instance(groups, source, game, game_dir)
                    added += 1
            except Exception as exc:
                self._debug_log(f"  Steam manifest error {manifest_path.name}: {exc}")
        self._debug_log(f"Steam scan done: {added} games from {steamapps}")

    def _parse_acf_value(self, text: str, key: str) -> str:
        pattern = rf'"{re.escape(key)}"\s+"([^"]*)"'
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return ""

    def _guess_platform_from_rom_path(self, root: Path, file_path: Path) -> str:
        try:
            relative = file_path.relative_to(root)
            first = relative.parts[0].casefold() if relative.parts else ""
        except Exception:
            first = ""
        mapped = PLATFORM_FOLDER_MAP.get(first, "")
        disc_code = self._detect_disc_code(file_path.name)
        return self._normalize_platform(mapped, disc_code, str(file_path))

    def _default_emulator_for_platform(self, platform: str) -> str:
        return DEFAULT_EMULATOR_BY_PLATFORM.get(platform, "")

    def _merge_library_instance(self, groups: dict[str, dict[str, Any]], source: ScanSource, game: GuideGameInfo, path: Path) -> None:
        normalized_title = game.normalized_title or self._slugify_title(game.game_title)
        if not normalized_title:
            return
        disc_code = self._normalize_disc_code(game.disc_code) if game.disc_code else ""
        key = f"{game.platform}|{disc_code or normalized_title}"
        group = groups.get(key)
        if group is None:
            group = {
                "title": game.game_title,
                "normalized_title": normalized_title,
                "platform": game.platform,
                "disc_code": disc_code,
                "emulator": game.emulator,
                "aliases": [],
                "source_kinds": [],
                "storages": [],
                "source_labels": [],
                "source_ids": [],
                "primary_path": str(path),
                "paths": [],
                "instance_count": 0,
            }
            groups[key] = group

        aliases = self._dedupe_casefold(list(group["aliases"]) + list(game.aliases))
        if game.game_title and game.game_title.casefold() != group["title"].casefold() and len(game.game_title) > len(group["title"]):
            aliases = self._dedupe_casefold(aliases + [group["title"]])
            group["title"] = game.game_title
        group["aliases"] = [alias for alias in aliases if alias.casefold() != group["title"].casefold()][:16]

        if source.kind not in group["source_kinds"]:
            group["source_kinds"].append(source.kind)
        if source.storage not in group["storages"]:
            group["storages"].append(source.storage)
        if source.label not in group["source_labels"]:
            group["source_labels"].append(source.label)
        if source.id not in group["source_ids"]:
            group["source_ids"].append(source.id)
        path_text = str(path)
        if path_text not in group["paths"]:
            group["paths"].append(path_text)
        if not group["emulator"] and game.emulator:
            group["emulator"] = game.emulator
        group["instance_count"] += 1

    def _scan_steam_shortcuts(self) -> list[dict[str, Any]]:
        files = self._find_shortcut_files()
        entries: list[ShortcutEntry] = []
        seen: set[tuple[str, str]] = set()

        for path in files:
            try:
                data = path.read_bytes()
            except Exception as exc:
                decky.logger.warning(f"Impossible de lire {path}: {exc}")
                continue

            positions = [match.start() for match in re.finditer(re.escape(b"AppName\x00"), data)]
            for index, start in enumerate(positions):
                end = positions[index + 1] if index + 1 < len(positions) else len(data)
                block = data[start:end]
                app_name = self._extract_shortcut_value(block, b"AppName\x00")
                if not app_name:
                    continue

                exe = self._extract_shortcut_value(block, b"Exe\x00")
                start_dir = self._extract_shortcut_value(block, b"StartDir\x00")
                launch_options = self._extract_shortcut_value(block, b"LaunchOptions\x00")
                combined = " | ".join(part for part in [app_name, exe, start_dir, launch_options] if part)
                platform = self._guess_platform_from_shortcut(combined)
                emulator = self._guess_emulator_from_shortcut(combined)
                rom_hint = self._extract_rom_hint_from_shortcut(combined)
                game = self._build_game_info(
                    record_title=app_name,
                    platform=platform,
                    game_title=app_name,
                    rom_hint=rom_hint,
                    aliases_raw="",
                    emulator=emulator,
                )
                dedupe_key = (game.game_title.casefold(), game.disc_code.casefold())
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                entries.append(
                    ShortcutEntry(
                        app_name=app_name,
                        display_title=game.game_title,
                        platform=game.platform,
                        emulator=game.emulator,
                        disc_code=game.disc_code,
                        rom_hint=game.rom_hint or rom_hint,
                        source_path=str(path),
                    )
                )

        entries.sort(key=lambda item: (item.platform.casefold(), item.display_title.casefold()))
        return [asdict(item) for item in entries]

    def _find_shortcut_files(self) -> list[Path]:
        patterns = [
            Path.home() / ".local/share/Steam/userdata/*/config/shortcuts.vdf",
            Path.home() / ".steam/steam/userdata/*/config/shortcuts.vdf",
            Path("/home/deck/.local/share/Steam/userdata/*/config/shortcuts.vdf"),
            Path("/home/deck/.steam/steam/userdata/*/config/shortcuts.vdf"),
        ]
        found: list[Path] = []
        seen: set[Path] = set()
        for pattern in patterns:
            for candidate in pattern.parent.glob(pattern.name):
                if candidate.exists() and candidate not in seen:
                    seen.add(candidate)
                    found.append(candidate)
        return found

    def _extract_shortcut_value(self, block: bytes, marker: bytes) -> str:
        start = block.find(marker)
        if start < 0:
            return ""
        start += len(marker)
        end = block.find(b"\x00", start)
        if end < 0:
            end = len(block)
        raw = block[start:end]
        if not raw:
            return ""
        try:
            value = raw.decode("utf-8", errors="replace")
        except Exception:
            value = raw.decode("latin-1", errors="replace")
        return self._clean_inline_text(value)

    def _guess_emulator_from_shortcut(self, text: str) -> str:
        lowered = text.casefold()
        pairs = [
            ("pcsx2", "PCSX2"),
            ("duckstation", "DuckStation"),
            ("epsxe", "ePSXe"),
            ("retroarch", "RetroArch"),
            ("ppsspp", "PPSSPP"),
            ("vita3k", "Vita3K"),
            ("rpcs3", "RPCS3"),
            ("cemu", "Cemu"),
            ("dolphin", "Dolphin"),
            ("ryujinx", "Ryujinx"),
            ("yuzu", "Yuzu"),
            ("sudachi", "Sudachi"),
            ("desmume", "DeSmuME"),
            ("melonds", "melonDS"),
            ("citra", "Citra"),
            ("lime3ds", "Lime3DS"),
            ("mgba", "mGBA"),
            ("xemu", "xemu"),
            ("xenia", "Xenia"),
            ("ares", "Ares"),
        ]
        for needle, label in pairs:
            if needle in lowered:
                return label
        return ""

    def _guess_platform_from_shortcut(self, text: str) -> str:
        lowered = text.casefold()
        checks = [
            (("pcsx2", "playstation 2", "/ps2/", "\\ps2\\"), "PS2"),
            (("duckstation", "epsxe", "psx", "playstation 1", "/psx/", "/ps1/"), "PS1"),
            (("ppsspp", "/psp/", "\\psp\\"), "PSP"),
            (("vita3k", "ps vita"), "PS Vita"),
            (("rpcs3", "/ps3/", "\\ps3\\"), "PS3"),
            (("switch", "ryujinx", "yuzu", "sudachi"), "Switch"),
            (("cemu", "wii u", "/wiiu/"), "Wii U"),
            (("dolphin", "gamecube", "/gc/", "/gamecube/"), "GameCube"),
            (("wii", "/wii/"), "Wii"),
            (("melonds", "desmume", "/nds/", "/ds/"), "DS"),
            (("citra", "lime3ds", "/3ds/"), "3DS"),
            (("mgba", "/gba/"), "GBA"),
            (("gbc", "/gbc/"), "GBC"),
            (("/gb/",), "GB"),
            (("dreamcast", "flycast"), "Dreamcast"),
            (("saturn", "mednafen saturn"), "Saturn"),
            (("megadrive", "mega drive", "genesis"), "Mega Drive"),
            (("xemu", "original xbox"), "Xbox"),
            (("xenia", "xbox 360"), "Xbox 360"),
            (("retroarch",), "Retro"),
            (("steam",), "Steam"),
        ]
        for needles, label in checks:
            if any(needle in lowered for needle in needles):
                return label
        disc_code = self._detect_disc_code(text)
        return self._normalize_platform("", disc_code, text)

    def _extract_rom_hint_from_shortcut(self, text: str) -> str:
        patterns = [
            r'["\']([^"\']+\.(?:iso|bin|cue|img|mdf|nrg|chd|cso|pbp|rvz|wbfs|gcz|7z|zip|rar|nes|sfc|smc|gba|gbc|gb|nds|3ds))["\']',
            r'([^\s]+\.(?:iso|bin|cue|img|mdf|nrg|chd|cso|pbp|rvz|wbfs|gcz|7z|zip|rar|nes|sfc|smc|gba|gbc|gb|nds|3ds))',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            if matches:
                candidate = max(matches, key=len)
                return Path(candidate).name
        disc_code = self._detect_disc_code(text)
        if disc_code:
            return disc_code
        return ""

    def _guide_path(self, guide_id: str) -> Path:
        return self._guides_dir / f"{guide_id}.json"

    def _summary_dict(self, record: GuideRecord) -> dict[str, Any]:
        payload = self._record_to_payload(record)
        payload.pop("content", None)
        return payload

    def _describe_section_label(self, record: GuideRecord, index: int) -> str:
        if index < 0:
            return "texte complet"
        if 0 <= index < len(record.sections):
            return record.sections[index].title
        return "position inconnue"

    def _record_to_payload(self, record: GuideRecord) -> dict[str, Any]:
        payload = asdict(record)
        payload["section_count"] = len(record.sections)
        payload["page_count"] = len(record.source_pages) or 1
        payload["resume_label"] = self._describe_section_label(record, record.progress.last_section_index)
        payload["bookmark_label"] = self._describe_section_label(record, record.progress.bookmark_section_index)
        payload["has_resume"] = bool(record.progress.last_opened_at)
        payload["has_bookmark"] = bool(record.progress.bookmark_set_at)
        return payload

    def _load_all_records(self) -> list[GuideRecord]:
        records: list[GuideRecord] = []
        for path in self._guides_dir.glob("*.json"):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                records.append(self._record_from_payload(payload))
            except Exception as exc:
                decky.logger.error(f"Failed to load guide file {path.name}: {exc}")
        return records

    def _load_record_or_raise(self, guide_id: str) -> GuideRecord:
        path = self._guide_path(guide_id)
        if not path.exists():
            raise ValueError("Guide introuvable")
        payload = json.loads(path.read_text(encoding="utf-8"))
        return self._record_from_payload(payload)

    def _record_from_payload(self, payload: dict[str, Any]) -> GuideRecord:
        raw_sections = payload.get("sections") or []
        sections: list[GuideSection] = []
        for item in raw_sections:
            try:
                sections.append(
                    GuideSection(
                        title=str(item.get("title", "Section")),
                        line_start=int(item.get("line_start", 0)),
                        line_end=int(item.get("line_end", 0)),
                        heading_level=int(item.get("heading_level", 0) or 0),
                        is_preformatted=bool(item.get("is_preformatted", False)),
                    )
                )
            except Exception:
                continue

        raw_pages = payload.get("source_pages") or []
        source_pages: list[GuideSourcePage] = []
        for item in raw_pages:
            try:
                source_pages.append(
                    GuideSourcePage(
                        title=str(item.get("title", "Page")),
                        url=str(item.get("url", "")),
                    )
                )
            except Exception:
                continue

        raw_flags = payload.get("important_flags") or []
        important_flags: list[GuideFlag] = []
        for item in raw_flags:
            try:
                important_flags.append(GuideFlag(
                    category=str(item.get("category", "")),
                    section_index=int(item.get("section_index", -1)),
                    snippet=str(item.get("snippet", "")),
                    matched=str(item.get("matched", "")),
                ))
            except Exception:
                continue

        raw_progress = payload.get("progress") or {}

        # Parse named bookmarks
        named_bookmarks: list[NamedBookmark] = []
        for item in raw_progress.get("named_bookmarks") or []:
            try:
                named_bookmarks.append(NamedBookmark(
                    bookmark_id=str(item.get("bookmark_id", "")),
                    name=str(item.get("name", "")),
                    section_index=int(item.get("section_index", -1)),
                    scroll_fraction=max(0.0, min(float(item.get("scroll_fraction", 0.0)), 1.0)),
                    created_at=str(item.get("created_at", "")),
                ))
            except Exception:
                continue

        # Parse section notes
        section_notes: list[GuideSectionNote] = []
        for item in raw_progress.get("section_notes") or []:
            try:
                section_notes.append(GuideSectionNote(
                    section_index=int(item.get("section_index", -1)),
                    done=bool(item.get("done", False)),
                    flagged=bool(item.get("flagged", False)),
                    note=str(item.get("note", ""))[:MAX_NOTE_LENGTH],
                    updated_at=str(item.get("updated_at", "")),
                ))
            except Exception:
                continue

        raw_hidden = raw_progress.get("hidden_section_titles") or []
        hidden_titles: list[str] = []
        for item in raw_hidden:
            try:
                s = str(item).strip()
                if s and s not in hidden_titles:
                    hidden_titles.append(s)
            except Exception:
                continue

        progress = GuideReadingProgress(
            last_section_index=int(raw_progress.get("last_section_index", -1)),
            last_opened_at=str(raw_progress.get("last_opened_at", "")),
            font_scale=max(0.85, min(float(raw_progress.get("font_scale", 1.0)), 2.0)),
            bookmark_section_index=int(raw_progress.get("bookmark_section_index", -1)),
            bookmark_set_at=str(raw_progress.get("bookmark_set_at", "")),
            last_scroll_fraction=max(0.0, min(float(raw_progress.get("last_scroll_fraction", 0.0)), 1.0)),
            bookmark_scroll_fraction=max(0.0, min(float(raw_progress.get("bookmark_scroll_fraction", 0.0)), 1.0)),
            named_bookmarks=named_bookmarks,
            section_notes=section_notes,
            hidden_section_titles=hidden_titles,
        )

        raw_game = payload.get("game") or {}
        game = self._build_game_info(
            record_title=str(payload.get("title", "Guide")),
            platform=str(raw_game.get("platform", payload.get("platform", "Autre"))),
            game_title=str(raw_game.get("game_title", payload.get("game_title", ""))),
            rom_hint=str(raw_game.get("rom_hint", payload.get("rom_hint", ""))),
            aliases_raw="\n".join(raw_game.get("aliases", []) or payload.get("aliases", []) or []),
            emulator=str(raw_game.get("emulator", payload.get("emulator", ""))),
        )
        if raw_game.get("disc_code"):
            game.disc_code = self._normalize_disc_code(str(raw_game.get("disc_code", ""))) or game.disc_code
        if raw_game.get("normalized_title"):
            game.normalized_title = self._slugify_title(str(raw_game.get("normalized_title", game.normalized_title)))
        if raw_game.get("source"):
            game.source = str(raw_game.get("source", game.source))

        content = str(payload.get("content", ""))
        if not sections and content:
            sections = self._build_sections(content)
        if not source_pages:
            fallback_title = str(payload.get("title", "Guide"))
            fallback_url = str(payload.get("url", ""))
            source_pages = [GuideSourcePage(title=fallback_title, url=fallback_url)] if fallback_url else []

        max_section_index = len(sections) - 1
        if max_section_index >= 0:
            progress.last_section_index = max(-1, min(progress.last_section_index, max_section_index))
            progress.bookmark_section_index = max(-1, min(progress.bookmark_section_index, max_section_index))
        else:
            progress.last_section_index = -1
            progress.bookmark_section_index = -1

        return GuideRecord(
            id=str(payload.get("id", "")),
            title=str(payload.get("title", "Guide")),
            url=str(payload.get("url", "")),
            site=str(payload.get("site", self._site_name(str(payload.get("url", ""))))),
            extractor=str(payload.get("extractor", "generic")),
            saved_at=str(payload.get("saved_at", "")),
            word_count=int(payload.get("word_count", len(content.split()))),
            size_bytes=int(payload.get("size_bytes", len(content.encode("utf-8")))),
            snippet=str(payload.get("snippet", self._make_snippet(content))),
            content=content,
            source_charset=str(payload.get("source_charset", "utf-8")),
            game=game,
            sections=sections,
            source_pages=source_pages,
            progress=progress,
            detection_method=str(payload.get("detection_method", "")),
            important_flags=important_flags,
        )

    def _build_game_info(
        self,
        record_title: str,
        platform: str = "Autre",
        game_title: str = "",
        rom_hint: str = "",
        aliases_raw: str = "",
        emulator: str = "",
    ) -> GuideGameInfo:
        manual_title = self._clean_game_title(game_title)
        cleaned_rom_hint = rom_hint.strip()
        inferred_title = manual_title or self._clean_game_title(cleaned_rom_hint) or self._clean_game_title(record_title)
        disc_code = self._detect_disc_code(" | ".join([record_title, game_title, rom_hint]))
        normalized_platform = self._normalize_platform(platform, disc_code, " | ".join([record_title, rom_hint]))
        aliases = self._parse_aliases(aliases_raw)
        generated_aliases = self._generate_title_aliases(inferred_title)
        for candidate in [self._clean_game_title(cleaned_rom_hint), self._clean_game_title(record_title)]:
            if candidate and candidate.casefold() != inferred_title.casefold():
                generated_aliases.append(candidate)
        merged_aliases = self._dedupe_casefold([alias for alias in aliases + generated_aliases if alias])
        merged_aliases = [alias for alias in merged_aliases if alias.casefold() != inferred_title.casefold()]
        source = "manual" if manual_title or cleaned_rom_hint or aliases_raw.strip() or emulator.strip() else "inferred"
        return GuideGameInfo(
            platform=normalized_platform,
            game_title=inferred_title or "Guide sans jeu lié",
            normalized_title=self._slugify_title(inferred_title),
            aliases=merged_aliases[:12],
            disc_code=disc_code,
            rom_hint=cleaned_rom_hint,
            emulator=emulator.strip(),
            source=source,
        )

    def _normalize_platform(self, platform: str, disc_code: str = "", context: str = "") -> str:
        text = (platform or "").strip().casefold()
        if not text and disc_code.startswith(("SLES-", "SLUS-", "SCES-", "SCUS-", "SLPM-", "SLPS-", "SLAJ-", "SCPS-", "SCED-")):
            return "PS2"
        if not text:
            context_text = context.casefold()
            if "playstation 2" in context_text or "ps2" in context_text:
                return "PS2"
            return "Autre"
        aliases = {
            "ps2": "PS2",
            "playstation 2": "PS2",
            "sony playstation 2": "PS2",
            "ps1": "PS1",
            "psx": "PS1",
            "playstation": "PS1",
            "psp": "PSP",
            "ps vita": "PS Vita",
            "psvita": "PS Vita",
            "vita": "PS Vita",
            "ps3": "PS3",
            "ps4": "PS4",
            "ps5": "PS5",
            "steam": "Steam",
            "pc": "PC",
            "non-steam": "PC",
            "windows": "PC",
            "switch": "Switch",
            "nintendo switch": "Switch",
            "gamecube": "GameCube",
            "gc": "GameCube",
            "wii": "Wii",
            "wii u": "Wii U",
            "wiiu": "Wii U",
            "gba": "GBA",
            "gbc": "GBC",
            "gb": "GB",
            "nds": "DS",
            "ds": "DS",
            "n3ds": "3DS",
            "3ds": "3DS",
            "snes": "SNES",
            "sfc": "SNES",
            "super nintendo": "SNES",
            "super famicom": "SNES",
            "nes": "NES",
            "famicom": "NES",
            "n64": "N64",
            "nintendo 64": "N64",
            "dreamcast": "Dreamcast",
            "saturn": "Saturn",
            "megadrive": "Mega Drive",
            "mega drive": "Mega Drive",
            "genesis": "Mega Drive",
            "master system": "Master System",
            "sms": "Master System",
            "game gear": "Game Gear",
            "gamegear": "Game Gear",
            "turbografx": "TurboGrafx-16",
            "turbografx-16": "TurboGrafx-16",
            "pc engine": "TurboGrafx-16",
            "neo geo": "Neo Geo",
            "neogeo": "Neo Geo",
            "msx": "MSX",
            "dos": "DOS",
            "scummvm": "ScummVM",
            "xbox": "Xbox",
            "xbox 360": "Xbox 360",
            "xbox one": "Xbox One",
            "series": "Xbox Series",
            "retro": "Retro",
            "autre": "Autre",
        }
        return aliases.get(text, platform.strip() or "Autre")

    def _detect_disc_code(self, text: str) -> str:
        match = re.search(r"\b(SLES|SLUS|SCES|SCUS|SLPM|SLPS|SLAJ|SCPS|SCED)[-_ ]?(\d{3,5})\b", text, flags=re.IGNORECASE)
        if not match:
            return ""
        return f"{match.group(1).upper()}-{match.group(2)}"

    def _normalize_disc_code(self, value: str) -> str:
        return self._detect_disc_code(value) or value.strip().upper()

    def _clean_game_title(self, title: str) -> str:
        text = self._clean_inline_text(title)
        if not text:
            return ""
        # Remove common separators and everything after
        text = re.sub(r"\s*[|–—].*$", "", text)
        text = re.sub(r"\s*-\s*(guide|walkthrough|faq|faqs?|solution|soluce|cheminement).*$", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*-\s*(playstation ?[1-5]?|ps[1-5]|psp|pc|switch|gamefaqs|rpgsoluce).*$", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\bBy\b.*$", "", text, flags=re.IGNORECASE)

        # Remove file extensions (comprehensive)
        text = re.sub(
            r"\.(?:iso|bin|cue|img|mdf|nrg|chd|cso|pbp|rvz|wbfs|gcz|gcm|"
            r"7z|zip|rar|exe|lnk|cci|cxi|cia|3dsx|nds|3ds|gba|gbc|gb|"
            r"nes|sfc|smc|z64|n64|v64|md|gen|xci|nsp|vpk|elf|m3u|"
            r"pce|ws|wsc|ngp|ngc|a26|d64)$",
            "", text, flags=re.IGNORECASE,
        )

        # Remove bracketed tags [PAL] [NTSC-U] [PS2] [FR] etc
        text = re.sub(
            r"\[(?:"
            r"PS[1-5]|PSP|PSX|PC|NSW|SWITCH|GC|GBA|GBC|GB|NDS|3DS|N64|SNES|NES|DREAMCAST|WII(?:\s*U)?|"
            r"USA?|EUR(?:OPE)?|JPN|JAPAN|FRANCE|GERMANY|SPAIN|ITALY|KOREA|ASIA|WORLD|BRAZIL|AUSTRALIA|"
            r"PAL|NTSC(?:-[UJ])?|SECAM|"
            r"FR|EN|ES|DE|IT|PT|NL|SV|JA|KO|ZH|"
            r"Disc\s*\d+|CD\s*\d+|DVD\s*\d+|"
            r"[A-Z]{4}-?\d{3,5}|"
            r"v\d+(?:\.\d+)*"
            r")\]",
            "", text, flags=re.IGNORECASE,
        )

        # Remove parenthesized tags (France) (USA) (Disc 1) (v1.1) (En,Fr) (Europe,Australia) etc
        _region_word = (
            r"(?:USA?|Europe|Japan|France|Germany|Spain|Italy|Korea|Asia|World|Brazil|Australia|International|"
            r"NTSC(?:-[UJ])?|PAL|SECAM|[UEFJGSIKC]|"
            r"FR|EN|ES|DE|IT|PT|NL|SV|JA|KO|ZH|"
            r"En|Fr|De|Es|It|Pt|Nl|Sv|Ja|Ko|Zh|"
            r"Disc\s*\d+|CD\s*\d+|DVD\s*\d+|"
            r"v\d+(?:\.\d+)*|Rev\s*\d+|"
            r"Beta|Proto|Sample|Demo|Unl|Pirate)"
        )
        text = re.sub(
            r"\(" + _region_word + r"(?:\s*[,+&/]\s*" + _region_word + r")*\)",
            "", text, flags=re.IGNORECASE,
        )

        # Remove scene group tags in parens (all-caps or CamelCase short names)
        text = re.sub(r"\([A-Z][A-Za-z0-9]{1,20}\)", "", text)

        # Remove parenthesized content that is purely comma-separated 2-3 letter codes (language/region lists)
        text = re.sub(r"\(\s*[A-Za-z]{2,3}(?:\s*,\s*[A-Za-z]{2,3}){2,}\s*(?:\.{2,3})?\s*\)", "", text)

        # Remove disc codes
        text = re.sub(r"\b(?:SLES|SLUS|SCES|SCUS|SLPM|SLPS|SLAJ|SCPS|SCED)[-_ ]?\d{3,5}\b", "", text, flags=re.IGNORECASE)

        # Remove trailing bare platform/region/format tags (e.g. "Suikoden III NTSC USA PS2")
        text = re.sub(
            r"(?:\s+(?:NTSC(?:-[UJ])?|PAL|SECAM|USA?|EUR(?:OPE)?|JPN|JAPAN|FRANCE|"
            r"PS[1-5]|PSP|PSX|PC|GC|GBA|GBC|SNES|NES|N64|NDS|3DS|DREAMCAST|WII(?:\s*U)?|SWITCH|NSW))+\s*$",
            "", text, flags=re.IGNORECASE,
        )

        # Remove leading numbering artifacts from scene releases (0217 - ..., 3DS0310 - ...)
        text = re.sub(r"^(?:\d{3,4}|[A-Z0-9]{2,5}\d{3,5})\s*-\s*", "", text)

        # Cleanup
        text = re.sub(r"\(\s*\)", "", text)
        text = re.sub(r"\[\s*\]", "", text)
        text = re.sub(r"\s{2,}", " ", text)
        text = text.strip(" -|:;,.")

        # Replace dots used as word separators (but not in version numbers or abbreviations)
        if text.count(".") >= 2 and not re.search(r"\d\.\d", text):
            text = re.sub(r"\.(?=[A-Za-z])", " ", text)
            text = text.strip(". ")

        # Remove site suffixes
        text = re.sub(r"\s*-?\s*(?:SteamRIP|FitGirl|DODI|GOG|ElAmigos|PLAZA|CODEX|SKIDROW|RELOADED|TiNYiSO|RUNE)(?:\.com)?\s*$", "", text, flags=re.IGNORECASE)

        text = re.sub(r"\s{2,}", " ", text)
        return text.strip(" -|:;,.")

    def _parse_aliases(self, aliases_raw: str) -> list[str]:
        values = re.split(r"[\n,;|]+", aliases_raw or "")
        cleaned = [self._clean_game_title(value) for value in values]
        return [value for value in self._dedupe_casefold(cleaned) if value]

    def _generate_title_aliases(self, title: str) -> list[str]:
        if not title:
            return []
        variants = [title]
        roman_to_arabic = {
            "X": "10",
            "IX": "9",
            "VIII": "8",
            "VII": "7",
            "VI": "6",
            "V": "5",
            "IV": "4",
            "III": "3",
            "II": "2",
            "I": "1",
        }
        for roman, arabic in roman_to_arabic.items():
            if re.search(rf"\b{roman}\b", title, flags=re.IGNORECASE):
                variants.append(re.sub(rf"\b{roman}\b", arabic, title, flags=re.IGNORECASE))
        for roman, arabic in roman_to_arabic.items():
            if re.search(rf"\b{arabic}\b", title):
                variants.append(re.sub(rf"\b{arabic}\b", roman, title))
        return [self._clean_game_title(value) for value in variants if value]

    def _slugify_title(self, value: str) -> str:
        value = value.casefold().strip()
        value = re.sub(r"[^a-z0-9]+", "-", value)
        return value.strip("-")

    def _dedupe_casefold(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for value in values:
            normalized = value.casefold().strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            deduped.append(value.strip())
        return deduped

    def _write_record(self, record: GuideRecord) -> None:
        # v0.43.20: ATOMIC write. Previously a direct write_text — if a reader
        # (or save_progress, fired when opening a guide) touched the file mid-write
        # (e.g. opening a guide while its background import was still writing), it
        # saw a truncated JSON → "guide coupé et illisible". Write to a temp file
        # then os.replace() (atomic on Windows + Linux): readers always see either
        # the complete old file or the complete new one, never a partial.
        path = self._guide_path(record.id)
        tmp = path.with_name(path.name + ".tmp")
        tmp.write_text(
            json.dumps(self._record_to_payload(record), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        os.replace(str(tmp), str(path))

    def _search_site(
        self,
        site_key: str,
        site_config: dict[str, Any],
        query: str,
        platform: str,
    ) -> list[GuideSearchResult]:
        domain = str((site_config.get("domains") or [""])[0]).strip()
        if not domain:
            return []

        keywords = self._build_search_keywords(site_key, site_config, query, platform)
        search_query = self._build_duckduckgo_search_url(domain, keywords)
        self._debug_log(f"  search {site_key}: q='{search_query[:80]}'")

        try:
            html_text, _ = self._download_search_page(search_query)
            self._debug_log(f"  search {site_key}: got {len(html_text)} chars")
        except Exception as exc:
            self._debug_log(f"  search {site_key} FAILED: {exc}")
            return []

        if _HAS_HTML_PARSER:
            parser = _DuckDuckGoSearchParser()
            parser.feed(html_text)
            parser.close()
            parsed_results = parser.results
        else:
            parsed_results = _regex_parse_ddg_results(html_text)
        self._debug_log(f"  search {site_key}: parsed {len(parsed_results)} raw results")

        if not parsed_results:
            title_match = re.search(r"<title[^>]*>(.*?)</title>", html_text, flags=re.IGNORECASE | re.DOTALL)
            page_title = title_match.group(1).strip() if title_match else "(no title)"
            snippet = re.sub(r"<[^>]+>", " ", html_text[:800])
            snippet = re.sub(r"\s+", " ", snippet).strip()[:300]
            self._debug_log(f"  DDG 0 results - page title: {page_title}")
            self._debug_log(f"  DDG snippet: {snippet[:150]}")
            has_form = "name=\"q\"" in html_text or "name='q'" in html_text
            has_noresults = "no results" in html_text.casefold() or "aucun résultat" in html_text.casefold()
            self._debug_log(f"  DDG has_form={has_form} has_noresults={has_noresults} len={len(html_text)}")
            if "robot" in html_text.casefold() or "captcha" in html_text.casefold() or "blocked" in html_text.casefold():
                self._debug_log(f"  DDG rate limit/CAPTCHA detected!")
                return []
            return []

        allowed_domains = [str(item).strip().casefold() for item in site_config.get("domains", []) if str(item).strip()]
        site_label = str(site_config.get("label", domain))
        results: list[GuideSearchResult] = []
        for parsed in parsed_results:
            normalized_url = self._normalize_search_result_url(parsed.url)
            if not normalized_url:
                continue
            hostname = (urlparse(normalized_url).hostname or "").casefold()
            if allowed_domains and not any(hostname == item or hostname.endswith(f".{item}") for item in allowed_domains):
                continue
            if not self._looks_like_guide_result(site_key, parsed.title, normalized_url, parsed.snippet):
                continue
            results.append(
                GuideSearchResult(
                    title=self._clean_inline_text(parsed.title),
                    url=normalized_url,
                    site=site_label,
                    snippet=self._clean_inline_text(parsed.snippet),
                    score=self._score_search_result(site_key, query, platform, parsed.title, normalized_url, parsed.snippet),
                )
            )

        results.sort(key=lambda item: (-item.score, item.title.casefold()))
        return results[:SEARCH_RESULTS_PER_SITE]

    def _build_search_keywords(self, site_key: str, site_config: dict[str, Any], query: str, platform: str) -> str:
        platform_token = "" if platform in {"", "Autre", "Tous"} else platform
        default_keywords = str(site_config.get("keywords", "guide walkthrough"))
        parts = [query.strip()]
        if platform_token:
            parts.append(platform_token)
        parts.append(default_keywords)
        if site_key == "rpgsoluce" and platform_token == "PS2":
            parts.append("playstation 2")
        return " ".join(part for part in parts if part).strip()

    def _build_duckduckgo_search_url(self, domain: str, keywords: str) -> str:
        return f"site:{domain} {keywords}"

    def _download_search_page(self, query: str, lang: str = "fr") -> tuple[str, str]:
        if not _HAS_URLLIB:
            raise ValueError("Module réseau indisponible dans cette sandbox Python")
        context = self._make_ssl_context()

        # Language headers & UI locale per engine
        if lang == "en":
            accept_lang = "en-US,en;q=0.9"
            startpage_lui = "english"
            google_hl = "en"
            bing_setlang = "en"
            ddg_kl = "us-en"
        else:
            accept_lang = "fr-FR,fr;q=0.9,en;q=0.7"
            startpage_lui = "french"
            google_hl = "fr"
            bing_setlang = "fr"
            ddg_kl = "fr-fr"

        # Try multiple search engines in order. First one that returns real results wins.
        # Startpage first because testing showed it's the only one returning usable results.
        attempts = [
            # Startpage (proxies Google, returns actual results)
            {
                "name": "startpage",
                "method": "GET",
                "url": "https://www.startpage.com/sp/search?" + urllib.parse.urlencode({
                    "query": query, "cat": "web", "lui": startpage_lui,
                }),
                "data": None,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": accept_lang,
                    "Accept-Encoding": "identity",
                },
            },
            # Brave Search HTML (less aggressive anti-bot than Google/Bing)
            {
                "name": "brave",
                "method": "GET",
                "url": "https://search.brave.com/search?" + urllib.parse.urlencode({
                    "q": query, "source": "web",
                }),
                "data": None,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": accept_lang,
                    "Accept-Encoding": "identity",
                },
            },
            # Google HTML (backup)
            {
                "name": "google",
                "method": "GET",
                "url": "https://www.google.com/search?" + urllib.parse.urlencode({
                    "q": query, "hl": google_hl, "num": "20", "safe": "off",
                }),
                "data": None,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": accept_lang,
                    "Accept-Encoding": "identity",
                },
            },
            # Bing HTML
            {
                "name": "bing",
                "method": "GET",
                "url": "https://www.bing.com/search?" + urllib.parse.urlencode({
                    "q": query, "setlang": bing_setlang, "cc": bing_setlang,
                }),
                "data": None,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": accept_lang,
                    "Accept-Encoding": "identity",
                },
            },
            # DDG HTML as last resort
            {
                "name": "ddg_html",
                "method": "POST",
                "url": "https://html.duckduckgo.com/html/",
                "data": urllib.parse.urlencode({"q": query, "kl": ddg_kl}).encode("utf-8"),
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": accept_lang,
                    "Accept-Encoding": "identity",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": "https://html.duckduckgo.com/",
                    "Origin": "https://html.duckduckgo.com",
                },
            },
        ]

        last_error = None
        for attempt in attempts:
            try:
                request = urllib.request.Request(
                    attempt["url"],
                    data=attempt["data"],
                    headers=attempt["headers"],
                    method=attempt["method"],
                )
                with urllib.request.urlopen(request, timeout=20, context=context) as response:
                    data = response.read(2_000_000)
                    charset = response.headers.get_content_charset() or "utf-8"
                    try:
                        text = data.decode(charset, errors="replace")
                    except LookupError:
                        text = data.decode("utf-8", errors="replace")
                    # CAPTCHA check
                    if self._looks_like_captcha(text):
                        self._debug_log(f"  [{attempt['name']}] CAPTCHA detected, trying next engine")
                        continue
                    # Quick check: does this response mention ANY known guide domain?
                    mentions = sum(
                        text.casefold().count(d)
                        for d in ["gamefaqs", "rpgsoluce", "ign.com", "jeuxvideo",
                                  "neoseeker", "strategywiki", "vally8", "darklevel"]
                    )
                    self._debug_log(f"  [{attempt['name']}] {attempt['method']} {len(text)} chars, domain_mentions={mentions}")
                    if mentions == 0 and len(text) < 80000:
                        self._debug_log(f"  [{attempt['name']}] looks empty/blocked, trying next engine")
                        continue
                    self._last_search_engine = attempt["name"]
                    return text, charset
            except urllib.error.HTTPError as exc:
                self._debug_log(f"  [{attempt['name']}] HTTP {exc.code}")
                last_error = exc
            except Exception as exc:
                self._debug_log(f"  [{attempt['name']}] {type(exc).__name__}: {exc}")
                last_error = exc

        if last_error:
            raise last_error
        raise ValueError("Aucun moteur de recherche n'a répondu")

    def _make_ssl_context(self):
        """Create SSL context. Falls back to unverified if default context fails (Decky sandbox)."""
        try:
            ctx = ssl.create_default_context()
            stats = ctx.cert_store_stats()
            if stats.get("x509_ca", 0) > 0:
                return ctx
        except Exception:
            pass
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    def _normalize_search_result_url(self, value: str) -> str:
        raw_value = (value or "").strip()
        if not raw_value:
            return ""
        if raw_value.startswith("//"):
            raw_value = f"https:{raw_value}"
        parsed = urlparse(raw_value)
        if parsed.scheme not in ALLOWED_SCHEMES and not raw_value.startswith("/"):
            return ""
        if parsed.netloc.endswith("duckduckgo.com") or (not parsed.netloc and parsed.path.startswith("/l/")):
            target = parse_qs(parsed.query).get("uddg", [""])[0]
            if target:
                return target
        return raw_value

    def _parse_search_html(self, html_text: str) -> list[GuideSearchResult]:
        """v0.43.9: parse a SERP HTML page with both the stdlib and the regex
        parser, returning the union. Extracted so the general and the FR-discovery
        passes share one code path."""
        parsed: list[GuideSearchResult] = []
        if _HAS_HTML_PARSER:
            try:
                stdlib_parser = _DuckDuckGoSearchParser()
                stdlib_parser.feed(html_text)
                stdlib_parser.close()
                parsed.extend(stdlib_parser.results)
            except Exception:
                pass
        parsed.extend(_regex_parse_ddg_results(html_text))
        return parsed

    # v0.43.10: French guide sites (rpgsoluce, vally8, darklevel) and jeuxvideo
    # split ONE guide across many per-chapter pages (chapitre-1, chapitre-2,
    # index…). A site:-restricted search surfaces ALL of them, cluttering the
    # results with fragments of the same guide. These collapse fragment URLs back
    # to their guide root (the page to import — the BFS crawl then pulls the rest).
    _FRAGMENT_SITE_HOSTS = ("rpgsoluce.com", "vally8.free.fr", "jeuxvideo.com")
    _FRAGMENT_SEG_RE = re.compile(
        r"^(?:chapit?res?|parties?|parts?|chapters?|pages?|sections?|episodes?|ep|"
        r"soluces?|solutions?|walkthroughs?|etapes?|steps?|niveaux?|levels?|"
        r"actes?|acts?|discs?|cd|index)[-_]?\d*(?:\.html?)?$"
        r"|^\d{1,3}(?:\.html?)?$",
        re.IGNORECASE,
    )

    def _guide_base_path(self, host: str, path: str) -> str:
        """v0.43.10: map a guide URL path to its guide-root key so per-chapter
        fragments of the same guide collapse together. Uses PER-SITE root rules
        (verified against the real sites) — far more reliable than guessing which
        trailing segment is a "chapter", because these guides nest arbitrarily
        deep (/soluces/ps1/suikoden/runes/runes-magies.htm, /jeux/x/soluce7.php).
          rpgsoluce  /soluces/<platform>/<game>/... -> /soluces/<platform>/<game>
          vally8/dl  /jeux/<game>/soluce7.php       -> /jeux/<game>
          jeuxvideo  /wikis-soluce-astuces/<id-game>/... -> /wikis-soluce-astuces/<id-game>
        """
        h = host.casefold()
        segs = [s for s in path.split("/") if s]
        if not segs:
            return path
        # rpgsoluce: root = soluces/platform/game (first 3 segments)
        if "rpgsoluce.com" in h and segs[0].lower() == "soluces":
            return "/" + "/".join(segs[:3])
        # vally8: root = jeux/game (first 2 segments)
        if "vally8.free.fr" in h and segs[0].lower() == "jeux":
            return "/" + "/".join(segs[:2])
        # jeuxvideo wiki: collapse every sub-page to .../wikis-soluce-astuces/<id-game>
        if "wikis-soluce-astuces" in segs:
            i = segs.index("wikis-soluce-astuces")
            return "/" + "/".join(segs[: i + 2])
        # generic fallback: strip ONE trailing chapter/page/index fragment
        # (guarded so a top-level game slug is never stripped).
        if len(segs) >= 2 and self._FRAGMENT_SEG_RE.match(segs[-1]):
            segs = segs[:-1]
        return "/" + "/".join(segs)

    def _collapse_guide_fragments(self, results: list[GuideSearchResult]) -> list[GuideSearchResult]:
        """v0.43.10: for the fragment-heavy French sites, keep ONE result per
        guide (the root/index page) instead of one per chapter. Non-fragment
        sites (GameFAQs, IGN, Neoseeker…) pass through untouched — each URL is
        its own guide there. The kept representative is the shortest-path member
        (closest to the root), carrying the group's best score so it ranks well."""
        groups: dict[tuple[str, str], list[GuideSearchResult]] = {}
        order: list[tuple[str, str]] = []
        for r in results:
            pu = urlparse(r.url)
            host = (pu.hostname or "").casefold()
            is_fragment_site = any(host == d or host.endswith(f".{d}") for d in self._FRAGMENT_SITE_HOSTS)
            # Fragment sites group by guide root; others stay unique (full URL).
            key = (host, self._guide_base_path(host, pu.path)) if is_fragment_site else (host, r.url)
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(r)

        def nseg(u: str) -> int:
            return len([s for s in urlparse(u).path.split("/") if s])

        out: list[GuideSearchResult] = []
        for key in order:
            members = groups[key]
            if len(members) == 1:
                out.append(members[0])
                continue
            best_score = max(m.score for m in members)
            host, base = key

            def at_root(u: str) -> bool:
                segs = [s for s in urlparse(u).path.split("/") if s]
                if segs and re.match(r"^index(?:\.\w+)?$", segs[-1], re.IGNORECASE):
                    segs = segs[:-1]  # an index.* page counts as the guide root
                return ("/" + "/".join(segs)) == base

            root_members = [m for m in members if at_root(m.url)]
            if root_members:
                # A real root/index URL was returned — keep it as-is.
                rep = max(root_members, key=lambda r: r.score)
                rep_url, rep_title = rep.url, rep.title
            else:
                # Only deep chapter pages were returned. Keep the shortest member
                # as-is by default (safe, a real URL). ONLY jeuxvideo gets its root
                # reconstructed: JV wiki roots are canonical/browsable and search
                # often returns just sub-pages. rpgsoluce/vally8 dir roots aren't
                # always browsable (.php/.htm indices), so don't synthesize those.
                rep = min(members, key=lambda r: (nseg(r.url), -r.score))
                if "jeuxvideo.com" in host:
                    pu = urlparse(rep.url)
                    rep_url = f"{pu.scheme}://{pu.netloc}{base}/" if pu.scheme and pu.netloc else rep.url
                    rep_title = re.sub(
                        r"\s*[-–—:|]?\s*(?:chapit?re|partie|chapter|part|page|[ée]tape|episode|ch)\s*\d+.*$",
                        "", rep.title, flags=re.IGNORECASE,
                    ).strip() or rep.title
                else:
                    rep_url, rep_title = rep.url, rep.title
            out.append(GuideSearchResult(
                title=rep_title, url=rep_url, site=rep.site, snippet=rep.snippet, score=best_score,
                game=rep.game or self._game_name_from_url(rep_url),  # v0.43.35: keep/recompute
            ))
        return out

    # v0.43.9: language buckets for search scoring/discovery. Mirrors the sets in
    # _normalize_search_language; kept here so the scorer can bias by language.
    _FRENCH_SITE_KEYS = {"rpgsoluce", "jeuxvideo", "vally8"}
    _ENGLISH_SITE_KEYS = {"gamefaqs", "ign", "neoseeker"}

    def _looks_like_guide_result(self, site_key: str, title: str, url: str, snippet: str) -> bool:
        haystack = f"{title} {url} {snippet}".casefold()
        if site_key == "gamefaqs":
            # v0.43.27: exclude bare game-landing pages (no /faqs/) — they're nav
            # chrome, not guides, and import to 0-1 garbage sections.
            if self._is_gamefaqs_game_page(url):
                return False
            return "/faqs/" in url or any(token in haystack for token in ["walkthrough", "guide", "faq"])
        if site_key == "rpgsoluce":
            return "/soluces/" in url or any(token in haystack for token in ["soluce", "cheminement", "solution"])
        if site_key == "neoseeker":
            return any(token in haystack for token in ["guide", "walkthrough", "/guides/"])
        if site_key == "strategywiki":
            return "strategywiki" in haystack or any(token in haystack for token in ["walkthrough", "guide"])
        if site_key == "ign":
            return any(token in haystack for token in ["walkthrough", "guide", "wiki", "/wikis/"])
        if site_key == "jeuxvideo":
            # v0.42.12: JV walkthroughs live ONLY under /wikis-soluce-astuces/
            # (or legacy /wikis/). News (/news/), forums (/forums/), tests, and
            # videos all pollute results when we match "soluce"/"astuces" tokens
            # in the snippet. Whitelist by URL PATH — the reliable signal.
            u = url.casefold()
            return "/wikis-soluce-astuces/" in u or "/wikis/" in u
        if site_key == "vally8":
            return any(token in haystack for token in ["soluce", "solution", "jeux/"])
        if site_key == "darklevel":
            return any(token in haystack for token in ["soluce", "solution"])
        return True

    def _score_search_result(self, site_key: str, query: str, platform: str, title: str, url: str, snippet: str, lang: str = "auto") -> int:
        score = 0
        title_cf = title.casefold()
        url_cf = url.casefold()
        snippet_cf = snippet.casefold()
        query_terms = [term for term in re.split(r"\W+", query.casefold()) if len(term) >= 2]
        for term in query_terms:
            if term in title_cf:
                score += 18
            elif term in snippet_cf:
                score += 8
            elif term in url_cf:
                score += 6

        if platform not in {"", "Autre", "Tous"}:
            platform_cf = platform.casefold()
            if platform_cf in title_cf or platform_cf in snippet_cf or platform_cf in url_cf:
                score += 12
            if platform_cf == "ps2" and any(token in url_cf or token in title_cf for token in ["playstation-2", "/ps2/", "ps2"]):
                score += 12

        if site_key == "gamefaqs" and "/faqs/" in url_cf:
            score += 60
        if site_key == "rpgsoluce" and "/soluces/" in url_cf:
            score += 55
        if site_key == "neoseeker" and ("/guides/" in url_cf or "walkthrough" in url_cf):
            score += 40
        if site_key == "strategywiki":
            score += 30
        if site_key == "ign" and ("/wikis/" in url_cf or "walkthrough" in url_cf or "/guides/" in url_cf):
            score += 45
        if site_key == "jeuxvideo" and ("/wikis-soluce-astuces/" in url_cf or "/wikis/" in url_cf):
            score += 45
        if site_key == "vally8" and "jeux/" in url_cf:
            score += 40
        if site_key == "darklevel":
            score += 35

        if any(token in title_cf for token in ["walkthrough", "guide", "faq", "soluce", "cheminement", "solution"]):
            score += 20
        if len(snippet.strip()) >= 80:
            score += 8

        # v0.43.9: language bias. When a language is explicitly requested, push
        # matching-language sites to the top and demote the other language, so
        # "FR" actually yields French results first (the site-type bonuses above,
        # e.g. GameFAQs +60 vs RPGSoluce +55, otherwise let English win). The
        # boost (+90) dominates the site-type spread so any in-language result
        # outranks every out-of-language one, while ties still respect site type.
        if lang == "fr":
            if site_key in self._FRENCH_SITE_KEYS:
                score += 90
            elif site_key in self._ENGLISH_SITE_KEYS:
                score -= 15
        elif lang == "en":
            if site_key in self._ENGLISH_SITE_KEYS:
                score += 90
            elif site_key in self._FRENCH_SITE_KEYS:
                score -= 15
        return score

    # v0.43.24: a line is a divider / decoration if it's only made of these.
    _DECORATION_LINE_RE = re.compile(r"^[=_~*#+\-.|/\\ \t]+$")

    def _strip_cross_page_boilerplate(self, parts: list[str]) -> list[str]:
        """v0.43.24: remove nav/footer lines a multi-page site repeats on nearly
        EVERY crawled page (menu bars, chapter lists, social/footer links). A
        non-trivial line present in >= 60% of the page blocks is template
        boilerplate, not walkthrough content. Conservative: needs >=3 pages,
        skips blanks/dividers/PRE-marked lines, and never touches per-page unique
        text (chapter walkthroughs differ page to page)."""
        parts = [p for p in parts if p]
        if len(parts) < 3:
            return parts
        from collections import Counter
        counts: Counter = Counter()
        for part in parts:
            seen: set[str] = set()
            for ln in part.split("\n"):
                s = ln.strip()
                if len(s) < 8 or "\x01" in ln or self._DECORATION_LINE_RE.match(s):
                    continue
                seen.add(s)
            for s in seen:
                counts[s] += 1
        threshold = max(2, int(0.6 * len(parts)))
        boiler = {s for s, n in counts.items() if n >= threshold}
        if not boiler:
            return parts
        self._debug_log(f"  cross-page boilerplate: removing {len(boiler)} repeated line(s) across {len(parts)} pages")
        out: list[str] = []
        for part in parts:
            kept = [ln for ln in part.split("\n") if ln.strip() not in boiler]
            # collapse the blank runs the removal leaves behind
            cleaned = re.sub(r"\n{3,}", "\n\n", "\n".join(kept))
            out.append(cleaned)
        return out

    def _collect_guide(self, start_url: str, progress_cb: "Any | None" = None) -> dict[str, Any]:
        """Fetch a guide and all related pages.

        BFS queue strategy:
          - Start from `start_url`.
          - For each page, extract content and discover MORE URLs to fetch:
              1. Sibling pages under the same site-specific prefix (e.g. RPGSoluce
                 game tree /soluces/<platform>/<game>/...). Captures the "nav bar"
                 children automatically.
              2. Next-page link (existing _find_next_page_url heuristic).
                 Handles Neoseeker pagination, GameFAQs multi-part FAQs, etc.
          - Queue dedups via `visited` and `queue` membership.
          - Stops on: MAX_FETCHED_PAGES, queue empty, MAX_CONTENT_CHARS reached.

        Each contributed page prefixes its block with the page's display title +
        a `=====` divider, so the downstream section detector naturally identifies
        them as "banners" — one section per page.
        """
        self._debug_log(f"  _collect_guide: start_url={start_url}")
        # v0.42.15: per-crawl map of chapter URL → clean title from the TOC link
        # text (populated by JV chapter discovery). Lets _derive_page_display_title
        # use the sommaire's clean chapter name instead of the page's own long
        # news headline (which shares a redundant game-name prefix across pages).
        self._chapter_title_hints: dict[str, str] = {}
        # v0.43.36: per-crawl cache of the fetch strategy that WORKED for each host.
        # Bot-blocking sites (GameFAQs) fail attempts 1-4 and only succeed on Wayback;
        # without this every page re-runs the whole failing gauntlet (4 dead requests
        # + ~3s of inter-attempt sleeps). Once a host's winner is known, _download
        # tries it FIRST, so pages 2..N of the same guide skip straight to it.
        self._host_fetch_strategy: dict[str, str] = {}
        visited: set[str] = set()
        queued: set[str] = {start_url}
        queue: list[str] = [start_url]
        source_pages: list[GuideSourcePage] = []
        combined_parts: list[str] = []
        page_titles: list[str] = []  # v0.43.17: title per appended page block (aligned with combined_parts)
        seen_signatures: set[str] = set()
        first_title = ""
        extractor_name = "generic"
        charsets: list[str] = []

        # base_prefix is computed once from start_url; sibling discovery filters
        # to URLs under this prefix on the same host.
        base_prefix = self._compute_base_prefix(start_url)
        self._debug_log(f"  base_prefix={base_prefix or '(none)'}")

        total_content_chars = 0
        while queue and len(visited) < MAX_FETCHED_PAGES:
            current_url = queue.pop(0)
            if current_url in visited:
                continue
            visited.add(current_url)

            self._debug_log(f"  fetching page {len(visited)}/{MAX_FETCHED_PAGES}: {current_url}")
            # v0.43.14: report progress (done, moving total-estimate) so the
            # background-import UI can show "page X/Y" instead of a frozen spinner.
            if progress_cb is not None:
                try:
                    est_total = min(MAX_FETCHED_PAGES, len(visited) + len(queue))
                    progress_cb(len(visited), max(est_total, len(visited)), current_url)
                except Exception:
                    pass
            try:
                html_text, charset = self._download(current_url)
            except Exception as exc:
                # Tolerate per-page failures — keep crawling siblings, don't blow up the whole import.
                self._debug_log(f"  download failed: {type(exc).__name__}: {exc}")
                continue
            if charset not in charsets:
                charsets.append(charset)

            # v0.42.13 TEMP DEBUG: dump the raw HTML of the first 2 fetched pages
            # so we can inspect the real structure (chapter links, content div)
            # for sites the plugin fetches but the user's shell can't reliably
            # (jeuxvideo.com anti-bot serves stubs to shell curl). Remove later.
            if len(visited) <= 2:
                try:
                    dump_path = self._debug_dir / f"raw_fetch_{len(visited)}.html"
                    dump_path.write_text(html_text, encoding="utf-8", errors="replace")
                    self._debug_log(f"  [debug] raw HTML saved: {dump_path} ({len(html_text)} chars)")
                except Exception as _e:
                    self._debug_log(f"  [debug] raw HTML save failed: {_e}")

            current_title = self._extract_title(html_text, current_url)
            if not first_title:
                first_title = current_title

            extractor, page_content = self._extract_text(current_url, html_text)
            self._debug_log(f"  extracted: extractor={extractor} content_len={len(page_content)}")
            # v0.42.3: detect Wayback Machine's "Organization: Alexa Crawls"
            # interstitial. Happens when the original URL is blocked (Cloudflare,
            # 403, anti-bot) AND Wayback has no recent snapshot — Wayback returns
            # the Alexa Crawls description page (211 chars) instead of failing.
            # Without this check, the plugin saves the worthless interstitial as
            # the guide content. Skip this page and try the next URL in queue.
            if self._looks_like_wayback_alexa_interstitial(page_content):
                self._debug_log(f"  Wayback Alexa interstitial detected for {current_url}, skipping")
                continue
            page_content = self._remove_leading_duplicate_title(page_content, first_title or current_title)
            if extractor_name == "generic" and extractor != "generic":
                extractor_name = extractor

            signature = self._content_signature(page_content)
            if signature in seen_signatures:
                self._debug_log(f"  duplicate content signature, skipping page block")
                # Still discover related URLs from this page even if content was dup
                self._enqueue_related(current_url, html_text, base_prefix, extractor, queue, queued, visited)
                continue
            seen_signatures.add(signature)

            if page_content.strip():
                # v0.43.17: drop standalone "- Advertisement -" noise lines that
                # Neoseeker (and others) sprinkle through the body.
                page_content = re.sub(r"(?im)^\s*-?\s*advertisement\s*-?\s*$", "", page_content)
                display_title = self._derive_page_display_title(
                    page_index=len(source_pages),
                    page_title=current_title,
                    root_title=first_title,
                    page_content=page_content,
                    page_url=current_url,
                )
                # v0.43.17: never let an ad / empty line become the page title.
                if not display_title.strip() or re.match(r"^[-\s]*advertis\w*[-\s]*$", display_title, re.IGNORECASE):
                    display_title = (first_title if not combined_parts else f"Page {len(source_pages) + 1}")
                source_pages.append(GuideSourcePage(title=display_title, url=current_url))
                if not combined_parts:
                    combined_parts.append(page_content.strip())
                    page_titles.append(first_title or display_title or "Introduction")
                else:
                    divider = "=" * min(max(len(display_title), 8), 80)
                    page_block_content = self._remove_leading_duplicate_title(page_content, display_title)
                    combined_parts.append(f"{display_title}\n{divider}\n{page_block_content.strip()}")
                    page_titles.append(display_title)
                total_content_chars += len(page_content)
                if total_content_chars >= MAX_CONTENT_CHARS:
                    self._debug_log(f"  reached MAX_CONTENT_CHARS, stopping crawl")
                    break

            # Discover more URLs to fetch (siblings under prefix + next-link chain)
            self._enqueue_related(current_url, html_text, base_prefix, extractor, queue, queued, visited)

        # v0.43.24: strip nav/footer lines a multi-page site repeats on EVERY
        # crawled page (vally8 "Le coin de Chrono Cross", chapter menus, social
        # footers). Done here so page boundaries reflect the cleaned content.
        combined_parts = self._strip_cross_page_boilerplate(combined_parts)
        # Re-align titles with parts, dropping any page emptied by the strip.
        paired = [(p, page_titles[i] if i < len(page_titles) else f"Page {i + 1}") for i, p in enumerate(combined_parts)]
        paired = [(p, t) for p, t in paired if p.strip()]
        used_parts = [p for p, _ in paired]
        page_titles = [t for _, t in paired]
        content = "\n\n".join(used_parts).strip()
        self._debug_log(f"  _collect_guide done: {len(source_pages)} pages, {len(content)} chars content")
        if not content:
            raise ValueError("Aucun contenu exploitable n'a été extrait")

        # v0.43.17: line boundaries of each fetched page in the joined content, so
        # multi-page guides can be sectioned BY PAGE (one clean section per chapter)
        # instead of re-derived by banner/heading heuristics that then merge small
        # pages and mis-attribute their content under a neighbour's title.
        page_boundaries: list[dict[str, Any]] = []
        cursor = 0
        for idx, part in enumerate(used_parts):
            title = page_titles[idx] if idx < len(page_titles) else f"Page {idx + 1}"
            page_boundaries.append({"line_start": cursor, "title": title})
            cursor += part.count("\n") + 1  # lines in this part
            cursor += 1                      # blank line from the "\n\n" separator

        return {
            "title": first_title or self._site_name(start_url),
            "extractor": extractor_name,
            "content": content,
            "source_charset": charsets[0] if len(charsets) == 1 else "mixed",
            "source_pages": source_pages or [GuideSourcePage(title=first_title or "Page 1", url=start_url)],
            "page_boundaries": page_boundaries,
        }

    def _enqueue_related(
        self,
        current_url: str,
        html_text: str,
        base_prefix: str,
        extractor: str,
        queue: list[str],
        queued: set[str],
        visited: set[str],
    ) -> None:
        """Find sibling URLs + next-page URL, append them to queue (deduped)."""
        new_urls: list[str] = []
        if base_prefix:
            new_urls.extend(self._discover_related_urls(current_url, html_text, base_prefix))
        # v0.42.7: site-specific custom link discovery for sites whose chapter
        # URLs don't share a prefix with the TOC page (e.g. jeuxvideo.com where
        # each chapter has its OWN numeric ID different from the wiki TOC ID).
        new_urls.extend(self._discover_site_specific_chapter_links(current_url, html_text))
        next_url = self._find_next_page_url(current_url=current_url, html_text=html_text, extractor=extractor)
        if next_url:
            new_urls.append(next_url)
        for u in new_urls:
            if u in visited or u in queued:
                continue
            queued.add(u)
            queue.append(u)

    # v0.42.7: regex extractors for site-specific chapter link discovery.
    # Each entry is (hostname_substring, url_path_regex, label).
    # The path_regex captures internal links that point to chapter content
    # but DON'T share the TOC URL's prefix (so prefix-based discovery misses).
    _SITE_CHAPTER_LINK_RES = [
        # jeuxvideo.com: /wikis-soluce-astuces/<chapter-slug>/<numeric_id>
        # The TOC has its own ID (350892 for FFX) but chapter IDs are different
        # (200156, 200157, ...). Pattern: any sub-slug followed by a 4-7 digit ID.
        ("jeuxvideo.com",
         re.compile(r'href="(/wikis-soluce-astuces/[a-z0-9\-]+/\d{4,7})(?:#[^"]*)?"', re.IGNORECASE),
         "JV wiki chapter"),
    ]

    def _discover_site_specific_chapter_links(self, current_url: str, html_text: str) -> list[str]:
        """v0.42.7: extract explicit chapter links from the page HTML when the
        site uses non-prefix URL patterns (e.g. JV wikis). Returns absolute URLs.

        Safe: returns [] for sites not matched by `_SITE_CHAPTER_LINK_RES`."""
        parsed = urlparse(current_url)
        host = (parsed.hostname or "").lower()
        # v0.42.14: jeuxvideo.com — chapters live inside the TOC accordion, and
        # point to a MIX of /news/ and /wikis-soluce-astuces/ pages. Handled by
        # a dedicated parser (the generic regex approach can't express "only
        # links inside contenu-asl blocks").
        if "jeuxvideo.com" in host:
            return self._discover_jeuxvideo_chapter_links(current_url, html_text)
        # v0.43.30: IGN wiki chapter links live in ESCAPED JSON (React SSR), so the
        # <a>-tag link parser misses them and the crawl stalls at 3 pages.
        if "ign.com" in host:
            return self._discover_ign_chapter_links(current_url, html_text)
        out: list[str] = []
        seen: set[str] = set()
        for host_match, link_re, _label in self._SITE_CHAPTER_LINK_RES:
            if host_match not in host:
                continue
            for m in link_re.finditer(html_text):
                path = m.group(1)
                absolute = urljoin(current_url, path)
                ap = urlparse(absolute)
                if ap.scheme not in ALLOWED_SCHEMES:
                    continue
                if ap.hostname != parsed.hostname:
                    continue
                # Filter image / non-page extensions (reuse v0.41 constant)
                path_lower = ap.path.lower()
                if any(path_lower.endswith(ext) for ext in NON_PAGE_URL_EXTENSIONS):
                    continue
                canonical = ap._replace(fragment="").geturl()
                if canonical in seen or canonical == current_url:
                    continue
                seen.add(canonical)
                out.append(canonical)
        if out:
            try: self._debug_log(f"  site-specific link discovery: {len(out)} URLs for {host}")
            except Exception: pass
        return out

    def _discover_ign_chapter_links(self, current_url: str, html_text: str) -> list[str]:
        """v0.43.30: IGN wiki walkthroughs (`/wikis/<game>/<Chapter>`) render their
        chapter nav inside escaped React JSON (`href=\\"/wikis/…\\"`), which the
        HTML link parser can't see — so the crawl only followed the 2-3 real <a>
        tags and stopped (secret of mana / Persona 3 = 3 pages). Regex the raw
        text for every `/wikis/<game>/<Chapter>` in document order (walkthrough nav
        comes first, so chapters queue before reference pages under the page cap)."""
        parsed = urlparse(current_url)
        if "ign.com" not in (parsed.hostname or "").lower():
            return []
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) < 2 or parts[0] != "wikis":
            return []
        game = parts[1]
        pat = re.compile(r"/wikis/" + re.escape(game) + r"/([A-Za-z0-9_%.'()\-]+)")
        out: list[str] = []
        seen: set[str] = set()
        for m in pat.finditer(html_text):
            chapter = m.group(1)
            if not chapter or chapter.lower() in ("wiki_guide", "index"):
                continue
            canonical = f"https://www.ign.com/wikis/{game}/{chapter}"
            if any(canonical.lower().endswith(ext) for ext in NON_PAGE_URL_EXTENSIONS):
                continue
            if canonical in seen or canonical == current_url:
                continue
            seen.add(canonical)
            out.append(canonical)
        if out:
            try: self._debug_log(f"  IGN chapter discovery: {len(out)} URLs")
            except Exception: pass
        return out

    def _discover_jeuxvideo_chapter_links(self, current_url: str, html_text: str) -> list[str]:
        """v0.42.14: extract JV guide chapter links. The 'guide complet' landing
        page has a TOC accordion where each section is:
            <div class="contenu-asl" ...>
              <ul class="liste-default-jv">
                <li><a href="/news/<id>/...">Chapter title</a></li>
                <li><a href="/wikis-soluce-astuces/<id>/....htm">...</a></li>
              </ul>
            </div>
        Chapter content lives on a MIX of /news/ and /wikis-soluce-astuces/
        pages. We extract <a href> ONLY from inside contenu-asl blocks (so we
        don't follow unrelated sidebar/footer news links), accept both path
        types on the same host, and return absolute URLs."""
        out: list[str] = []
        seen: set[str] = set()
        try:
            # Each contenu-asl block holds one accordion section's chapter list.
            for block in re.finditer(
                r'<div[^>]+class="[^"]*\bcontenu-asl\b[^"]*"[^>]*>(.*?)</div>',
                html_text, flags=re.DOTALL | re.IGNORECASE,
            ):
                inner = block.group(1)
                # Capture <a href="...">link text</a> so we can use the clean
                # sommaire text as the chapter's section title.
                for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', inner, flags=re.DOTALL | re.IGNORECASE):
                    href = m.group(1).strip()
                    link_text = self._clean_inline_text(re.sub(r"<[^>]+>", " ", m.group(2)))
                    if not href or href.startswith("#") or href.lower().startswith("javascript:"):
                        continue
                    absolute = urljoin(current_url, href)
                    ap = urlparse(absolute)
                    if ap.scheme not in ALLOWED_SCHEMES:
                        continue
                    ahost = (ap.hostname or "").lower()
                    if "jeuxvideo.com" not in ahost:
                        continue
                    path = ap.path.lower()
                    # Only real chapter pages: news articles or wiki sub-pages.
                    if not (path.startswith("/news/") or path.startswith("/wikis-soluce-astuces/")):
                        continue
                    if any(path.endswith(ext) for ext in NON_PAGE_URL_EXTENSIONS):
                        continue
                    canonical = ap._replace(fragment="").geturl()
                    if canonical in seen or canonical == current_url:
                        continue
                    seen.add(canonical)
                    out.append(canonical)
                    # Store the clean TOC link text for this chapter (used as the
                    # section title instead of the page's long news headline).
                    if link_text and len(link_text) >= 3:
                        try:
                            self._chapter_title_hints[canonical] = link_text[:100]
                        except Exception:
                            pass
        except Exception as exc:
            try: self._debug_log(f"  JV chapter discovery failed: {exc}")
            except Exception: pass
        if out:
            try: self._debug_log(f"  JV chapter discovery: {len(out)} chapter URLs")
            except Exception: pass
        return out

    def _compute_base_prefix(self, start_url: str) -> str:
        """Determine the URL path prefix used to discover sibling guide pages.

        Strategy per-site:
          - RPGSoluce: /soluces/<platform>/<game> — captures the whole game tree
            including /cheminement/, /etoiles/, /quetes/, /objets/, etc.
          - Jeuxvideo: /wikis-soluce-astuces/<wiki_id> — captures all sub-pages
            of a wiki (chapters, secrets, etc.) when user imports the TOC.
          - Vally8: /jeux/<game> — captures soluce.php / soluce2.php / etc.
          - Others: empty (no prefix-based discovery — falls back to next-link chain).

        Returning "" disables prefix discovery for this crawl.
        """
        parsed = urlparse(start_url)
        host = (parsed.hostname or "").lower()
        path = parsed.path

        if "rpgsoluce.com" in host:
            parts = path.strip("/").split("/")
            # Expected: soluces / <platform> / <game> [/ <subpage> ...]
            if len(parts) >= 3 and parts[0] == "soluces":
                return "/" + "/".join(parts[:3])

        # v0.42.5: jeuxvideo.com wiki structure.
        # Pattern: /wikis-soluce-astuces/<numeric_wiki_id>/<page>.htm
        # When the user imports a wiki TOC URL (e.g. wiki-de-final-fantasy-x.htm),
        # the actual walkthrough content is in sibling pages under the same wiki_id
        # (Solution complète : Partie 1, Partie 2, etc.). Using the wiki_id as
        # prefix lets _discover_related_urls follow these chapter links.
        if "jeuxvideo.com" in host:
            parts = path.strip("/").split("/")
            if len(parts) >= 2 and parts[0] in ("wikis-soluce-astuces", "wikis") and parts[1].isdigit():
                return "/" + "/".join(parts[:2])

        # v0.42.5: vally8.free.fr pattern: /jeux/<game>/<page>.php
        if "vally8.free.fr" in host:
            parts = path.strip("/").split("/")
            if len(parts) >= 2 and parts[0] == "jeux":
                return "/" + "/".join(parts[:2])

        # v0.43.13: Neoseeker wiki walkthroughs. Structure:
        #   /<game>/walkthrough                      (TOC landing)
        #   /<game>/walkthrough/<Chapter_Name>       (chapter pages)
        # Prefixing on /<game>/<section> lets the BFS follow every chapter linked
        # from the TOC table — Neoseeker guides are split one page per chapter,
        # which is exactly what makes them clean to section.
        if "neoseeker.com" in host:
            parts = path.strip("/").split("/")
            if len(parts) >= 2 and parts[1].lower() in ("walkthrough", "walkthroughs", "guide", "guides", "faq", "faqs"):
                return "/" + "/".join(parts[:2])

        return ""

    def _discover_related_urls(self, current_url: str, html_text: str, base_prefix: str) -> list[str]:
        """Return internal URLs whose path starts with base_prefix.

        Used to follow site nav bars / per-section landing pages without relying
        on the conservative next-link scoring. Strict same-host + same-prefix
        check keeps us inside the current guide tree.
        """
        if not base_prefix:
            return []
        if _HAS_HTML_PARSER:
            parser = _LinkParser()
            try:
                parser.feed(html_text)
                parser.close()
            except Exception:
                return []
            links = parser.links
        else:
            links = _regex_extract_links(html_text)

        current = urlparse(current_url)
        out: list[str] = []
        seen_here: set[str] = set()
        for link in links:
            href = (link.get("href") or "").strip()
            if not href or href.startswith("#") or href.lower().startswith("javascript:"):
                continue
            absolute = urljoin(current_url, href)
            parsed = urlparse(absolute)
            if parsed.scheme not in ALLOWED_SCHEMES:
                continue
            if parsed.hostname != current.hostname:
                continue
            # Normalise to drop fragment+query for the prefix check
            path_only = parsed.path.rstrip("/")
            if not path_only.startswith(base_prefix):
                continue
            # v0.41: skip non-page URLs (images, fonts, archives, etc.).
            # Without this, e.g. rpgsoluce FF9 has `<a href="images/01.jpg">`
            # which the crawler downloaded as HTML, polluting the guide with
            # 25 sections of duplicated homepage at the tail.
            path_lower = path_only.lower()
            if any(path_lower.endswith(ext) for ext in NON_PAGE_URL_EXTENSIONS):
                continue
            # Build a canonical URL (no fragment) for dedup
            canonical = parsed._replace(fragment="").geturl()
            if canonical in seen_here:
                continue
            seen_here.add(canonical)
            out.append(canonical)
        return out

    def _validate_url(self, value: str) -> str:
        if not _HAS_URLLIB:
            raise ValueError("Module réseau indisponible dans cette sandbox Python")
        self._debug_log(f"  _validate_url: {value[:120]}")
        parsed = urlparse(value.strip())
        if parsed.scheme not in ALLOWED_SCHEMES:
            raise ValueError("Seules les URL http/https sont acceptées")
        if not parsed.netloc:
            raise ValueError("URL invalide")

        hostname = (parsed.hostname or "").strip().lower()
        if not hostname:
            raise ValueError("URL invalide")
        if hostname in {"localhost", "127.0.0.1", "::1"}:
            raise ValueError("Les URL locales sont refusées")
        if hostname.endswith(".local") or hostname.endswith(".internal"):
            raise ValueError("Les hôtes locaux sont refusés")

        if ipaddress is not None:
            try:
                ip = ipaddress.ip_address(hostname)
            except ValueError:
                ip = None
            if ip is not None:
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    raise ValueError("Les IP locales/privées sont refusées")

        self._debug_log(f"  _validate_url OK: {parsed.geturl()[:120]}")
        return parsed.geturl()

    def _download(self, url: str) -> tuple[str, str]:
        if not _HAS_URLLIB:
            raise ValueError("Module réseau indisponible dans cette sandbox Python")
        context = self._make_ssl_context()
        parsed_target = urlparse(url)
        origin = f"{parsed_target.scheme}://{parsed_target.netloc}"

        # Attempt 1: Direct GET with browser-like headers
        attempts: list[dict[str, Any]] = [
            {
                "name": "direct",
                "url": url,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept-Encoding": "identity",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Cache-Control": "max-age=0",
                },
            },
            # Attempt 2: With Referer from Google (mimics clicking from search results)
            {
                "name": "with_referer",
                "url": url,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
                    "Accept-Encoding": "identity",
                    "Referer": "https://www.google.com/",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "cross-site",
                    "Sec-Fetch-User": "?1",
                },
            },
            # Attempt 3: Firefox-like UA (some sites block Chrome-on-Linux specifically)
            {
                "name": "firefox_ua",
                "url": url,
                "headers": {
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
                    "Accept-Encoding": "identity",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
            },
            # Attempt 4 (v0.42.8): curl subprocess. The Decky backend is a
            # long-running process whose urllib opener accumulates per-session
            # state (connection reuse / cookies) that some WAFs (jeuxvideo.com)
            # flag as a bot AFTER the first requests — even though an isolated
            # urllib call with identical headers succeeds. curl is a FRESH
            # process each time with no shared state and a different TLS stack,
            # so it bypasses that flag. Proven to return 200 on JV from this Deck.
            {
                "name": "curl",
                "url": url,
                "use_curl": True,
                "headers": {},
            },
            # Attempt 5: Wayback Machine fallback (for sites that hard-block bots like GameFAQs)
            {
                "name": "wayback",
                "url": "https://web.archive.org/web/2024/" + url,
                "headers": {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
                    "Accept-Encoding": "identity",
                },
            },
        ]

        # v0.43.36: if a previous page of this host revealed which strategy works
        # (e.g. GameFAQs → wayback), try it FIRST so we skip the failing attempts and
        # their inter-attempt sleeps. Stable sort keeps the rest in their normal order.
        strat = getattr(self, "_host_fetch_strategy", None)
        host_key = parsed_target.netloc.casefold()
        if strat and host_key in strat:
            preferred = strat[host_key]
            attempts.sort(key=lambda a: 0 if a["name"] == preferred else 1)

        last_error: Exception | None = None
        for idx, attempt in enumerate(attempts):
            retried_429 = False
            while True:
                try:
                    if idx > 0 and not retried_429:
                        time.sleep(0.4)  # v0.43.36: was 1.0 — trimmed; the host cache avoids most retries
                    # v0.42.8: curl-subprocess attempt (fresh process, no shared
                    # urllib opener state). Used to bypass WAFs that flag the
                    # long-running backend's connection reuse.
                    if attempt.get("use_curl"):
                        data = self._download_via_curl(attempt["url"])
                        if data is None:
                            self._debug_log(f"  download [curl] unavailable or failed")
                            last_error = ValueError("curl indisponible")
                            break
                        if len(data) > MAX_DOWNLOAD_BYTES:
                            raise ValueError("Page trop lourde pour cette version")
                        charset = self._detect_charset(data, None)
                        try:
                            text = data.decode(charset, errors="replace")
                        except LookupError:
                            charset = "utf-8"
                            text = data.decode("utf-8", errors="replace")
                        self._debug_log(f"  download [curl] {len(text)} chars charset={charset} from {attempt['url'][:80]}")
                        if strat is not None and attempt["name"] != "direct":
                            strat[host_key] = attempt["name"]
                        return text, charset
                    request = urllib.request.Request(
                        attempt["url"],
                        headers=attempt["headers"],
                        method="GET",
                    )
                    with urllib.request.urlopen(request, timeout=25, context=context) as response:
                        data = response.read(MAX_DOWNLOAD_BYTES + 1)
                        if len(data) > MAX_DOWNLOAD_BYTES:
                            raise ValueError("Page trop lourde pour cette version")
                        charset = self._detect_charset(data, response.headers.get_content_charset())
                        try:
                            text = data.decode(charset, errors="replace")
                        except LookupError:
                            charset = "utf-8"
                            text = data.decode("utf-8", errors="replace")
                        self._debug_log(f"  download [{attempt['name']}] {len(text)} chars charset={charset} from {attempt['url'][:80]}")
                        # If it's Wayback, verify it's a real archive (not an empty placeholder)
                        if attempt["name"] == "wayback":
                            if "Wayback Machine has not archived" in text or "Sorry, we don't have that URL" in text:
                                self._debug_log(f"  download [wayback] no archive available")
                                last_error = ValueError("Aucune archive Wayback disponible")
                                break
                        if strat is not None and attempt["name"] != "direct":
                            strat[host_key] = attempt["name"]
                        return text, charset
                except urllib.error.HTTPError as exc:
                    # Rate limit: one polite retry after a 30s wait on the SAME attempt.
                    if exc.code == 429 and not retried_429:
                        self._debug_log(f"  download [{attempt['name']}] HTTP 429, attente 30s avant retry")
                        time.sleep(30.0)
                        retried_429 = True
                        continue
                    self._debug_log(f"  download [{attempt['name']}] HTTP {exc.code}")
                    last_error = ValueError(f"HTTP {exc.code}")
                    break
                except urllib.error.URLError as exc:
                    self._debug_log(f"  download [{attempt['name']}] URL error: {exc.reason}")
                    last_error = ValueError(f"Échec réseau : {exc.reason}")
                    break
                except Exception as exc:
                    self._debug_log(f"  download [{attempt['name']}] {type(exc).__name__}: {exc}")
                    last_error = exc
                    break

        if last_error:
            raise ValueError(f"Téléchargement impossible après toutes les tentatives : {last_error}")
        raise ValueError("Téléchargement impossible")

    def _download_via_curl(self, url: str) -> bytes | None:
        """v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).

        Returns response body bytes on HTTP 2xx, or None if curl is missing,
        times out, or the server returns a non-success status. Used as a
        download attempt to bypass WAFs that flag the long-running backend's
        urllib connection state (e.g. jeuxvideo.com 403s the plugin but
        serves curl with HTTP 200 from the same machine)."""
        try:
            import subprocess
            import os as _os
        except Exception:
            return None
        try:
            # v0.42.11 CRITICAL FIX: the Decky backend runs with LD_LIBRARY_PATH
            # (and possibly LD_PRELOAD) pointing at Decky's bundled runtime libs.
            # When we launch the system `curl` as a subprocess, it INHERITS that
            # env and loads an incompatible libcurl/libssl → its HTTPS handler
            # breaks → curl exits 1 (CURLE_UNSUPPORTED_PROTOCOL). The exact same
            # curl command works from a normal shell. Strip the LD_* vars so
            # curl loads the system libraries it was built against.
            clean_env = {
                k: v for k, v in _os.environ.items()
                if k not in ("LD_LIBRARY_PATH", "LD_PRELOAD")
            }
            clean_env.setdefault("PATH", "/usr/bin:/bin:/usr/local/bin")
            # -s silent, -L follow redirects, --compressed accept gzip,
            # -A browser UA, --max-time hard timeout, --fail => non-zero on >=400.
            result = subprocess.run(
                [
                    "curl", "-sL", "--compressed", "--fail",
                    "--max-time", "25",
                    "-A", USER_AGENT,
                    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "-H", "Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                    url,
                ],
                capture_output=True,
                timeout=30,
                env=clean_env,
            )
            if result.returncode != 0:
                stderr_tail = (result.stderr or b"")[-200:].decode("utf-8", errors="replace")
                try: self._debug_log(f"  curl exit={result.returncode} for {url[:80]} stderr={stderr_tail!r}")
                except Exception: pass
                return None
            body = result.stdout
            if not body or len(body) < 200:
                return None
            return body[:MAX_DOWNLOAD_BYTES + 1]
        except FileNotFoundError:
            # curl not installed
            return None
        except Exception as exc:
            try: self._debug_log(f"  curl error: {type(exc).__name__}: {exc}")
            except Exception: pass
            return None

    def _detect_charset(self, data: bytes, header_charset: str | None) -> str:
        """Detect the correct charset by looking at HTML meta tag and scoring candidates."""
        # First, check HTML meta tag (most reliable for legacy sites like vally8)
        snippet = data[:4096].decode("ascii", errors="replace")
        meta_match = re.search(
            r'<meta[^>]+charset=["\']?([\w\-]+)',
            snippet, flags=re.IGNORECASE,
        )
        if meta_match:
            declared = meta_match.group(1).strip().lower()
            try:
                data.decode(declared, errors="strict")
                return declared
            except (UnicodeDecodeError, LookupError):
                pass
        # Then HTTP header
        if header_charset:
            try:
                data.decode(header_charset, errors="strict")
                return header_charset
            except (UnicodeDecodeError, LookupError):
                pass
        # Fallback candidates: try utf-8 first (strict), then latin-1 as last resort
        for candidate in ["utf-8", "cp1252", "iso-8859-1"]:
            try:
                data.decode(candidate, errors="strict")
                return candidate
            except (UnicodeDecodeError, LookupError):
                continue
        # If nothing matched strictly, use utf-8 with replacement
        return "utf-8"

    def _extract_title(self, html_text: str, url: str) -> str:
        match = re.search(r"<title[^>]*>(.*?)</title>", html_text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return self._site_name(url)
        title = self._clean_inline_text(match.group(1))
        title = re.sub(r"\s+[\-|–|—]\s+.*$", "", title)
        return title or self._site_name(url)

    def _extract_text(self, url: str, html_text: str) -> tuple[str, str]:
        hostname = (urlparse(url).hostname or "").lower()
        if "gamefaqs." in hostname:
            text = self._extract_gamefaqs_text(html_text)
            return "gamefaqs", text
        if "rpgsoluce." in hostname:
            text = self._extract_rpgsoluce_text(html_text)
            return "rpgsoluce", text
        if "vally8." in hostname:
            text = self._extract_vally8_text(html_text)
            return "vally8", text
        if "neoseeker." in hostname:
            text = self._extract_neoseeker_text(html_text)
            return "neoseeker", text
        if "strategywiki." in hostname:
            text = self._extract_strategywiki_text(html_text)
            return "strategywiki", text
        if "jeuxvideo." in hostname:
            text = self._extract_jeuxvideo_text(html_text)
            return "jeuxvideo", text
        if "ign." in hostname:
            text = self._extract_ign_text(html_text)
            return "ign", text
        return "generic", self._extract_generic_text(html_text)

    def _extract_gamefaqs_text(self, html_text: str) -> str:
        full_text = self._html_to_text(html_text)
        # Strip Wayback Machine wrapper chrome FIRST (the GameFAQs fallback often
        # routes through web.archive.org which prefixes ~150 lines of capture
        # metadata, navigation, and timestamps before the actual page content).
        full_text = self._strip_wayback_chrome(full_text)
        full_text = self._crop_between_text_markers(
            full_text,
            # v0.41.1: more specific start markers that skip the ~55-line block
            # of GameFAQs UI widgets (Log in / Notify me / BOOKMARK / Message Sent / etc.)
            # that sits BETWEEN the page H1 "Guide and Walkthrough" and the actual
            # author-attributed FAQ. The attribution looks like:
            #   "Guide and Walkthrough (PS) (French) by Seven_Heavens"
            #   "Guide and Walkthrough (PS2) by dan_crenshaw"
            # We match that and fall back to the version line, then bare keywords.
            start_markers=[
                r"^Guide and Walkthrough\s*\([^\)\n]+\)(?:\s*\([^\)\n]+\))?\s+by\s+\S+",
                r"^Version:\s*[\d.]+\s*\|\s*Updated:",
                r"\bFAQ/Walkthrough\b",
                r"\bGuide by\b",
                r"\bGuide and Walkthrough\b",  # last-ditch fallback
            ],
            end_markers=[
                r"\bView in:\s*Text Mode\b",
                r"\bGameFAQsfacebook\.com\b",
                r"\bHelp / Contact Us\b",
                r"\b©\s*20\d\d\s*FANDOM\b",
            ],
        )
        full_text = self._strip_noise(full_text)
        return full_text

    def _extract_rpgsoluce_text(self, html_text: str) -> str:
        region = self._extract_html_region(
            html_text,
            selectors=[
                r'<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>(.*?)</div>',
                r"<div[^>]+class='[^']*entry-content[^']*'[^>]*>(.*?)</div>",
                r'<div[^>]+class="[^"]*(?:post-content|td-post-content|article-content)[^"]*"[^>]*>(.*?)</div>',
                r"<div[^>]+class='[^']*(?:post-content|td-post-content|article-content)[^']*'[^>]*>(.*?)</div>",
                r"<article[^>]*>(.*?)</article>",
                r"<main[^>]*>(.*?)</main>",
            ],
        )
        text = self._html_to_text(region or html_text)
        text = self._crop_between_text_markers(
            text,
            start_markers=[
                r"\bChapitre\s+\d+\b",
                r"\bCheminement\b",
                r"\bSolution\b",
                r"\bSoluce\b",
            ],
            end_markers=[
                r"\bCommentaires\b",
                r"\bLaisser un commentaire\b",
                r"\bSur le même thème\b",
                r"\bArticles similaires\b",
                r"\bNavigation des articles\b",
            ],
        )
        # v0.41: strip site-specific chrome (nav menu, footer, citation widget,
        # HTML comment leak). Must run BEFORE _strip_noise so the latter sees
        # clean text and doesn't accidentally preserve menu blocks.
        text = self._strip_rpgsoluce_chrome(text)
        text = self._strip_noise(text)
        return text

    def _extract_neoseeker_text(self, html_text: str) -> str:
        region = self._extract_html_region(
            html_text,
            selectors=[
                # v0.43.13: the real container is <article id="wiki-content"> (an
                # ARTICLE with an ID, not a div.class). The old div/class selectors
                # never matched, so extraction silently fell back to the generic
                # <article> grab. Target it explicitly first.
                r'<article[^>]+id="wiki-content"[^>]*>(.*?)</article>',
                r'<div[^>]+class="[^"]*(?:page-contents|wiki-content|guide-content|nsec_content)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<div[^>]+id="[^"]*(?:wiki_content|content)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<article[^>]*>(.*?)</article>',
                r'<main[^>]*>(.*?)</main>',
            ],
        )
        # v0.43.13: drop Neoseeker chrome sitting inside the article: the
        # prev/next nav bar, MediaWiki edit links, and the file/image thumb
        # tables (controller-button icon galleries) that add no textual value.
        if region:
            region = re.sub(r'<div[^>]+id="nav_prev_next"[^>]*>.*?</div>\s*(?=<div|<section|$)', "", region, flags=re.DOTALL | re.IGNORECASE)
            region = re.sub(r'<span[^>]+class="[^"]*mw-editsection[^"]*"[^>]*>.*?</span>', "", region, flags=re.DOTALL | re.IGNORECASE)
        text = self._html_to_text(region or html_text)
        text = self._crop_between_text_markers(
            text,
            start_markers=[
                r"\bWalkthrough\b",
                r"\bGuide\b",
                r"\bIntroduction\b",
                r"\bChapter\s+\d+\b",
            ],
            end_markers=[
                r"\bComments\b",
                r"\bForum Discussion\b",
                r"\bRelated Pages\b",
                r"\bContribute to this page\b",
                r"\bCopyright\b.{0,20}Neoseeker\b",
            ],
        )
        text = self._strip_noise(text)
        return text

    def _extract_strategywiki_text(self, html_text: str) -> str:
        # MediaWiki structure — main content is inside #mw-content-text
        region = self._extract_html_region(
            html_text,
            selectors=[
                r'<div[^>]+id="mw-content-text"[^>]*>(.*?)<div[^>]+class="[^"]*printfooter',
                r'<div[^>]+id="mw-content-text"[^>]*>(.*?)</div>\s*(?:<div[^>]+class="[^"]*(?:catlinks|navbox))',
                r'<div[^>]+id="bodyContent"[^>]*>(.*?)</div>\s*<div[^>]+id="(?:footer|siteSub)',
                r'<div[^>]+class="[^"]*mw-parser-output[^"]*"[^>]*>(.*?)</div>\s*<(?:div[^>]+class="[^"]*(?:printfooter|catlinks))',
            ],
        )
        # Remove MediaWiki edit links and TOC noise inline
        if region:
            region = re.sub(r'<span[^>]+class="[^"]*mw-editsection[^"]*"[^>]*>.*?</span>', "", region, flags=re.DOTALL | re.IGNORECASE)
            region = re.sub(r'<div[^>]+id="toc"[^>]*>.*?</div>\s*</div>', "", region, flags=re.DOTALL | re.IGNORECASE)
            region = re.sub(r'<table[^>]+class="[^"]*(?:infobox|navbox|ambox|metadata)[^"]*"[^>]*>.*?</table>', "", region, flags=re.DOTALL | re.IGNORECASE)
        text = self._html_to_text(region or html_text)
        text = self._crop_between_text_markers(
            text,
            start_markers=[r"\bWalkthrough\b", r"\bGuide\b", r"\bIntroduction\b", r"\bChapter\s+\d+\b"],
            end_markers=[
                r"\bCategories?\b\s*:",
                r"\bRetrieved from\b",
                r"\bNavigation menu\b",
                r"\bThis page was last edited\b",
            ],
        )
        text = self._strip_noise(text)
        return text

    def _extract_jeuxvideo_text(self, html_text: str) -> str:
        # v0.42.14: modern JV (Webedia) wiki structure. The article body is in
        #   <article class="js-content-article"> ... <div class="...js-main-content">
        # with structured chapter content under group-asl / contenu-asl blocks.
        # News-article chapters (JV puts some walkthrough content under /news/)
        # use a different wrapper, handled by the broader fallbacks.
        region = self._extract_html_region(
            html_text,
            selectors=[
                # v0.42.14: prefer js-main-content — it's the CLEAN article body
                # on both news (corps-news) and wiki pages, WITHOUT the header
                # chrome ("News astuce · Publié le · Partager · Rédaction") that
                # js-content-article includes. `corps-news` is the news variant.
                r'<div[^>]+class="[^"]*corps-news[^"]*js-main-content[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<div[^>]+class="[^"]*js-main-content[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<article[^>]+class="[^"]*js-content-article[^"]*"[^>]*>(.*?)</article>',
                r'<div[^>]+class="[^"]*(?:group-asl|contenu-asl)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<div[^>]+class="[^"]*(?:content-wiki|wiki-content|newsContent|article-content)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<article[^>]*>(.*?)</article>',
                r'<main[^>]*>(.*?)</main>',
            ],
        )
        if region:
            # Remove common sidebar / related / comment / ad blocks
            region = re.sub(r'<aside[^>]*>.*?</aside>', "", region, flags=re.DOTALL | re.IGNORECASE)
            region = re.sub(r'<div[^>]+class="[^"]*(?:related|ad-|publicite|comments)[^"]*"[^>]*>.*?</div>', "", region, flags=re.DOTALL | re.IGNORECASE)
        text = self._html_to_text(region or html_text)
        text = self._crop_between_text_markers(
            text,
            start_markers=[
                r"\bSoluce\b", r"\bCheminement\b", r"\bAstuces?\b", r"\bWalkthrough\b",
                r"\bChapitre\s+\d+\b", r"\bPartie\s+\d+\b",
            ],
            end_markers=[
                r"\bCommentaires\b",
                r"\bSujets populaires\b",
                r"\bTous les topics\b",
                r"\bSur le même sujet\b",
                r"\bÀ lire aussi\b",
            ],
        )
        text = self._strip_noise(text)
        return text

    def _extract_vally8_text(self, html_text: str) -> str:
        """v0.41.1: site-specific extractor for vally8.free.fr (old fan site).
        Uses generic HTML region selectors then strips the per-page nav menu
        and footer that the crawler concatenates across multi-page guides."""
        region = self._extract_html_region(
            html_text,
            selectors=[
                # vally8 uses very old HTML; try common wrapper patterns
                r'<td[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)</td>',
                r'<div[^>]+id="content"[^>]*>(.*?)</div>',
                r'<article[^>]*>(.*?)</article>',
                r'<main[^>]*>(.*?)</main>',
            ],
        )
        text = self._html_to_text(region or html_text)
        # Strip per-page menu+footer BEFORE the global crop, because the menu
        # repeats at every page boundary across the multi-page concat.
        text = self._strip_vally8_chrome(text)
        text = self._crop_between_text_markers(
            text,
            start_markers=[
                r"^La soluce de\b",
                r"^Avant de commencer\b",
                r"^Cheminement\b",
            ],
            end_markers=[
                r"^phpMyVisites\b",
                r"\bphpMyVisites\b",
            ],
        )
        text = self._strip_noise(text)
        return text

    def _extract_ign_next_data(self, html_text: str) -> str:
        """v0.43.31: modern IGN wikis (Next.js) put the walkthrough content in the
        __NEXT_DATA__ JSON, at props.pageProps.page.page.htmlEntities[].values.html
        — NOT in any HTML container, so the selector extractor returned ~30 chars
        (secret of mana / Persona 3 stalled at a few thin pages). Parse the JSON
        and concatenate every entity's `html` (recursing into list-valued blocks
        like tables). Returns "" if the structure isn't present (older pages)."""
        try:
            m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html_text, re.DOTALL)
            if not m:
                return ""
            data = json.loads(m.group(1))
            page = ((data.get("props") or {}).get("pageProps") or {}).get("page") or {}
            ents = (page.get("page") or {}).get("htmlEntities")
            if not isinstance(ents, list) or not ents:
                return ""
            parts: list[str] = []

            def collect(o: Any) -> None:
                if isinstance(o, dict):
                    h = o.get("html")
                    if isinstance(h, str) and h.strip():
                        parts.append(h)
                    for k, v in o.items():
                        if k != "html" and isinstance(v, (list, dict)):
                            collect(v)
                elif isinstance(o, list):
                    for it in o:
                        collect(it)

            for e in ents:
                collect(e.get("values") if isinstance(e, dict) else e)
            if not parts:
                return ""
            raw = _html_unescape("\n".join(parts))
            # IGN embeds like <youtube>URL</youtube> / <ign-widget> add nothing.
            raw = re.sub(r"<(youtube|ign-[\w-]+|gallery)[^>]*>.*?</\1>", "", raw, flags=re.DOTALL | re.IGNORECASE)
            text = self._strip_noise(self._html_to_text(raw))
            return text
        except Exception as exc:
            try: self._debug_log(f"  IGN __NEXT_DATA__ extraction failed: {exc}")
            except Exception: pass
            return ""

    def _extract_ign_text(self, html_text: str) -> str:
        # v0.43.31: try the Next.js JSON payload FIRST (modern React pages);
        # fall through to the legacy HTML selectors for older wiki pages.
        nd = self._extract_ign_next_data(html_text)
        if nd and len(nd) >= 120:
            return nd
        # v0.42.4: IGN migrated to Next.js with JSX-generated class names. The
        # old selectors (data-cy="article-body" / article-page-content /
        # wiki-content / main-body) no longer exist. The new structure is:
        #   <main data-cy="page-main-content" id="main-content">
        #     <section class="jsx-... wiki-section wiki-html">  [×6 typically]
        #       [walkthrough content]
        #     </section>
        #   </main>
        # Strategy: prefer the wiki-section blocks (most precise), fall back to
        # main-content (broader), then any <main>.
        region = self._extract_html_region(
            html_text,
            selectors=[
                # Prefer the main content container (the wiki page wrapper)
                r'<main[^>]+(?:id="main-content"|data-cy="page-main-content")[^>]*>(.*?)</main>',
                # Then the individual wiki-section blocks (concatenated) — useful
                # when <main> isn't easily delimited
                r'(<section[^>]+class="[^"]*\bwiki-section\b[^"]*"[^>]*>.*?</section>(?:\s*<section[^>]+class="[^"]*\bwiki-section\b[^"]*"[^>]*>.*?</section>)*)',
                # Legacy IGN article structure (older URLs)
                r'<div[^>]+(?:data-cy="article-body"|class="[^"]*(?:article-body|article-page-content|wiki-content|main-body)[^"]*")[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                # Generic fallback
                r'<article[^>]*>(.*?)</article>',
                r'<main[^>]*>(.*?)</main>',
            ],
        )
        if region:
            # Drop IGN-specific UI chrome that nests inside the wrappers
            region = re.sub(r'<aside[^>]*>.*?</aside>', "", region, flags=re.DOTALL | re.IGNORECASE)
            region = re.sub(r'<nav[^>]*>.*?</nav>', "", region, flags=re.DOTALL | re.IGNORECASE)
            # Related / ads / video embeds / IGN player widgets
            region = re.sub(
                r'<div[^>]+class="[^"]*(?:related|advertisement|ad-slot|adunit|video-container|jw-player|pogo-slot|sticky-header)[^"]*"[^>]*>.*?</div>',
                "", region, flags=re.DOTALL | re.IGNORECASE,
            )
            # Drop "In This Wiki Guide" sidebar (now sometimes inside main)
            region = re.sub(
                r'<section[^>]+class="[^"]*\b(?:wiki-header|in-this-wiki|related-pages|object-collection|featured-comments|comments-section)\b[^"]*"[^>]*>.*?</section>',
                "", region, flags=re.DOTALL | re.IGNORECASE,
            )
        text = self._html_to_text(region or html_text)
        text = self._crop_between_text_markers(
            text,
            start_markers=[
                r"\bWalkthrough\b", r"\bGuide\b", r"\bIntroduction\b",
                r"\bChapter\s+\d+\b", r"\bPart\s+\d+\b",
            ],
            end_markers=[
                r"\bUp Next\b",
                r"\bIn This Wiki Guide\b",
                r"\bTable of Contents\b",
                r"\bWas this guide helpful\b",
                r"\bRelated Guides\b",
                r"\bComments?\b\s*\(\d+\)",
                r"\bWritten by\b.*\bIGN[\-\s]Wiki",
            ],
        )
        text = self._strip_noise(text)
        return text

    def _extract_generic_text(self, html_text: str) -> str:
        text = self._html_to_text(html_text)
        text = self._strip_noise(text)
        return text

    def _html_to_text(self, html_text: str) -> str:
        if _HAS_HTML_PARSER:
            parser = _ReadableTextParser()
            parser.feed(html_text)
            parser.close()
            raw = parser.text()
        else:
            raw = _regex_strip_tags(html_text)
        return self._normalize_blank_runs(raw)

    def _normalize_blank_runs(self, text: str) -> str:
        """Collapse runs of 3+ consecutive newlines down to exactly 2.

        HTML extraction tends to emit double-blank-lines around every <p>, <br>,
        and <div> closure, which the frontend renderer then displays as huge
        vertical gaps between mini "paragraphs". One blank line between content
        is enough — anything more is visual noise.
        """
        if not text:
            return text
        # Normalise CRLF first so the regex below catches mixed line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        return re.sub(r"\n{3,}", "\n\n", text)

    def _extract_html_region(self, html_text: str, selectors: list[str]) -> str | None:
        for selector in selectors:
            match = re.search(selector, html_text, flags=re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1)
        return None

    def _looks_like_wayback_alexa_interstitial(self, text: str) -> bool:
        """v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"
        page that Wayback returns when there's NO snapshot of the requested
        URL (or only an Alexa-crawled placeholder). Signature: very short
        content (< 500 chars) starting with the Alexa attribution line.

        When the plugin's _download falls back to Wayback for a Cloudflare-
        blocked URL (e.g. Neoseeker, IGN), Wayback often returns this
        interstitial instead of failing. Without this check the plugin saves
        the meta-text as the guide content. Return True to instruct the
        caller to skip this page."""
        if not text:
            return False
        snippet = text[:600].strip()
        if not snippet:
            return False
        # Strong signal
        if snippet.startswith("Organization: Alexa Crawls"):
            return True
        # Looser: contains the Alexa Crawls signature AND mentions donating crawl data
        if (
            len(text.strip()) < 500
            and "Alexa Crawls" in snippet
            and ("donat" in snippet.lower() or "crawl data" in snippet.lower())
        ):
            return True
        return False

    def _strip_wayback_chrome(self, text: str) -> str:
        """Strip Wayback Machine capture chrome that wraps the actual page.

        When a fetch falls back to web.archive.org, the extracted text starts
        with ~50-150 lines of: capture count, date range, month abbreviations,
        "COLLECTED BY", "TIMESTAMPS", a line like
        `The Wayback Machine - https://web.archive.org/.../original-url`,
        and then potentially more nav cruft before the real page.

        Heuristic: locate the `The Wayback Machine - http` line and keep only
        what's AFTER it. If not found, return text unchanged.
        """
        marker_re = re.compile(r"^\s*The Wayback Machine\s*-\s*https?://", re.IGNORECASE | re.MULTILINE)
        m = marker_re.search(text)
        if not m:
            return text
        # Cut everything up to and including that line
        # Find end-of-line after match start
        nl_pos = text.find("\n", m.end())
        if nl_pos < 0:
            return text  # marker is on the last line, nothing useful after
        return text[nl_pos + 1:].lstrip()

    def _crop_between_text_markers(self, text: str, start_markers: list[str], end_markers: list[str]) -> str:
        # v0.41.1: MULTILINE so callers can use ^ / $ to anchor at line boundaries.
        # Required by the GameFAQs extractor to match its "Guide and Walkthrough
        # (PLATFORM) by AUTHOR" attribution line and skip the UI noise block above it.
        flags = re.IGNORECASE | re.MULTILINE
        start_index = 0
        for pattern in start_markers:
            match = re.search(pattern, text, flags=flags)
            if match:
                start_index = match.start()
                break

        end_index = len(text)
        for pattern in end_markers:
            match = re.search(pattern, text[start_index:], flags=flags)
            if match:
                end_index = start_index + match.start()
                break

        return text[start_index:end_index].strip()

    def _strip_noise(self, text: str) -> str:
        # Protect heading & preformatted markers from per-line cleanup
        lines = text.splitlines()
        cleaned_lines: list[str] = []
        in_pre = False
        # v0.42.2: enriched patterns. The original only caught single-word UI
        # widgets; lots of multi-word boilerplate from non-rpgsoluce/gamefaqs
        # sites was leaking through. These now catch common header/footer/
        # cookie/login/share/print/social UI patterns across English & French.
        noise_patterns = [
            r"^(?:Menu|Navigation|Home|Accueil|Sommaire|Index)$",
            r"^(?:facebook|twitter|x\.com|instagram|youtube|reddit|tiktok|discord|threads|mastodon)$",
            r"^(?:advertisement|publicité|publicite|sponsored)$",
            r"^(?:next|previous|suivant|précédent|precedent)$",
            # Auth / account widgets
            r"^(?:Log\s*in|Sign\s*in|Connexion|Connection|Se\s+connecter|Create\s+account|Cr[ée]er\s+un\s+compte|Register|S[''']?inscrire)\b",
            r"^(?:Sign\s*up|Logout|Sign\s*out|Se\s+d[ée]connecter)\b",
            # Cookie / GDPR / privacy banners
            r"^(?:Accept\s+cookies?|Refuse|Refuser|Manage\s+preferences|G[ée]rer\s+(?:les\s+)?pr[ée]f[ée]rences)\b",
            r"^(?:Cookie\s+policy|Politique\s+(?:des?\s+)?cookies?|GDPR|RGPD|Privacy\s+policy|Politique\s+de\s+confidentialit[ée])\b",
            r"^(?:Terms\s+of\s+use|Conditions\s+(?:g[ée]n[ée]rales|d['']utilisation))\b",
            # Newsletter / subscribe
            r"^(?:Subscribe|S[''']?abonner|Newsletter|Inscription\s+(?:à\s+la\s+)?newsletter)\b",
            # Action buttons (lone)
            r"^(?:Submit|Soumettre|Envoyer|Send|Cancel|Annuler|Save|Sauvegarder|Reset|R[ée]initialiser)$",
            r"^(?:Read\s+more|Lire\s+la\s+suite|Voir\s+plus|Show\s+more|Afficher\s+plus|Continue\s+reading)$",
            # Share / print
            r"^(?:Share|Partager|Tweet|Pin|Print|Imprimer|Email|E-?mail|Copy\s+link|Copier\s+le\s+lien)$",
            # Search / find boxes
            r"^(?:Search|Rechercher|Recherche|Search\s+the\s+site)$",
            # Common single-word menu items (don't be too greedy)
            r"^(?:About|Contact|Privacy|Terms|Help|Aide|FAQ|Forum|Blog|News|Actualit[ée]s?)$",
            # Footer rights/copyright (catches "© <year> Site")
            r"^\s*©\s*\d{4}",
            # v0.42.2 B3: HTML residual fragments left by an imperfect parser
            r"^(?:<!--|-->|<!\[CDATA\[|\]\]>)\s*$",
            r"^</?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^<>]*)?/?>$",
            r"^\{\{[^}]*\}\}$",
            r"^\[\[[^\]]*\]\]$",
            # Hidden HTML artifacts
            r"^(?:[ \s]*)$",  # truly blank including non-breaking spaces
        ]
        for raw_line in lines:
            stripped = raw_line.strip()
            # Track <pre> blocks — keep them verbatim
            if "\x01PRE\x02" in stripped:
                in_pre = True
                cleaned_lines.append(stripped)
                continue
            if "\x01/PRE\x02" in stripped:
                in_pre = False
                cleaned_lines.append(stripped)
                continue
            if in_pre:
                # Preserve every line inside <pre>, even blank ones, verbatim
                cleaned_lines.append(raw_line.rstrip())
                continue

            # Preserve heading markers verbatim
            if self._is_heading_marker_line(stripped):
                cleaned_lines.append(stripped)
                continue

            if not stripped:
                if cleaned_lines and cleaned_lines[-1] != "":
                    cleaned_lines.append("")
                continue
            if len(stripped) <= 2:
                continue
            lowered = stripped.lower()
            if any(re.match(pattern, lowered, flags=re.IGNORECASE) for pattern in noise_patterns):
                continue
            cleaned_lines.append(stripped)

        text = "\n".join(cleaned_lines)
        # Auto-detect ASCII-art / box-drawing / table blocks if no <pre> was present.
        text = self._wrap_ascii_art_blocks(text)
        text = _html_unescape(text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _is_heading_marker_line(self, line: str) -> bool:
        return line.startswith("\x01H") and "\x01/H\x02" in line

    # ------------------------------------------------------------------
    # v0.41 — rpgsoluce.com specific chrome stripping
    # ------------------------------------------------------------------

    def _strip_rpgsoluce_chrome(self, text: str) -> str:
        """Remove rpgsoluce.com boilerplate that the generic strippers miss.

        Targets four distinct parasites observed in stored guides:
        1. `recherche quand campagne -->` — leaked HTML comment closer
        2. Page footer `© YYYY ... / Partenariats : / Puissance Zelda | ...`
        3. Sidebar nav menu block (`Cheminement` + 5-9 flat-list lines)
        4. Random author-attributed citation widget at page bottom

        Safe-by-default: any regex failure or unexpected exception returns
        the input unchanged. Each pattern is anchored and conservative."""
        if not text:
            return text
        try:
            text = _RPGSOLUCE_COMMENT_LEAK_RE.sub("", text)
            text = _RPGSOLUCE_FOOTER_RE.sub("", text)
            text = self._strip_rpgsoluce_menu_block(text)
            # Citation widget: only on short lines (avoid eating prose that
            # happens to end with ", X , YY").
            cleaned_lines: list[str] = []
            for line in text.split("\n"):
                if len(line) <= 200 and _RPGSOLUCE_CITATION_RE.match(line.strip()):
                    continue  # drop the citation line
                cleaned_lines.append(line)
            text = "\n".join(cleaned_lines)
            # Collapse runs of blank lines produced by stripping
            text = re.sub(r"\n{3,}", "\n\n", text)
            return text
        except Exception as exc:
            try: self._debug_log(f"_strip_rpgsoluce_chrome failed: {exc}")
            except Exception: pass
            return text

    def _strip_gamefaqs_chrome(self, text: str) -> str:
        """v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)
        that sits between the page H1 "Guide and Walkthrough" and the real
        author-attributed FAQ content. Identifies the attribution line and
        truncates everything above it.

        Safe-by-default: returns input unchanged if attribution is not found."""
        if not text:
            return text
        try:
            attribution_re = re.compile(
                r"^Guide and Walkthrough\s*\([^\)\n]+\)(?:\s*\([^\)\n]+\))?\s+by\s+\S+",
                re.MULTILINE,
            )
            m = attribution_re.search(text)
            if m:
                return text[m.start():].lstrip()
            return text
        except Exception as exc:
            try: self._debug_log(f"_strip_gamefaqs_chrome failed: {exc}")
            except Exception: pass
            return text

    def _strip_vally8_chrome(self, text: str) -> str:
        """v0.41.1: strip vally8.free.fr boilerplate that repeats at every
        page boundary in multi-page crawls:
        1. Nav menu block (Accueil Vally8 + items down to Forum)
        2. "Voir la suite de la soluce" inter-page link
        3. "Vous pouvez aussi vous rendre sur le forum" invite
        4. "phpMyVisites | Open source web analytics" tracker line

        Safe-by-default: any regex failure returns input unchanged."""
        if not text:
            return text
        try:
            # 1. Nav menu block — from "Accueil Vally8" through "Forum" line.
            # The menu is a vertical list with blank lines between items.
            text = re.sub(
                r"^[ \t]*Accueil Vally8[ \t]*\n"
                r"(?:[ \t]*={3,}[ \t]*\n)?"                # optional ==== underline
                r"(?:[ \t]*\n)*"                            # leading blanks
                r"(?:[^\n]{1,80}[ \t]*\n[ \t]*\n){1,30}"   # 1-30 short items + blank
                r"[ \t]*Forum[ \t]*\n",
                "",
                text,
                flags=re.MULTILINE,
            )
            # 2-4. Single-line footer parasites
            text = re.sub(r"^[ \t]*phpMyVisites[^\n]*$", "", text, flags=re.MULTILINE)
            text = re.sub(r"^[ \t]*Voir la suite de la soluce[ \t]*$", "", text, flags=re.MULTILINE)
            text = re.sub(
                r"^[ \t]*Voir la (?:première|deuxième|troisième|quatrième|cinquième|sixième|septième|huitième) partie[^\n]*$",
                "",
                text,
                flags=re.MULTILINE,
            )
            text = re.sub(
                r"^[ \t]*Vous pouvez aussi vous rendre sur le forum[^\n]*$",
                "",
                text,
                flags=re.MULTILINE,
            )
            # Collapse runs of blanks left behind
            text = re.sub(r"\n{3,}", "\n\n", text)
            return text
        except Exception as exc:
            try: self._debug_log(f"_strip_vally8_chrome failed: {exc}")
            except Exception: pass
            return text

    def _strip_rpgsoluce_menu_block(self, text: str) -> str:
        """Detect and remove the rpgsoluce sidebar nav menu block.

        Signature: a line containing only `Cheminement` followed by 2-12
        non-empty lines forming a flat menu list (no internal sentence
        boundaries). Block terminates at the first blank line.

        Heuristic gates (all required to strip):
        - Block has 2..12 lines
        - At least one line is >= 40 chars (characteristic of dense menu)
        - NO line contains a sentence boundary (lowercase + period + space + uppercase)

        If any gate fails, the `Cheminement` line is left intact — it might
        be a legitimate heading on a landing page."""
        lines = text.split("\n")
        out: list[str] = []
        i = 0
        while i < len(lines):
            if lines[i].strip() == "Cheminement":
                # Collect candidate block (non-empty lines until next blank or cap)
                j = i + 1
                block: list[str] = []
                while j < len(lines):
                    nxt = lines[j].strip()
                    if not nxt:
                        break
                    block.append(nxt)
                    j += 1
                    if len(block) > 12:
                        block = []  # abandon: too long to be a menu
                        break
                is_menu = (
                    2 <= len(block) <= 12
                    and any(len(b) >= 40 for b in block)
                    and not any(_RPGSOLUCE_SENTENCE_BOUNDARY_RE.search(b) for b in block)
                )
                if is_menu:
                    i = j  # skip "Cheminement" + the whole block
                    continue
            out.append(lines[i])
            i += 1
        return "\n".join(out)

    def _wrap_ascii_art_blocks(self, text: str) -> str:
        """Detect dense runs of non-prose lines (tables, ascii-art) and wrap them
        with PRE markers so the frontend can render them in a monospace block."""
        lines = text.splitlines()
        output: list[str] = []
        in_pre_explicit = False
        block: list[str] = []

        def looks_preformatted(line: str) -> bool:
            if len(line) < 3:
                return False
            if "\x01" in line:
                return False
            # Count drawing / separator characters vs alpha
            non_alpha = sum(1 for c in line if not c.isalnum() and not c.isspace())
            alpha = sum(1 for c in line if c.isalnum())
            total = alpha + non_alpha
            if total < 6:
                return False
            # Box-drawing, ASCII bars, tables, big spacing
            if re.search(r"[│┃┆┇┊┋║╎╏╍╏|]{2,}", line):
                return True
            if re.search(r"[─━┄┅┈┉═╌╍]{4,}", line):
                return True
            if re.match(r"^[\-=\*\+#_~\^<>|/\\\s]{8,}$", line):
                return True
            # Tables drawn with pipes
            if line.count("|") >= 3 and alpha >= 3 and alpha < total * 0.6:
                return True
            # Lots of multiple spaces (aligned columns)
            if len(re.findall(r"  {2,}", line)) >= 2 and alpha >= 3:
                return True
            return False

        def flush_block() -> None:
            if len(block) >= 3:
                output.append("\x01PRE\x02")
                output.extend(block)
                output.append("\x01/PRE\x02")
            else:
                output.extend(block)
            block.clear()

        for line in lines:
            if "\x01PRE\x02" in line:
                flush_block()
                output.append(line)
                in_pre_explicit = True
                continue
            if "\x01/PRE\x02" in line:
                output.append(line)
                in_pre_explicit = False
                continue
            if in_pre_explicit:
                output.append(line)
                continue
            if looks_preformatted(line):
                block.append(line)
            else:
                flush_block()
                output.append(line)
        flush_block()
        return "\n".join(output)

    def _remove_leading_duplicate_title(self, text: str, title: str) -> str:
        cleaned_title = self._clean_inline_text(title)
        if not cleaned_title:
            return text.strip()
        lines = [line for line in text.splitlines()]
        title_cf = cleaned_title.casefold()
        while lines:
            first_line = lines[0].strip()
            if not first_line:
                lines.pop(0)
                continue
            # Strip heading marker wrappers before comparing
            marker = re.match(r"^\x01H(\d)\x02(.*?)\x01/H\x02$", first_line)
            compare_text = self._clean_inline_text(marker.group(2) if marker else first_line)
            if compare_text.casefold() == title_cf:
                lines.pop(0)
                continue
            break
        return "\n".join(lines).strip()

    # v0.43.29: vally8 / darklevel URL-slug → readable page title. These sites give
    # EVERY page the same site-name <title> ("Le coin de <jeu>") and repeat their
    # nav as the first content lines, so normal title derivation names every
    # section after the site. The URL slug (soluce.php / perso.php / keyitem.php)
    # is the reliable per-page signal.
    # v0.43.35: map the URL slug of a guide to the GAME NAME, so search results and
    # (later) the library can show which game a result concerns — the page <title>
    # is often useless ("RPG Soluce", "Walkthrough", "Le coin de …").
    _GAME_SLUG_FIXUPS = {
        # slugs that titlecase badly (smushed words / abbreviations) — mostly rpgsoluce/vally8
        "chronocross": "Chrono Cross", "wildarms3": "Wild Arms 3", "wildarms": "Wild Arms",
        "suikoden5": "Suikoden 5", "suikoden3": "Suikoden 3",
        "ff7": "Final Fantasy VII", "ff8": "Final Fantasy VIII", "ff9": "Final Fantasy IX",
        "ff10": "Final Fantasy X", "ff12": "Final Fantasy XII",
        "no-im-not-a-human": "No, I'm not a Human",
    }
    _GAME_SMALL_WORDS = {"of", "the", "and", "a", "an", "to", "for", "in", "on",
                         "de", "la", "le", "les", "du", "des", "not", "im"}
    _GAME_ROMAN_RE = re.compile(r"^(?:i{1,3}|iv|v|vi{0,3}|ix|xi{0,3}|xiv|xv|xvi{0,3})$")

    def _prettify_game_slug(self, slug: str) -> str:
        s = slug.strip().lower()
        if s in self._GAME_SLUG_FIXUPS:
            return self._GAME_SLUG_FIXUPS[s]
        s = re.sub(r"\.(?:html?|php|asp)$", "", s)
        s = re.sub(r"[-_]+", " ", s)
        s = re.sub(r"([a-z])(\d+)$", r"\1 \2", s)  # suikoden5 -> suikoden 5
        s = re.sub(r"\s+", " ", s).strip()
        if not s:
            return ""
        words = s.split(" ")
        out: list[str] = []
        for i, w in enumerate(words):
            if self._GAME_ROMAN_RE.match(w):
                out.append(w.upper())
            elif w.isdigit():
                out.append(w)
            elif i > 0 and w in self._GAME_SMALL_WORDS:
                out.append(w)
            else:
                out.append(w[:1].upper() + w[1:])
        return " ".join(out)

    def _game_name_from_url(self, url: str) -> str:
        """Best-effort game name from the URL slug, per host. Empty if none found."""
        try:
            p = urlparse(url)
        except Exception:
            return ""
        host = (p.hostname or "").casefold()
        segs = [s for s in p.path.split("/") if s]
        slug = ""
        if "gamefaqs" in host:
            for s in segs:
                m = re.match(r"^\d+-(.+)$", s)  # <platform>/<id>-<game>/faqs/…
                if m:
                    slug = m.group(1)
                    break
        elif "ign.com" in host and "wikis" in segs:
            i = segs.index("wikis")
            if i + 1 < len(segs):
                slug = segs[i + 1]
        elif "neoseeker" in host and segs:
            slug = segs[0]
        elif "rpgsoluce" in host and "soluces" in segs:
            i = segs.index("soluces")
            if i + 2 < len(segs):  # soluces/<platform>/<game>/…
                slug = segs[i + 2]
        elif ("vally8" in host or "darklevel" in host) and "jeux" in segs:
            i = segs.index("jeux")
            if i + 1 < len(segs):
                slug = segs[i + 1]
        elif "jeuxvideo.com" in host and segs:
            last = re.sub(r"\.html?$", "", segs[-1])
            slug = re.sub(r"^(?:wiki-de-|guide-complet-de-|soluce-de-|guide-de-)", "", last)
        return self._prettify_game_slug(slug) if slug else ""

    # v0.43.36: page <title>s that say nothing about WHICH game (site name / sub-page
    # label). When a guide's title is one of these, we replace it with the game name
    # derived from the URL so the library isn't full of "RPG Soluce" / "Walkthrough".
    _GENERIC_TITLE_RE = re.compile(
        r"^(?:rpg\s+soluce"
        r"|soluce"
        r"|(?:full\s+)?walkthrough(?:\s*&?\s*(?:and\s+)?guide)?"
        r"|guide(?:\s+complet)?"
        r"|wiki(?:\s+de\b.*)?"
        r"|table\s+of\s+contents"
        r"|introduction|sommaire"
        r"|qu[êe]tes?\s+(?:annexes?|secondaires?))$",
        re.IGNORECASE)
    # Hosts whose page <title> is reliably NOT the game name (IGN sub-page names like
    # "Walkthrough"/"Seekers of Truth"; rpgsoluce's site name) → always prefer the URL.
    _TITLE_PREFER_URL_HOSTS = ("ign.com", "rpgsoluce.com")

    def _looks_generic_title(self, title: str) -> bool:
        return bool(self._GENERIC_TITLE_RE.match((title or "").strip()))

    def _better_guide_title(self, current_title: str, url: str) -> str:
        """Upgrade a useless guide title to the game name (from the URL) when the
        page title doesn't identify the game. Leaves already-informative titles
        (e.g. 'Koudelka', 'Bahamut Lagoon') untouched."""
        t = (current_title or "").strip()
        # vally8/darklevel: "Le coin de <Game>" names the game well — strip the prefix.
        m = re.match(r"^\s*le\s+coin\s+de\s+(.+)$", t, re.IGNORECASE)
        if m and len(m.group(1).strip()) >= 2:
            return self._clean_inline_text(m.group(1))
        host = (urlparse(url).hostname or "").casefold()
        game = self._game_name_from_url(url)
        if game and any(h in host for h in self._TITLE_PREFER_URL_HOSTS):
            return game
        if t and not self._looks_generic_title(t):
            return t
        return game or t

    _VALLY8_SLUG_MAP = {
        "soluce": "Soluce", "solution": "Soluce", "cheminement": "Cheminement",
        "perso": "Personnages", "persos": "Personnages", "personnages": "Personnages",
        "keyitem": "Objets clés", "keyitems": "Objets clés", "objet": "Objets", "objets": "Objets",
        "inventaire": "Inventaire", "index": "Introduction", "intro": "Introduction",
        "arme": "Armes", "armes": "Armes", "magie": "Magie", "magies": "Magies",
        "carte": "Cartes", "cartes": "Cartes", "map": "Cartes", "boss": "Boss",
        "quete": "Quêtes", "quetes": "Quêtes", "sidequest": "Quêtes annexes",
        "astuce": "Astuces", "astuces": "Astuces", "secret": "Secrets", "secrets": "Secrets",
        "competence": "Compétences", "competences": "Compétences", "skill": "Compétences",
        "objectif": "Objectifs", "monstre": "Monstres", "monstres": "Monstres", "ennemi": "Ennemis",
    }

    def _vally8_slug_title(self, slug: str) -> str:
        s = re.sub(r"\.(?:php|html?|asp)$", "", slug, flags=re.IGNORECASE).lower()
        m = re.match(r"^(.+?)(\d+)$", s)  # soluce2 -> ("soluce", "2")
        base, num = (m.group(1), m.group(2)) if m else (s, "")
        name = self._VALLY8_SLUG_MAP.get(base) or (base[:1].upper() + base[1:] if base else "")
        if not name:
            return ""
        return f"{name} (partie {num})" if num else name

    def _derive_page_display_title(
        self,
        page_index: int,
        page_title: str,
        root_title: str,
        page_content: str,
        page_url: str,
    ) -> str:
        # v0.42.15: prefer the clean TOC link text captured during discovery
        # (e.g. JV sommaire chapter names) over the page's own long headline.
        hint = getattr(self, "_chapter_title_hints", {}).get(page_url)
        if hint:
            cleaned_hint = self._clean_inline_text(hint)
            if cleaned_hint and len(cleaned_hint) >= 3:
                return cleaned_hint

        # v0.43.29: vally8/darklevel — name the page from its URL slug.
        _host = (urlparse(page_url).hostname or "").casefold()
        if "vally8.free.fr" in _host or "darklevel.free.fr" in _host:
            _slug = urlparse(page_url).path.rstrip("/").split("/")[-1]
            _vt = self._vally8_slug_title(_slug)
            if _vt:
                return _vt

        candidate = self._clean_inline_text(page_title)
        root_clean = self._clean_inline_text(root_title)

        if candidate and root_clean and candidate.casefold() != root_clean.casefold():
            return candidate

        lines = [self._clean_inline_text(line) for line in page_content.splitlines()]
        for line in lines[:12]:
            if len(line) >= 5 and len(line) <= 110 and not self._looks_like_noise_title(line, root_clean):
                return line

        parsed = urlparse(page_url)
        last_segment = parsed.path.rstrip("/").split("/")[-1]
        if last_segment:
            cleaned_segment = re.sub(r"[-_]+", " ", last_segment)
            cleaned_segment = re.sub(r"\.html?$", "", cleaned_segment, flags=re.IGNORECASE)
            cleaned_segment = re.sub(r"\.htm$", "", cleaned_segment, flags=re.IGNORECASE)
            cleaned_segment = re.sub(r"\s+", " ", cleaned_segment).strip()
            if cleaned_segment and cleaned_segment.casefold() != root_clean.casefold():
                return cleaned_segment

        return f"Page {page_index + 1}"

    def _looks_like_noise_title(self, line: str, root_title: str) -> bool:
        lowered = line.casefold()
        if root_title and lowered == root_title.casefold():
            return True
        if len(line) < 5:
            return True
        if re.search(r"https?://", lowered):
            return True
        if sum(char.isalpha() for char in line) < 3:
            return True
        if re.search(r"^(page\s+\d+|next|previous|suivant|précédent)$", lowered):
            return True
        return False

    def _find_next_page_url(self, current_url: str, html_text: str, extractor: str) -> str | None:
        if _HAS_HTML_PARSER:
            parser = _LinkParser()
            try:
                parser.feed(html_text)
                parser.close()
            except Exception:
                return None
            links = parser.links
        else:
            links = _regex_extract_links(html_text)

        current = urlparse(current_url)
        current_path = current.path.rstrip("/")
        current_query = parse_qs(current.query)
        current_page_num = self._extract_page_number(current_url)

        best_candidate: tuple[int, str] | None = None
        for link in links:
            href = (link.get("href") or "").strip()
            if not href or href.startswith("#") or href.lower().startswith("javascript:"):
                continue

            absolute = urljoin(current_url, href)
            parsed = urlparse(absolute)
            if parsed.scheme not in ALLOWED_SCHEMES:
                continue
            if parsed.hostname != current.hostname:
                continue

            absolute_path = parsed.path.rstrip("/")
            if absolute_path == current_path and parsed.query == current.query:
                continue
            if extractor == "gamefaqs" and "/faqs/" not in absolute_path:
                continue
            if extractor == "rpgsoluce" and not absolute_path:
                continue

            score = self._score_next_link(
                current_url=current_url,
                candidate_url=absolute,
                link=link,
                current_path=current_path,
                current_page_num=current_page_num,
                current_query=current_query,
            )
            if score <= 0:
                continue
            if best_candidate is None or score > best_candidate[0]:
                best_candidate = (score, absolute)

        return best_candidate[1] if best_candidate else None

    def _score_next_link(
        self,
        current_url: str,
        candidate_url: str,
        link: dict[str, str],
        current_path: str,
        current_page_num: int | None,
        current_query: dict[str, list[str]],
    ) -> int:
        text = self._clean_inline_text(" ".join([link.get("text", ""), link.get("title", "")]))
        rel = (link.get("rel") or "").casefold()
        link_class = (link.get("class") or "").casefold()
        link_id = (link.get("id") or "").casefold()
        candidate = urlparse(candidate_url)
        score = 0

        if any(token in rel for token in ["next", "sibling-next"]):
            score += 80
        if any(token in text.casefold() for token in [">", ">>", "next", "suivant", "suite", "chapitre suivant", "page suivante"]):
            score += 50
        if any(token in link_class for token in ["next", "suivant", "nav-next", "pagination-next"]):
            score += 35
        if any(token in link_id for token in ["next", "suivant"]):
            score += 35

        candidate_page_num = self._extract_page_number(candidate_url)
        if current_page_num is not None and candidate_page_num is not None:
            if candidate_page_num == current_page_num + 1:
                score += 40
            elif candidate_page_num > current_page_num + 1:
                score += 5
            elif candidate_page_num <= current_page_num:
                score -= 60

        if candidate.path.rstrip("/") != current_path:
            if self._same_article_family(current_url, candidate_url):
                score += 25
            else:
                score -= 20
        else:
            candidate_query = parse_qs(candidate.query)
            if "page" in candidate_query and "page" in current_query:
                try:
                    if int(candidate_query["page"][0]) == int(current_query["page"][0]) + 1:
                        score += 40
                except Exception:
                    pass

        if len(text) > 50:
            score -= 10
        if re.search(r"comment|login|connexion|accueil|home|forum", text.casefold()):
            score -= 100

        return score

    def _extract_page_number(self, url: str) -> int | None:
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        if "page" in query:
            try:
                return int(query["page"][0])
            except Exception:
                return None

        path = parsed.path.rstrip("/")
        patterns = [
            r"(?:page|p|chapitre|chapter)[-_]?(\d+)$",
            r"(?:page|p|chapitre|chapter)[-_]?(\d+)\.html?$",
            r"(\d+)\.html?$",
            r"/(\d+)$",
        ]
        for pattern in patterns:
            match = re.search(pattern, path, flags=re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except Exception:
                    return None
        return None

    def _same_article_family(self, first_url: str, second_url: str) -> bool:
        first = urlparse(first_url)
        second = urlparse(second_url)
        if first.hostname != second.hostname:
            return False
        first_parts = [part for part in first.path.split("/") if part]
        second_parts = [part for part in second.path.split("/") if part]
        if len(first_parts) < 2 or len(second_parts) < 2:
            return first.path.rsplit("/", 1)[0] == second.path.rsplit("/", 1)[0]
        return first_parts[:-1] == second_parts[:-1]

    def _content_signature(self, text: str) -> str:
        normalized = re.sub(r"\s+", " ", text).strip().casefold()
        return normalized[:4000]

    def _cap_sections(self, sections: list[GuideSection], lines: list[str]) -> list[GuideSection]:
        """v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old
        `sections[:MAX_SECTION_COUNT]` dropped every section past the cap, and
        since the reader renders section-by-section, all their content became
        unreachable (chrono cross: 65% of the walkthrough invisible). Here the
        last kept section is stretched to EOF so the tail stays readable."""
        if len(sections) <= MAX_SECTION_COUNT:
            return sections
        kept = list(sections[:MAX_SECTION_COUNT])
        last = kept[-1]
        eof = len(lines) - 1
        if last.line_end < eof:
            kept[-1] = GuideSection(
                title=last.title, line_start=last.line_start, line_end=eof,
                heading_level=last.heading_level, is_preformatted=last.is_preformatted,
            )
        self._debug_log(f"  _cap_sections: {len(sections)} -> {MAX_SECTION_COUNT} (last stretched to EOF line {eof})")
        return kept

    def _build_sections(self, content: str) -> list[GuideSection]:
        """Back-compat wrapper that drops the detection method.
        Prefer _build_sections_with_method when you need the method label."""
        sections, _ = self._build_sections_with_method(content)
        return sections

    def _build_sections_with_method(self, content: str) -> tuple[list[GuideSection], str]:
        """Detect section boundaries in a guide's plain text. Returns (sections, method).

        Strategy (first method that yields ≥ 2 quality sections wins):
          1. HTML heading markers left by the parser (web guides w/ real h1-h6)
          2. GameFAQs-style [CODE] table-of-contents → anchor each code in body
          3. ASCII banners: "====" / title / "====" or "title\n======"
          4. Heuristic (uppercase / chapter-keyword / numbered)

        All paths go through a merge pass that removes sections shorter than
        MIN_SECTION_CONTENT_LINES lines of real content.

        The returned method is one of: "headings" | "toc_codes" | "banners" | "heuristic" | "none".
        """
        lines = content.splitlines()
        total = len(lines)
        if total < 10:
            return [], "none"

        # --- PASS 1: explicit HTML headings ---
        heading_indexes: list[tuple[int, int, str]] = []
        for index, raw_line in enumerate(lines):
            stripped = raw_line.strip()
            m = re.match(r"^\x01H(\d)\x02(.*?)\x01/H\x02$", stripped)
            if m:
                level = int(m.group(1))
                title = m.group(2).strip()
                if title:
                    heading_indexes.append((index, level, title))
        if len(heading_indexes) >= 2:
            levels_used = {level for _, level, _ in heading_indexes}
            primary_levels = {1, 2, 3}
            if len(primary_levels & levels_used) < 2:
                primary_levels = {1, 2, 3, 4}
            filtered = [item for item in heading_indexes if item[1] in primary_levels]
            if len(filtered) < 2:
                filtered = heading_indexes
            sections = self._sections_from_starts(
                [(idx, title, level) for idx, level, title in filtered],
                lines,
            )
            sections = self._merge_small_sections(sections, lines)
            if len(sections) >= 2:
                sections = self._split_large_sections(sections, lines)
                # v0.42.0: polish titles before returning (all paths)
                sections = self._polish_section_titles(sections)
                return self._cap_sections(sections, lines), "headings"

        # --- PASS 2: GameFAQs-style TOC with [CODE] anchors ---
        toc_sections = self._sections_from_toc_codes(lines)
        if len(toc_sections) >= 2:
            toc_sections = self._merge_small_sections(toc_sections, lines)
            if len(toc_sections) >= 2:
                toc_sections = self._split_large_sections(toc_sections, lines)
                toc_sections = self._polish_section_titles(toc_sections)
                return self._cap_sections(toc_sections, lines), "toc_codes"

        # --- PASS 2a-star: GameFAQs TOC with *CODE search markers (Koudelka) ---
        # Some GameFAQs FAQs anchor sections with *CODE (asterisk) instead of
        # [CODE] brackets, with a real 2-level hierarchy (Walkthrough → Disc One…).
        star_sections = self._sections_from_asterisk_toc(lines)
        if len(star_sections) >= 2:
            # NB: no _merge_small_sections here — every *CODE entry is an intentional
            # TOC section, and merging would swallow short parent headings like the
            # "Lists" intro (breaking the Lists → i-viii hierarchy). Only split large.
            star_sections = self._split_large_sections(star_sections, lines)
            star_sections = self._polish_section_titles(star_sections)
            return self._cap_sections(star_sections, lines), "toc_codes"

        # --- PASS 2a-dot: GameFAQs TOC with "Title …dots… CODE" + |CODE| body ---
        # French FF IX FAQ etc.: clean titles in the TOC, codes re-stated as |CODE|
        # in the body. Without this it falls to banners with garbage titles.
        dot_sections = self._sections_from_dotcode_toc(lines)
        if len(dot_sections) >= 2:
            # No split/merge: the TOC already anchors each location; splitting would
            # re-derive garbage titles from the |CODE| body banners.
            dot_sections = self._polish_section_titles(dot_sections)
            return self._cap_sections(dot_sections, lines), "toc_codes"

        # --- PASS 2b: numbered/lettered TOC without [CODE] markers ---
        # Older GameFAQs FAQs (pre-2005-ish, dan_crenshaw era) use a TOC like
        # "4a. Hugo Chapter 1" / "4b. Chris Chapter 1" with no bracketed code.
        numbered_toc_sections = self._sections_from_numbered_toc(lines)
        if len(numbered_toc_sections) >= 2:
            numbered_toc_sections = self._merge_small_sections(numbered_toc_sections, lines)
            if len(numbered_toc_sections) >= 2:
                numbered_toc_sections = self._split_large_sections(numbered_toc_sections, lines)
                numbered_toc_sections = self._polish_section_titles(numbered_toc_sections)
                return self._cap_sections(numbered_toc_sections, lines), "numbered_toc"

        # --- PASS 3: ASCII banners ---
        banner_sections = self._sections_from_ascii_banners(lines)
        if len(banner_sections) >= 2:
            banner_sections = self._merge_small_sections(banner_sections, lines)
            if len(banner_sections) >= 2:
                banner_sections = self._split_large_sections(banner_sections, lines)
                banner_sections = self._polish_section_titles(banner_sections)
                return self._cap_sections(banner_sections, lines), "banners"

        # --- PASS 4: heuristic fallback (stricter than before) ---
        heuristic_sections = self._sections_from_heuristic(lines)
        if heuristic_sections:
            heuristic_sections = self._merge_small_sections(heuristic_sections, lines)
            heuristic_sections = self._split_large_sections(heuristic_sections, lines)
            heuristic_sections = self._polish_section_titles(heuristic_sections)
            return self._cap_sections(heuristic_sections, lines), "heuristic"

        # --- PASS 5 (v0.42.4): force-pagination fallback ---
        # If NO method produced 2+ sections, the guide would render as one
        # huge unstructured page. That's the case for prose-only guides like
        # vally8 where sentences are NOT valid heading candidates (C3 rightly
        # rejects them). Chunk the content into reasonable pages so the user
        # can still navigate. Title format: "Page N/M".
        if total > self.FORCED_PAGINATION_CHUNK * 2:
            chunk = self.FORCED_PAGINATION_CHUNK
            forced: list[GuideSection] = []
            page_count = (total + chunk - 1) // chunk  # ceil
            for page_num, chunk_start in enumerate(range(0, total, chunk), start=1):
                chunk_end = min(chunk_start + chunk - 1, total - 1)
                forced.append(GuideSection(
                    title=f"Page {page_num}/{page_count}",
                    line_start=chunk_start,
                    line_end=chunk_end,
                    heading_level=2,
                ))
            if len(forced) >= 2:
                try: self._debug_log(f"  forced-pagination fallback: {len(forced)} pages of {chunk} lines")
                except Exception: pass
                return self._cap_sections(forced, lines), "forced-pages"
        return [], "none"

    # ==================================================================
    # v0.42.0 — Section title polish (sidebar UX)
    # ==================================================================

    # Separators that mark a hierarchical title boundary ("Parent — Child").
    # `—` (em-dash), `-`, and `:` all qualify when surrounded by whitespace.
    _TITLE_SEPARATOR_RE = re.compile(r"(\s+[—–\-:]\s+)")
    # ASCII decoration to trim from title ends.
    _TITLE_TRAIL_DECOR_RE = re.compile(r"[\s\-=_~*#|]{3,}$")
    # Existing (suite N) / (suite 2) suffix from _split_large_sections forced
    # pagination — also catches "(1/3)" once we've numbered things.
    _TITLE_SUITE_SUFFIX_RE = re.compile(r"\s*\((?:suite\s*)?\d+(?:/\d+)?\)\s*$", re.IGNORECASE)
    # v0.43.8: GameFAQs "search code" FAQs put a dotted-leader TOC tail on titles
    # ("Sidequest: The Gargoyle .............… — CHARACTER…") and a trailing
    # search code ("....................*INTRO"). Cut from the first run of 4+
    # dots (or a leading unicode ellipsis) onward.
    _TITLE_LEADER_RE = re.compile(r"\s*\.{4,}.*$")
    _TITLE_TRAIL_ELLIPSIS_RE = re.compile(r"\s*….*$")
    # v0.42.2: title length cap. Anything over this in the sidebar becomes
    # unreadable on Steam Deck. Lower than the 70 used by forced pagination
    # because sidebar slots are narrower than the heading line itself.
    TITLE_MAX_CHARS = 55

    # v0.42.9: stopwords (FR + EN) used to detect prose-as-heading.
    _PROSE_STOPWORDS_RE = re.compile(
        r"\b(?:the|and|with|that|this|your|you|are|was|were|will|from|into|have|has|had|"
        r"been|but|not|all|when|which|who|whom|once|gets|get|"
        r"de|la|le|les|une|un|des|du|que|qui|quoi|dans|pour|avec|sur|sans|"
        r"est|sont|été|être|fait|faire|vous|nous|ils|elles|ainsi|aussi|"
        r"plusieurs|quelques|voici|voilà)\b",
        re.IGNORECASE,
    )

    def _is_prose_heading(self, title: str) -> bool:
        """v0.42.9: True if `title` looks like a prose sentence / mid-content
        fragment wrongly promoted to a section heading, rather than a real
        topical heading.

        CONSERVATIVE (high precision): protects structural headings (banners,
        chapter markers, numbered, all-caps) and short noun-phrase labels.
        Only flags clear prose — long sentences, multi-sentence fragments,
        wordy colon lead-ins, truncated prose, embedded game-data lines, and
        repeated-word colon junk. Tuned against the real guide dump so it does
        NOT eat 'How to Recruit:', 'Personal Skills:', 'Mueller joins...' etc."""
        t = (title or "").strip()
        if not t:
            return False
        # --- Protect structural headings ---
        if "|" in t:                                    # banner: | ALEXANDRIE |
            return False
        if t.startswith("->") or t.startswith("=") or t.startswith("*"):
            return False
        if re.match(r"^(?:chapter|chapitre|part|partie|section|episode|acte|disc|cd|prologue|epilogue|ending|fin)\b", t, re.IGNORECASE):
            return False
        if re.match(r"^[IVXLC]{1,5}[\.\)]\s", t):       # roman numeral list
            return False
        letters = [c for c in t if c.isalpha()]
        if letters and sum(1 for c in letters if c.isupper()) >= 0.7 * len(letters) and len(t.split()) >= 3:
            return False                                # spaced-caps banner / ALL CAPS heading
        words = [w for w in re.split(r"\s+", t) if w]
        wc = len(words)
        # --- Flag prose ---
        # 1. Repeated-word colon junk: "Talents : Talents :"
        if re.match(r"^(.{2,30}?)\s*:\s*\1\s*:?\s*$", t):
            return True
        # 2. Internal sentence boundary (multi-sentence fragment)
        if re.search(r"[a-zà-ÿ][.!?]\s+[A-ZÀ-Ÿ]", t):
            return True
        # 3. Ends with sentence punctuation AND wordy (>=6 words)
        if t[-1] in ".!?" and wc >= 6:
            return True
        # 4. Ends with colon AND wordy (>=5 words) = prose lead-in
        if t.rstrip().endswith(":") and wc >= 5:
            return True
        # 5. Truncated prose: ends with ellipsis AND wordy
        if (t.endswith("…") or t.endswith("...")) and wc >= 5:
            return True
        # 6. Embedded game-data line: "(HP: 150)", "[33 Gil]"
        if (re.search(r"\(\s*HP\s*:\s*\d+", t, re.IGNORECASE) or re.search(r"\[\s*\d+\s*(?:Gil|gil|PO|HP|MP)\b", t)) and wc >= 4:
            return True
        # 7. High stopword density = prose — BUT only when the line ALSO looks
        # sentence-shaped (ends in sentence punctuation OR starts lowercase).
        # v0.42.15: French chapter titles are noun phrases full of articles
        # ("Les services de la taverne et les bibliothèques Menzzoriennes") and
        # would be false-flagged by stopword count alone. Requiring a
        # sentence-like shape preserves them while still catching real prose.
        if wc >= 6 and len(self._PROSE_STOPWORDS_RE.findall(t)) >= 3:
            if t[-1] in ".!?:" or t[0].islower():
                return True
        return False

    def _merge_prose_titled_sections(self, sections: list[GuideSection]) -> list[GuideSection]:
        """v0.42.9: absorb prose-titled sections into their neighbor (previous,
        or next if it's the first). Content is preserved — only the spurious
        boundary is removed. Keeps the surviving section's title.

        v0.42.10 SIZE GUARD: only merge if the result stays under
        SPLIT_LARGE_THRESHOLD lines. Without this, a chain of consecutive
        prose-titled sections (e.g. a 1800-line prose block that forced-
        pagination chopped into 250-line pieces, all sharing the same prose
        title) would re-fuse into a single 1000+ line monster — endless scroll
        on the Deck, worse than the original. When merging would exceed the
        cap, keep the prose section standalone: an ugly title is better than
        an un-navigable blob."""
        if len(sections) < 2:
            return sections
        cap = self.SPLIT_LARGE_THRESHOLD

        def size(s: GuideSection) -> int:
            return s.line_end - s.line_start + 1

        out: list[GuideSection] = []
        for sec in sections:
            if self._is_prose_heading(sec.title or "") and out:
                prev = out[-1]
                if size(prev) + size(sec) <= cap:
                    # Safe to absorb: result stays navigable.
                    out[-1] = GuideSection(
                        title=prev.title,
                        line_start=prev.line_start,
                        line_end=max(prev.line_end, sec.line_end),
                        heading_level=prev.heading_level,
                        is_preformatted=prev.is_preformatted,
                    )
                    continue
                # else: too big to merge — keep standalone (no monster).
            out.append(sec)
        # Edge case: FIRST section prose — fold into next only if it stays small.
        if len(out) >= 2 and self._is_prose_heading(out[0].title or ""):
            if size(out[0]) + size(out[1]) <= cap:
                merged_first = GuideSection(
                    title=out[1].title,
                    line_start=out[0].line_start,
                    line_end=out[1].line_end,
                    heading_level=out[1].heading_level,
                    is_preformatted=out[1].is_preformatted,
                )
                out = [merged_first] + out[2:]
        return out

    def _looks_letter_spaced(self, title: str) -> bool:
        """v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS
        banner ("E N D  O F  D I S C  O N E") — i.e. mostly single-character
        tokens. Conservative: needs >=4 single-char tokens AND >=60% of tokens
        being single chars, so normal titles ("A1. Getting out of the Attic")
        never trigger."""
        toks = [t for t in title.split(" ") if t]
        if len(toks) < 5:
            return False
        singles = sum(1 for t in toks if len(t) == 1 and t.isalpha())
        return singles >= 4 and singles >= 0.6 * len(toks)

    def _unspace_title(self, title: str) -> str:
        """v0.43.8: rebuild a letter-spaced banner into words. Word boundaries
        survive extraction as DOUBLE spaces ("D U N G E O N  T O  S H R I N E"),
        so split on 2+ spaces to get words. Inside each word, merge runs of
        single-character tokens into one word but keep multi-char tokens (like a
        "2E." / "vi." prefix) separate so their trailing space is preserved.
          "E N D  O F  D I S C  O N E" -> "END OF DISC ONE"
          "2E.  D U N G E O N  T O  S H R I N E" -> "2E. DUNGEON TO SHRINE"
          "vi. S A V E  L O C A T I O N S" -> "vi. SAVE LOCATIONS"
        """
        out_words: list[str] = []
        for chunk in re.split(r" {2,}", title.strip()):
            parts: list[str] = []
            buf = ""
            for tok in (t for t in chunk.split(" ") if t):
                if len(tok) == 1:
                    buf += tok
                else:
                    if buf:
                        parts.append(buf); buf = ""
                    parts.append(tok)
            if buf:
                parts.append(buf)
            joined = " ".join(parts)
            if joined:
                out_words.append(joined)
        return " ".join(out_words)

    def _clean_spaced_and_leader_title(self, title: str) -> str:
        """v0.43.8: drop the dotted-leader TOC tail, then un-space if the title
        is a letter-spaced banner. Best-effort — falls back to the original if
        the result would be empty."""
        t = title or ""
        t = self._TITLE_LEADER_RE.sub("", t)          # kill "....CODE" / "....… — X" tail
        t = self._TITLE_TRAIL_ELLIPSIS_RE.sub("", t)  # kill a bare trailing "…"
        t = t.strip()
        if self._looks_letter_spaced(t):
            t = self._unspace_title(t)
        t = re.sub(r"\s{2,}", " ", t).strip()
        return t or (title or "").strip()

    def _normalize_gamefaqs_titles(self, sections: list[GuideSection]) -> list[GuideSection]:
        """v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and
        un-space letter-spaced banners so the sidebar is readable and the later
        prose/duplicate passes see the real title text."""
        out: list[GuideSection] = []
        for s in sections:
            nt = self._clean_spaced_and_leader_title(s.title or "")
            if nt and nt != (s.title or ""):
                out.append(GuideSection(
                    title=nt,
                    line_start=s.line_start,
                    line_end=s.line_end,
                    heading_level=s.heading_level,
                    is_preformatted=s.is_preformatted,
                ))
            else:
                out.append(s)
        return out

    def _polish_section_titles(self, sections: list[GuideSection]) -> list[GuideSection]:
        """v0.42.0: clean up section titles for sidebar readability.

        Three transformations in order:
        1. Trim trailing ASCII decoration: ``"Bataille à Lelcar---"`` → ``"Bataille à Lelcar"``
        2. Strip inherited prefixes when 3+ consecutive sections share a long
           parent prefix ending at a hierarchical separator: keep the leading
           section's full title (as the parent), strip ``"Prefix — "`` from
           all followers. Greatly shortens GameFAQs author-tabled prefixes.
        3. Number consecutive same-title duplicates ``A`` ``A`` ``A`` →
           ``A (1/3)`` ``A (2/3)`` ``A (3/3)``. Replaces the inconsistent
           ``(suite N)`` from forced pagination with a clear position marker.

        All transformations are best-effort: if a transformation would leave
        a section with an empty title, the original is restored."""
        if not sections:
            return sections
        try:
            # v0.42.9: STEP 0 — merge sections whose TITLE is prose/garbage
            # (mid-content sentences wrongly promoted to headings by banners /
            # numbered_toc / heuristic-during-split). Absorbs them into the
            # previous section so no content is lost, just the bogus boundary.
            n_before_merge = len(sections)
            sections = self._merge_prose_titled_sections(sections)
            if len(sections) != n_before_merge:
                try: self._debug_log(f"  prose-merge: {n_before_merge} -> {len(sections)} sections")
                except Exception: pass
            # Snapshot BEFORE so we can log how much each pass changed.
            before = [s.title or "" for s in sections]
            sections = self._trim_trailing_title_decoration(sections)
            after_trim = [s.title or "" for s in sections]
            sections = self._strip_inherited_prefixes(sections)
            # v0.43.8: NOW that inherited "parent …leader… — " prefixes are
            # stripped (leaving the real child title), clean any residual
            # dotted-leader tail and un-space letter-spaced banners
            # ("E N D  O F  D I S C  O N E" -> "END OF DISC ONE"). Placed AFTER
            # prefix-strip on purpose: running it earlier would eat the "— child"
            # part that prefix-strip needs to recover the real title.
            sections = self._normalize_gamefaqs_titles(sections)
            after_prefix = [s.title or "" for s in sections]
            sections = self._number_consecutive_duplicates(sections)
            after_number = [s.title or "" for s in sections]
            # v0.42.2: 4th pass — truncate any title still over TITLE_MAX_CHARS.
            # Necessary because prefix-strip helps SOME guides but not all
            # (single titles with no shared prefix slip through). Length cap
            # catches phrase-as-title pollution from heuristic detection too.
            sections = self._truncate_long_titles(sections)
            after_trunc = [s.title or "" for s in sections]
            # Diagnostic: log how many titles each pass mutated.
            ch_trim = sum(1 for b, a in zip(before, after_trim) if b != a)
            ch_pref = sum(1 for b, a in zip(after_trim, after_prefix) if b != a)
            ch_num = sum(1 for b, a in zip(after_prefix, after_number) if b != a)
            ch_trunc = sum(1 for b, a in zip(after_number, after_trunc) if b != a)
            total_changed = sum(1 for b, a in zip(before, after_trunc) if b != a)
            try:
                self._debug_log(
                    f"  _polish_section_titles: {len(sections)} sections | "
                    f"trim={ch_trim} prefix={ch_pref} number={ch_num} trunc={ch_trunc} total={total_changed}"
                )
                # If something changed, log a sample of the first few transformations
                if total_changed:
                    samples = 0
                    for i, (b, a) in enumerate(zip(before, after_trunc)):
                        if b != a:
                            self._debug_log(f"    [{i}] {b[:60]!r} -> {a[:60]!r}")
                            samples += 1
                            if samples >= 5:
                                break
            except Exception: pass
            return sections
        except Exception as exc:
            try: self._debug_log(f"_polish_section_titles failed: {exc}")
            except Exception: pass
            return sections

    # v0.42.3: titles of FAQ meta-sections that pollute the sidebar without
    # carrying walkthrough content. Pre-populated in hidden_section_titles
    # at import time; user can unhide via the "Afficher masquées" toggle.
    _META_FAQ_TITLE_RES = [
        re.compile(r"^(?:AUTEUR|AUTHOR|AUTHORS?)\s*$", re.IGNORECASE),
        re.compile(r"^(?:CR[ÉE]DITS?|CREDITS?|REMERCIEMENTS?|ACKNOWLEDG(?:E?MENTS?))\s*$", re.IGNORECASE),
        re.compile(r"^(?:VERSION|VERSION\s+HISTORY|REVISION\s+HISTORY|CHANGELOG|HISTORIQUE)\s*$", re.IGNORECASE),
        re.compile(r"^(?:DISCLAIMER|DISCLAIMERS?|MENTIONS?\s+L[ÉE]GALES?|D[ÉE]NI\s+DE\s+RESPONSABILIT[ÉE])\s*$", re.IGNORECASE),
        re.compile(r"^(?:LICEN[CS]E|LICEN[CS]E\s+AGREEMENT|DROITS?(?:\s+D['']AUTEUR)?|COPYRIGHT)\s*$", re.IGNORECASE),
        re.compile(r"^(?:INTRO|INTRODUCTION|PR[ÉE]FACE|PREAMBULE|PR[ÉE]AMBULE|FOREWORD|FOREWARD|AVANT[\-\s]PROPOS)\s*$", re.IGNORECASE),
        re.compile(r"^(?:TABLE\s+(?:DES?\s+)?MATI[ÈE]RES?|TABLE\s+OF\s+CONTENTS?|TOC|CONTENTS?|SOMMAIRE|INDEX)\s*$", re.IGNORECASE),
        re.compile(r"^(?:CONTACT|CONTACT\s+(?:INFO|ME)|FEEDBACK|EMAIL|E-?MAIL|COURRIEL)\s*$", re.IGNORECASE),
        re.compile(r"^(?:FAQ\s*-?\s*INFO|FAQ\s+INFORMATIONS?|GUIDE\s+INFO)\s*$", re.IGNORECASE),
        re.compile(r"^(?:LEGAL|LEGAL\s+(?:INFO|STUFF|NOTICE)|TERMS\s+(?:OF\s+USE)?)\s*$", re.IGNORECASE),
        re.compile(r"^(?:UPDATES?\s+HISTORY|UPDATE\s+LOG)\s*$", re.IGNORECASE),
    ]

    def _detect_meta_faq_section_titles(
        self, sections: list[GuideSection], content: str
    ) -> list[str]:
        """v0.42.3: identify section titles that look like FAQ meta-content
        (author, credits, version, disclaimer, etc.) so they can be auto-hidden
        in the sidebar by default. User can unhide via the toggle.

        Returns a list of EXACT title strings (as currently in `sections`),
        suitable for pre-populating `progress.hidden_section_titles`."""
        if not sections:
            return []
        out: list[str] = []
        seen: set[str] = set()
        # Only consider the first ~8 sections AND the last ~5 sections — meta
        # content typically lives at the top (intro, author info, TOC) or the
        # bottom (credits, version history, disclaimer).
        head_idx = list(range(min(8, len(sections))))
        tail_idx = [i for i in range(max(0, len(sections) - 5), len(sections)) if i not in head_idx]
        candidates = head_idx + tail_idx
        for idx in candidates:
            sec = sections[idx]
            title = (sec.title or "").strip()
            if not title or title in seen:
                continue
            for pattern in self._META_FAQ_TITLE_RES:
                if pattern.match(title):
                    out.append(title)
                    seen.add(title)
                    break
        if out:
            try: self._debug_log(f"  auto-hide meta-FAQ sections: {out}")
            except Exception: pass
        return out

    def _truncate_long_titles(self, sections: list[GuideSection]) -> list[GuideSection]:
        """v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest
        word boundary and appending ellipsis. Keeps the start (the most
        identifying part) and ensures the sidebar stays scannable."""
        if not sections:
            return sections
        max_len = self.TITLE_MAX_CHARS
        out: list[GuideSection] = []
        for s in sections:
            t = (s.title or "").strip()
            if len(t) <= max_len:
                out.append(s)
                continue
            # Cut at the last whitespace before max_len-1 so the ellipsis fits
            cut = max_len - 1
            slice_ = t[:cut]
            ws = slice_.rfind(" ")
            if ws >= int(max_len * 0.6):  # don't cut TOO short
                slice_ = slice_[:ws]
            new_title = slice_.rstrip(" -:—,.") + "…"
            if new_title and new_title != t:
                out.append(GuideSection(
                    title=new_title,
                    line_start=s.line_start,
                    line_end=s.line_end,
                    heading_level=s.heading_level,
                    is_preformatted=s.is_preformatted,
                ))
            else:
                out.append(s)
        return out

    def _trim_trailing_title_decoration(self, sections: list[GuideSection]) -> list[GuideSection]:
        out: list[GuideSection] = []
        for s in sections:
            new_title = self._TITLE_TRAIL_DECOR_RE.sub("", s.title or "").strip()
            if new_title and new_title != s.title:
                out.append(GuideSection(
                    title=new_title,
                    line_start=s.line_start,
                    line_end=s.line_end,
                    heading_level=s.heading_level,
                    is_preformatted=s.is_preformatted,
                ))
            else:
                out.append(s)
        return out

    def _strip_inherited_prefixes(self, sections: list[GuideSection]) -> list[GuideSection]:
        """When 3+ consecutive sections share a prefix of >= 25 chars ending at
        a hierarchical separator, drop the prefix on followers (keep first)."""
        if len(sections) < 3:
            return sections
        out = list(sections)
        i = 0
        while i < len(out) - 2:
            title_i = out[i].title or ""
            sep_match = self._TITLE_SEPARATOR_RE.search(title_i)
            if not sep_match or sep_match.start() < 25:
                i += 1
                continue
            prefix = title_i[:sep_match.start()]
            sep_str = sep_match.group(1)
            prefix_with_sep = prefix + sep_str
            run_end = i + 1
            while run_end < len(out):
                t = out[run_end].title or ""
                if t.startswith(prefix_with_sep) and len(t) > len(prefix_with_sep):
                    run_end += 1
                else:
                    break
            if run_end - i >= 3:
                # Keep [i] (parent), strip prefix from [i+1..run_end).
                for j in range(i + 1, run_end):
                    suffix = (out[j].title or "")[len(prefix_with_sep):].strip()
                    if suffix and len(suffix) >= 2:
                        out[j] = GuideSection(
                            title=suffix,
                            line_start=out[j].line_start,
                            line_end=out[j].line_end,
                            heading_level=out[j].heading_level,
                            is_preformatted=out[j].is_preformatted,
                        )
                i = run_end
            else:
                i += 1
        return out

    def _number_consecutive_duplicates(self, sections: list[GuideSection]) -> list[GuideSection]:
        """When N+ consecutive sections share the same base title (ignoring any
        ``(suite K)`` differentiator), rewrite as ``Title (k/N)`` so the user
        sees progression in the sidebar instead of identical rows."""
        if len(sections) < 2:
            return sections
        def base_title(t: str) -> str:
            return self._TITLE_SUITE_SUFFIX_RE.sub("", t or "").strip()
        out = list(sections)
        i = 0
        while i < len(out):
            b = base_title(out[i].title or "")
            if not b:
                i += 1
                continue
            run_end = i + 1
            while run_end < len(out) and base_title(out[run_end].title or "") == b:
                run_end += 1
            run_len = run_end - i
            if run_len >= 2:
                # v0.43.25: a run of 3+ paginated pieces becomes a COLLAPSIBLE
                # GROUP — the first piece is the parent (heading_level 2, clean
                # title) and the rest are children (heading_level 3). The reader's
                # buildTocGroups then nests them, so "BIG ALIEN ×12" is one
                # expandable entry instead of 12 flat rows. Runs of 2 stay flat.
                group = run_len >= 3
                for k in range(run_len):
                    idx = i + k
                    if group and k == 0:
                        new_title, new_level = b, 2
                    elif group:
                        new_title, new_level = f"{b} — {k + 1}/{run_len}", 3
                    else:
                        new_title, new_level = f"{b} ({k + 1}/{run_len})", out[idx].heading_level
                    out[idx] = GuideSection(
                        title=new_title,
                        line_start=out[idx].line_start,
                        line_end=out[idx].line_end,
                        heading_level=new_level,
                        is_preformatted=out[idx].is_preformatted,
                    )
            i = run_end
        return out

    SPLIT_LARGE_THRESHOLD = 350       # lines — sections beyond this get sub-segmented if possible
    SPLIT_MIN_SUB_LINES = 30          # don't create sub-sections shorter than this — avoids over-splitting
    # Tightened in v0.20: force-paginate ANY oversized section that semantic split can't break down.
    # Previously 800 left a "no-man's land" (sections 350-800 with no inner banners stayed huge).
    FORCED_PAGINATION_THRESHOLD = 350
    FORCED_PAGINATION_CHUNK = 250     # forced page size in lines (UX sweet spot for Steam Deck reader)
    # v0.42.18: char-based thresholds. Some sources (jeuxvideo.com news articles)
    # are char-heavy but line-light — long paragraphs, few line breaks — so the
    # line-based pagination never triggers and a single section holds 8000+ chars
    # (endless scroll on the Deck). A section is ALSO "large" if it exceeds
    # CHAR_SPLIT_THRESHOLD, and forced pagination caps each page at both a char
    # budget and the line budget above.
    # v0.42.20: tuned smaller for finer cuts on prose sources (JV). Guarded so
    # it only fires on PROSE sections (high avg line length) — line-heavy FAQ
    # guides (GameFAQs/rpgsoluce, ~70 chars/line hard-wrapped) are NOT char-split
    # even when their char count is high, since they're already line-paginated.
    CHAR_SPLIT_THRESHOLD = 2000       # chars — prose sections beyond this get paginated
    CHAR_PAGINATION_CHUNK = 1200      # target chars per forced page (≈ one Deck screen)
    CHAR_SPLIT_MIN_AVG_LINE = 130     # only char-split when avg line length exceeds this (prose, not FAQ)
    MAX_SECTION_SUBPAGES = 12         # v0.43.23: cap pages ONE section paginates into.
    # A 95k-char prose block was becoming 79 pages of 1200 chars ("BIG FREAKING
    # ALIEN (7/79)") — unnavigable. The per-page budget grows so no single section
    # yields more than this many pages.

    SPLIT_MAX_PASSES = 5  # safety cap against infinite recursion when split can't shrink further

    def _split_large_sections(
        self,
        sections: list[GuideSection],
        lines: list[str],
        depth: int = 0,
        char_split: bool = True,
    ) -> list[GuideSection]:
        """Iterative wrapper around _split_large_sections_once: re-applies the
        same algorithm until no section exceeds the threshold, capped at
        SPLIT_MAX_PASSES depth so a malformed input can never infinite-loop.

        Necessary because Tier 1 semantic split can produce 2+ subs where ONE of
        them is still huge (e.g. 1700-line "Hugo Chapter 1" gets cut at line 100
        and 1700, leaving a 1600-line sub). Iteration handles those nested cases.

        v0.43.32: char_split=False disables the char-based pagination (only the
        line-based 350-line split fires). Used by the per-page path so IGN's
        long-line prose chapters (1 paragraph = 1 long line → char-heavy even at 5
        lines) aren't shredded into "(k/N)" parts of a few lines each.
        """
        if depth >= self.SPLIT_MAX_PASSES:
            return sections
        pass_result = self._split_large_sections_once(sections, lines, char_split=char_split)
        # Did anything actually change? If not, abort to avoid infinite loops.
        if len(pass_result) == len(sections):
            return pass_result
        # Still any oversized section (line- OR char-heavy prose)? If so, recurse.
        def _oversized(s: GuideSection) -> bool:
            span = s.line_end - s.line_start
            if span > self.SPLIT_LARGE_THRESHOLD:
                return True
            if not char_split:
                return False
            char_len = sum(len(lines[i]) for i in range(s.line_start, min(s.line_end + 1, len(lines))))
            avg_line = char_len / max(1, span + 1)
            return char_len > self.CHAR_SPLIT_THRESHOLD and avg_line >= self.CHAR_SPLIT_MIN_AVG_LINE
        if any(_oversized(s) for s in pass_result):
            return self._split_large_sections(pass_result, lines, depth=depth + 1, char_split=char_split)
        return pass_result

    def _char_chunk_boundaries(self, lines: list[str], start: int, end: int) -> list[tuple[int, int]]:
        """v0.42.18: split a line range into (start, end) chunks, each capped at
        BOTH CHAR_PAGINATION_CHUNK chars and FORCED_PAGINATION_CHUNK lines. This
        paginates char-heavy prose (JV, long paragraphs) and line-heavy FAQs
        uniformly — whichever budget is hit first ends the chunk."""
        out: list[tuple[int, int]] = []
        end = min(end, len(lines) - 1)
        # v0.43.23: grow the per-page budgets so ONE section never paginates into
        # more than MAX_SECTION_SUBPAGES pages (the 79-page explosion fix).
        total_chars = sum(len(lines[i]) + 1 for i in range(start, end + 1))
        total_lines = end - start + 1
        char_budget = max(self.CHAR_PAGINATION_CHUNK, -(-total_chars // self.MAX_SECTION_SUBPAGES))
        line_budget = max(self.FORCED_PAGINATION_CHUNK, -(-total_lines // self.MAX_SECTION_SUBPAGES))
        i = start
        while i <= end:
            chunk_chars = 0
            chunk_lines = 0
            j = i
            while j <= end:
                chunk_chars += len(lines[j]) + 1
                chunk_lines += 1
                j += 1
                if chunk_chars >= char_budget or chunk_lines >= line_budget:
                    break
            out.append((i, j - 1))
            i = j
        return out or [(start, end)]

    def _split_large_sections_once(
        self,
        sections: list[GuideSection],
        lines: list[str],
        char_split: bool = True,
    ) -> list[GuideSection]:
        """One pass of the split algorithm (see _split_large_sections for the
        iterative wrapper).

        Two-tier strategy per oversized section:
          1. SEMANTIC split: try banners then heuristic INSIDE the range. If found
             (≥ 2 sub-candidates each ≥ SPLIT_MIN_SUB_LINES), use them — titles
             prefixed with parent ("Part I — Chapter 1").
          2. FORCED pagination: if semantic split failed AND the section is >=
             FORCED_PAGINATION_THRESHOLD (800 lines), chunk into FORCED_PAGINATION_CHUNK
             (250-line) pages titled "<parent>" / "<parent> (suite 2)" / etc.
             Guarantees readability even for pure-prose chapter walkthroughs.

        Never blows up the original section: if both passes fail, the original is kept.
        """
        if not sections or not lines:
            return sections
        result: list[GuideSection] = []
        for sec in sections:
            span = sec.line_end - sec.line_start
            char_len = sum(len(lines[i]) for i in range(sec.line_start, min(sec.line_end + 1, len(lines))))
            # v0.42.20: char-heavy is only "large" for PROSE (high avg line len),
            # so FAQ guides (short hard-wrapped lines) aren't over-split.
            line_count = max(1, span + 1)
            avg_line = char_len / line_count
            char_heavy = char_split and char_len > self.CHAR_SPLIT_THRESHOLD and avg_line >= self.CHAR_SPLIT_MIN_AVG_LINE
            if span <= self.SPLIT_LARGE_THRESHOLD and not char_heavy:
                result.append(sec)
                continue

            translated: list[GuideSection] = []
            method_used = ""

            # --- Tier 1: semantic sub-segmentation ---
            body_start = sec.line_start + 1
            body_end = sec.line_end
            sub_lines = lines[body_start:body_end + 1]
            if sub_lines:
                sub_candidates = self._sections_from_ascii_banners(sub_lines)
                method_used = "banners"
                if len(sub_candidates) < 2:
                    sub_candidates = self._sections_from_heuristic(sub_lines)
                    method_used = "heuristic"
                sub_candidates = [s for s in sub_candidates if (s.line_end - s.line_start) >= self.SPLIT_MIN_SUB_LINES]

                if len(sub_candidates) >= 2:
                    for i, sub in enumerate(sub_candidates):
                        global_start = body_start + sub.line_start
                        global_end = (body_start + sub_candidates[i + 1].line_start - 1) if i + 1 < len(sub_candidates) else body_end
                        if global_end < global_start:
                            continue
                        sub_title = sub.title.strip() or f"Partie {i + 1}"
                        if sec.title and sec.title.strip() and sec.title.strip().casefold() != sub_title.casefold():
                            prefix = sec.title.strip()
                            if len(prefix) > 40:
                                prefix = prefix[:37] + "…"
                            full_title = f"{prefix} — {sub_title}"
                        else:
                            full_title = sub_title
                        if len(full_title) > 110:
                            full_title = full_title[:107] + "…"
                        translated.append(GuideSection(
                            title=full_title,
                            line_start=global_start,
                            line_end=global_end,
                            heading_level=min(sec.heading_level + 1, 6) if sec.heading_level else 3,
                            is_preformatted=sec.is_preformatted,
                        ))

            # --- Tier 2: forced pagination fallback for huge sections with no semantic break ---
            # v0.42.20: trigger on line threshold OR char-heavy-prose.
            if len(translated) < 2 and (span >= self.FORCED_PAGINATION_THRESHOLD or char_heavy):
                translated = []
                base_title = (sec.title or "Section").strip()
                if len(base_title) > 70:
                    base_title = base_title[:67] + "…"
                for page_num, (global_start, global_end) in enumerate(
                    self._char_chunk_boundaries(lines, sec.line_start, sec.line_end), start=1
                ):
                    if global_end < global_start:
                        continue
                    title = base_title if page_num == 1 else f"{base_title} (suite {page_num})"
                    translated.append(GuideSection(
                        title=title,
                        line_start=global_start,
                        line_end=global_end,
                        heading_level=min(sec.heading_level + 1, 6) if sec.heading_level else 3,
                        is_preformatted=sec.is_preformatted,
                    ))
                method_used = "forced-pages"

            if len(translated) < 2:
                result.append(sec)
                continue

            # Optional preface (parent header lines before first sub) — only for SEMANTIC splits.
            # Forced pages already start at sec.line_start so no preface is needed.
            if method_used != "forced-pages":
                first_sub_start = translated[0].line_start
                if first_sub_start > sec.line_start + 1:
                    result.append(GuideSection(
                        title=sec.title,
                        line_start=sec.line_start,
                        line_end=first_sub_start - 1,
                        heading_level=sec.heading_level,
                        is_preformatted=sec.is_preformatted,
                    ))
            self._debug_log(f"  split-large: '{sec.title[:40]}' ({span} lines) → {len(translated)} via {method_used}")
            result.extend(translated)

        return result

    def _sections_from_starts(
        self,
        starts: list[tuple[int, str, int]],
        lines: list[str],
    ) -> list[GuideSection]:
        """Turn a list of (line_index, title, heading_level) into GuideSection
        records with line_end set to the line before the next start."""
        if not starts:
            return []
        starts = sorted(starts, key=lambda item: item[0])
        sections: list[GuideSection] = []
        for pos, (start_idx, title, level) in enumerate(starts):
            end_idx = (starts[pos + 1][0] - 1) if pos + 1 < len(starts) else len(lines) - 1
            sections.append(GuideSection(
                title=title.strip() or f"Section {pos + 1}",
                line_start=start_idx,
                line_end=max(end_idx, start_idx),
                heading_level=level,
                is_preformatted=False,
            ))
        return sections

    def _sections_from_toc_codes(self, lines: list[str]) -> list[GuideSection]:
        """Detect a GameFAQs-style Table of Contents with [CODE] markers.

        Typical layout:
            TABLE OF CONTENTS                          [TOC]
            ---------------------------------------------
             1. Introduction ........................ [INTR]
             2. Walkthrough ......................... [WALK]
                2.1 Chapter 1 ....................... [CH01]
            ...

        Each code appears again in the body as the heading anchor. We locate
        the TOC block (via explicit header OR by spotting a dense-code zone),
        extract ordered (title, code) pairs, then search the body below for
        each code to find section starts.
        """
        # Locate a "Table of Contents" header line
        toc_start = -1
        toc_markers = [
            r"^\s*(?:table of contents|contents|sommaire|table des mati[eè]res)\b",
        ]
        for idx, raw in enumerate(lines[:min(len(lines), 400)]):
            lowered = raw.strip().lower()
            if not lowered:
                continue
            for pattern in toc_markers:
                if re.match(pattern, lowered, flags=re.IGNORECASE):
                    toc_start = idx
                    break
            if toc_start >= 0:
                break

        # Fallback: no explicit header found — try detecting a dense-code zone.
        # GameFAQs FAQs without "SOMMAIRE" header still have a clearly bunched
        # TOC area where many lines carry a [CODE]. We anchor on that.
        if toc_start < 0:
            dense_zone_start = self._find_toc_dense_zone(lines)
            if dense_zone_start >= 0:
                toc_start = max(0, dense_zone_start - 1)

        if toc_start < 0:
            return []

        # Scan forward collecting candidate TOC entries until we hit a clear
        # break (≥ 3 consecutive non-TOC lines or end of TOC region).
        toc_entries: list[tuple[str, str]] = []  # (title, code)
        non_toc_streak = 0
        scan_end = min(len(lines), toc_start + 400)
        # Code token pattern: uppercase/digit/dash, 2-8 chars
        code_re = re.compile(r"\[([A-Z0-9][A-Z0-9\-_]{1,8})\]")
        for idx in range(toc_start + 1, scan_end):
            line = lines[idx].rstrip()
            if not line.strip():
                non_toc_streak += 1
                if non_toc_streak >= 3 and toc_entries:
                    break
                continue
            code_match = code_re.search(line)
            if code_match:
                code = code_match.group(1)
                # Title = everything before the code, stripped of dotted fillers
                title_part = line[: code_match.start()].rstrip()
                title_part = re.sub(r"[\.\s]{2,}$", "", title_part).strip()
                # Strip leading numbering like "1. " / "1.2 " / "  2)"
                title_part = re.sub(r"^\s*[\divx]+(?:[\.\)][\divx\.]*)*\s*[\.\)\-:]?\s*", "", title_part, flags=re.IGNORECASE)
                if title_part and len(title_part) < 120:
                    toc_entries.append((title_part, code))
                non_toc_streak = 0
            else:
                non_toc_streak += 1
                if non_toc_streak >= 3 and toc_entries:
                    break

        if len(toc_entries) < 3:
            return []

        # Now find each code in the body BELOW the TOC. The first TOC entry
        # itself might match the header we landed on — skip matches in the
        # TOC region by requiring position > last toc entry line.
        body_start = toc_start + max(1, min(len(toc_entries) * 2 + 2, 120))
        # Extend body_start past the last line where we saw a TOC code
        last_toc_line = toc_start
        for idx in range(toc_start + 1, scan_end):
            if code_re.search(lines[idx]):
                last_toc_line = idx
        body_start = max(body_start, last_toc_line + 1)

        # For each code, find its first occurrence in body AS A SECTION HEADER
        # (not just any mention). Heuristic: the line must contain the code AND
        # be within 3 lines of a separator or look like a title line.
        starts: list[tuple[int, str, int]] = []
        used_positions: set[int] = set()
        for title, code in toc_entries:
            needle = f"[{code}]"
            best_pos = -1
            for idx in range(body_start, len(lines)):
                if idx in used_positions:
                    continue
                if needle in lines[idx]:
                    best_pos = idx
                    break
            if best_pos >= 0:
                used_positions.add(best_pos)
                starts.append((best_pos, title, 2))

        # Dedup starts that are too close (< MIN_SECTION_SPAN_LINES), keep the
        # first (usually the proper heading, not a cross-reference further down)
        starts.sort(key=lambda item: item[0])
        deduped: list[tuple[int, str, int]] = []
        for item in starts:
            if not deduped or item[0] - deduped[-1][0] >= MIN_SECTION_SPAN_LINES:
                deduped.append(item)

        if len(deduped) < 2:
            return []
        return self._sections_from_starts(deduped, lines)

    def _sections_from_asterisk_toc(self, lines: list[str]) -> list[GuideSection]:
        """v0.43.38: GameFAQs TOC that anchors sections with *CODE search markers
        (Koudelka etc.) instead of [CODE] brackets:

            Table of Contents
             1. Introduction ....................... *INTRO
             4. The Walkthrough .................... *WALK
                Disc One ........................... *DISC/1
             6. Lists .............................. *LIST
                i. Puzzles and Key Items ........... *LIST1

        Each *CODE reappears in the body as the section header. Numbered entries
        are top-level (L2); unnumbered or roman-numbered entries nest under the
        preceding numbered one (L3). This is the guide's OWN structure — far more
        logical than letting numbered_toc mis-anchor it (which buried the whole
        main walkthrough inside the 'Sidequest' section)."""
        # 1) locate the TOC header
        toc_start = -1
        for idx, raw in enumerate(lines[:min(len(lines), 400)]):
            if re.match(r"^\s*(?:table of contents|contents|sommaire|table des mati[eè]res)\b",
                        raw.strip(), re.IGNORECASE):
                toc_start = idx
                break
        if toc_start < 0:
            return []

        # 2) collect TOC entries: "<opt num/roman>. <title> …dots/spaces… *CODE"
        entry_re = re.compile(
            r"^\s*(?P<title>.*?)\s*[.\s]{2,}\*(?P<code>[A-Za-z0-9][A-Za-z0-9/_\-]{1,10})\s*$")
        toc_entries: list[tuple[str, str, int]] = []  # (title, code, level)
        seen_codes: set[str] = set()
        non_toc = 0
        body_start = -1
        scan_end = min(len(lines), toc_start + 120)
        for idx in range(toc_start + 1, scan_end):
            line = lines[idx].rstrip()
            if not line.strip():
                non_toc += 1
                if non_toc >= 4 and toc_entries:
                    break
                continue
            m = entry_re.match(line)
            if not m:
                non_toc += 1
                if non_toc >= 4 and toc_entries:
                    break
                continue
            code = m.group("code")
            # A repeated code means we've scrolled past the TOC into the body (body
            # section headers use the same "title …dots… *CODE" format). Stop here
            # and treat this line as where the body begins.
            if code in seen_codes:
                body_start = idx
                break
            non_toc = 0
            raw_title = m.group("title").strip()
            if re.match(r"^\d{1,2}[.)]", raw_title):            # "4. The Walkthrough" → top level
                level = 2
                title = re.sub(r"^\d{1,2}[.)]\s*", "", raw_title).strip()
            elif re.match(r"^[ivxlc]{1,5}[.)]", raw_title, re.IGNORECASE):  # "i. Puzzles" → child
                level = 3
                title = re.sub(r"^[ivxlc]{1,5}[.)]\s*", "", raw_title, flags=re.IGNORECASE).strip()
            else:                                              # "Disc One" (no prefix) → child
                level = 3
                title = raw_title
            if title and len(title) < 120:
                toc_entries.append((title, code, level))
                seen_codes.add(code)

        if len(toc_entries) < 4:
            return []
        if body_start < 0:
            body_start = min(scan_end, toc_start + len(toc_entries) + 2)

        # 3) body anchors — find each *CODE at/after body_start. Match the code with
        # a trailing boundary so "*LIST" doesn't hit the "*LIST1" line.
        starts: list[tuple[int, str, int]] = []
        used: set[int] = set()
        for title, code, level in toc_entries:
            anchor_re = re.compile(r"\*" + re.escape(code) + r"(?![A-Za-z0-9/])")
            best = -1
            for idx in range(body_start, len(lines)):
                if idx in used:
                    continue
                if anchor_re.search(lines[idx]):
                    best = idx
                    break
            if best >= 0:
                used.add(best)
                starts.append((best, title, level))

        starts.sort(key=lambda item: item[0])
        deduped: list[tuple[int, str, int]] = []
        for item in starts:
            if not deduped or item[0] - deduped[-1][0] >= MIN_SECTION_SPAN_LINES:
                deduped.append(item)
        if len(deduped) < 2:
            return []
        return self._sections_from_starts(deduped, lines)

    def _sections_from_dotcode_toc(self, lines: list[str]) -> list[GuideSection]:
        """v0.43.39: GameFAQs TOC where each entry is "<Clean Title> …dots… CODE"
        (bare uppercase code, no bracket/asterisk) and the body re-states the code
        wrapped like |CODE| (French FF IX FAQ etc.):

            Introduction - Alexandrie.............DISC1P01
            Château d'Alexandrie..................DISC1P02
            *Quêtes Secondaires...................QUETESEC

        The banner detector otherwise produces garbage titles ('|CHÂTEAUD'ALEX… |
        DISC1P02|', '|ENEMIS||OBJETS|'). We use the guide's own clean TOC titles and
        group the walkthrough by disc (DISC<n>P… codes); reference lists (weapons,
        items, skills) become their own top-level sections."""
        toc_re = re.compile(r"^\s*\*?\s*(?P<title>.+?)\s*\.{3,}\s*(?P<code>[A-Z][A-Z0-9]{4,9})\s*$")
        # 1) collect candidate "title…dots…CODE" lines near the top
        cands: list[tuple[int, str, str]] = []
        for i in range(min(len(lines), 700)):
            m = toc_re.match(lines[i])
            if not m:
                continue
            title = m.group("title").strip().lstrip("*").strip()
            if 2 <= len(title) <= 90 and sum(c.isalpha() for c in title) >= 2:
                cands.append((i, title, m.group("code")))
        if len(cands) < 8:
            return []
        # 2) the TOC is the densest contiguous run (line gaps <= 5)
        runs: list[list[tuple[int, str, str]]] = []
        cur = [cands[0]]
        for c in cands[1:]:
            if c[0] - cur[-1][0] <= 5:
                cur.append(c)
            else:
                runs.append(cur)
                cur = [c]
        runs.append(cur)
        runs.sort(key=len, reverse=True)
        toc = runs[0]
        if len(toc) < 8:
            return []
        toc_end = toc[-1][0]

        # 3) unique codes in TOC order, then anchor each in the body (|CODE| / [CODE]
        #    / bare CODE) below the TOC zone.
        seen: set[str] = set()
        entries: list[tuple[str, str]] = []
        for _, t, c in toc:
            if c in seen:
                continue
            seen.add(c)
            entries.append((t, c))

        starts: list[tuple[int, str, str]] = []
        used: set[int] = set()
        for title, code in entries:
            wrapped = re.compile(r"[|\[]\s*" + re.escape(code) + r"\s*[|\]]")
            bare = re.compile(r"\b" + re.escape(code) + r"\b")
            best = -1
            for rx in (wrapped, bare):
                for idx in range(toc_end + 1, len(lines)):
                    if idx in used:
                        continue
                    if rx.search(lines[idx]):
                        best = idx
                        break
                if best >= 0:
                    break
            if best >= 0:
                used.add(best)
                starts.append((best, title, code))

        if len(starts) < 4:
            return []
        starts.sort(key=lambda item: item[0])

        # 4) levels: walkthrough grouped by disc (first entry of a disc = L2 parent,
        #    rest = L3); reference lists (weapons/items/skills) = their own L2.
        ref_re = re.compile(r"^(?:COMP|ARME|OBJET|LIST|ENNEMI|BESTI|CREDIT|MAGIE)", re.IGNORECASE)
        leveled: list[tuple[int, str, int]] = []
        cur_disc: str | None = None
        for pos, title, code in starts:
            md = re.match(r"^DISC(\d)", code)
            if md:
                level = 2 if md.group(1) != cur_disc else 3
                cur_disc = md.group(1)
            elif ref_re.match(code):
                level, cur_disc = 2, None
            else:
                level = 3 if cur_disc else 2
            leveled.append((pos, title, level))

        deduped: list[tuple[int, str, int]] = []
        for item in leveled:
            if not deduped or item[0] - deduped[-1][0] >= MIN_SECTION_SPAN_LINES:
                deduped.append(item)
        if len(deduped) < 4:
            return []
        return self._sections_from_starts(deduped, lines)

    def _is_toc_subcode(self, code: str, parent: str) -> bool:
        """v0.43.38: is `code` a genuine sub-entry of the top-level `parent` code?
        e.g. "4b" under "4", "vi.1"/"vi.26.a" under "vi". A lettered room code like
        "a1" is NOT a sub-code of "3" — it just happens to have a letter."""
        code = code.lower()
        parent = parent.lower()
        m = re.match(r"^(\d{1,3})[a-z]$", code)         # digit sub: "4b"
        if m:
            return m.group(1) == parent
        m = re.match(r"^([ivxlc]{1,5})[.\s\d]", code)   # roman sub: "vi.1", "vi.26.a"
        if m:
            return m.group(1) == parent
        return False

    def _sections_from_numbered_toc(self, lines: list[str]) -> list[GuideSection]:
        """Detect TOCs that use numbered/lettered IDs without [CODE] markers.

        Common in older GameFAQs FAQs (dan_crenshaw style):
            1. Introduction
            2. Top 10 e-Mail Questions
            2a. What do I get for loading Suikoden II data?
            2b. Should I play Suikoden I and II first?
            ...
            4. Walkthrough
            4a. Introduction
            4b. Hugo Chapter 1
            4c. Chris Chapter 1

        Strategy:
          1. Scan first ~600 lines for "<num><letter?>. <text>" entries.
          2. Group into runs (gap <= 8 lines) — the largest run with >= 6 entries
             is the TOC.
          3. For each (id, title), find the next body line starting with "<id>. ..."
             which is the section header.
          4. Use found positions as section starts.

        The body line for "4b. Hugo Chapter 1" might appear as the title alone
        ("4b. Hugo Chapter 1") or inside a banner ("---\n4b. Hugo Chapter 1\n---")
        — we just match the line starting with the id, either way works.
        """
        # v0.43.26: two code styles.
        #  - digit  : "4b. Hugo Chapter 1"  (dan_crenshaw)
        #  - roman  : "I. Introduction" / "VI.1 Beginning" / "VI.26.A - The Red Room"
        #    (GameFAQs "verbose walkthrough" style — chrono cross etc., which used
        #    to fall through to the garbage heuristic).
        entry_re_digit = re.compile(r"^\s*(\d{1,3}[a-z]?)\.\s+(.{3,120})\s*$")
        entry_re_roman = re.compile(r"^\s*([IVXLC]{1,5}(?:\.\d{1,3}(?:\.[A-Za-z])?)?)[.\s\-–]+(.{3,120}?)\s*$")

        # Step 1: candidate entries
        candidates: list[tuple[int, str, str]] = []
        max_check = min(len(lines), 600)
        for i in range(max_check):
            m = entry_re_digit.match(lines[i]) or entry_re_roman.match(lines[i])
            if not m:
                continue
            id_ = m.group(1).lower()
            title = m.group(2).strip().rstrip(".")
            # Skip very short titles or lines that look like prose/data (no alpha)
            if len(title) < 3 or sum(c.isalpha() for c in title) < 3:
                continue
            candidates.append((i, id_, title))

        if len(candidates) < 6:
            return []

        # Step 2: group into runs (gaps <= 8 lines)
        runs: list[list[tuple[int, str, str]]] = []
        current: list[tuple[int, str, str]] = [candidates[0]]
        for cand in candidates[1:]:
            if cand[0] - current[-1][0] <= 8:
                current.append(cand)
            else:
                runs.append(current)
                current = [cand]
        runs.append(current)

        # Pick the largest run with >= 6 entries — that's the TOC
        runs.sort(key=lambda r: len(r), reverse=True)
        toc_run: list[tuple[int, str, str]] | None = None
        for run in runs:
            if len(run) >= 6:
                toc_run = run
                break
        if not toc_run:
            return []

        # Step 3: body starts after the TOC zone
        toc_end_line = toc_run[-1][0]
        body_start = toc_end_line + 1
        if body_start >= len(lines) - 5:
            return []  # nothing meaningful in body

        # Step 4: for each TOC entry, find its body anchor
        raw_starts: list[tuple[int, str, str]] = []  # (pos, title, id_)
        used_positions: set[int] = set()
        for _, id_, title in toc_run:
            # v0.43.26: flexible separator after the code (". " for digit/roman-top,
            # " " for "VI.1", " - " for "VI.26.A").
            anchor_re = re.compile(r"^\s*" + re.escape(id_) + r"[.\s\-–].+$", re.IGNORECASE)
            best_pos = -1
            for body_idx in range(body_start, len(lines)):
                if body_idx in used_positions:
                    continue
                if anchor_re.match(lines[body_idx]):
                    best_pos = body_idx
                    break
            if best_pos >= 0:
                used_positions.add(best_pos)
                raw_starts.append((best_pos, title, id_))

        if len(raw_starts) < 2:
            return []

        # v0.43.38: assign heading levels in READING order with parent tracking. A
        # code is a CHILD (level 3) only when it's a genuine sub-code of the current
        # top-level code ("4b" under "4", "VI.1" under "VI") — NOT merely because its
        # format has a letter. This fixes guides (Koudelka) whose walkthrough uses
        # lettered room codes (A1, B5, C1…) that were wrongly nested under the last
        # numeric section ("3. Sidequest: The Gargoyle") instead of being siblings.
        raw_starts.sort(key=lambda item: item[0])
        starts: list[tuple[int, str, int]] = []
        current_parent: str | None = None  # the open top-level code sub-codes attach to
        for pos, title, id_ in raw_starts:
            if re.fullmatch(r"\d{1,3}", id_) or re.fullmatch(r"[ivxlc]{1,5}", id_):
                current_parent = id_
                level = 2
            elif current_parent and self._is_toc_subcode(id_, current_parent):
                level = 3
            else:
                current_parent = None  # a non-sub top-level breaks the numeric chain
                level = 2
            starts.append((pos, title, level))

        if len(starts) < 2:
            return []

        # Dedup positions too close together
        deduped: list[tuple[int, str, int]] = []
        for item in starts:
            if not deduped or item[0] - deduped[-1][0] >= MIN_SECTION_SPAN_LINES:
                deduped.append(item)

        if len(deduped) < 2:
            return []
        return self._sections_from_starts(deduped, lines)

    def _find_toc_dense_zone(self, lines: list[str]) -> int:
        """Find a TOC by detecting a run of code-bearing lines without a header.

        Heuristic: in the first 500 lines of the document, scan for [CODE]
        occurrences. Group them into "runs" where consecutive codes are at
        most 6 lines apart. The largest run, if it contains >= 4 distinct codes,
        is the TOC. Returns the line index of the first code in that run,
        or -1 if no dense zone is found.

        Why: many GameFAQs FAQs jump straight into a numbered TOC like
            1. Introduction-----------------[000]
            2. Walkthrough------------------[001]
        with no preceding "TABLE OF CONTENTS" header. The existing header-based
        detection would miss them. Body anchors for those same codes are
        spaced FAR apart (hundreds of lines), so they don't form dense zones —
        only the TOC area does.
        """
        code_re = re.compile(r"\[([A-Z0-9][A-Z0-9\-_]{1,8})\]")
        max_check = min(len(lines), 500)
        code_line_indexes: list[int] = [i for i in range(max_check) if code_re.search(lines[i])]
        if len(code_line_indexes) < 4:
            return -1

        # Group into runs based on inter-line gap
        runs: list[list[int]] = []
        current: list[int] = [code_line_indexes[0]]
        for idx in code_line_indexes[1:]:
            if idx - current[-1] <= 6:
                current.append(idx)
            else:
                runs.append(current)
                current = [idx]
        runs.append(current)

        # Largest run with enough distinct codes wins
        runs.sort(key=lambda r: len(r), reverse=True)
        for run in runs:
            distinct_codes: set[str] = set()
            for line_idx in run:
                for m in code_re.finditer(lines[line_idx]):
                    distinct_codes.add(m.group(1))
            if len(distinct_codes) >= 4:
                return run[0]
        return -1

    def _sections_from_ascii_banners(self, lines: list[str]) -> list[GuideSection]:
        """Detect banner-style headings common in plain-text FAQs:

        Pattern A (boxed):
            =======================
              TITLE HERE
            =======================

        Pattern B (underlined):
            TITLE HERE
            =============

        A "separator" line is one consisting mostly of =, -, _, *, # (≥ 6 chars).
        """
        def is_sep(line: str) -> bool:
            stripped = line.strip()
            if len(stripped) < 6:
                return False
            if "\x01" in stripped:
                return False
            # Allow optional leading/trailing whitespace already stripped
            return bool(re.match(r"^[=\-_*#~]{6,}\s*$", stripped))

        def looks_like_title(line: str) -> bool:
            stripped = line.strip()
            if not stripped or "\x01" in stripped:
                return False
            if len(stripped) > 120 or len(stripped) < 3:
                return False
            if stripped.startswith(("http://", "https://")):
                return False
            # Title should have at least 2 alphabetic characters
            return sum(1 for c in stripped if c.isalpha()) >= 2

        starts: list[tuple[int, str, int]] = []
        idx = 0
        n = len(lines)
        while idx < n:
            # Pattern A: sep / title / sep
            if is_sep(lines[idx]) and idx + 2 < n and looks_like_title(lines[idx + 1]) and is_sep(lines[idx + 2]):
                title_line = lines[idx + 1].strip()
                # Strip [CODE] suffix for the display title
                title_clean = re.sub(r"\s*\[[A-Z0-9][A-Z0-9\-_]{1,8}\]\s*$", "", title_line).strip()
                starts.append((idx, title_clean or title_line, 2))
                idx += 3
                continue
            # Pattern B: title / sep (only if not directly preceded by text)
            if (idx + 1 < n
                and looks_like_title(lines[idx])
                and is_sep(lines[idx + 1])
                and (idx == 0 or not lines[idx - 1].strip())):
                title_line = lines[idx].strip()
                title_clean = re.sub(r"\s*\[[A-Z0-9][A-Z0-9\-_]{1,8}\]\s*$", "", title_line).strip()
                starts.append((idx, title_clean or title_line, 2))
                idx += 2
                continue
            idx += 1

        # Drop candidates too close to each other
        deduped: list[tuple[int, str, int]] = []
        for item in starts:
            if not deduped or item[0] - deduped[-1][0] >= MIN_SECTION_SPAN_LINES:
                deduped.append(item)
        if len(deduped) < 2:
            return []

        # Anti-spam: filter out titles that repeat too often. In GameFAQs FAQs,
        # per-character/per-move banners like "Attack:", "Defend:", "Deathblow:"
        # appear dozens of times — they're labels inside a battle entry, not real
        # top-level sections. Keep banners whose title is unique enough.
        title_counts: dict[str, int] = {}
        for _, title, _ in deduped:
            key = title.strip().casefold()
            title_counts[key] = title_counts.get(key, 0) + 1
        SPAM_THRESHOLD = 3  # title appears > this many times => treat as label noise, not section
        spam_keys = {k for k, c in title_counts.items() if c > SPAM_THRESHOLD}
        if spam_keys:
            filtered = [item for item in deduped if item[1].strip().casefold() not in spam_keys]
            # Only apply the filter if it doesn't gut the result entirely
            if len(filtered) >= 2:
                deduped = filtered

        if len(deduped) < 2:
            return []
        return self._sections_from_starts(deduped, lines)

    def _sections_from_heuristic(self, lines: list[str]) -> list[GuideSection]:
        """Last-resort heuristic. Stricter than before:
         - ALL-CAPS lines must have ≥ 2 words AND ≥ 8 alpha chars
         - numbered lines must be followed by a capitalized title (not a list item)
         - lines ending with ":" must have ≥ 3 words (not "Note:" / "Item:")
        """
        candidate_indexes: list[int] = []
        for index, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line:
                continue
            if self._is_heading_marker_line(line) or "\x01PRE\x02" in line or "\x01/PRE\x02" in line:
                continue
            if len(line) < 4 or len(line) > 120:
                continue
            if line.startswith(("http://", "https://")):
                continue
            if re.match(r"^[=\-_*]{4,}$", line):
                continue
            alpha_count = sum(char.isalpha() for char in line)
            if alpha_count < 3:
                continue

            heading_like = False
            word_count = len([w for w in re.split(r"\s+", line) if w])

            # v0.42.3 C3: reject sentence-like lines BEFORE evaluating other
            # heading patterns. A heading is short and topical, NOT a sentence.
            # Catches false positives like:
            #   "Marina joins along with Belcoot."  (period as sentence end)
            #   "Hugo Chapter 1 — Sgt. Joe, I suggest you put and keep your t" (mid-sentence)
            #   "mission. When you're given the choice of wh"  (lowercase start, period in middle)
            # Without this, the heuristic catches lots of prose fragments and
            # pollutes the sidebar with phrase-as-title sections.
            if line[0].islower():
                # A heading doesn't start with a lowercase letter
                continue
            if re.search(r"[a-zà-ÿ]\.\s+[A-ZÀ-Ÿ]", line):
                # Lowercase + period + space + UPPERCASE = sentence boundary
                # in the middle of the line. Real headings don't contain that.
                continue
            # Ends with sentence-ending punctuation AND is "wordy" → likely prose
            if line and line[-1] in ".!?" and word_count >= 6:
                # Exception: keep "N. Title" patterns that legitimately end with period
                # by checking the period is right after a digit.
                if not re.match(r"^\d+\.\s+", line):
                    continue
            # Lots of common stopwords inside → prose, not heading
            stopword_count = len(re.findall(
                r"\b(?:the|and|with|that|this|your|you|are|was|were|will|from|into|"
                r"have|has|had|been|being|but|not|all|any|some|when|which|who|whom|"
                r"de|la|le|les|une|un|du|des|que|qui|quoi|dans|pour|avec|sur|sans|"
                r"est|sont|été|être|avoir|fait|faire|on|nous|vous|ils|elles)\b",
                line,
                flags=re.IGNORECASE,
            ))
            if stopword_count >= 4:
                # 4+ stopwords usually = prose. Skip.
                continue

            # Explicit keyword prefix (strict)
            if re.match(
                r"^(chapter|chapitre|part\s+[IVX\d]|section\s+\d|episode|mission|acte|route\s+[A-Z\d]|walkthrough|prologue|epilogue|ending|fin)\b",
                line,
                flags=re.IGNORECASE,
            ):
                heading_like = True
            # Numbered heading "1. Title" / "2) Title" — require a letter after
            elif re.match(r"^\d+[\).:\-]\s*[A-ZÉÈÀÂÎÔÙÇ][\w]", line):
                heading_like = True
            # Roman numerals "I. Title"
            elif re.match(r"^[IVX]{1,4}[\).:\-]\s*[A-ZÉÈÀÂÎÔÙÇ][\w]", line):
                heading_like = True
            # All caps: ≥ 2 words and ≥ 8 alpha chars
            elif line == line.upper() and word_count >= 2 and alpha_count >= 8:
                heading_like = True
            # Ends with colon: ≥ 3 words (avoid "Note:", "Tip:")
            elif line.endswith(":") and word_count >= 3 and line[0].isupper():
                heading_like = True

            if heading_like:
                candidate_indexes.append(index)

        # Drop candidates that are too close together
        deduped: list[tuple[int, str, int]] = []
        for index in candidate_indexes:
            title = lines[index].strip()
            if not deduped or index - deduped[-1][0] >= MIN_SECTION_SPAN_LINES:
                deduped.append((index, title, 0))
        if len(deduped) < 2:
            return []
        return self._sections_from_starts(deduped, lines)

    def _merge_small_sections(
        self,
        sections: list[GuideSection],
        lines: list[str],
    ) -> list[GuideSection]:
        """Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES
        real content lines into the NEXT section (or previous, if last).
        A "content line" is non-blank, not a separator, not a heading marker,
        and not a PRE marker."""
        if len(sections) < 2:
            return sections

        def content_line_count(section: GuideSection) -> int:
            count = 0
            # Skip the heading line itself (line_start)
            for idx in range(section.line_start + 1, min(section.line_end + 1, len(lines))):
                stripped = lines[idx].strip()
                if not stripped:
                    continue
                if "\x01" in stripped:
                    continue
                if re.match(r"^[=\-_*#~]{4,}$", stripped):
                    continue
                count += 1
            return count

        # Pass 1: merge forward (absorb short sections into the next one).
        merged: list[GuideSection] = []
        pending_start: GuideSection | None = None
        for i, sec in enumerate(sections):
            count = content_line_count(sec)
            is_last = i == len(sections) - 1
            if count < MIN_SECTION_CONTENT_LINES and not is_last:
                # Keep this section's line_start but absorb its range into the next
                # by not emitting it; the next section's line_start will be moved back.
                if pending_start is None:
                    pending_start = sec
                # else: keep the earliest pending_start, so extra-short sections
                # keep rolling forward.
                continue
            if pending_start is not None:
                # Extend this section upward to include the pending short region.
                sec = GuideSection(
                    title=sec.title,
                    line_start=pending_start.line_start,
                    line_end=sec.line_end,
                    heading_level=sec.heading_level,
                    is_preformatted=sec.is_preformatted,
                )
                pending_start = None
            merged.append(sec)

        # Edge case: the TAIL sections were all short. Fold them into the
        # previous emitted section.
        if pending_start is not None and merged:
            last = merged[-1]
            merged[-1] = GuideSection(
                title=last.title,
                line_start=last.line_start,
                line_end=sections[-1].line_end,
                heading_level=last.heading_level,
                is_preformatted=last.is_preformatted,
            )

        return merged

    def _make_id(self, title: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", title.casefold()).strip("-")
        if not slug:
            slug = "guide"
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        return f"{slug[:60]}-{timestamp}"

    def _make_snippet(self, content: str) -> str:
        normalized = re.sub(r"\s+", " ", content).strip()
        return normalized[:180] + ("…" if len(normalized) > 180 else "")

    def _site_name(self, url: str) -> str:
        hostname = urlparse(url).hostname or "site"
        return hostname.removeprefix("www.")

    def _clean_inline_text(self, value: str) -> str:
        value = _html_unescape(value or "")
        value = re.sub(r"\s+", " ", value)
        return value.strip()
