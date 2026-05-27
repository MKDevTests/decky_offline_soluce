import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  DialogButton,
  Focusable,
  Router,
  definePlugin,
} from "@decky/ui";
import { callable, routerHook } from "@decky/api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBookOpen } from "react-icons/fa";

// Module-level handoff for the full-screen reader.
// QAM sets the target guide id, then navigates to the route; FullScreenReader
// reads (and clears) it on mount. Avoids URL params + global state libs.
let pendingFullScreenGuideId: string | null = null;
function requestFullScreenGuide(guideId: string): void {
  pendingFullScreenGuideId = guideId;
}
function consumeFullScreenGuideId(): string | null {
  const id = pendingFullScreenGuideId;
  pendingFullScreenGuideId = null;
  return id;
}

const FULL_SCREEN_ROUTE = "/decky-offline-soluce/reader";
const HOTKEY_GLOBAL_NAME = "OfflineSoluceHotkey";
// Steam Big Picture overlays at top (status / battery / time ~40px) and bottom (back
// hint / system shortcuts ~40px). Pad full-screen routes so our header & footer
// aren't covered. Tuned for SteamOS 3.8.x — bump if Steam changes the chrome height.
const STEAM_UI_TOP_BAR_PX = 40;
const STEAM_UI_BOTTOM_BAR_PX = 40;

// ========== Types ==========

type GuideSection = {
  title: string;
  line_start: number;
  line_end: number;
  heading_level?: number;
  is_preformatted?: boolean;
};

type GuideSourcePage = {
  title: string;
  url: string;
};

type NamedBookmark = {
  bookmark_id: string;
  name: string;
  section_index: number;
  scroll_fraction: number;
  created_at: string;
};

type GuideSectionNote = {
  section_index: number;
  done: boolean;
  flagged: boolean;
  note: string;
  updated_at: string;
};

type GuideProgress = {
  last_section_index: number;
  last_opened_at: string;
  font_scale: number;
  bookmark_section_index: number;
  bookmark_set_at: string;
  last_scroll_fraction: number;
  bookmark_scroll_fraction: number;
  named_bookmarks: NamedBookmark[];
  section_notes: GuideSectionNote[];
};

type GuideGameInfo = {
  platform: string;
  game_title: string;
  normalized_title: string;
  aliases: string[];
  disc_code: string;
  rom_hint: string;
  emulator: string;
  source: string;
};

type GuideSummary = {
  id: string;
  title: string;
  url: string;
  site: string;
  extractor: string;
  saved_at: string;
  word_count: number;
  size_bytes: number;
  snippet: string;
  section_count: number;
  page_count: number;
  source_charset: string;
  // Method used to detect sections: "headings" | "toc_codes" | "banners" | "heuristic" | "none" | "" (legacy)
  detection_method: string;
  progress: GuideProgress;
  resume_label: string;
  bookmark_label: string;
  has_resume: boolean;
  has_bookmark: boolean;
  game: GuideGameInfo;
};

type GuideDetail = GuideSummary & {
  content: string;
  sections: GuideSection[];
  source_pages: GuideSourcePage[];
};

type GuideSearchResult = {
  title: string;
  url: string;
  site: string;
  snippet: string;
  score: number;
};

type ScanSource = {
  id: string;
  kind: string;
  path: string;
  label: string;
  enabled: boolean;
  exists: boolean;
  storage: string;
};

type LibraryItem = {
  id: string;
  title: string;
  normalized_title: string;
  platform: string;
  disc_code: string;
  emulator: string;
  aliases: string[];
  source_kinds: string[];
  storages: string[];
  source_labels: string[];
  source_ids: string[];
  primary_path: string;
  paths: string[];
  instance_count: number;
  source_count: number;
  custom_title: string;
  is_favorite: boolean;
};

type LibraryStatus = {
  scanned_at: string;
  item_count: number;
  instance_count: number;
  enabled_source_count: number;
};

type ReaderPreferences = {
  theme: "dark" | "sepia";
  font_family: "sans" | "serif" | "mono";
  line_height: "tight" | "normal" | "airy";
  max_width: "narrow" | "normal" | "full";
  highlight_keywords: boolean;
  numbered_sections: boolean;
};

type FindMatch = {
  line_index: number;
  section_index: number;
  section_title: string;
  line_text: string;
  char_pos: number;
};

type FindResult = {
  matches: FindMatch[];
  total: number;
  pattern: string;
  capped?: boolean;
};

type ExportEntry = {
  name: string;
  path: string;
  size_bytes: number;
  modified_at: string;
};

type ViewMode = "sources" | "library" | "search" | "guides";

// ========== Backend callables ==========

const listGuides = callable<[], GuideSummary[]>("list_guides");
const getGuide = callable<[guideId: string], GuideDetail>("get_guide");
const searchGuides = callable<[query: string, platform: string, preferredSite: string, language: string], GuideSearchResult[]>("search_guides");
const saveGuide = callable<[
  url: string,
  gameTitle: string,
  platform: string,
  romHint: string,
  aliases: string,
  emulator: string,
], GuideDetail>("save_guide");
const deleteGuide = callable<[guideId: string], boolean>("delete_guide");
const saveProgress = callable<[guideId: string, lastSectionIndex: number, fontScale: number, scrollFraction: number], GuideDetail>("save_progress");
const setBookmark = callable<[guideId: string, sectionIndex: number, scrollFraction: number], GuideDetail>("set_bookmark");
const clearBookmark = callable<[guideId: string], GuideDetail>("clear_bookmark");
const clearProgress = callable<[guideId: string], GuideDetail>("clear_progress");
const addNamedBookmark = callable<[guideId: string, name: string, sectionIndex: number, scrollFraction: number], GuideDetail>("add_named_bookmark");
const deleteNamedBookmark = callable<[guideId: string, bookmarkId: string], GuideDetail>("delete_named_bookmark");
const setSectionNote = callable<[guideId: string, sectionIndex: number, done: boolean, flagged: boolean, note: string], GuideDetail>("set_section_note");
const clearSectionNote = callable<[guideId: string, sectionIndex: number], GuideDetail>("clear_section_note");
const reconstructSections = callable<[guideId: string], GuideDetail>("reconstruct_sections");
const findInGuide = callable<[guideId: string, pattern: string], FindResult>("find_in_guide");
const exportGuide = callable<[guideId: string], { path: string; size_bytes: number; guide_id: string }>("export_guide");
const exportAllGuides = callable<[], { path: string; size_bytes: number; guide_count: number }>("export_all_guides");
const listExportFiles = callable<[], ExportEntry[]>("list_export_files");
const importGuideFromPath = callable<[path: string], { imported_count: number; imported_ids: string[] }>("import_guide_from_path");
const openUrlExternal = callable<[url: string], { ok: boolean; url: string }>("open_url_external");
const getReaderPreferences = callable<[], ReaderPreferences>("get_reader_preferences");
const updateReaderPreferences = callable<[
  theme: string,
  fontFamily: string,
  lineHeight: string,
  maxWidth: string,
  highlightKeywords: boolean,
  numberedSections: boolean,
], ReaderPreferences>("update_reader_preferences");
const listScanSources = callable<[], ScanSource[]>("list_scan_sources");
const toggleScanSource = callable<[sourceId: string], ScanSource>("toggle_scan_source");
const getLibraryStatus = callable<[], LibraryStatus>("get_library_status");
const rescanLibrary = callable<[], LibraryStatus>("rescan_library");
const listLibraryItems = callable<[], LibraryItem[]>("list_library_items");
const renameLibraryItem = callable<[itemId: string, customTitle: string], { id: string; custom_title: string }>("rename_library_item");
const toggleLibraryFavorite = callable<[itemId: string], { id: string; is_favorite: boolean }>("toggle_library_favorite");
const debugInfo = callable<[], Record<string, unknown>>("debug_info");
const testNetwork = callable<[], Record<string, unknown>>("test_network");
const testSearch = callable<[query: string], Record<string, unknown>>("test_search");
const clearDebugLog = callable<[], Record<string, unknown>>("clear_debug_log");

// ========== Constants ==========

const VIEW_SEQUENCE: ViewMode[] = ["sources", "library", "search", "guides"];
const SEARCH_SITE_CHOICES = [
  { value: "all", label: "Tous" },
  { value: "gamefaqs", label: "GameFAQs" },
  { value: "rpgsoluce", label: "RPGSoluce" },
  { value: "ign", label: "IGN" },
  { value: "jeuxvideo", label: "Jeuxvideo.com" },
  { value: "vally8", label: "Vally8" },
  { value: "darklevel", label: "Darklevel" },
  { value: "neoseeker", label: "Neoseeker" },
  { value: "strategywiki", label: "StrategyWiki" },
];
const LANGUAGE_CHOICES = [
  { value: "auto", label: "Auto" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];
const THEME_CHOICES: ReaderPreferences["theme"][] = ["dark", "sepia"];
const THEME_LABELS: Record<string, string> = { dark: "Sombre", sepia: "Sépia" };
const FONT_CHOICES: ReaderPreferences["font_family"][] = ["sans", "serif", "mono"];
const FONT_LABELS: Record<string, string> = { sans: "Sans-serif", serif: "Serif", mono: "Monospace" };
const LINE_HEIGHT_CHOICES: ReaderPreferences["line_height"][] = ["tight", "normal", "airy"];
const LINE_HEIGHT_LABELS: Record<string, string> = { tight: "Serré", normal: "Normal", airy: "Aéré" };
const MAX_WIDTH_CHOICES: ReaderPreferences["max_width"][] = ["narrow", "normal", "full"];
const MAX_WIDTH_LABELS: Record<string, string> = { narrow: "Étroit", normal: "Normal", full: "Plein" };
const KIND_CHOICES = ["Tous", "ROMs", "Games", "Steam"];
const STORAGE_CHOICES = ["Tous", "Interne", "SD / externe"];

// Preset search terms for the in-guide finder (keyboard-free)
const FIND_PRESETS: Array<{ label: string; pattern: string }> = [
  { label: "— Choisir —", pattern: "" },
  { label: "Boss", pattern: "boss" },
  { label: "Final boss", pattern: "final boss" },
  { label: "Save / Sauvegarde", pattern: "save" },
  { label: "Item / Objet", pattern: "item" },
  { label: "Key item / Clé", pattern: "key item" },
  { label: "Quest / Quête", pattern: "quest" },
  { label: "Secret", pattern: "secret" },
  { label: "Warning / Attention", pattern: "warning" },
  { label: "Tip / Astuce", pattern: "tip" },
  { label: "Weapon / Arme", pattern: "weapon" },
  { label: "Ending / Fin", pattern: "ending" },
  { label: "Chapter / Chapitre", pattern: "chapter" },
];

// Keywords that get auto-highlighted in guides (grouped by style)
const KEYWORD_GROUPS: Array<{ color: string; words: string[] }> = [
  { color: "#ff6e6e", words: ["boss", "final boss", "mini-boss", "miniboss"] },
  { color: "#ffd166", words: ["item", "objet", "équipement", "equipement", "key item", "weapon", "arme"] },
  { color: "#8be08b", words: ["save", "sauvegarde", "save point", "point de sauvegarde"] },
  { color: "#8bb3ff", words: ["quête", "quest", "mission", "side quest", "quête annexe"] },
  { color: "#ff8bd1", words: ["secret", "spoiler", "caché", "hidden"] },
  { color: "#fca55e", words: ["attention", "warning", "danger", "piège", "trap"] },
  { color: "#b59bff", words: ["astuce", "tip", "conseil", "hint"] },
];

// ========== Theme helpers ==========

type ThemeStyle = {
  background: string;
  textColor: string;
  borderColor: string;
  boxBg: string;
  boxBorder: string;
  preBg: string;
  preText: string;
  headingColor: string;
};

function themeStyle(theme: ReaderPreferences["theme"]): ThemeStyle {
  if (theme === "sepia") {
    return {
      background: "#f4ecd8",
      textColor: "#3a2f20",
      borderColor: "rgba(58,47,32,0.25)",
      boxBg: "rgba(58,47,32,0.05)",
      boxBorder: "rgba(58,47,32,0.18)",
      preBg: "rgba(58,47,32,0.08)",
      preText: "#2b2315",
      headingColor: "#5b4423",
    };
  }
  // dark (default)
  return {
    background: "rgba(0,0,0,0.35)",
    textColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(255,255,255,0.18)",
    boxBg: "rgba(255,255,255,0.04)",
    boxBorder: "rgba(255,255,255,0.08)",
    preBg: "rgba(255,255,255,0.06)",
    preText: "rgba(255,255,255,0.98)",
    headingColor: "#ffd966",
  };
}

function fontFamily(family: ReaderPreferences["font_family"]): string {
  if (family === "serif") return "Georgia, 'Times New Roman', Times, serif";
  if (family === "mono") return "'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace";
  return "-apple-system, system-ui, 'Segoe UI', 'Noto Sans', sans-serif";
}

function lineHeightValue(level: ReaderPreferences["line_height"]): number {
  if (level === "tight") return 1.4;
  if (level === "airy") return 2.0;
  return 1.7;
}

function maxWidthValue(level: ReaderPreferences["max_width"]): string {
  if (level === "narrow") return "62ch";
  if (level === "normal") return "82ch";
  return "100%";
}

// ========== Shared styles ==========

const boxStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  fontSize: "0.75rem",
  marginRight: "6px",
  marginBottom: "6px",
};

