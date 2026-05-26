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
MAX_SECTION_COUNT = 120
MAX_FETCHED_PAGES = 12
# Minimum "content" (non-blank, non-decorative) lines a section must contain to
# survive post-filter. Anything shorter gets merged with the following section.
MIN_SECTION_CONTENT_LINES = 4
# Hard minimum span in raw lines between two consecutive section starts.
MIN_SECTION_SPAN_LINES = 6
ALLOWED_SCHEMES = {"http", "https"}
SEARCH_RESULT_LIMIT = 12
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
    "darklevel": {
        "label": "Darklevel",
        "domains": ["darklevel.free.fr"],
        "keywords": "soluce",
    },
    "neoseeker": {
        "label": "Neoseeker",
        "domains": ["neoseeker.com"],
        "keywords": "walkthrough guide",
    },
    "strategywiki": {
        "label": "StrategyWiki",
        "domains": ["strategywiki.org"],
        "keywords": "walkthrough guide",
    },
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


@dataclass
class GuideSearchResult:
    title: str
    url: str
    site: str
    snippet: str
    score: int = 0


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
        self._search_cache: dict[str, tuple[float, str, str]] = {}
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

        # Build ONE generic query (no site: filter, which trips anti-bot protection on Startpage/Google)
        platform_token = "" if normalized_platform in {"", "Autre", "Tous"} else normalized_platform
        query_parts = [normalized_query]
        if platform_token:
            query_parts.append(platform_token)
        if normalized_lang == "fr":
            query_parts.append("walkthrough guide soluce")
        else:
            query_parts.append("walkthrough guide faq")
        combined_query = " ".join(query_parts).strip()
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
        all_parsed: list[GuideSearchResult] = []
        if _HAS_HTML_PARSER:
            try:
                stdlib_parser = _DuckDuckGoSearchParser()
                stdlib_parser.feed(html_text)
                stdlib_parser.close()
                all_parsed.extend(stdlib_parser.results)
            except Exception:
                pass
        all_parsed.extend(_regex_parse_ddg_results(html_text))

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
            score = self._score_search_result(matched_site_key, normalized_query, normalized_platform, parsed.title, parsed.url, parsed.snippet)
            final_results.append(GuideSearchResult(
                title=parsed.title, url=parsed.url, site=site_label,
                snippet=parsed.snippet, score=score,
            ))

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
        if not _HAS_URLLIB:
            raise ValueError("L'import de guides nécessite le module réseau (indisponible dans cette sandbox)")
        self._switch_debug_file("save_guide.log")
        self._debug_log(f"save_guide: url='{url}' game='{game_title}' platform='{platform}'")
        try:
            normalized_url = self._validate_url(url)
            self._debug_log(f"  validated url: {normalized_url}")
        except Exception as exc:
            self._debug_log(f"  validate_url FAILED: {exc}")
            raise
        try:
            collected = self._collect_guide(normalized_url)
            self._debug_log(f"  collected: title='{collected.get('title','')}' extractor='{collected.get('extractor','')}' content_len={len(collected.get('content',''))}")
        except Exception as exc:
            self._debug_log(f"  collect_guide FAILED: {exc}")
            raise
        content = collected["content"]

        if len(content) < 200:
            raise ValueError("Extraction trop pauvre : la page n'a pas fourni assez de contenu lisible")

        if len(content) > MAX_CONTENT_CHARS:
            content = content[:MAX_CONTENT_CHARS] + "\n\n[... contenu tronqué ...]"

        sections = self._build_sections(content)
        title = str(collected["title"])
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
            source_pages=list(collected["source_pages"]),
            progress=GuideReadingProgress(),
        )
        self._write_record(record)
        self._debug_log(f"  save_guide SUCCESS: id={guide_id} title='{title}' sections={len(sections)} words={len(content.split())}")
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

    async def reconstruct_sections(self, guide_id: str) -> dict[str, Any]:
        """Re-run the section detector on an existing guide's content.
        Preserves progress/notes/bookmarks but remaps their section_index to the
        closest matching new section by title, falling back to clamped index."""
        record = self._load_record_or_raise(guide_id)
        old_sections = list(record.sections)
        new_sections = self._build_sections(record.content)
        record.sections = new_sections

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
    ) -> dict[str, Any]:
        prefs = ReaderPreferences(
            theme=theme if theme in {"dark", "sepia"} else "dark",
            font_family=font_family if font_family in {"sans", "serif", "mono"} else "sans",
            line_height=line_height if line_height in {"tight", "normal", "airy"} else "normal",
            max_width=max_width if max_width in {"narrow", "normal", "full"} else "normal",
            highlight_keywords=bool(highlight_keywords),
            numbered_sections=bool(numbered_sections),
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
        return ReaderPreferences(
            theme=theme,
            font_family=str(payload.get("font_family", "sans")),
            line_height=str(payload.get("line_height", "normal")),
            max_width=str(payload.get("max_width", "normal")),
            highlight_keywords=bool(payload.get("highlight_keywords", True)),
            numbered_sections=bool(payload.get("numbered_sections", True)),
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
        english_sites = {"gamefaqs", "ign", "neoseeker", "strategywiki"}
        french_sites = {"rpgsoluce", "jeuxvideo", "vally8", "darklevel"}
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
        self._guide_path(record.id).write_text(
            json.dumps(self._record_to_payload(record), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

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

    def _looks_like_guide_result(self, site_key: str, title: str, url: str, snippet: str) -> bool:
        haystack = f"{title} {url} {snippet}".casefold()
        if site_key == "gamefaqs":
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
            return any(token in haystack for token in ["soluce", "wiki", "astuces", "/wikis/"])
        if site_key == "vally8":
            return any(token in haystack for token in ["soluce", "solution", "jeux/"])
        if site_key == "darklevel":
            return any(token in haystack for token in ["soluce", "solution"])
        return True

    def _score_search_result(self, site_key: str, query: str, platform: str, title: str, url: str, snippet: str) -> int:
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
        if site_key == "jeuxvideo" and ("/wikis/" in url_cf or "soluce" in url_cf):
            score += 45
        if site_key == "vally8" and "jeux/" in url_cf:
            score += 40
        if site_key == "darklevel":
            score += 35

        if any(token in title_cf for token in ["walkthrough", "guide", "faq", "soluce", "cheminement", "solution"]):
            score += 20
        if len(snippet.strip()) >= 80:
            score += 8
        return score

    def _collect_guide(self, start_url: str) -> dict[str, Any]:
        self._debug_log(f"  _collect_guide: start_url={start_url}")
        visited: set[str] = set()
        source_pages: list[GuideSourcePage] = []
        combined_parts: list[str] = []
        seen_signatures: set[str] = set()
        first_title = ""
        extractor_name = "generic"
        charsets: list[str] = []
        current_url = start_url

        for page_index in range(MAX_FETCHED_PAGES):
            if current_url in visited:
                break
            visited.add(current_url)

            self._debug_log(f"  downloading page {page_index}: {current_url}")
            html_text, charset = self._download(current_url)
            self._debug_log(f"  downloaded: {len(html_text)} chars, charset={charset}")
            if charset not in charsets:
                charsets.append(charset)

            current_title = self._extract_title(html_text, current_url)
            if not first_title:
                first_title = current_title

            extractor, page_content = self._extract_text(current_url, html_text)
            self._debug_log(f"  extracted: extractor={extractor} content_len={len(page_content)}")
            page_content = self._remove_leading_duplicate_title(page_content, first_title or current_title)
            extractor_name = extractor_name or extractor
            if extractor_name == "generic" and extractor != "generic":
                extractor_name = extractor

            signature = self._content_signature(page_content)
            if signature in seen_signatures:
                break
            seen_signatures.add(signature)

            if page_content.strip():
                display_title = self._derive_page_display_title(
                    page_index=page_index,
                    page_title=current_title,
                    root_title=first_title,
                    page_content=page_content,
                    page_url=current_url,
                )
                source_pages.append(GuideSourcePage(title=display_title, url=current_url))
                if not combined_parts:
                    combined_parts.append(page_content.strip())
                else:
                    divider = "=" * min(max(len(display_title), 8), 80)
                    page_block_content = self._remove_leading_duplicate_title(page_content, display_title)
                    combined_parts.append(f"{display_title}\n{divider}\n{page_block_content.strip()}")

            next_url = self._find_next_page_url(current_url=current_url, html_text=html_text, extractor=extractor)
            if not next_url:
                break
            current_url = next_url

        content = "\n\n".join(part for part in combined_parts if part).strip()
        self._debug_log(f"  _collect_guide done: {len(source_pages)} pages, {len(content)} chars content")
        if not content:
            raise ValueError("Aucun contenu exploitable n'a été extrait")

        return {
            "title": first_title or self._site_name(start_url),
            "extractor": extractor_name,
            "content": content,
            "source_charset": charsets[0] if len(charsets) == 1 else "mixed",
            "source_pages": source_pages or [GuideSourcePage(title=first_title or "Page 1", url=start_url)],
        }

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
            # Attempt 4: Wayback Machine fallback (for sites that hard-block bots like GameFAQs)
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

        last_error: Exception | None = None
        for idx, attempt in enumerate(attempts):
            try:
                if idx > 0:
                    time.sleep(1.0)
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
                            continue
                    return text, charset
            except urllib.error.HTTPError as exc:
                self._debug_log(f"  download [{attempt['name']}] HTTP {exc.code}")
                last_error = ValueError(f"HTTP {exc.code}")
                continue
            except urllib.error.URLError as exc:
                self._debug_log(f"  download [{attempt['name']}] URL error: {exc.reason}")
                last_error = ValueError(f"Échec réseau : {exc.reason}")
                continue
            except Exception as exc:
                self._debug_log(f"  download [{attempt['name']}] {type(exc).__name__}: {exc}")
                last_error = exc
                continue

        if last_error:
            raise ValueError(f"Téléchargement impossible après toutes les tentatives : {last_error}")
        raise ValueError("Téléchargement impossible")

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
        full_text = self._crop_between_text_markers(
            full_text,
            start_markers=[
                r"\bGuide and Walkthrough\b",
                r"\bFAQ/Walkthrough\b",
                r"\bGuide by\b",
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
        text = self._strip_noise(text)
        return text

    def _extract_neoseeker_text(self, html_text: str) -> str:
        region = self._extract_html_region(
            html_text,
            selectors=[
                r'<div[^>]+class="[^"]*(?:page-contents|wiki-content|guide-content|nsec_content)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<div[^>]+id="[^"]*(?:wiki_content|content)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<article[^>]*>(.*?)</article>',
                r'<main[^>]*>(.*?)</main>',
            ],
        )
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
        region = self._extract_html_region(
            html_text,
            selectors=[
                r'<div[^>]+class="[^"]*(?:wiki-content|content-wiki|contentPaginator)[^"]*"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)[^>]+class',
                r'<div[^>]+id="(?:content|jv-wiki-content|wiki-content)"[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<article[^>]+class="[^"]*(?:wiki|soluce|article)[^"]*"[^>]*>(.*?)</article>',
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

    def _extract_ign_text(self, html_text: str) -> str:
        region = self._extract_html_region(
            html_text,
            selectors=[
                r'<div[^>]+(?:data-cy="article-body"|class="[^"]*(?:article-body|article-page-content|wiki-content|main-body)[^"]*")[^>]*>(.*?)</div>\s*<(?:div|section|footer|aside)',
                r'<article[^>]*>(.*?)</article>',
                r'<section[^>]+class="[^"]*wiki[^"]*"[^>]*>(.*?)</section>',
                r'<main[^>]*>(.*?)</main>',
            ],
        )
        if region:
            # Remove related articles, ads, video embeds that pollute text
            region = re.sub(r'<aside[^>]*>.*?</aside>', "", region, flags=re.DOTALL | re.IGNORECASE)
            region = re.sub(r'<div[^>]+class="[^"]*(?:related|advertisement|ad-slot|video-container|jw-player)[^"]*"[^>]*>.*?</div>', "", region, flags=re.DOTALL | re.IGNORECASE)
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
            return parser.text()
        return _regex_strip_tags(html_text)

    def _extract_html_region(self, html_text: str, selectors: list[str]) -> str | None:
        for selector in selectors:
            match = re.search(selector, html_text, flags=re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1)
        return None

    def _crop_between_text_markers(self, text: str, start_markers: list[str], end_markers: list[str]) -> str:
        start_index = 0
        for pattern in start_markers:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                start_index = match.start()
                break

        end_index = len(text)
        for pattern in end_markers:
            match = re.search(pattern, text[start_index:], flags=re.IGNORECASE)
            if match:
                end_index = start_index + match.start()
                break

        return text[start_index:end_index].strip()

    def _strip_noise(self, text: str) -> str:
        # Protect heading & preformatted markers from per-line cleanup
        lines = text.splitlines()
        cleaned_lines: list[str] = []
        in_pre = False
        noise_patterns = [
            r"^(?:Menu|Navigation|Home|Accueil)$",
            r"^(?:facebook|twitter|x\.com|instagram|youtube)$",
            r"^(?:advertisement|publicité)$",
            r"^(?:next|previous|suivant|précédent)$",
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

    def _derive_page_display_title(
        self,
        page_index: int,
        page_title: str,
        root_title: str,
        page_content: str,
        page_url: str,
    ) -> str:
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

    def _build_sections(self, content: str) -> list[GuideSection]:
        """Detect section boundaries in a guide's plain text.

        Strategy (first method that yields ≥ 2 quality sections wins):
          1. HTML heading markers left by the parser (web guides w/ real h1-h6)
          2. GameFAQs-style [CODE] table-of-contents → anchor each code in body
          3. ASCII banners: "====" / title / "====" or "title\n======"
          4. Heuristic (uppercase / chapter-keyword / numbered)

        All paths go through a merge pass that removes sections shorter than
        MIN_SECTION_CONTENT_LINES lines of real content.
        """
        lines = content.splitlines()
        total = len(lines)
        if total < 10:
            return []

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
                return sections[:MAX_SECTION_COUNT]

        # --- PASS 2: GameFAQs-style TOC with [CODE] anchors ---
        toc_sections = self._sections_from_toc_codes(lines)
        if len(toc_sections) >= 2:
            toc_sections = self._merge_small_sections(toc_sections, lines)
            if len(toc_sections) >= 2:
                return toc_sections[:MAX_SECTION_COUNT]

        # --- PASS 3: ASCII banners ---
        banner_sections = self._sections_from_ascii_banners(lines)
        if len(banner_sections) >= 2:
            banner_sections = self._merge_small_sections(banner_sections, lines)
            if len(banner_sections) >= 2:
                return banner_sections[:MAX_SECTION_COUNT]

        # --- PASS 4: heuristic fallback (stricter than before) ---
        heuristic_sections = self._sections_from_heuristic(lines)
        if heuristic_sections:
            heuristic_sections = self._merge_small_sections(heuristic_sections, lines)
        return heuristic_sections[:MAX_SECTION_COUNT]

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
        the TOC block, extract ordered (title, code) pairs, then search the
        body below for each code to find section starts.
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