// ========== Utility functions ==========

function formatDetectionMethod(value: string): string {
  // Map backend method codes to short, user-readable French labels.
  switch (value) {
    case "headings": return "Titres HTML";
    case "toc_codes": return "TOC [CODE]";
    case "banners": return "Banners ASCII";
    case "heuristic": return "Heuristique";
    case "none": return "Aucune section";
    default: return value || "—";
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Jamais";
  return date.toLocaleString();
}

function bytesToKo(value: number): string {
  return `${Math.max(1, Math.round(value / 1024))} Ko`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cycleIndex(current: number, total: number, delta: number): number {
  if (total <= 0) return 0;
  return (current + delta + total) % total;
}

function getSectionText(guide: GuideDetail | null, sectionIndex: number): string {
  if (!guide) return "";
  if (sectionIndex < 0) return guide.content;
  const section = guide.sections[sectionIndex];
  if (!section) return guide.content;
  const lines = guide.content.split(/\r?\n/);
  return lines.slice(section.line_start, section.line_end + 1).join("\n");
}

function fieldLine(label: string, value: string | undefined | null) {
  if (!value) return null;
  return (
    <div style={{ fontSize: "0.8rem", opacity: 0.88 }}>
      <strong>{label} :</strong> {value}
    </div>
  );
}

function guideMatchesLibraryItem(guide: GuideSummary, item: LibraryItem): boolean {
  const guidePlatform = guide.game.platform || "Autre";
  const itemPlatform = item.platform || "Autre";
  const platformCompatible =
    guidePlatform === itemPlatform ||
    (guidePlatform === "Steam" && itemPlatform === "PC") ||
    (guidePlatform === "PC" && itemPlatform === "Steam");
  if (!platformCompatible) return false;
  if (guide.game.disc_code && item.disc_code && guide.game.disc_code === item.disc_code) return true;
  const displayTitle = item.custom_title || item.title;
  const guideNames = new Set<string>([
    normalizeText(guide.game.normalized_title || guide.game.game_title || guide.title),
    normalizeText(guide.game.game_title || guide.title),
    normalizeText(guide.title),
    ...guide.game.aliases.map((alias) => normalizeText(alias)),
  ]);
  if (guideNames.has(normalizeText(displayTitle))) return true;
  if (guideNames.has(item.normalized_title)) return true;
  return item.aliases.some((alias) => guideNames.has(normalizeText(alias)));
}

// ========== Content parsing for rich rendering ==========

// A content block is either a paragraph or a preformatted block (ASCII art / table)
type ContentBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string; level: number }
  | { kind: "pre"; text: string };

// Parse text containing \x01H{n}\x02...\x01/H\x02 and \x01PRE\x02...\x01/PRE\x02 markers
function parseBlocks(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (!raw) return blocks;

  // Split by PRE markers first
  const preRegex = /\x01PRE\x02\n?([\s\S]*?)\n?\x01\/PRE\x02/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = preRegex.exec(raw)) !== null) {
    const before = raw.slice(cursor, match.index);
    if (before.trim()) {
      blocks.push(...parseParagraphsAndHeadings(before));
    }
    const preText = match[1].replace(/^\n+|\n+$/g, "");
    if (preText) blocks.push({ kind: "pre", text: preText });
    cursor = match.index + match[0].length;
  }
  const tail = raw.slice(cursor);
  if (tail.trim()) {
    blocks.push(...parseParagraphsAndHeadings(tail));
  }
  return blocks;
}

function parseParagraphsAndHeadings(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const headingRegex = /\x01H(\d)\x02(.*?)\x01\/H\x02/g;
  // Expand headings into own blocks, then split remaining by blank lines
  const lines = raw.split(/\n/);
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    // Further split the paragraph buffer by blank lines
    const joined = paragraphBuffer.join("\n");
    const paragraphs = joined.split(/\n\n+/);
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (trimmed) blocks.push({ kind: "paragraph", text: trimmed });
    }
    paragraphBuffer = [];
  };

  for (const line of lines) {
    const stripped = line.trim();
    headingRegex.lastIndex = 0;
    const m = headingRegex.exec(stripped);
    if (m && m[0] === stripped) {
      flushParagraph();
      blocks.push({ kind: "heading", text: m[2].trim(), level: parseInt(m[1], 10) || 2 });
    } else if (stripped === "") {
      paragraphBuffer.push("");
    } else {
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();
  return blocks;
}

// Highlight keywords + search matches in a text block
function renderHighlightedText(
  text: string,
  highlightKeywords: boolean,
  searchPattern: string,
): React.ReactNode {
  if (!text) return text;
  // Build a combined regex of keywords (word-ish boundaries) and the search pattern.
  const pieces: Array<{ regex: RegExp; className: string; color?: string }> = [];

  if (searchPattern && searchPattern.trim().length >= 2) {
    const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pieces.push({ regex: new RegExp(escaped, "gi"), className: "os-find" });
  }

  if (highlightKeywords) {
    for (const group of KEYWORD_GROUPS) {
      const words = group.words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      if (words) {
        pieces.push({
          regex: new RegExp(`\\b(?:${words})\\b`, "gi"),
          className: "os-kw",
          color: group.color,
        });
      }
    }
  }

  if (pieces.length === 0) return text;

  // Collect all matches across all pieces
  type Span = { start: number; end: number; className: string; color?: string };
  const spans: Span[] = [];
  for (const piece of pieces) {
    piece.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = piece.regex.exec(text)) !== null) {
      if (m.index === piece.regex.lastIndex) piece.regex.lastIndex++;
      spans.push({ start: m.index, end: m.index + m[0].length, className: piece.className, color: piece.color });
    }
  }
  if (spans.length === 0) return text;
  // Sort, then merge overlaps (search match wins over keyword)
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      // Overlap: keep the one with higher priority (find > keyword)
      if (s.className === "os-find" && last.className !== "os-find") {
        merged[merged.length - 1] = s;
      }
      continue;
    }
    merged.push(s);
  }

  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < merged.length; i++) {
    const s = merged[i];
    if (s.start > cursor) out.push(text.slice(cursor, s.start));
    const substr = text.slice(s.start, s.end);
    if (s.className === "os-find") {
      out.push(<mark key={`m-${i}`} style={{ background: "#ffe066", color: "#1a1a1a", borderRadius: "2px", padding: "0 2px" }}>{substr}</mark>);
    } else {
      out.push(<span key={`k-${i}`} style={{ color: s.color, fontWeight: 600 }}>{substr}</span>);
    }
    cursor = s.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

// ========== GuideReader — shared reading component ==========

type GuideReaderProps = {
  guide: GuideDetail;
  sectionIndex: number;
  fontScale: number;
  preferences: ReaderPreferences;
  searchPattern: string;
  scrollRestoreFraction: number | null;
  onScrollChange: (fraction: number) => void;
  onSectionChange?: (index: number) => void;
  maxHeight?: string;
};

/**
 * Shared reading surface: themed, per-block rendering with keyword highlighting,
 * search-match highlighting, and monospace rendering for ASCII-art blocks.
 */
function GuideReader(props: GuideReaderProps) {
  const {
    guide, sectionIndex, fontScale, preferences,
    searchPattern, scrollRestoreFraction, onScrollChange,
    maxHeight,
  } = props;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const raw = useMemo(() => getSectionText(guide, sectionIndex), [guide, sectionIndex]);
  const blocks = useMemo(() => parseBlocks(raw), [raw]);

  const theme = themeStyle(preferences.theme);
  const lh = lineHeightValue(preferences.line_height);
  const widthCap = maxWidthValue(preferences.max_width);
  const ff = fontFamily(preferences.font_family);

  // Restore scroll when section switches / on first render if requested
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      if (scrollRestoreFraction !== null) {
        const max = Math.max(1, el.scrollHeight - el.clientHeight);
        el.scrollTop = max * scrollRestoreFraction;
      } else {
        el.scrollTop = 0;
      }
      const max = Math.max(1, el.scrollHeight - el.clientHeight);
      onScrollChange(Math.max(0, Math.min(1, el.scrollTop / max)));
    });
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex, guide.id, scrollRestoreFraction]);

  const containerStyle: React.CSSProperties = {
    overflowY: "auto",
    overflowX: "hidden",
    padding: "14px 16px",
    borderRadius: "10px",
    border: `1px solid ${theme.borderColor}`,
    background: theme.background,
    lineHeight: lh,
    color: theme.textColor,
    fontFamily: ff,
    maxHeight: maxHeight || "62vh",
  };

  const innerStyle: React.CSSProperties = {
    fontSize: `${fontScale}rem`,
    lineHeight: lh,
    maxWidth: widthCap,
    marginLeft: "auto",
    marginRight: "auto",
  };

  const paragraphStyle: React.CSSProperties = {
    margin: "0 0 0.8em",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };

  const preStyle: React.CSSProperties = {
    margin: "0.6em 0",
    padding: "10px 12px",
    borderRadius: "6px",
    background: theme.preBg,
    color: theme.preText,
    fontFamily: "'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace",
    fontSize: `${Math.max(0.75, fontScale - 0.1)}rem`,
    lineHeight: 1.35,
    whiteSpace: "pre",
    overflowX: "auto",
  };

  const headingStyle = (level: number): React.CSSProperties => ({
    margin: level <= 2 ? "1em 0 0.5em" : "0.8em 0 0.4em",
    fontSize: level <= 2 ? `${fontScale * 1.3}rem` : `${fontScale * 1.15}rem`,
    fontWeight: 700,
    color: theme.headingColor,
    lineHeight: 1.3,
  });

  return (
    <div
      ref={scrollRef}
      style={containerStyle}
      onScroll={(e: any) => {
        const el = e.currentTarget;
        const max = Math.max(1, el.scrollHeight - el.clientHeight);
        onScrollChange(Math.max(0, Math.min(1, el.scrollTop / max)));
      }}
    >
      <div style={innerStyle}>
        {blocks.length === 0 ? (
          <p style={paragraphStyle}>Aucun contenu</p>
        ) : (
          blocks.map((block, idx) => {
            if (block.kind === "heading") {
              return <div key={idx} style={headingStyle(block.level)}>{block.text}</div>;
            }
            if (block.kind === "pre") {
              return <pre key={idx} style={preStyle}>{block.text}</pre>;
            }
            return (
              <p key={idx} style={paragraphStyle}>
                {renderHighlightedText(block.text, preferences.highlight_keywords, searchPattern)}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
}


// ========== Full-screen reader component ==========

/**
 * Stand-alone full-page reading surface, mounted via routerHook on the
 * `/decky-offline-soluce/reader` route. Owns its own state — when the user
 * navigates back, progress is persisted and the QAM Content view will pick up
 * the latest record on its next refresh.
 */
function FullScreenReader() {
  const guideIdRef = useRef<string | null>(consumeFullScreenGuideId());
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [preferences, setPreferences] = useState<ReaderPreferences | null>(null);
  const [sectionIndex, setSectionIndex] = useState<number>(-1);
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [searchPattern, setSearchPattern] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const lastScrollFractionRef = useRef<number>(0);
  const restoreFractionRef = useRef<number | null>(null);
  const initialScrollRef = useRef<boolean>(true);
  // Mirror of latest section/font so the unmount cleanup persists the freshest values,
  // not the values captured at first effect run (closure trap on the [guide?.id]-only dep).
  const latestStateRef = useRef<{ sectionIndex: number; fontScale: number }>({ sectionIndex: -1, fontScale: 1.0 });

  useEffect(() => {
    const id = guideIdRef.current;
    if (!id) {
      setLoadError("Aucun guide à ouvrir — relance depuis le menu Decky.");
      return;
    }
    (async () => {
      try {
        const [prefs, detail] = await Promise.all([getReaderPreferences(), getGuide(id)]);
        setPreferences(prefs);
        setGuide(detail);
        const startIdx = detail.progress.last_section_index >= 0
          ? detail.progress.last_section_index
          : (detail.sections.length > 0 ? 0 : -1);
        setSectionIndex(startIdx);
        setFontScale(detail.progress.font_scale && detail.progress.font_scale > 0 ? detail.progress.font_scale : 1.0);
        restoreFractionRef.current = detail.progress.last_scroll_fraction || 0;
      } catch (e: any) {
        setLoadError(String(e?.message || e || "Erreur de chargement"));
      }
    })();
  }, []);

  // Keep the latest section/font mirrored in a ref so the unmount cleanup is accurate
  useEffect(() => {
    latestStateRef.current = { sectionIndex, fontScale };
  }, [sectionIndex, fontScale]);

  // Debounced persist on section / font / scroll changes
  useEffect(() => {
    if (!guide) return;
    const t = setTimeout(() => {
      saveProgress(guide.id, sectionIndex, fontScale, lastScrollFractionRef.current).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex, fontScale, guide?.id]);

  // Final persist on unmount — uses latestStateRef to capture values right before exit,
  // so "reprendre" lands exactly where the user left off even on fast back-presses.
  useEffect(() => () => {
    if (guide) {
      const { sectionIndex: si, fontScale: fs } = latestStateRef.current;
      saveProgress(guide.id, si, fs, lastScrollFractionRef.current).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.id]);

  // Reset restore fraction when section changes after initial load
  useEffect(() => {
    if (initialScrollRef.current) {
      initialScrollRef.current = false;
      return;
    }
    restoreFractionRef.current = 0;
  }, [sectionIndex]);

  const theme = preferences ? themeStyle(preferences.theme) : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966", preBg: "rgba(0,0,0,0.3)", preText: "#ddd" };
  const layoutStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    paddingTop: `${STEAM_UI_TOP_BAR_PX}px`,
    paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    background: theme.background,
    color: theme.textColor,
    fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
  };
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderBottom: `1px solid ${theme.borderColor}`,
    background: "rgba(0,0,0,0.35)",
    flexShrink: 0,
  };
  const sidebarStyle: React.CSSProperties = {
    width: "300px",
    overflowY: "auto",
    overflowX: "hidden",
    borderRight: `1px solid ${theme.borderColor}`,
    background: "rgba(0,0,0,0.18)",
    flexShrink: 0,
  };
  const mainAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  };
  const readerPaneStyle: React.CSSProperties = {
    flex: 1,
    padding: "12px 16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };
  const footerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderTop: `1px solid ${theme.borderColor}`,
    background: "rgba(0,0,0,0.35)",
    flexShrink: 0,
  };

  if (loadError) {
    return (
      <div style={layoutStyle}>
        <div style={headerStyle}>
          <DialogButton onClick={() => Router.NavigateBack()}>← Retour</DialogButton>
          <div style={{ flex: 1, fontWeight: 700 }}>Lecteur plein écran</div>
        </div>
        <div style={{ padding: "24px", fontSize: "0.95rem" }}>{loadError}</div>
      </div>
    );
  }

  if (!guide || !preferences) {
    return (
      <div style={layoutStyle}>
        <div style={headerStyle}>
          <DialogButton onClick={() => Router.NavigateBack()}>← Retour</DialogButton>
          <div style={{ flex: 1, fontWeight: 700 }}>Chargement…</div>
        </div>
      </div>
    );
  }

  const sectionCount = guide.sections.length;
  const currentSection = sectionIndex >= 0 ? guide.sections[sectionIndex] : null;
  const sectionLabel = currentSection ? currentSection.title : "—";

  return (
    <div style={layoutStyle}>
      <div style={headerStyle}>
        <DialogButton onClick={() => Router.NavigateBack()}>← Retour</DialogButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {guide.game.game_title || guide.title}
          </div>
          <div style={{ fontSize: "0.78rem", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sectionCount > 0 && sectionIndex >= 0
              ? `Section ${sectionIndex + 1}/${sectionCount} · ${sectionLabel}`
              : "Aucune section"}
          </div>
        </div>
        <DialogButton onClick={() => setShowToc((v) => !v)}>{showToc ? "Masquer sommaire" : "📚 Sommaire"}</DialogButton>
        <DialogButton onClick={() => setFontScale((v) => Math.max(0.85, +(v - 0.1).toFixed(2)))}>A−</DialogButton>
        <DialogButton onClick={() => setFontScale((v) => Math.min(2.0, +(v + 0.1).toFixed(2)))}>A+</DialogButton>
        <DialogButton onClick={() => setShowSearch((v) => !v)}>{showSearch ? "Fermer 🔍" : "🔍"}</DialogButton>
      </div>

      {showSearch ? (
        <div style={{ padding: "8px 16px", background: "rgba(0,0,0,0.25)", flexShrink: 0 }}>
          <input
            type="text"
            value={searchPattern}
            onChange={(e: any) => setSearchPattern(e.target.value)}
            placeholder="Surligner dans la section…"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: `1px solid ${theme.borderColor}`,
              background: "rgba(0,0,0,0.4)",
              color: theme.textColor,
              fontSize: "0.9rem",
            }}
          />
        </div>
      ) : null}

      <div style={mainAreaStyle}>
        {showToc ? (
          <Focusable style={sidebarStyle}>
            {guide.sections.map((sec, idx) => {
              const isCurrent = idx === sectionIndex;
              const indent = Math.max(0, (sec.heading_level || 0) - 1) * 12;
              return (
                <Focusable
                  key={idx}
                  onActivate={() => setSectionIndex(idx)}
                  style={{
                    padding: "8px 10px",
                    paddingLeft: `${10 + indent}px`,
                    borderLeft: isCurrent ? "3px solid #ffd966" : "3px solid transparent",
                    background: isCurrent ? "rgba(255, 217, 102, 0.18)" : "transparent",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isCurrent ? 700 : 400,
                    color: theme.textColor,
                  }}
                >
                  {preferences.numbered_sections ? `[${idx + 1}] ` : ""}{sec.title || "(sans titre)"}
                </Focusable>
              );
            })}
          </Focusable>
        ) : null}

        <div style={readerPaneStyle}>
          <GuideReader
            guide={guide}
            sectionIndex={sectionIndex}
            fontScale={fontScale}
            preferences={preferences}
            searchPattern={searchPattern}
            scrollRestoreFraction={restoreFractionRef.current}
            onScrollChange={(f) => {
              lastScrollFractionRef.current = f;
              if (restoreFractionRef.current !== null) restoreFractionRef.current = null;
            }}
            maxHeight={showSearch ? "calc(100vh - 280px)" : "calc(100vh - 230px)"}
          />
        </div>
      </div>

      <div style={footerStyle}>
        <DialogButton
          disabled={sectionIndex <= 0}
          onClick={() => setSectionIndex((v) => Math.max(0, v - 1))}
        >
          ◀ Section précédente
        </DialogButton>
        <div style={{ flex: 1, textAlign: "center", fontSize: "0.78rem", opacity: 0.7 }}>
          {sectionCount > 0 && sectionIndex >= 0 ? `${sectionIndex + 1} / ${sectionCount}` : ""}
        </div>
        <DialogButton
          onClick={() => {
            if (!guide) return;
            void setBookmark(guide.id, sectionIndex, lastScrollFractionRef.current)
              .then((g) => setGuide(g))
              .catch(() => {});
          }}
        >
          🔖 Marque-page
        </DialogButton>
        <div style={{ flex: 1 }} />
        <DialogButton
          disabled={sectionCount === 0 || sectionIndex >= sectionCount - 1}
          onClick={() => setSectionIndex((v) => Math.min(sectionCount - 1, v + 1))}
        >
          Section suivante ▶
        </DialogButton>
      </div>
    </div>
  );
}


// ========== Global hotkey listener ==========

/**
 * Invisible global component that listens for F8 keypresses anywhere in Steam UI.
 * On press: loads the most-recently-opened guide and navigates to the full-screen reader.
 *
 * The user maps a back paddle (L4/R4/L5/R5) to F8 in Steam Input — pressing the paddle
 * fires F8 → this handler triggers → reader opens at last position. No QAM detour.
 */
function GlobalHotkeyListener() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "F8") return;
      e.preventDefault();
      void (async () => {
        try {
          const guides = await listGuides();
          if (!guides.length) return;
          // Pick most-recently-opened (highest last_opened_at, ISO strings sort lex correctly)
          const sorted = [...guides].sort((a, b) =>
            (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "")
          );
          const target = sorted[0];
          if (!target?.id) return;
          requestFullScreenGuide(target.id);
          Router.CloseSideMenus();
          Router.Navigate(FULL_SCREEN_ROUTE);
        } catch {
          // Silent — nothing useful to show globally; user can still open via QAM.
        }
      })();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  return null;
}


// ========== Main Content component ==========

function Content() {
  // Core state
  const [activeView, setActiveView] = useState<ViewMode>("sources");
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<GuideDetail | null>(null);
  const [sources, setSources] = useState<ScanSource[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>({
    scanned_at: "", item_count: 0, instance_count: 0, enabled_source_count: 0,
  });
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [searchResults, setSearchResults] = useState<GuideSearchResult[]>([]);
  const [error, setError] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isHydratingGuide, setIsHydratingGuide] = useState<boolean>(false);

  // Index state
  const [sourceIndex, setSourceIndex] = useState<number>(0);
  const [kindIndex, setKindIndex] = useState<number>(0);
  const [storageIndex, setStorageIndex] = useState<number>(0);
  const [platformIndex, setPlatformIndex] = useState<number>(0);
  const [libraryIndex, setLibraryIndex] = useState<number>(0);
  const [searchSiteIndex, setSearchSiteIndex] = useState<number>(0);
  const [languageIndex, setLanguageIndex] = useState<number>(0);
  const [searchResultIndex, setSearchResultIndex] = useState<number>(0);
  const [guideIndex, setGuideIndex] = useState<number>(0);
  const [relatedGuideIndex, setRelatedGuideIndex] = useState<number>(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(-1);
  const [fontScale, setFontScale] = useState<number>(1);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameCandidateIndex, setRenameCandidateIndex] = useState<number>(0);
  const [debugOutput, setDebugOutput] = useState<string>("");
  const [sortByName, setSortByName] = useState<boolean>(true);
  const [letterFilter, setLetterFilter] = useState<string>("");  // "" = all; otherwise single uppercase char
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  // Reader preferences
  const [preferences, setPreferences] = useState<ReaderPreferences>({
    theme: "dark", font_family: "sans", line_height: "normal",
    max_width: "normal", highlight_keywords: true, numbered_sections: true,
  });

  // Reading features
  const [findPresetIndex, setFindPresetIndex] = useState<number>(0);
  const [findPattern, setFindPattern] = useState<string>("");
  const [findMatches, setFindMatches] = useState<FindMatch[]>([]);
  const [findIndex, setFindIndex] = useState<number>(0);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [tocIndex, setTocIndex] = useState<number>(0);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [bookmarkIndex, setBookmarkIndex] = useState<number>(0);
  const [exportFiles, setExportFiles] = useState<ExportEntry[]>([]);
  const [exportIndex, setExportIndex] = useState<number>(0);
  const [showExports, setShowExports] = useState<boolean>(false);

  const saveTimeoutRef = useRef<number | null>(null);
  const lastScrollFractionRef = useRef<number>(0);
  const pendingRestoreFractionRef = useRef<number | null>(null);
  const [scrollRestoreToken, setScrollRestoreToken] = useState<number>(0);
  const [expandedReader, setExpandedReader] = useState<boolean>(false);

  // Recompute the restore fraction whenever a caller bumps the token.
  // This triggers a re-render so the GuideReader sees the new value.
  const scrollRestoreFraction = useMemo<number | null>(
    () => pendingRestoreFractionRef.current,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollRestoreToken],
  );

  const platformChoices = useMemo(() => {
    const dynamic = Array.from(new Set(libraryItems.map((item) => item.platform || "Autre"))).sort((a, b) => a.localeCompare(b));
    return ["Tous", ...dynamic];
  }, [libraryItems]);

  const filteredItems = useMemo(() => {
    const kindFilter = KIND_CHOICES[kindIndex] || "Tous";
    const storageFilter = STORAGE_CHOICES[storageIndex] || "Tous";
    const platformFilter = platformChoices[platformIndex] || "Tous";

    const items = libraryItems.filter((item) => {
      if (showFavoritesOnly && !item.is_favorite) return false;
      if (kindFilter !== "Tous") {
        const kindMap: Record<string, string> = { "ROMs": "roms", "Games": "games", "Steam": "steam" };
        const wanted = kindMap[kindFilter] || "";
        if (wanted && !item.source_kinds.includes(wanted)) return false;
      }
      if (storageFilter !== "Tous" && !item.storages.includes(storageFilter)) return false;
      if (platformFilter !== "Tous" && item.platform !== platformFilter) return false;
      if (letterFilter) {
        const title = (item.custom_title || item.title || "").trim();
        if (!title) return false;
        const firstChar = title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .charAt(0)
          .toUpperCase();
        if (letterFilter === "#") {
          // "#" bucket = non-alphabetic initials (digits, symbols)
          if (/^[A-Z]$/.test(firstChar)) return false;
        } else if (firstChar !== letterFilter) {
          return false;
        }
      }
      return true;
    });
    const getTitle = (item: LibraryItem) => (item.custom_title || item.title || "").toLowerCase();
    if (sortByName) items.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    else items.sort((a, b) => {
      const pa = (a.platform || "").localeCompare(b.platform || "");
      return pa !== 0 ? pa : getTitle(a).localeCompare(getTitle(b));
    });
    return items;
  }, [kindIndex, storageIndex, platformIndex, libraryItems, platformChoices, sortByName, letterFilter, showFavoritesOnly]);

  // Letters that actually have at least one matching game (ignoring letterFilter itself)
  const availableLetters = useMemo(() => {
    const present = new Set<string>();
    for (const item of libraryItems) {
      if (showFavoritesOnly && !item.is_favorite) continue;
      const title = (item.custom_title || item.title || "").trim();
      if (!title) continue;
      const firstChar = title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .charAt(0)
        .toUpperCase();
      if (/^[A-Z]$/.test(firstChar)) present.add(firstChar);
      else present.add("#");
    }
    // Always prepend "" (= all) and sort alphabetically with "#" last
    const sorted = Array.from(present).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
    return ["", ...sorted];  // "" = Tous
  }, [libraryItems, showFavoritesOnly]);

  const selectedSource = sources[sourceIndex] || null;
  const selectedLibraryItem = filteredItems[libraryIndex] || null;
  const relatedGuides = useMemo(() => {
    if (!selectedLibraryItem) return [] as GuideSummary[];
    return guides.filter((guide) => guideMatchesLibraryItem(guide, selectedLibraryItem));
  }, [guides, selectedLibraryItem]);
  const selectedRelatedGuide = relatedGuides[relatedGuideIndex] || null;

  const renameCandidates = useMemo(() => {
    if (!selectedLibraryItem) return [] as string[];
    const candidates = new Set<string>();
    candidates.add(selectedLibraryItem.title);
    if (selectedLibraryItem.custom_title) candidates.add(selectedLibraryItem.custom_title);
    for (const alias of selectedLibraryItem.aliases) if (alias) candidates.add(alias);
    const title = selectedLibraryItem.custom_title || selectedLibraryItem.title;
    const dashSplit = title.split(/\s*[-:]\s*/);
    if (dashSplit.length > 1 && dashSplit[0].length >= 3) candidates.add(dashSplit[0].trim());
    return Array.from(candidates).filter((c) => c.length >= 2);
  }, [selectedLibraryItem]);

  const selectedSearchSite = SEARCH_SITE_CHOICES[searchSiteIndex] || SEARCH_SITE_CHOICES[0];
  const selectedLanguage = LANGUAGE_CHOICES[languageIndex] || LANGUAGE_CHOICES[0];
  const selectedSearchResult = searchResults[searchResultIndex] || null;
  const selectedGuideSummary = guides[guideIndex] || null;

  // Most-recently-opened guide across the whole library (for the "Resume" banner)
  const lastOpenedGuide = useMemo(() => {
    let best: GuideSummary | null = null;
    for (const g of guides) {
      const when = g.progress?.last_opened_at || "";
      if (!when) continue;
      if (!best || when > (best.progress?.last_opened_at || "")) best = g;
    }
    return best;
  }, [guides]);

  const currentSectionLabel =
    selectedSectionIndex < 0
      ? "texte complet"
      : selectedGuide?.sections[selectedSectionIndex]?.title ?? "section";

  const currentSectionNote = useMemo(() => {
    if (!selectedGuide || selectedSectionIndex < 0) return null;
    return selectedGuide.progress.section_notes.find((n) => n.section_index === selectedSectionIndex) || null;
  }, [selectedGuide, selectedSectionIndex]);

  const sectionsWithNotes = useMemo(() => {
    if (!selectedGuide) return new Set<number>();
    return new Set(selectedGuide.progress.section_notes.map((n) => n.section_index));
  }, [selectedGuide]);

  const loadSourcesAndLibrary = async () => {
    const [sourceItems, status, itemList] = await Promise.all([
      listScanSources(), getLibraryStatus(), listLibraryItems(),
    ]);
    setSources(sourceItems);
    setLibraryStatus(status);
    setLibraryItems(itemList);
  };

  const loadAll = async () => {
    const [guideItems] = await Promise.all([listGuides(), loadSourcesAndLibrary()]);
    setGuides(guideItems);
    try {
      const prefs = await getReaderPreferences();
      setPreferences(prefs);
    } catch {
      // keep defaults
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadAll();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chargement initial impossible");
      }
    })();
    return () => {
      if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => { if (sourceIndex >= sources.length) setSourceIndex(0); }, [sourceIndex, sources.length]);
  useEffect(() => { if (libraryIndex >= filteredItems.length) setLibraryIndex(0); }, [libraryIndex, filteredItems.length]);
  useEffect(() => { if (guideIndex >= guides.length) setGuideIndex(0); }, [guideIndex, guides.length]);
  useEffect(() => { if (searchResultIndex >= searchResults.length) setSearchResultIndex(0); }, [searchResultIndex, searchResults.length]);
  useEffect(() => { if (relatedGuideIndex >= relatedGuides.length) setRelatedGuideIndex(0); }, [relatedGuideIndex, relatedGuides.length]);
  useEffect(() => { if (platformIndex >= platformChoices.length) setPlatformIndex(0); }, [platformIndex, platformChoices.length]);

  // Debounced progress save
  useEffect(() => {
    if (!selectedGuide || isHydratingGuide) return;
    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const updated = await saveProgress(selectedGuide.id, selectedSectionIndex, fontScale, lastScrollFractionRef.current);
          setSelectedGuide((c) => (c && c.id === updated.id ? updated : c));
          setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Impossible de sauvegarder la progression");
        }
      })();
    }, 400);
  }, [selectedGuide?.id, selectedSectionIndex, fontScale, isHydratingGuide]);

  // ========== Handlers ==========

  const openGuideById = async (guideId: string) => {
    setIsBusy(true);
    setError("");
    try {
      const detail = await getGuide(guideId);
      setIsHydratingGuide(true);
      setSelectedGuide(detail);
      setSelectedSectionIndex(detail.progress.last_section_index ?? -1);
      setFontScale(detail.progress.font_scale ?? 1);
      setFindPattern("");
      setFindPresetIndex(0);
      setFindMatches([]);
      setFindIndex(0);
      setShowToc(false);
      setShowBookmarks(false);
      setActiveView("guides");
      window.setTimeout(() => setIsHydratingGuide(false), 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleCurrentSource = async () => {
    if (!selectedSource) return;
    setIsBusy(true);
    setError("");
    try {
      await toggleScanSource(selectedSource.id);
      await loadSourcesAndLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de modifier la source");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRescan = async () => {
    setIsBusy(true); setError("");
    try {
      const status = await rescanLibrary();
      setLibraryStatus(status);
      await loadSourcesAndLibrary();
      setSearchResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rescan impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartRename = () => {
    if (!selectedLibraryItem) return;
    setRenameCandidateIndex(0);
    setIsRenaming(true);
  };

  const handleConfirmRename = async () => {
    if (!selectedLibraryItem || !renameCandidates.length) return;
    const chosen = renameCandidates[renameCandidateIndex] || selectedLibraryItem.title;
    setIsBusy(true); setError("");
    try {
      const newTitle = chosen === selectedLibraryItem.title ? "" : chosen;
      await renameLibraryItem(selectedLibraryItem.id, newTitle);
      setIsRenaming(false);
      await loadSourcesAndLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Renommage impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelRename = () => { setIsRenaming(false); setRenameCandidateIndex(0); };

  const handleToggleFavorite = async () => {
    if (!selectedLibraryItem) return;
    setIsBusy(true); setError("");
    try {
      const result = await toggleLibraryFavorite(selectedLibraryItem.id);
      // Patch local state — no need to rescan the whole library
      setLibraryItems((items) => items.map((it) => (
        it.id === result.id ? { ...it, is_favorite: result.is_favorite } : it
      )));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de modifier le favori");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDebug = async () => {
    setIsBusy(true); setError("");
    try {
      const info = await debugInfo();
      setDebugOutput(JSON.stringify(info, null, 2));
    } catch (e) {
      setDebugOutput(e instanceof Error ? e.message : "Debug impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleTestNetwork = async () => {
    setIsBusy(true); setError("");
    try {
      const info = await testNetwork();
      setDebugOutput(JSON.stringify(info, null, 2));
    } catch (e) {
      setDebugOutput(e instanceof Error ? e.message : "Test réseau impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleTestSearch = async () => {
    setIsBusy(true); setError("");
    try {
      const q = selectedLibraryItem
        ? `${selectedLibraryItem.custom_title || selectedLibraryItem.title} ${selectedLibraryItem.platform} walkthrough guide`
        : "Suikoden III PS2 faq walkthrough";
      const info = await testSearch(q);
      setDebugOutput(JSON.stringify(info, null, 2));
    } catch (e) {
      setDebugOutput(e instanceof Error ? e.message : "Test de recherche impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearDebug = async () => {
    setIsBusy(true);
    try {
      await clearDebugLog();
      setDebugOutput("Debug log effacé.");
    } catch (e) {
      setDebugOutput(e instanceof Error ? e.message : "Impossible d'effacer");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedLibraryItem) {
      setError("Aucun jeu sélectionné dans la bibliothèque locale.");
      return;
    }
    setIsBusy(true); setError("");
    try {
      const searchTitle = selectedLibraryItem.custom_title || selectedLibraryItem.title;
      const results = await searchGuides(searchTitle, selectedLibraryItem.platform, selectedSearchSite.value, selectedLanguage.value);
      setSearchResults(results);
      setSearchResultIndex(0);
      if (!results.length) setError("Aucun résultat. Change de site ou de langue, puis relance.");
    } catch (e) {
      setSearchResults([]);
      setError(e instanceof Error ? e.message : "Recherche impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportSelectedResult = async () => {
    if (!selectedLibraryItem || !selectedSearchResult) {
      setError("Aucun résultat sélectionné à importer.");
      return;
    }
    setIsBusy(true); setError("");
    try {
      const importTitle = selectedLibraryItem.custom_title || selectedLibraryItem.title;
      const detail = await saveGuide(
        selectedSearchResult.url, importTitle, selectedLibraryItem.platform,
        selectedLibraryItem.primary_path || importTitle,
        selectedLibraryItem.aliases.join("; "),
        selectedLibraryItem.emulator || "",
      );
      await loadAll();
      setGuideIndex(0);
      setSearchResults([]); setSearchResultIndex(0);
      setActiveView("guides");
      setIsHydratingGuide(true);
      setSelectedGuide(detail);
      setSelectedSectionIndex(detail.progress.last_section_index ?? -1);
      setFontScale(detail.progress.font_scale ?? 1);
      window.setTimeout(() => setIsHydratingGuide(false), 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteSelectedGuide = async () => {
    if (!selectedGuideSummary) return;
    setIsBusy(true); setError("");
    try {
      await deleteGuide(selectedGuideSummary.id);
      if (selectedGuide?.id === selectedGuideSummary.id) {
        setSelectedGuide(null);
        setSelectedSectionIndex(-1);
      }
      const guideItems = await listGuides();
      setGuides(guideItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetBookmark = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    try {
      let effectiveSection = selectedSectionIndex;
      if (effectiveSection < 0 && selectedGuide.sections.length > 0) {
        effectiveSection = 0;
        setSelectedSectionIndex(0);
      }
      const updated = await setBookmark(selectedGuide.id, effectiveSection, lastScrollFractionRef.current);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer le marque-page");
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoToBookmark = () => {
    if (!selectedGuide || !selectedGuide.has_bookmark) return;
    const idx = selectedGuide.progress.bookmark_section_index;
    const frac = selectedGuide.progress.bookmark_scroll_fraction || 0;
    pendingRestoreFractionRef.current = frac;
    setScrollRestoreToken((t) => t + 1);
    setSelectedSectionIndex(idx >= 0 ? idx : 0);
  };

  const handleResumeReading = () => {
    if (!selectedGuide) return;
    const idx = selectedGuide.progress.last_section_index;
    const frac = selectedGuide.progress.last_scroll_fraction || 0;
    pendingRestoreFractionRef.current = frac;
    setScrollRestoreToken((t) => t + 1);
    setSelectedSectionIndex(idx >= 0 ? idx : 0);
  };

  const handleClearBookmark = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    try {
      const updated = await clearBookmark(selectedGuide.id);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'effacer le marque-page");
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearProgress = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    try {
      const updated = await clearProgress(selectedGuide.id);
      setSelectedGuide(updated);
      setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
      setFontScale(updated.progress.font_scale ?? 1);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'effacer la progression");
    } finally {
      setIsBusy(false);
    }
  };

  // Find-in-guide
  const handleRunFind = async () => {
    if (!selectedGuide) return;
    const preset = FIND_PRESETS[findPresetIndex];
    const pattern = preset?.pattern.trim() || "";
    if (pattern.length < 2) {
      setError("Choisis un mot-clé à chercher.");
      return;
    }
    setIsBusy(true); setError("");
    try {
      const result = await findInGuide(selectedGuide.id, pattern);
      setFindPattern(pattern);
      setFindMatches(result.matches);
      setFindIndex(0);
      if (result.matches.length === 0) setError(`Aucune occurrence de "${pattern}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recherche impossible");
      setFindMatches([]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleReconstructSections = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    try {
      const updated = await reconstructSections(selectedGuide.id);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
      // Reset reader state because section indices changed
      setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reconstruction impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const goToMatch = (idx: number) => {
    if (!selectedGuide || findMatches.length === 0) return;
    const wrapped = ((idx % findMatches.length) + findMatches.length) % findMatches.length;
    setFindIndex(wrapped);
    const match = findMatches[wrapped];
    if (match.section_index >= 0) {
      const section = selectedGuide.sections[match.section_index];
      let fraction = 0;
      if (section) {
        const span = Math.max(1, section.line_end - section.line_start + 1);
        const offset = Math.max(0, match.line_index - section.line_start);
        // Bias slightly upward so the matching line isn't flush against the top edge
        fraction = Math.max(0, Math.min(1, (offset - 2) / span));
      }
      pendingRestoreFractionRef.current = fraction;
      setScrollRestoreToken((t) => t + 1);
      if (match.section_index !== selectedSectionIndex) {
        setSelectedSectionIndex(match.section_index);
      }
    }
  };

  // TOC navigation
  const jumpToSection = (idx: number) => {
    if (!selectedGuide) return;
    pendingRestoreFractionRef.current = 0;
    setScrollRestoreToken((t) => t + 1);
    setSelectedSectionIndex(idx);
    setShowToc(false);
  };

  // Named bookmarks
  const handleAddNamedBookmark = async () => {
    if (!selectedGuide) return;
    // Auto-name from current section + current time — no keyboard needed
    const section = selectedSectionIndex >= 0 ? selectedGuide.sections[selectedSectionIndex] : null;
    const secTitle = section ? section.title.slice(0, 40) : "Début";
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const name = `${secTitle} — ${hhmm}`;
    setIsBusy(true); setError("");
    try {
      const updated = await addNamedBookmark(
        selectedGuide.id, name,
        selectedSectionIndex,
        lastScrollFractionRef.current,
      );
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ajouter le marque-page");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteNamedBookmark = async (bookmarkId: string) => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    try {
      const updated = await deleteNamedBookmark(selectedGuide.id, bookmarkId);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoToNamedBookmark = (bm: NamedBookmark) => {
    if (!selectedGuide) return;
    pendingRestoreFractionRef.current = bm.scroll_fraction || 0;
    setScrollRestoreToken((t) => t + 1);
    setSelectedSectionIndex(bm.section_index >= 0 ? bm.section_index : 0);
  };

  // Section notes
  const handleToggleDone = async () => {
    if (!selectedGuide || selectedSectionIndex < 0) return;
    const existing = currentSectionNote;
    setIsBusy(true); setError("");
    try {
      const updated = await setSectionNote(
        selectedGuide.id, selectedSectionIndex,
        !(existing?.done || false),
        existing?.flagged || false,
        existing?.note || "",
      );
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleFlag = async () => {
    if (!selectedGuide || selectedSectionIndex < 0) return;
    const existing = currentSectionNote;
    setIsBusy(true); setError("");
    try {
      const updated = await setSectionNote(
        selectedGuide.id, selectedSectionIndex,
        existing?.done || false,
        !(existing?.flagged || false),
        existing?.note || "",
      );
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearSectionNote = async () => {
    if (!selectedGuide || selectedSectionIndex < 0) return;
    setIsBusy(true); setError("");
    try {
      const updated = await clearSectionNote(selectedGuide.id, selectedSectionIndex);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible");
    } finally {
      setIsBusy(false);
    }
  };

  // Preferences
  const savePrefs = async (next: ReaderPreferences) => {
    setPreferences(next);
    try {
      await updateReaderPreferences(
        next.theme, next.font_family, next.line_height, next.max_width,
        next.highlight_keywords, next.numbered_sections,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sauvegarde préférences impossible");
    }
  };

  const cycleTheme = () => {
    const i = THEME_CHOICES.indexOf(preferences.theme);
    const next = THEME_CHOICES[(i + 1) % THEME_CHOICES.length];
    void savePrefs({ ...preferences, theme: next });
  };
  const cycleFont = () => {
    const i = FONT_CHOICES.indexOf(preferences.font_family);
    const next = FONT_CHOICES[(i + 1) % FONT_CHOICES.length];
    void savePrefs({ ...preferences, font_family: next });
  };
  const cycleLineHeight = () => {
    const i = LINE_HEIGHT_CHOICES.indexOf(preferences.line_height);
    const next = LINE_HEIGHT_CHOICES[(i + 1) % LINE_HEIGHT_CHOICES.length];
    void savePrefs({ ...preferences, line_height: next });
  };
  const cycleMaxWidth = () => {
    const i = MAX_WIDTH_CHOICES.indexOf(preferences.max_width);
    const next = MAX_WIDTH_CHOICES[(i + 1) % MAX_WIDTH_CHOICES.length];
    void savePrefs({ ...preferences, max_width: next });
  };
  const toggleHighlight = () => void savePrefs({ ...preferences, highlight_keywords: !preferences.highlight_keywords });
  const toggleNumbered = () => void savePrefs({ ...preferences, numbered_sections: !preferences.numbered_sections });

  // External URL
  const handleOpenExternal = async () => {
    if (!selectedGuide?.url) return;
    setIsBusy(true); setError("");
    try {
      await openUrlExternal(selectedGuide.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ouvrir dans le navigateur");
    } finally {
      setIsBusy(false);
    }
  };

  // Export / Import
  const handleExportCurrent = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    try {
      const result = await exportGuide(selectedGuide.id);
      setDebugOutput(`Exporté : ${result.path} (${bytesToKo(result.size_bytes)})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportAll = async () => {
    setIsBusy(true); setError("");
    try {
      const result = await exportAllGuides();
      setDebugOutput(`Export complet : ${result.path} (${result.guide_count} guides, ${bytesToKo(result.size_bytes)})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleListExports = async () => {
    setIsBusy(true); setError("");
    try {
      const files = await listExportFiles();
      setExportFiles(files);
      setExportIndex(0);
      setShowExports(true);
      if (!files.length) setError("Aucun export dans ~/Documents/OfflineSoluce/exports");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportSelectedExport = async () => {
    const entry = exportFiles[exportIndex];
    if (!entry) return;
    setIsBusy(true); setError("");
    try {
      const result = await importGuideFromPath(entry.path);
      setDebugOutput(`Importé : ${result.imported_count} guide(s)`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const toggleExpandedReader = () => {
    setExpandedReader((v) => !v);
  };

  // ========== Renderers ==========

  const renderModeHeader = () => (
    <PanelSection title="Vue active">
      <PanelSectionRow>
        <div style={boxStyle}>
          <div style={{ fontWeight: 700, marginBottom: "6px" }}>{activeView.toUpperCase()}</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.86 }}>
            Sources → bibliothèque → recherche → guides offline.
          </div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={isBusy} onClick={() => setActiveView(VIEW_SEQUENCE[cycleIndex(VIEW_SEQUENCE.indexOf(activeView), VIEW_SEQUENCE.length, -1)])}>
          Vue précédente
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={isBusy} onClick={() => setActiveView(VIEW_SEQUENCE[cycleIndex(VIEW_SEQUENCE.indexOf(activeView), VIEW_SEQUENCE.length, 1)])}>
          Vue suivante
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );

  const renderSourcesView = () => (
    <>
      {lastOpenedGuide ? (
        <PanelSection title="Reprendre la lecture">
          <PanelSectionRow>
            <div style={{ ...boxStyle, borderColor: "rgba(255, 217, 102, 0.35)" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                {lastOpenedGuide.game.game_title || lastOpenedGuide.title}
              </div>
              <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>
                {lastOpenedGuide.resume_label}
                {lastOpenedGuide.progress?.last_opened_at
                  ? ` — ${formatDate(lastOpenedGuide.progress.last_opened_at)}`
                  : ""}
              </div>
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => void openGuideById(lastOpenedGuide.id)}>
              ⏱ Reprendre où j'étais
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => {
              requestFullScreenGuide(lastOpenedGuide.id);
              Router.CloseSideMenus();
              Router.Navigate(FULL_SCREEN_ROUTE);
            }}>
              🖥️ Reprendre en plein écran
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      ) : null}

      <PanelSection title="Résumé scan">
        <PanelSectionRow>
          <div style={boxStyle}>
            <div><strong>Sources activées :</strong> {libraryStatus.enabled_source_count}</div>
            <div><strong>Jeux indexés :</strong> {libraryStatus.item_count}</div>
            <div><strong>Occurrences trouvées :</strong> {libraryStatus.instance_count}</div>
            <div><strong>Dernier scan :</strong> {libraryStatus.scanned_at ? formatDate(libraryStatus.scanned_at) : "Jamais"}</div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleRescan()}>
            {isBusy ? "Scan en cours..." : "Rescanner les dossiers activés"}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void loadSourcesAndLibrary()}>
            Redétecter les dossiers
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={selectedSource ? `Source ${sourceIndex + 1}/${sources.length}` : "Sources détectées"}>
        <PanelSectionRow>
          <div style={boxStyle}>
            {selectedSource ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>{selectedSource.label}</div>
                <div>
                  <span style={pillStyle}>{selectedSource.kind === "roms" ? "ROMs" : selectedSource.kind === "games" ? "Games" : "Steam"}</span>
                  <span style={pillStyle}>{selectedSource.storage}</span>
                  <span style={pillStyle}>{selectedSource.enabled ? "Activée" : "Désactivée"}</span>
                  <span style={pillStyle}>{selectedSource.exists ? "Présente" : "Absente"}</span>
                </div>
                {fieldLine("Chemin", selectedSource.path)}
              </>
            ) : (
              <div style={{ fontSize: "0.82rem", opacity: 0.86 }}>Aucune source détectée. Vérifie tes dossiers Emulation/roms et Games.</div>
            )}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || sources.length <= 1} onClick={() => setSourceIndex((v) => cycleIndex(v, sources.length, -1))}>
            Source précédente
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || sources.length <= 1} onClick={() => setSourceIndex((v) => cycleIndex(v, sources.length, 1))}>
            Source suivante
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || !selectedSource} onClick={() => void handleToggleCurrentSource()}>
            {selectedSource?.enabled ? "Désactiver cette source" : "Activer cette source"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Sauvegarde / restauration">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || !guides.length} onClick={() => void handleExportAll()}>
            Exporter tous les guides (bundle JSON)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleListExports()}>
            Lister les exports disponibles
          </ButtonItem>
        </PanelSectionRow>
        {showExports && exportFiles.length ? (
          <>
            <PanelSectionRow>
              <div style={boxStyle}>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                  Export {exportIndex + 1}/{exportFiles.length}
                </div>
                <div style={{ fontSize: "0.85rem" }}>{exportFiles[exportIndex]?.name}</div>
                <div style={{ fontSize: "0.72rem", opacity: 0.75 }}>
                  {formatDate(exportFiles[exportIndex]?.modified_at || "")} · {bytesToKo(exportFiles[exportIndex]?.size_bytes || 0)}
                </div>
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || exportFiles.length <= 1} onClick={() => setExportIndex((v) => cycleIndex(v, exportFiles.length, -1))}>
                Export précédent
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || exportFiles.length <= 1} onClick={() => setExportIndex((v) => cycleIndex(v, exportFiles.length, 1))}>
                Export suivant
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || !exportFiles[exportIndex]} onClick={() => void handleImportSelectedExport()}>
                Importer cet export
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => setShowExports(false)}>
                Masquer la liste
              </ButtonItem>
            </PanelSectionRow>
          </>
        ) : null}
      </PanelSection>

      <PanelSection title="Diagnostic">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleDebug()}>
            {isBusy ? "Diagnostic en cours..." : "Lancer le diagnostic"}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleTestNetwork()}>
            {isBusy ? "Test réseau en cours..." : "Tester la connexion aux moteurs"}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleTestSearch()}>
            {isBusy ? "Test recherche en cours..." : "Tester le parsing des résultats"}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleClearDebug()}>
            Effacer le fichier debug
          </ButtonItem>
        </PanelSectionRow>
        {debugOutput ? (
          <PanelSectionRow>
            <div style={{
              whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0,
              padding: "10px 12px", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)",
              fontSize: "0.7rem", maxHeight: "30vh", overflowY: "auto",
              fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
            }}>
              {debugOutput}
            </div>
          </PanelSectionRow>
        ) : null}
      </PanelSection>
    </>
  );

  const renderLibraryView = () => {
    const favoriteCount = libraryItems.filter((i) => i.is_favorite).length;
    const letterIdx = availableLetters.indexOf(letterFilter) >= 0 ? availableLetters.indexOf(letterFilter) : 0;
    const letterLabel = (l: string) => l === "" ? "Tous" : l === "#" ? "Chiffres / symboles" : l;
    return (
    <>
      <PanelSection title="Filtrer par lettre">
        <PanelSectionRow>
          <div style={boxStyle}>
            <div><strong>Initiale :</strong> {letterLabel(letterFilter)}</div>
            <div style={{ fontSize: "0.72rem", opacity: 0.75, marginTop: "4px" }}>
              {availableLetters.length > 1
                ? `${availableLetters.length - 1} lettre(s) disponibles · ${filteredItems.length} jeu(x) visibles`
                : "Bibliothèque vide"}
            </div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || availableLetters.length <= 1}
            onClick={() => {
              const next = availableLetters[cycleIndex(letterIdx, availableLetters.length, -1)];
              setLetterFilter(next); setLibraryIndex(0);
            }}>
            ◀ Lettre précédente
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || availableLetters.length <= 1}
            onClick={() => {
              const next = availableLetters[cycleIndex(letterIdx, availableLetters.length, 1)];
              setLetterFilter(next); setLibraryIndex(0);
            }}>
            Lettre suivante ▶
          </ButtonItem>
        </PanelSectionRow>
        {letterFilter ? (
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => { setLetterFilter(""); setLibraryIndex(0); }}>
              Effacer le filtre
            </ButtonItem>
          </PanelSectionRow>
        ) : null}
      </PanelSection>

      <PanelSection title="Filtres bibliothèque">
        <PanelSectionRow>
          <div style={boxStyle}>
            <div><strong>Type :</strong> {KIND_CHOICES[kindIndex] || "Tous"}</div>
            <div><strong>Stockage :</strong> {STORAGE_CHOICES[storageIndex] || "Tous"}</div>
            <div><strong>Plateforme :</strong> {platformChoices[platformIndex] || "Tous"}</div>
            <div><strong>Tri :</strong> {sortByName ? "A → Z" : "Plateforme + nom"}</div>
            <div><strong>Favoris uniquement :</strong> {showFavoritesOnly ? "Oui" : "Non"} ({favoriteCount} ★)</div>
            <div><strong>Résultats :</strong> {filteredItems.length}</div>
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => { setShowFavoritesOnly((v) => !v); setLibraryIndex(0); }}>
            {showFavoritesOnly ? "Afficher tous les jeux" : `★ N'afficher que les favoris (${favoriteCount})`}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setKindIndex((v) => cycleIndex(v, KIND_CHOICES.length, 1))}>Changer le type</ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setStorageIndex((v) => cycleIndex(v, STORAGE_CHOICES.length, 1))}>Changer le stockage</ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setPlatformIndex((v) => cycleIndex(v, platformChoices.length, 1))}>Changer la plateforme</ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => { setSortByName((v) => !v); setLibraryIndex(0); }}>
            {sortByName ? "Trier par plateforme" : "Trier par nom"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={selectedLibraryItem ? `Jeu ${libraryIndex + 1}/${filteredItems.length}` : "Jeu sélectionné"}>
        <PanelSectionRow>
          <div style={boxStyle}>
            {selectedLibraryItem ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                  {selectedLibraryItem.is_favorite ? "★ " : ""}{selectedLibraryItem.custom_title || selectedLibraryItem.title}
                </div>
                {selectedLibraryItem.custom_title ? (
                  <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "4px" }}>Original : {selectedLibraryItem.title}</div>
                ) : null}
                <div>
                  <span style={pillStyle}>{selectedLibraryItem.platform}</span>
                  {selectedLibraryItem.disc_code ? <span style={pillStyle}>{selectedLibraryItem.disc_code}</span> : null}
                  {selectedLibraryItem.emulator ? <span style={pillStyle}>{selectedLibraryItem.emulator}</span> : null}
                  {selectedLibraryItem.source_kinds.map((kind) => (
                    <span key={kind} style={pillStyle}>{kind}</span>
                  ))}
                </div>
                {fieldLine("Chemin principal", selectedLibraryItem.primary_path)}
                {fieldLine("Alias", selectedLibraryItem.aliases.join(" | "))}
                <div style={{ fontSize: "0.8rem", opacity: 0.86 }}>
                  <strong>Sources :</strong> {selectedLibraryItem.source_count} / <strong>Occurrences :</strong> {selectedLibraryItem.instance_count}
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.86 }}>
                  <strong>Guides liés :</strong> {relatedGuides.length}
                </div>
              </>
            ) : (
              <div style={{ fontSize: "0.82rem", opacity: 0.86 }}>Bibliothèque vide pour ces filtres. Active des sources, puis rescanne.</div>
            )}
          </div>
        </PanelSectionRow>

        {isRenaming && selectedLibraryItem ? (
          <>
            <PanelSectionRow>
              <div style={boxStyle}>
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>Choisir le titre ({renameCandidateIndex + 1}/{renameCandidates.length})</div>
                <div style={{ fontSize: "0.95rem", marginBottom: "4px" }}>
                  {renameCandidates[renameCandidateIndex] || selectedLibraryItem.title}
                </div>
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || renameCandidates.length <= 1} onClick={() => setRenameCandidateIndex((v) => cycleIndex(v, renameCandidates.length, -1))}>
                Titre précédent
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || renameCandidates.length <= 1} onClick={() => setRenameCandidateIndex((v) => cycleIndex(v, renameCandidates.length, 1))}>
                Titre suivant
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleConfirmRename()}>Valider ce titre</ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={handleCancelRename}>Annuler</ButtonItem>
            </PanelSectionRow>
          </>
        ) : (
          <>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || filteredItems.length <= 1} onClick={() => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, -1))}>Jeu précédent</ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || filteredItems.length <= 1} onClick={() => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, 1))}>Jeu suivant</ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || filteredItems.length <= 10} onClick={() => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, -10))}>-10 jeux</ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || filteredItems.length <= 10} onClick={() => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, 10))}>+10 jeux</ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || !selectedLibraryItem} onClick={() => void handleToggleFavorite()}>
                {selectedLibraryItem?.is_favorite ? "★ Retirer des favoris" : "☆ Ajouter aux favoris"}
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || !selectedLibraryItem || renameCandidates.length <= 1} onClick={handleStartRename}>
                Changer le titre de recherche
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || !selectedLibraryItem} onClick={() => setActiveView("search")}>
                Chercher une soluce pour ce jeu
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || !selectedRelatedGuide} onClick={() => void openGuideById(selectedRelatedGuide!.id)}>
                Ouvrir le guide lié sélectionné
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}
      </PanelSection>

      {selectedRelatedGuide ? (
        <PanelSection title={`Guide lié ${relatedGuideIndex + 1}/${relatedGuides.length}`}>
          <PanelSectionRow>
            <div style={boxStyle}>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>{selectedRelatedGuide.title}</div>
              <div>
                <span style={pillStyle}>{selectedRelatedGuide.site}</span>
                {selectedRelatedGuide.has_resume ? <span style={pillStyle}>Reprise: {selectedRelatedGuide.resume_label}</span> : null}
              </div>
              {fieldLine("Résumé", selectedRelatedGuide.snippet)}
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || relatedGuides.length <= 1} onClick={() => setRelatedGuideIndex((v) => cycleIndex(v, relatedGuides.length, -1))}>
              Guide lié précédent
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || relatedGuides.length <= 1} onClick={() => setRelatedGuideIndex((v) => cycleIndex(v, relatedGuides.length, 1))}>
              Guide lié suivant
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      ) : null}
    </>
    );
  };

  const renderSearchView = () => (
    <>
      <PanelSection title="Base de recherche">
        <PanelSectionRow>
          <div style={boxStyle}>
            {selectedLibraryItem ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>{selectedLibraryItem.custom_title || selectedLibraryItem.title}</div>
                <div>
                  <span style={pillStyle}>{selectedLibraryItem.platform}</span>
                  <span style={pillStyle}>{selectedSearchSite.label}</span>
                  <span style={pillStyle}>Langue : {selectedLanguage.label}</span>
                  {selectedLibraryItem.disc_code ? <span style={pillStyle}>{selectedLibraryItem.disc_code}</span> : null}
                </div>
                {selectedLibraryItem.custom_title ? fieldLine("Titre original", selectedLibraryItem.title) : null}
              </>
            ) : (
              <div style={{ fontSize: "0.82rem", opacity: 0.86 }}>Choisis d'abord un jeu dans la vue bibliothèque.</div>
            )}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setSearchSiteIndex((v) => cycleIndex(v, SEARCH_SITE_CHOICES.length, 1))}>
            Site : {selectedSearchSite.label} (suivant)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setLanguageIndex((v) => cycleIndex(v, LANGUAGE_CHOICES.length, 1))}>
            Langue : {selectedLanguage.label} (suivant)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || !selectedLibraryItem} onClick={() => void handleSearch()}>
            {isBusy ? "Recherche en cours..." : "Lancer la recherche"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {selectedSearchResult ? (
        <PanelSection title={`Résultat ${searchResultIndex + 1}/${searchResults.length}`}>
          <PanelSectionRow>
            <div style={boxStyle}>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>{selectedSearchResult.title}</div>
              <div>
                <span style={pillStyle}>{selectedSearchResult.site}</span>
                <span style={pillStyle}>Score {selectedSearchResult.score}</span>
              </div>
              {fieldLine("URL", selectedSearchResult.url)}
              {fieldLine("Extrait", selectedSearchResult.snippet)}
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || searchResults.length <= 1} onClick={() => setSearchResultIndex((v) => cycleIndex(v, searchResults.length, -1))}>
              Résultat précédent
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || searchResults.length <= 1} onClick={() => setSearchResultIndex((v) => cycleIndex(v, searchResults.length, 1))}>
              Résultat suivant
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => void openUrlExternal(selectedSearchResult.url)}>
              Ouvrir dans le navigateur
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !selectedLibraryItem} onClick={() => void handleImportSelectedResult()}>
              Importer ce résultat offline
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      ) : null}
    </>
  );

  const renderReaderPreferences = () => (
    <PanelSection title="Préférences de lecture">
      <PanelSectionRow>
        <div style={boxStyle}>
          <div><strong>Thème :</strong> {THEME_LABELS[preferences.theme]}</div>
          <div><strong>Police :</strong> {FONT_LABELS[preferences.font_family]}</div>
          <div><strong>Interligne :</strong> {LINE_HEIGHT_LABELS[preferences.line_height]}</div>
          <div><strong>Largeur :</strong> {MAX_WIDTH_LABELS[preferences.max_width]}</div>
          <div><strong>Surligner mots-clés :</strong> {preferences.highlight_keywords ? "Oui" : "Non"}</div>
          <div><strong>Numéroter sections :</strong> {preferences.numbered_sections ? "Oui" : "Non"}</div>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={cycleTheme}>Changer le thème</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={cycleFont}>Changer la police</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={cycleLineHeight}>Changer l'interligne</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={cycleMaxWidth}>Changer la largeur</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={toggleHighlight}>
          {preferences.highlight_keywords ? "Désactiver" : "Activer"} le surlignage des mots-clés
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={toggleNumbered}>
          {preferences.numbered_sections ? "Cacher" : "Afficher"} les numéros de section
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );

  const renderGuidesView = () => {
    const sectionCount = selectedGuide?.sections.length || 0;
    const currentMatch = findMatches[findIndex];

    // Mini-map inline
    const miniMap = selectedGuide && sectionCount > 0 ? (
      <div style={{
        display: "flex", gap: "2px", marginTop: "4px",
        background: "rgba(255,255,255,0.05)", padding: "3px", borderRadius: "4px",
      }}>
        {selectedGuide.sections.map((_, i) => {
          let bg = "rgba(255,255,255,0.15)";
          if (i === selectedSectionIndex) bg = "#ffd966";
          else if (i < selectedSectionIndex) bg = "rgba(139, 224, 139, 0.7)";
          if (sectionsWithNotes.has(i)) bg = i === selectedSectionIndex ? "#ffd966" : "#ff8bd1";
          return (
            <div key={i} style={{
              flex: 1, height: "6px", borderRadius: "2px", background: bg,
            }} />
          );
        })}
      </div>
    ) : null;

    return (
      <>
        {!expandedReader ? (
        <PanelSection title={selectedGuideSummary ? `Guide importé ${guideIndex + 1}/${guides.length}` : "Guides importés"}>
          <PanelSectionRow>
            <div style={boxStyle}>
              {selectedGuideSummary ? (
                <>
                  <div style={{ fontWeight: 700, marginBottom: "6px" }}>{selectedGuideSummary.title}</div>
                  <div>
                    <span style={pillStyle}>{selectedGuideSummary.site}</span>
                    <span style={pillStyle}>{selectedGuideSummary.game.platform}</span>
                    {selectedGuideSummary.detection_method ? (
                      <span style={pillStyle} title="Méthode utilisée pour découper les sections">
                        ✂ {formatDetectionMethod(selectedGuideSummary.detection_method)}
                      </span>
                    ) : null}
                    {selectedGuideSummary.has_resume ? <span style={pillStyle}>Reprise</span> : null}
                    {selectedGuideSummary.has_bookmark ? <span style={pillStyle}>Marque-page</span> : null}
                    {selectedGuideSummary.progress.named_bookmarks.length > 0 ? (
                      <span style={pillStyle}>🔖 {selectedGuideSummary.progress.named_bookmarks.length}</span>
                    ) : null}
                    {selectedGuideSummary.progress.section_notes.length > 0 ? (
                      <span style={pillStyle}>📝 {selectedGuideSummary.progress.section_notes.length}</span>
                    ) : null}
                  </div>
                  {fieldLine("Jeu lié", selectedGuideSummary.game.game_title)}
                  {fieldLine("Extrait", selectedGuideSummary.snippet)}
                  <div style={{ fontSize: "0.8rem", opacity: 0.86 }}>
                    <strong>Pages :</strong> {selectedGuideSummary.page_count} · <strong>Sections :</strong> {selectedGuideSummary.section_count} · <strong>Taille :</strong> {bytesToKo(selectedGuideSummary.size_bytes)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.82rem", opacity: 0.86 }}>Aucun guide importé pour le moment.</div>
              )}
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || guides.length <= 1} onClick={() => setGuideIndex((v) => cycleIndex(v, guides.length, -1))}>Guide précédent</ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || guides.length <= 1} onClick={() => setGuideIndex((v) => cycleIndex(v, guides.length, 1))}>Guide suivant</ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !selectedGuideSummary} onClick={() => void openGuideById(selectedGuideSummary!.id)}>
              Ouvrir ce guide
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !selectedGuideSummary} onClick={() => {
              if (!selectedGuideSummary) return;
              requestFullScreenGuide(selectedGuideSummary.id);
              Router.CloseSideMenus();
              Router.Navigate(FULL_SCREEN_ROUTE);
            }}>
              🖥️ Ouvrir en plein écran
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !selectedGuideSummary} onClick={() => void handleDeleteSelectedGuide()}>
              Supprimer ce guide
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
        ) : null}

        {!expandedReader ? renderReaderPreferences() : null}

        {selectedGuide ? (
          <>
            <PanelSection title="Lecture offline">
              <PanelSectionRow>
                <div style={boxStyle}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>
                    {selectedGuide.game.game_title || selectedGuide.title}
                  </div>
                  <div style={{ fontSize: "0.82rem", opacity: 0.9, marginBottom: "2px" }}>
                    <strong>Section :</strong> {preferences.numbered_sections && sectionCount > 0 && selectedSectionIndex >= 0 ? `[${selectedSectionIndex + 1}/${sectionCount}] ` : ""}{currentSectionLabel}
                  </div>
                  {currentSectionNote ? (
                    <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>
                      {currentSectionNote.done ? "✅ " : ""}{currentSectionNote.flagged ? "⚐ " : ""}
                      {currentSectionNote.note ? `"${currentSectionNote.note}"` : ""}
                    </div>
                  ) : null}
                  {selectedGuide.has_bookmark ? (
                    <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>🔖 Marque-page rapide : {selectedGuide.bookmark_label}</div>
                  ) : null}
                  {miniMap}
                </div>
              </PanelSectionRow>

              <PanelSectionRow>
                <GuideReader
                  guide={selectedGuide}
                  sectionIndex={selectedSectionIndex}
                  fontScale={fontScale}
                  preferences={preferences}
                  searchPattern={findPattern}
                  scrollRestoreFraction={scrollRestoreFraction}
                  onScrollChange={(f) => {
                    lastScrollFractionRef.current = f;
                    pendingRestoreFractionRef.current = null;
                  }}
                  maxHeight={expandedReader ? "78vh" : "55vh"}
                />
              </PanelSectionRow>

              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={toggleExpandedReader}>
                  {expandedReader ? "🔽 Réduire le lecteur" : "📖 Agrandir le lecteur"}
                </ButtonItem>
              </PanelSectionRow>
            </PanelSection>

            {!expandedReader ? (
            <>
            <PanelSection title="Navigation rapide">
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !sectionCount} onClick={() => {
                  if (selectedSectionIndex < 0) setSelectedSectionIndex(0);
                  else setSelectedSectionIndex((v) => Math.max(0, v - 1));
                }}>
                  ◀ Section précédente
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !sectionCount} onClick={() => {
                  if (selectedSectionIndex < 0) setSelectedSectionIndex(0);
                  else setSelectedSectionIndex((v) => Math.min(sectionCount - 1, v + 1));
                }}>
                  Section suivante ▶
                </ButtonItem>
              </PanelSectionRow>
              {sectionCount > 6 ? (
                <>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy || selectedSectionIndex <= 0} onClick={() => setSelectedSectionIndex((v) => Math.max(0, v - 5))}>
                      ⏪ -5 sections
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy || selectedSectionIndex >= sectionCount - 1} onClick={() => setSelectedSectionIndex((v) => Math.min(sectionCount - 1, v + 5))}>
                      +5 sections ⏩
                    </ButtonItem>
                  </PanelSectionRow>
                </>
              ) : null}
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !sectionCount} onClick={() => setShowToc((v) => !v)}>
                  {showToc ? "Masquer le sommaire" : "📚 Afficher le sommaire"}
                </ButtonItem>
              </PanelSectionRow>
            </PanelSection>

            {showToc && sectionCount > 0 ? (
              <PanelSection title={`Sommaire (${tocIndex + 1}/${sectionCount})`}>
                <PanelSectionRow>
                  <div style={{ ...boxStyle, maxHeight: "28vh", overflowY: "auto" }}>
                    {selectedGuide.sections.map((sec, idx) => {
                      const isCurrent = idx === selectedSectionIndex;
                      const isFocused = idx === tocIndex;
                      const hasNote = sectionsWithNotes.has(idx);
                      const indent = Math.max(0, (sec.heading_level || 0) - 1) * 12;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "4px 6px",
                            marginLeft: `${indent}px`,
                            borderLeft: isFocused ? "3px solid #ffd966" : "3px solid transparent",
                            background: isCurrent ? "rgba(255, 217, 102, 0.15)" : "transparent",
                            fontSize: "0.8rem",
                            fontWeight: isCurrent ? 700 : 400,
                          }}
                        >
                          {preferences.numbered_sections ? `[${idx + 1}] ` : ""}
                          {hasNote ? "📝 " : ""}
                          {sec.title}
                        </div>
                      );
                    })}
                  </div>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => setTocIndex((v) => cycleIndex(v, sectionCount, -1))}>
                    Section précédente (sommaire)
                  </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => setTocIndex((v) => cycleIndex(v, sectionCount, 1))}>
                    Section suivante (sommaire)
                  </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => setTocIndex((v) => cycleIndex(v, sectionCount, -10))}>
                    -10 dans le sommaire
                  </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => setTocIndex((v) => cycleIndex(v, sectionCount, 10))}>
                    +10 dans le sommaire
                  </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => jumpToSection(tocIndex)}>
                    Aller à cette section
                  </ButtonItem>
                </PanelSectionRow>
              </PanelSection>
            ) : null}

            <PanelSection title="Rechercher dans le guide">
              <PanelSectionRow>
                <div style={boxStyle}>
                  <div style={{ fontSize: "0.82rem", marginBottom: "4px" }}>
                    <strong>Mot-clé :</strong> {FIND_PRESETS[findPresetIndex]?.label || "— Choisir —"}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.75 }}>
                    {findPresetIndex > 0 ? `Recherche : "${FIND_PRESETS[findPresetIndex].pattern}"` : "Choisis un mot-clé puis lance la recherche."}
                  </div>
                  {findMatches.length > 0 ? (
                    <div style={{ fontSize: "0.78rem", opacity: 0.9, marginTop: "6px" }}>
                      <strong>{findMatches.length}</strong> occurrence(s) — {findIndex + 1} / {findMatches.length}
                      {currentMatch ? (
                        <div style={{ marginTop: "4px", fontSize: "0.72rem", opacity: 0.8 }}>
                          Section : {currentMatch.section_title || "(début)"}<br />
                          <em>"{currentMatch.line_text.substring(0, 140)}"</em>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy}
                  onClick={() => setFindPresetIndex((v) => cycleIndex(v, FIND_PRESETS.length, -1))}>
                  ◀ Mot-clé précédent
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy}
                  onClick={() => setFindPresetIndex((v) => cycleIndex(v, FIND_PRESETS.length, 1))}>
                  Mot-clé suivant ▶
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || findPresetIndex === 0} onClick={() => void handleRunFind()}>
                  🔍 Chercher
                </ButtonItem>
              </PanelSectionRow>
              {findMatches.length > 0 ? (
                <>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => goToMatch(findIndex - 1)}>
                      ◀ Occurrence précédente
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => goToMatch(findIndex + 1)}>
                      Occurrence suivante ▶
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => { setFindMatches([]); setFindPattern(""); setFindIndex(0); setFindPresetIndex(0); }}>
                      Effacer la recherche
                    </ButtonItem>
                  </PanelSectionRow>
                </>
              ) : null}
            </PanelSection>

            <PanelSection title="Marque-pages & notes">
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleSetBookmark()}>
                  🔖 Poser le marque-page rapide ici
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !selectedGuide.has_bookmark} onClick={handleGoToBookmark}>
                  ⏱ Aller au marque-page rapide
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !selectedGuide.has_bookmark} onClick={() => void handleClearBookmark()}>
                  Retirer le marque-page rapide
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || selectedGuide.progress.last_section_index < 0} onClick={handleResumeReading}>
                  Reprendre où j'étais
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleAddNamedBookmark()}>
                  ➕ Ajouter un marque-page nommé ici
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <div style={{ ...boxStyle, fontSize: "0.72rem", opacity: 0.75 }}>
                  Le marque-page est nommé automatiquement (section courante + heure).
                </div>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !selectedGuide.progress.named_bookmarks.length} onClick={() => setShowBookmarks((v) => !v)}>
                  {showBookmarks ? "Masquer" : "📚 Voir"} les marque-pages nommés ({selectedGuide.progress.named_bookmarks.length})
                </ButtonItem>
              </PanelSectionRow>
              {showBookmarks && selectedGuide.progress.named_bookmarks.length > 0 ? (
                <>
                  <PanelSectionRow>
                    <div style={boxStyle}>
                      {selectedGuide.progress.named_bookmarks.map((bm, i) => {
                        const isFocused = i === bookmarkIndex;
                        const secTitle = bm.section_index >= 0 && selectedGuide.sections[bm.section_index]
                          ? selectedGuide.sections[bm.section_index].title
                          : "Début";
                        return (
                          <div key={bm.bookmark_id} style={{
                            padding: "4px 6px",
                            borderLeft: isFocused ? "3px solid #ffd966" : "3px solid transparent",
                            fontSize: "0.8rem",
                            fontWeight: isFocused ? 700 : 400,
                          }}>
                            🔖 {bm.name}
                            <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>{secTitle}</div>
                          </div>
                        );
                      })}
                    </div>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => setBookmarkIndex((v) => cycleIndex(v, selectedGuide.progress.named_bookmarks.length, -1))}>
                      MP précédent
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => setBookmarkIndex((v) => cycleIndex(v, selectedGuide.progress.named_bookmarks.length, 1))}>
                      MP suivant
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => {
                      const bm = selectedGuide.progress.named_bookmarks[bookmarkIndex];
                      if (bm) handleGoToNamedBookmark(bm);
                    }}>
                      Aller à ce marque-page
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => {
                      const bm = selectedGuide.progress.named_bookmarks[bookmarkIndex];
                      if (bm) void handleDeleteNamedBookmark(bm.bookmark_id);
                    }}>
                      Supprimer ce marque-page
                    </ButtonItem>
                  </PanelSectionRow>
                </>
              ) : null}
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || selectedSectionIndex < 0} onClick={() => void handleToggleDone()}>
                  {currentSectionNote?.done ? "✅ Marquer NON faite" : "Marquer cette section comme faite"}
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || selectedSectionIndex < 0} onClick={() => void handleToggleFlag()}>
                  {currentSectionNote?.flagged ? "⚐ Retirer le drapeau" : "⚐ Marquer à revoir"}
                </ButtonItem>
              </PanelSectionRow>
              {currentSectionNote ? (
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleClearSectionNote()}>
                    Retirer les marqueurs de cette section
                  </ButtonItem>
                </PanelSectionRow>
              ) : null}
            </PanelSection>

            <PanelSection title="Outils">
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => setFontScale((v) => Math.max(0.85, Math.round((v - 0.05) * 100) / 100))}>
                  A- Réduire le texte ({fontScale.toFixed(2)}x)
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => setFontScale((v) => Math.min(2.0, Math.round((v + 0.05) * 100) / 100))}>
                  A+ Agrandir le texte ({fontScale.toFixed(2)}x)
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !selectedGuide.url} onClick={() => void handleOpenExternal()}>
                  🌐 Ouvrir la source dans le navigateur
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleExportCurrent()}>
                  💾 Exporter ce guide en JSON
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleReconstructSections()}>
                  🔧 Reconstruire le sommaire ({selectedGuide.sections.length} sections)
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleClearProgress()}>
                  Effacer la reprise (garde marque-pages et notes)
                </ButtonItem>
              </PanelSectionRow>
              {selectedGuide.source_pages.length > 1 ? (
                <PanelSectionRow>
                  <div style={boxStyle}>
                    <div style={{ fontWeight: 700, marginBottom: "6px" }}>Pages source ({selectedGuide.source_pages.length})</div>
                    {selectedGuide.source_pages.slice(0, 6).map((page) => (
                      <div key={`${page.url}-${page.title}`} style={{ fontSize: "0.78rem", opacity: 0.84, marginBottom: "4px" }}>
                        • {page.title}
                      </div>
                    ))}
                    {selectedGuide.source_pages.length > 6 ? (
                      <div style={{ fontSize: "0.78rem", opacity: 0.74 }}>… {selectedGuide.source_pages.length - 6} pages de plus</div>
                    ) : null}
                  </div>
                </PanelSectionRow>
              ) : null}
            </PanelSection>
            </>
            ) : null}
          </>
        ) : null}
      </>
    );
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box", paddingBottom: "12px" }}>
      {renderModeHeader()}
      {error ? (
        <PanelSection title="État">
          <PanelSectionRow>
            <div style={{ ...boxStyle, borderColor: "rgba(255,100,100,0.35)" }}>{error}</div>
          </PanelSectionRow>
        </PanelSection>
      ) : null}
      {activeView === "sources" ? renderSourcesView() : null}
      {activeView === "library" ? renderLibraryView() : null}
      {activeView === "search" ? renderSearchView() : null}
      {activeView === "guides" ? renderGuidesView() : null}
    </div>
  );
}

export default definePlugin(() => {
  routerHook.addRoute(FULL_SCREEN_ROUTE, FullScreenReader, { exact: true });
  routerHook.addGlobalComponent(HOTKEY_GLOBAL_NAME, GlobalHotkeyListener);
  return {
    title: <div className="title">Offline Soluce</div>,
    content: <Content />,
    icon: <FaBookOpen />,
    onDismount() {
      routerHook.removeRoute(FULL_SCREEN_ROUTE);
      routerHook.removeGlobalComponent(HOTKEY_GLOBAL_NAME);
    },
  };
});
