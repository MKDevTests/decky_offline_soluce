import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  DialogButton,
  Focusable,
  Router,
  Navigation,
  TextField,
  ToggleField,
  definePlugin,
} from "@decky/ui";

/** v0.33: robust back navigation. Router.NavigateBack doesn't exist on every
 * Steam UI build. Try Navigation.NavigateBack first (the documented API),
 * then Router.NavigateBack, then window.history.back() as last resort. */
function safeNavigateBack(): boolean {
  try {
    const nav: any = Navigation;
    if (nav?.NavigateBack) { nav.NavigateBack(); return true; }
  } catch {}
  try {
    const rt: any = Router;
    if (rt?.NavigateBack) { rt.NavigateBack(); return true; }
  } catch {}
  try { window.history.back(); return true; } catch {}
  return false;
}
import { callable, routerHook, toaster } from "@decky/api";
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
// v0.43.2: handoff for "search guides for this game" — the full-screen game
// library requests a search; the QAM Content picks it up and opens the search
// view pre-filled. (The QAM is always mounted, just not visible during full-screen.)
let pendingSearchQuery: string | null = null;
function requestSearch(q: string): void { pendingSearchQuery = q; }
function consumeSearch(): string | null {
  const q = pendingSearchQuery;
  pendingSearchQuery = null;
  return q;
}

const FULL_SCREEN_ROUTE = "/decky-offline-soluce/reader";
const LIBRARY_ROUTE = "/decky-offline-soluce/library";  // v0.42.17: full-screen guide browser (Levier D)
const GAME_LIBRARY_ROUTE = "/decky-offline-soluce/games";  // v0.43.1: full-screen installed-games browser
const SEARCH_ROUTE = "/decky-offline-soluce/search";  // v0.43.3: full-screen search + import
const SEARCH_PAGE_SIZE = 8;  // v0.43.12: initial results shown; "charger plus" reveals +8
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
  // Titles of sections the user has hidden from the sidebar. Filtered out by
  // default; toggle "Afficher masquées" surfaces them again.
  hidden_section_titles: string[];
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

type ImportantFlag = {
  category: "missable" | "key_item" | "side_quest" | string;
  section_index: number;
  snippet: string;
  matched: string;
};

type GuideDetail = GuideSummary & {
  content: string;
  sections: GuideSection[];
  source_pages: GuideSourcePage[];
  important_flags?: ImportantFlag[];
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
  // Legacy keyboard hotkey (unused on Steam Deck — SteamOS never delivers keystrokes
  // from Steam Input bindings to Steam UI). Kept for non-Deck contexts.
  resume_hotkey: string;
  // Controller button index from ControllerInputGamepadButton enum:
  //   32 = LBACK (left back paddle), 33 = RBACK (right back paddle)
  //   30 = LSHOULDER (L1), 31 = RSHOULDER (R1)
  // -1 = defaults (both back paddles trigger)
  resume_button: number;
  // v0.40: master switch — when false, listener stays armed but skips action.
  resume_enabled: boolean;
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

type ViewMode = "home" | "sources" | "library" | "search" | "guides";

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
// v0.43.14: background import (non-blocking) + progress polling.
type ImportStatus = {
  state: "running" | "done" | "error" | "unknown";
  done: number; total: number; msg: string;
  guide_id: string | null; error: string | null; title: string; section_count: number;
};
const startImport = callable<[
  url: string, gameTitle: string, platform: string, romHint: string, aliases: string, emulator: string,
], { job_id: string; duplicate_guide_id: string | null }>("start_import");
const getImportStatus = callable<[jobId: string], ImportStatus>("get_import_status");
type ImportJob = ImportStatus & { job_id: string };
const listImports = callable<[], ImportJob[]>("list_imports");
const dismissImport = callable<[jobId: string], boolean>("dismiss_import");
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
const reloadGuideContent = callable<[guideId: string], GuideDetail>("reload_guide_content");
// v0.41: strip site-specific chrome (rpgsoluce nav menu, footer, citation, HTML
// comment leak) from an already-stored guide, then rebuild sections. Uses the
// stored content as-is — no re-download. Auto-remaps progress/notes/bookmarks.
const cleanExistingGuide = callable<[guideId: string], GuideDetail>("clean_existing_guide");
// v0.42.2: batch operation — clean + rebuild sections (with polish) on EVERY
// stored guide. Returns aggregate stats + per-guide changes for the UI.
type PolishAllSummary = {
  guides_processed: number;
  total_chars_before: number;
  total_chars_after: number;
  total_chars_removed: number;
  total_titles_changed: number;
  per_guide: Array<{
    guide_id: string;
    title: string;
    site: string;
    before_chars?: number;
    after_chars?: number;
    chars_removed?: number;
    before_sections?: number;
    after_sections?: number;
    section_delta?: number;
    titles_changed?: number;
    error?: string;
  }>;
};
const polishAllGuides = callable<[], PolishAllSummary>("polish_all_guides");
const toggleSectionHidden = callable<[guideId: string, sectionIndex: number], GuideDetail>("toggle_section_hidden");
const showAllSections = callable<[guideId: string], GuideDetail>("show_all_sections");
// A2 auto-backup
type BackupConfig = {
  enabled: boolean;
  interval_days: number;
  last_backup_at: string;
  last_backup_path: string;
  last_backup_size_bytes: number;
};
const getBackupConfig = callable<[], BackupConfig>("get_backup_config");
const setBackupConfig = callable<[boolean, number], BackupConfig>("set_backup_config");
const runBackupNow = callable<[], { path: string; size_bytes: number; guide_count: number; config: BackupConfig }>("run_backup_now");
// A3 ES-DE: returns the cleaned game-title of the ROM currently loaded by a running emulator,
// or empty fields if no emulator is detected.
const getRunningEmulatorGameHint = callable<[], { hint: string; rom_path: string; emulator: string }>("get_running_emulator_game_hint");
const BACKUP_INTERVAL_CHOICES = [1, 3, 7, 14, 30];
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
  resumeHotkey: string,
  resumeButton: number,
  resumeEnabled: boolean,
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
const VIEW_LABELS: Record<string, string> = {
  home: "Accueil", sources: "Réglages", library: "Bibliothèque de jeux", search: "Recherche", guides: "Guides",
};
const SEARCH_SITE_CHOICES = [
  { value: "all", label: "Tous" },
  { value: "gamefaqs", label: "GameFAQs" },
  { value: "rpgsoluce", label: "RPGSoluce" },
  { value: "ign", label: "IGN" },
  { value: "jeuxvideo", label: "Jeuxvideo.com" },
  { value: "vally8", label: "Vally8" },
  { value: "neoseeker", label: "Neoseeker" },
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

// v0.43.33: auto-highlight HIGH-VALUE PHRASES (not common words like "boss"/"item"
// which were pure noise). Mirrors the backend _IMPORTANT_FLAG_RES so the inline
// highlight and the "À ne pas rater" checklist agree. Ordered by priority.
const HIGHLIGHT_CATEGORIES: Array<{ category: string; color: string; icon: string; source: string }> = [
  {
    category: "missable", color: "#ff6b6b", icon: "🔴",
    source: "(?:permanently\\s+)?missable|point\\s+of\\s+no\\s+return|do(?:n'?t| not)\\s+miss\\b"
      + "|\\b(?:last|only|one)\\s+(?:chance|time)\\s+to\\b|one[-\\s]time[-\\s]only"
      + "|can(?:'?t|not)\\s+(?:be\\s+)?(?:obtain|get|acquire|find|buy|purchase)\\w*\\s+(?:it\\s+)?(?:later|again|after|anymore)"
      + "|no\\s+longer\\s+(?:be\\s+)?(?:available|obtainable|accessible)"
      + "|before\\s+(?:you\\s+)?(?:leave|proceed|continue|move\\s+on)"
      + "|manquable|[àa]\\s+ne\\s+pas\\s+(?:rater|manquer|louper|oublier)|point\\s+de\\s+non[-\\s]retour"
      + "|derni[èe]re\\s+(?:chance|occasion|possibilit[ée])",
  },
  {
    category: "key_item", color: "#ffd166", icon: "🟡",
    source: "\\bkey\\s+items?\\b|objets?\\s+cl[ée]s?\\b"
      + "|\\bunique\\s+(?:weapon|armou?r|accessor\\w+|ring|sword|shield|item|equipment)"
      + "|(?:ultimate|strongest|best)\\s+(?:weapon|armou?r|sword|spear|shield)\\b"
      + "|arme\\s+(?:ultime|unique|l[ée]gendaire)|un\\s+seul\\s+exemplaire",
  },
  {
    category: "side_quest", color: "#8bb3ff", icon: "🔵",
    source: "\\bside[-\\s]quest|\\boptional\\s+(?:quest|boss|area|dungeon|content|objective|super\\s?boss)"
      + "|qu[êe]tes?\\s+(?:annexes?|secondaires?|optionnelles?|facultatives?)|\\b(?:facultati\\w+|optionnel\\w*)\\b",
  },
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
  // v0.43.5: "normal" calibrated to ~72ch — the typographic sweet spot for
  // comfortable reading (66-80 chars/line). The column is centered by the reader.
  if (level === "narrow") return "58ch";
  if (level === "normal") return "72ch";
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
    case "numbered_toc": return "TOC numérotée";
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

/** A3: find the guide that matches the currently running Steam app (if any).
 *  Tries: exact normalized title/game_title, alias match, substring containment.
 *  Returns null if no plausible match.
 *
 *  v0.39 fix: when multiple guides match the running game at the same tier
 *  (e.g. user has both a site-specific guide AND a generic "RPG Soluce" guide
 *  attached to the same `game_title`), pick the one with the most recent
 *  `last_opened_at`. Previously we returned the first match in array order,
 *  which depended on the non-deterministic Python `glob` order on the Deck —
 *  resulting in the palette opening the "wrong" guide for the same game.
 *  Auto-healing: opening the intended guide once manually bumps its
 *  timestamp above the other(s), and the palette locks onto it thereafter. */
function findGuideForRunningApp(guides: GuideSummary[], appName: string): GuideSummary | null {
  if (!appName || !guides.length) return null;
  const normApp = normalizeText(appName);
  if (!normApp) return null;

  // Tiebreak helper: within a match tier, pick the most-recently-opened guide.
  const pickMostRecent = (candidates: GuideSummary[]): GuideSummary | null => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    return candidates.slice().sort((a, b) =>
      (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "")
    )[0];
  };

  // Tier 1: exact match on normalized game_title or title
  const tier1 = guides.filter((g) =>
    normalizeText(g.game.game_title || "") === normApp ||
    normalizeText(g.title) === normApp
  );
  if (tier1.length) return pickMostRecent(tier1);

  // Tier 2: alias match
  const tier2 = guides.filter((g) =>
    (g.game.aliases || []).some((a) => normalizeText(a) === normApp)
  );
  if (tier2.length) return pickMostRecent(tier2);

  // Tier 3: substring containment (either direction). Skips matches where one side
  // is too short (<4 chars) to avoid false positives like "II" matching "Civ II".
  if (normApp.length >= 4) {
    const tier3 = guides.filter((g) => {
      const gt = normalizeText(g.game.game_title || g.title);
      if (!gt || gt.length < 4) return false;
      return gt.includes(normApp) || normApp.includes(gt);
    });
    if (tier3.length) return pickMostRecent(tier3);
  }

  return null;
}

/** A5: find guides similar to the current one — same series (shared title words),
 *  same platform, same site. Returns up to 5 results sorted by relevance. */
function findSimilarGuides(current: GuideSummary | null, all: GuideSummary[]): GuideSummary[] {
  if (!current) return [];
  const currentText = `${current.title} ${current.game.game_title || ""}`;
  const currentWords = new Set(
    normalizeText(currentText)
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
  if (currentWords.size === 0) return [];
  const scored: Array<{ guide: GuideSummary; score: number }> = [];
  for (const g of all) {
    if (g.id === current.id) continue;
    let score = 0;
    const gWords = normalizeText(`${g.title} ${g.game.game_title || ""}`).split(/\s+/);
    for (const w of gWords) {
      if (w.length >= 4 && currentWords.has(w)) score += 5;
    }
    if (g.game.platform && g.game.platform === current.game.platform) score += 2;
    if (g.site && g.site === current.site) score += 1;
    if (score >= 5) scored.push({ guide: g, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.guide);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "guide", "walkthrough",
  "soluce", "cheminement", "dans", "avec", "pour", "complet", "complete", "full",
  "version", "final", "english", "francais", "french",
]);

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

/**
 * Old-school FAQs hard-wrap prose at ~80 chars with literal `\n`. On a wide
 * Deck screen with `white-space: pre-wrap`, every wrap shows as a forced break,
 * making 1 paragraph look like 8 mini-paragraphs. This collapses the soft-wrap
 * `\n` into spaces so the browser can wrap naturally — but PRESERVES hard
 * breaks for lists, stat labels, indented blocks, and short all-caps headers.
 */
function smartCollapseParagraph(text: string): string {
  const lines = text.split(/\n/);
  if (lines.length <= 1) return text;

  const isHardBreak = (idx: number): boolean => {
    if (idx === 0) return false;
    const rawLine = lines[idx];
    const line = rawLine.trim();
    const prev = lines[idx - 1].trim();
    if (!line) return true;
    // Bullet/list items
    if (/^[-*•·●▪▫►▼>+]\s+\S/.test(line)) return true;
    if (/^\d{1,3}[.):]\s+\S/.test(line)) return true;
    if (/^[a-z]\)\s+\S/.test(line)) return true;
    if (/^\d+[a-z]\.\s+\S/.test(line)) return true;
    // Labeled stat lines, with or without colon ("HP : 950", "Level 27", "BOSS:")
    if (/^(BOSS|Boss|HP|MP|SP|XP|EXP|Level|Niveau|Item|Objet|Items|Attack|Defend|Defense|Special|Magic|Stats|Stat|Rune|Skill|Skills|Equipement|Equipment)\b/i.test(line)) return true;
    // Previous line was short header ending with colon ("Stats:" / "Items:")
    if (prev.length < 60 && /[:：]\s*$/.test(prev)) return true;
    // Short ALL-CAPS / dashed-banner line (small headers like "STORMFIST" or "------")
    if (line.length < 80 && /^[A-Z][A-Z0-9\s\-]{2,}$/.test(line)) return true;
    if (line.length < 80 && /^[=\-_*#~+]{4,}/.test(line)) return true;
    // Indented line (preserved code/stat blocks)
    if (/^\s{2,}\S/.test(rawLine)) return true;
    // Short numeric-heavy line ("Level 1 6 9", "100 200 300") — likely table row
    if (line.length < 60 && (line.match(/\d/g) || []).length >= 3 && !/[.!?]$/.test(line)) return true;
    return false;
  };

  const out: string[] = [];
  let buffer = lines[0];
  for (let i = 1; i < lines.length; i++) {
    if (isHardBreak(i)) {
      out.push(buffer);
      buffer = lines[i];
    } else {
      // Soft-wrap continuation → join with single space
      buffer = buffer.replace(/\s+$/, "") + " " + lines[i].replace(/^\s+/, "");
    }
  }
  out.push(buffer);
  return out.join("\n");
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
      if (trimmed) {
        // Collapse soft-wrap newlines into spaces so the browser flows the
        // text at screen width. Hard breaks (lists, stat lines, ASCII art)
        // are preserved by smartCollapseParagraph.
        const flowed = smartCollapseParagraph(trimmed);
        blocks.push({ kind: "paragraph", text: flowed });
      }
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

/** L5: resolve a "section/chapter/chap. N[letter]" reference in text to a section index.
 * Heuristic: looks for a section whose title starts with `Nx.` or `Nx ` (case-insensitive).
 * Returns -1 if no plausible target. */
function resolveSectionReference(
  refId: string,
  sections: GuideSection[],
): number {
  const id = refId.toLowerCase().trim();
  if (!id) return -1;
  // Pattern A: title starts with "<id>." or "<id> "
  for (let i = 0; i < sections.length; i++) {
    const t = (sections[i].title || "").trim().toLowerCase();
    if (t.startsWith(id + ".") || t.startsWith(id + " ") || t.startsWith(id + ":")) return i;
  }
  // Pattern B: title contains "[<id>]" — for TOC code-style anchors
  for (let i = 0; i < sections.length; i++) {
    const t = (sections[i].title || "").trim().toLowerCase();
    if (t.includes("[" + id + "]")) return i;
  }
  return -1;
}

// Highlight keywords + search matches + cross-references in a text block
function renderHighlightedText(
  text: string,
  highlightKeywords: boolean,
  searchPattern: string,
  sections?: GuideSection[],
  onJumpToSection?: (idx: number) => void,
): React.ReactNode {
  if (!text) return text;
  // Build a combined regex of keywords (word-ish boundaries) and the search pattern.
  const pieces: Array<{ regex: RegExp; className: string; color?: string }> = [];

  if (searchPattern && searchPattern.trim().length >= 2) {
    const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pieces.push({ regex: new RegExp(escaped, "gi"), className: "os-find" });
  }

  if (highlightKeywords) {
    for (const cat of HIGHLIGHT_CATEGORIES) {
      try {
        pieces.push({ regex: new RegExp(cat.source, "gi"), className: "os-kw", color: cat.color });
      } catch { /* skip a bad pattern rather than break rendering */ }
    }
  }

  // L5: cross-references — only active when we have sections + a jump callback
  if (sections && sections.length > 0 && onJumpToSection) {
    pieces.push({
      regex: /\b(?:section|chapitre|chapter|chap\.?)\s+(\d{1,3}[a-z]?)\b/gi,
      className: "os-ref",
    });
  }

  if (pieces.length === 0) return text;

  // Collect all matches across all pieces
  type Span = { start: number; end: number; className: string; color?: string; refTarget?: number };
  const spans: Span[] = [];
  for (const piece of pieces) {
    piece.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = piece.regex.exec(text)) !== null) {
      if (m.index === piece.regex.lastIndex) piece.regex.lastIndex++;
      const span: Span = { start: m.index, end: m.index + m[0].length, className: piece.className, color: piece.color };
      if (piece.className === "os-ref" && sections && m[1]) {
        const target = resolveSectionReference(m[1], sections);
        if (target < 0) continue; // skip cross-refs that don't resolve to anything
        span.refTarget = target;
      }
      spans.push(span);
    }
  }
  if (spans.length === 0) return text;
  // Sort, then merge overlaps (search match wins, then ref, then keyword)
  const priority: Record<string, number> = { "os-find": 3, "os-ref": 2, "os-kw": 1 };
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      const lastP = priority[last.className] || 0;
      const sP = priority[s.className] || 0;
      if (sP > lastP) merged[merged.length - 1] = s;
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
    } else if (s.className === "os-ref" && typeof s.refTarget === "number" && onJumpToSection) {
      const target = s.refTarget;
      out.push(
        <span
          key={`r-${i}`}
          onClick={() => onJumpToSection(target)}
          style={{
            color: "#8fd0ff",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {substr}
        </span>
      );
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
  /** L5: when provided, cross-references like "voir section 4b" in the rendered
   * text become clickable spans that jump to the target section. */
  onJumpToSection?: (idx: number) => void;
  /** v0.34: incremented by parent to force the scroll-restore effect to re-fire,
   * even when sectionIndex doesn't change (e.g. "Aller au marque-page" while
   * already in the bookmark's section). */
  restoreGeneration?: number;
  /** v0.43.6: page-scroll pulse. When `.n` increments, scroll ~80% of a screen
   * in `.dir` (+1 down, -1 up). Driven by the reader's L1/R1 shortcuts. */
  scrollPulse?: { n: number; dir: 1 | -1 };
};

/**
 * Shared reading surface: themed, per-block rendering with keyword highlighting,
 * search-match highlighting, and monospace rendering for ASCII-art blocks.
 */
function GuideReader(props: GuideReaderProps) {
  const {
    guide, sectionIndex, fontScale, preferences,
    searchPattern, scrollRestoreFraction, onScrollChange,
    maxHeight, onJumpToSection, restoreGeneration,
    scrollPulse,
  } = props;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const raw = useMemo(() => getSectionText(guide, sectionIndex), [guide, sectionIndex]);
  const blocks = useMemo(() => parseBlocks(raw), [raw]);

  const theme = themeStyle(preferences.theme);
  const lh = lineHeightValue(preferences.line_height);
  const widthCap = maxWidthValue(preferences.max_width);
  const ff = fontFamily(preferences.font_family);

  // Restore scroll when section switches / on first render / on intentional bookmark jump.
  // v0.34: retry across multiple RAF frames if scrollHeight is still growing (content not
  // fully laid out yet for long sections). Reacts to restoreGeneration so the parent can
  // force a re-fire without changing sectionIndex.
  // v0.34 fix: scrollRestoreFraction REMOVED from deps. The parent nulls it via onScrollChange
  // after restore, which would have re-fired this effect with null → scroll back to 0.
  // We read scrollRestoreFraction at run time (closure captures the value at the moment the
  // effect actually runs, which is right after the relevant render).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let cancelled = false;
    let rafId = 0;
    // Snapshot the target fraction at effect-run time so a subsequent prop change can't
    // override our intent mid-restore.
    const targetFrac = scrollRestoreFraction;
    const attempt = (tries: number) => {
      if (cancelled) return;
      const currentMax = Math.max(1, el.scrollHeight - el.clientHeight);
      const targetTop = targetFrac !== null
        ? currentMax * targetFrac
        : 0;
      el.scrollTop = targetTop;
      // Re-check next frame: if scrollHeight changed (content still rendering), redo with new max
      rafId = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const newMax = Math.max(1, el.scrollHeight - el.clientHeight);
        if (newMax !== currentMax && tries < 5) {
          attempt(tries + 1);
          return;
        }
        const finalFrac = newMax > 1 ? Math.max(0, Math.min(1, el.scrollTop / newMax)) : 0;
        onScrollChange(finalFrac);
      });
    };
    rafId = window.requestAnimationFrame(() => attempt(0));
    return () => { cancelled = true; window.cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex, guide.id, restoreGeneration]);

  // v0.43.6: page scroll (L1/R1) — jump ~80% of a screen when the pulse changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !scrollPulse || scrollPulse.n === 0) return;
    el.scrollBy({ top: Math.round(el.clientHeight * 0.8) * scrollPulse.dir, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPulse?.n]);

  // v0.43.18: right-stick continuous scroll REMOVED — all three controller APIs
  // failed on this Steam build (RegisterForControllerStateChanges absent;
  // RegisterForControllerAnalogInputMessages → "unknown method"; the browser
  // Gamepad API reports no pad because Steam Input captures the controller first).
  // L1/R1 (page scroll ~80%) and L2/R2 (prev/next section) cover navigation.

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
    // Tightened in v0.22: was 0.8em which combined with HTML's per-line blank-line
    // emission made the rendered text look airy and broken. 0.4em keeps paragraphs
    // distinguishable but compacts the visual rhythm.
    margin: "0 0 0.4em",
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
                {renderHighlightedText(block.text, preferences.highlight_keywords, searchPattern, guide.sections, onJumpToSection)}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
}


// ========== Full-screen reader component ==========

type TocGroup = {
  parent: { index: number; sec: GuideSection };
  children: { index: number; sec: GuideSection }[];
};

/** Group consecutive sections so heading_level <= 2 starts a group, deeper levels nest under it. */
function buildTocGroups(sections: GuideSection[]): TocGroup[] {
  const groups: TocGroup[] = [];
  let current: TocGroup | null = null;
  sections.forEach((sec, idx) => {
    const level = sec.heading_level || 2;
    if (level <= 2 || current === null) {
      current = { parent: { index: idx, sec }, children: [] };
      groups.push(current);
    } else {
      current.children.push({ index: idx, sec });
    }
  });
  return groups;
}

/** Sidebar TOC with filter + collapsible groups + hide-section toggle + auto-scroll. */
function TocSidebar(props: {
  guide: GuideDetail;
  preferences: ReaderPreferences;
  theme: any; // ThemeStyle-shaped; loose to accept the fallback used during loading
  sidebarStyle: React.CSSProperties;
  sectionIndex: number;
  setSectionIndex: (n: number) => void;
  tocFilter: string;
  setTocFilter: (s: string) => void;
  collapsedParents: Set<number>;
  setCollapsedParents: (next: Set<number> | ((c: Set<number>) => Set<number>)) => void;
  showHiddenSections: boolean;
  setShowHiddenSections: (next: boolean | ((c: boolean) => boolean)) => void;
}) {
  const {
    guide, preferences, theme, sidebarStyle, sectionIndex, setSectionIndex,
    tocFilter, setTocFilter, collapsedParents, setCollapsedParents,
    showHiddenSections, setShowHiddenSections,
  } = props;
  const currentRowRef = useRef<any>(null);
  // L3: auto-scroll the sidebar so the current section's row is visible whenever sectionIndex changes
  useEffect(() => {
    const el = currentRowRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch { /* older browsers */ }
    }
  }, [sectionIndex]);

  const hiddenTitles = new Set((guide.progress?.hidden_section_titles || []).map((t) => (t || "").trim()));
  const isHidden = (sec: GuideSection) => hiddenTitles.has((sec.title || "").trim());
  const hiddenCount = guide.sections.reduce((n, s) => n + (isHidden(s) ? 1 : 0), 0);
  // v0.25: which sections are marked as "done" (manually or auto via scroll-to-bottom)
  const doneIndices = new Set<number>();
  const flaggedIndices = new Set<number>();
  for (const n of guide.progress?.section_notes || []) {
    if (n.done) doneIndices.add(n.section_index);
    if (n.flagged) flaggedIndices.add(n.section_index);
  }
  const sectionBadge = (idx: number): string => {
    let out = "";
    if (doneIndices.has(idx)) out += "✅ ";
    if (flaggedIndices.has(idx)) out += "⚐ ";
    return out;
  };

  const groups = buildTocGroups(guide.sections);
  const filterNeedle = tocFilter.trim().toLowerCase();

  // Apply hide filter first (unless "show hidden" toggle is on), then text filter.
  let working: TocGroup[] = showHiddenSections
    ? groups
    : groups
        .map((g) => {
          const childrenVisible = g.children.filter((c) => !isHidden(c.sec));
          if (isHidden(g.parent.sec)) {
            // Parent hidden: surface children that aren't hidden by making the FIRST visible
            // child a new pseudo-parent. If none, drop the group entirely.
            if (childrenVisible.length === 0) return null;
            return { parent: childrenVisible[0], children: childrenVisible.slice(1) };
          }
          return { parent: g.parent, children: childrenVisible };
        })
        .filter((g): g is TocGroup => g !== null);

  // Then text filter: keep groups whose parent OR any child title matches; drop non-matching children.
  const filtered: TocGroup[] = filterNeedle
    ? working
        .map((g) => {
          const parentMatches = (g.parent.sec.title || "").toLowerCase().includes(filterNeedle);
          const matchingChildren = g.children.filter((c) => (c.sec.title || "").toLowerCase().includes(filterNeedle));
          if (parentMatches || matchingChildren.length > 0) {
            return { parent: g.parent, children: parentMatches ? g.children : matchingChildren };
          }
          return null;
        })
        .filter((g): g is TocGroup => g !== null)
    : working;

  const toggle = (parentIdx: number) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentIdx)) next.delete(parentIdx);
      else next.add(parentIdx);
      return next;
    });
  };

  const filterInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "4px",
    border: `1px solid ${theme.borderColor}`,
    background: "rgba(0,0,0,0.5)",
    color: theme.textColor,
    fontSize: "0.78rem",
    boxSizing: "border-box",
  };
  const filterWrapStyle: React.CSSProperties = {
    padding: "8px 10px 6px",
    position: "sticky",
    top: 0,
    background: "rgba(0,0,0,0.55)",
    borderBottom: `1px solid ${theme.borderColor}`,
    zIndex: 1,
  };
  const hiddenToggleStyle: React.CSSProperties = {
    marginTop: "5px",
    fontSize: "0.7rem",
    padding: "4px 6px",
    borderRadius: "3px",
    background: showHiddenSections ? "rgba(255, 217, 102, 0.15)" : "rgba(255,255,255,0.05)",
    color: theme.textColor,
    cursor: "pointer",
    textAlign: "center",
    border: "1px solid " + (showHiddenSections ? "rgba(255, 217, 102, 0.4)" : "transparent"),
  };
  const parentRowStyleBase = (isCurrent: boolean): React.CSSProperties => ({
    padding: "7px 10px",
    borderLeft: isCurrent ? "3px solid #ffd966" : "3px solid transparent",
    background: isCurrent ? "rgba(255, 217, 102, 0.18)" : "transparent",
    cursor: "pointer",
    fontSize: "0.86rem",
    fontWeight: 700,
    color: theme.textColor,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });
  const childRowStyleBase = (isCurrent: boolean): React.CSSProperties => ({
    padding: "5px 10px 5px 30px",
    borderLeft: isCurrent ? "3px solid #ffd966" : "3px solid transparent",
    background: isCurrent ? "rgba(255, 217, 102, 0.18)" : "transparent",
    cursor: "pointer",
    fontSize: "0.76rem",
    fontWeight: isCurrent ? 700 : 400,
    color: theme.textColor,
    opacity: 0.92,
  });

  return (
    <div style={sidebarStyle}>
      <div style={filterWrapStyle}>
        {/* v0.36: TextField (Steam-Deck-native) ouvre le clavier virtuel à la prise de focus. */}
        <TextField
          value={tocFilter}
          onChange={(e: any) => setTocFilter(e.target.value)}
          placeholder="Filtrer le sommaire…"
          bShowClearAction
        />
        {hiddenCount > 0 ? (
          <Focusable onActivate={() => setShowHiddenSections((v) => !v)} style={hiddenToggleStyle}>
            {showHiddenSections
              ? `👁 Cacher les ${hiddenCount} masquée(s)`
              : `🙈 Afficher les ${hiddenCount} masquée(s)`}
          </Focusable>
        ) : null}
      </div>
      <Focusable>
        {filtered.length === 0 && filterNeedle ? (
          <div style={{ padding: "16px", textAlign: "center", opacity: 0.6, fontSize: "0.8rem" }}>
            Aucune section ne correspond à « {tocFilter} »
          </div>
        ) : null}
        {filtered.map((group) => {
          const containsCurrent = sectionIndex === group.parent.index
            || group.children.some((c) => c.index === sectionIndex);
          // Always expand the group containing the current section, and when filtering.
          const effectiveCollapsed = !filterNeedle && !containsCurrent && collapsedParents.has(group.parent.index);
          const hasChildren = group.children.length > 0;
          const parentIsCurrent = sectionIndex === group.parent.index;
          const parentHidden = isHidden(group.parent.sec);
          const parentStyle = { ...parentRowStyleBase(parentIsCurrent), opacity: parentHidden ? 0.45 : 1 };
          return (
            <div key={group.parent.index}>
              <Focusable
                ref={parentIsCurrent ? currentRowRef : undefined}
                onActivate={() => {
                  if (hasChildren && !filterNeedle) toggle(group.parent.index);
                  setSectionIndex(group.parent.index);
                }}
                style={parentStyle}
              >
                <span style={{ width: "12px", display: "inline-block", opacity: hasChildren ? 0.7 : 0, fontSize: "0.7rem" }}>
                  {hasChildren ? (effectiveCollapsed ? "▶" : "▼") : ""}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {parentHidden ? "🙈 " : ""}
                  {sectionBadge(group.parent.index)}
                  {preferences.numbered_sections ? `${group.parent.index + 1}. ` : ""}{group.parent.sec.title || "(sans titre)"}
                </span>
                {hasChildren ? (
                  <span style={{ fontSize: "0.66rem", opacity: 0.55, padding: "1px 5px", borderRadius: "3px", background: "rgba(255,255,255,0.08)" }}>
                    {group.children.length}
                  </span>
                ) : null}
              </Focusable>
              {!effectiveCollapsed && group.children.map((child) => {
                const isCurrent = child.index === sectionIndex;
                const childHidden = isHidden(child.sec);
                const childStyle = { ...childRowStyleBase(isCurrent), opacity: childHidden ? 0.45 : 0.92 };
                return (
                  <Focusable
                    key={child.index}
                    ref={isCurrent ? currentRowRef : undefined}
                    onActivate={() => setSectionIndex(child.index)}
                    style={childStyle}
                  >
                    {childHidden ? "🙈 " : ""}
                    {sectionBadge(child.index)}
                    {preferences.numbered_sections ? `${child.index + 1}. ` : ""}{child.sec.title || "(sans titre)"}
                  </Focusable>
                );
              })}
            </div>
          );
        })}
      </Focusable>
    </div>
  );
}

/**
 * v0.35: collapsible named-bookmarks panel for the FullScreenReader.
 * Replaces the GuideReader pane when toggled on, so it doesn't permanently
 * eat reading space. List of bookmarks is sorted newest-first.
 */
function NamedBookmarksPanel(props: {
  guide: GuideDetail;
  currentSectionIndex: number;
  currentScrollFraction: number;
  busy: boolean;
  theme: any;
  onClose: () => void;
  onAdd: () => void;
  onDelete: (bookmarkId: string) => void;
  onGoTo: (bm: NamedBookmark) => void;
}) {
  const { guide, currentSectionIndex, currentScrollFraction, busy, theme, onClose, onAdd, onDelete, onGoTo } = props;
  const bookmarks = (guide.progress?.named_bookmarks || []).slice().sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );
  const containerStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "12px 14px",
    borderRadius: "10px",
    border: `1px solid ${theme.borderColor}`,
    background: theme.background,
    color: theme.textColor,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };
  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    paddingBottom: "8px",
    borderBottom: `1px solid ${theme.borderColor}`,
  };
  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "6px",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${theme.borderColor}`,
  };
  const currentSectionTitle = guide.sections[currentSectionIndex]?.title || "Début";
  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: "0.95rem" }}>
          📚 Marques-pages ({bookmarks.length})
        </div>
        <DialogButton onClick={onClose}>Fermer ✕</DialogButton>
      </div>
      <div style={{ fontSize: "0.75rem", opacity: 0.78 }}>
        Position actuelle : <strong>{currentSectionTitle.slice(0, 50)}</strong> · {Math.round(currentScrollFraction * 100)}%
      </div>
      <DialogButton disabled={busy} onClick={onAdd}>
        ➕ Ajouter le point actuel comme marque-page
      </DialogButton>
      {bookmarks.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", opacity: 0.6, fontSize: "0.85rem" }}>
          Aucun marque-page nommé pour ce guide.<br />
          Clique « Ajouter » ci-dessus pour en créer un.
        </div>
      ) : (
        bookmarks.map((bm) => {
          const sec = guide.sections[bm.section_index] || null;
          const secLabel = sec?.title || (bm.section_index >= 0 ? `Section ${bm.section_index + 1}` : "Début");
          return (
            <div key={bm.bookmark_id} style={itemStyle}>
              <Focusable
                onActivate={() => onGoTo(bm)}
                style={{ flex: 1, minWidth: 0, cursor: "pointer", padding: "2px 4px" }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📍 {bm.name || "(sans nom)"}
                </div>
                <div style={{ fontSize: "0.72rem", opacity: 0.72, marginTop: "2px" }}>
                  {secLabel.slice(0, 60)} · {Math.round((bm.scroll_fraction || 0) * 100)}%
                  {bm.created_at ? ` · ${formatDate(bm.created_at)}` : ""}
                </div>
              </Focusable>
              <DialogButton disabled={busy} onClick={() => onDelete(bm.bookmark_id)}>
                ✕
              </DialogButton>
            </div>
          );
        })
      )}
    </div>
  );
}


/**
 * v0.43.3: full-screen search + import. Reachable from the launcher and from a
 * game fiche ("Rechercher des guides pour ce jeu" — pre-fills the query). Keeps
 * the whole search→import flow in the full-screen context instead of bouncing
 * back to the cramped QAM.
 */
function FullScreenSearch() {
  const [query, setQuery] = useState<string>("");
  const [langIndex, setLangIndex] = useState<number>(0);
  const [siteIndex, setSiteIndex] = useState<number>(0);
  const [results, setResults] = useState<GuideSearchResult[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");
  const [imported, setImported] = useState<GuideSummary[]>([]);  // v0.43.7: for anti-duplicate
  const [zeroSecGuide, setZeroSecGuide] = useState<GuideDetail | null>(null);  // v0.43.7: 0-section delete prompt
  const [visibleCount, setVisibleCount] = useState<number>(SEARCH_PAGE_SIZE);  // v0.43.12: show 8, "charger plus"
  const ranInitial = useRef<boolean>(false);

  const lang = LANGUAGE_CHOICES[langIndex] || LANGUAGE_CHOICES[0];
  const site = SEARCH_SITE_CHOICES[siteIndex] || SEARCH_SITE_CHOICES[0];

  // v0.43.7: normalize a URL for duplicate matching (strip scheme, www, trailing /).
  const normUrl = (u: string) => (u || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").replace(/#.*$/, "");
  const importedByUrl = useMemo(() => {
    const m = new Map<string, GuideSummary>();
    for (const g of imported) if (g.url) m.set(normUrl(g.url), g);
    return m;
  }, [imported]);
  const findImported = (url: string) => importedByUrl.get(normUrl(url)) || null;

  const runSearch = async (q: string) => {
    const query2 = q.trim();
    if (!query2) { setMsg("Tape un nom de jeu."); return; }
    setBusy(true); setMsg("Recherche…"); setResults([]); setVisibleCount(SEARCH_PAGE_SIZE);
    try {
      const r = await searchGuides(query2, "Autre", site.value, lang.value);
      setResults(r);
      setMsg(r.length ? `${r.length} résultat(s)` : "Aucun résultat. Change de langue/site et réessaie.");
    } catch (e) {
      setMsg(`Échec : ${e instanceof Error ? e.message : e}`);
    } finally { setBusy(false); }
  };

  useEffect(() => {
    (async () => {
      try { setPreferences(await getReaderPreferences()); } catch {}
      try { setImported(await listGuides()); } catch {}
      const q = consumeSearch();
      if (q && !ranInitial.current) { ranInitial.current = true; setQuery(q); runSearch(q); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openGuideId = (id: string) => { requestFullScreenGuide(id); try { Router.Navigate(FULL_SCREEN_ROUTE); } catch {} };

  const importResult = async (r: GuideSearchResult) => {
    if (busy) return;
    // v0.43.7 anti-duplicate: if this URL is already imported, open it instead.
    const existing = findImported(r.url);
    if (existing) { openGuideId(existing.id); return; }
    // v0.43.14: background import — the backend crawls (up to 60 pages) in a
    // thread and we poll for progress. No more frozen UI on big Neoseeker guides;
    // the import even keeps running if you leave this screen.
    setBusy(true); setMsg(`Démarrage de l'import de « ${r.title.slice(0, 40)} »…`);
    try {
      const resp = await startImport(r.url, query.trim() || r.title, "Autre", query.trim() || r.title, "", "");
      // v0.43.21: backend anti-duplicate — if this guide (by root URL) already
      // exists, open it instead of making a second copy.
      if (resp.duplicate_guide_id) {
        try { setImported(await listGuides()); } catch {}
        setMsg("Déjà importé — ouverture…");
        openGuideId(resp.duplicate_guide_id);
        return;
      }
      const job_id = resp.job_id;
      if (!job_id) { setMsg("Import : réponse inattendue"); return; }
      let status: ImportStatus | null = null;
      for (let i = 0; i < 600; i++) {  // ~15 min ceiling at 1.5s/poll
        await new Promise((res) => setTimeout(res, 1500));
        try { status = await getImportStatus(job_id); } catch { continue; }
        if (!status || status.state === "unknown") continue;
        if (status.state === "running") {
          const prog = status.total > 0 ? ` — ${status.done}/${status.total} pages` : "";
          setMsg(`⏳ ${status.msg || "Import en cours"}${prog}  ·  (tu peux quitter, l'import continue en arrière-plan)`);
          continue;
        }
        break;  // done | error
      }
      try { setImported(await listGuides()); } catch {}
      if (!status || status.state !== "done" || !status.guide_id) {
        setMsg(`Import échoué : ${status?.error || "délai dépassé"}`);
        return;
      }
      // v0.43.7: 0 sections = failed extraction — propose immediate delete.
      if ((status.section_count || 0) === 0) {
        try { setZeroSecGuide(await getGuide(status.guide_id)); setMsg(""); return; } catch {}
      }
      setMsg(`✓ Importé : ${status.section_count} section(s). Ouverture…`);
      openGuideId(status.guide_id);
    } catch (e) {
      setMsg(`Import échoué : ${e instanceof Error ? e.message : e}`);
    } finally { setBusy(false); }
  };

  const theme = preferences ? themeStyle(preferences.theme)
    : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966", preBg: "rgba(0,0,0,0.3)", preText: "#ddd" };
  const layoutStyle: React.CSSProperties = {
    width: "100vw", height: "100vh",
    paddingTop: `${STEAM_UI_TOP_BAR_PX}px`, paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
    boxSizing: "border-box", display: "flex", flexDirection: "column",
    background: theme.background, color: theme.textColor,
    fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
  };
  const headerStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
    borderBottom: `1px solid ${theme.borderColor}`, background: "rgba(0,0,0,0.35)", flexShrink: 0,
  };

  return (
    <div style={layoutStyle}>
      <div style={headerStyle}>
        <DialogButton onClick={() => safeNavigateBack()} style={{ minWidth: "auto", width: "auto" }}>← Retour</DialogButton>
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>🔍 Rechercher un guide</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ maxWidth: "640px" }}>
          {zeroSecGuide ? (
            <div style={{ border: "1px solid rgba(255,100,100,0.4)", borderRadius: "8px", padding: "14px", marginBottom: "14px", background: "rgba(255,100,100,0.08)" }}>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>⚠ Extraction ratée</div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "12px" }}>
                « {zeroSecGuide.title} » a été importé mais ne contient <strong>aucune section</strong> (le site n'a pas fourni de contenu exploitable). Inutile de le garder.
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => void (async () => {
                  try { await deleteGuide(zeroSecGuide.id); setImported(await listGuides()); } catch {}
                  setZeroSecGuide(null); setMsg("Guide supprimé.");
                })()}>🗑 Supprimer</DialogButton>
                <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => { const g = zeroSecGuide; setZeroSecGuide(null); openGuideId(g.id); }}>Garder quand même</DialogButton>
              </div>
            </div>
          ) : null}
          <div style={{ marginBottom: "10px" }}>
            <TextField value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Nom du jeu (ex : Suikoden V)…" bShowClearAction />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
            <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={busy} onClick={() => setLangIndex((v) => (v + 1) % LANGUAGE_CHOICES.length)}>Langue : {lang.label}</DialogButton>
            <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={busy} onClick={() => setSiteIndex((v) => (v + 1) % SEARCH_SITE_CHOICES.length)}>Site : {site.label}</DialogButton>
            <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={busy} onClick={() => void runSearch(query)}>🔍 Lancer</DialogButton>
          </div>
          {msg ? <div style={{ fontSize: "0.85rem", color: theme.headingColor, marginBottom: "12px" }}>{msg}</div> : null}
          <Focusable style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {results.slice(0, visibleCount).map((r, i) => {
              const dup = findImported(r.url);
              return (
                <Focusable key={`${r.url}-${i}`} onActivate={() => void importResult(r)} style={{
                  background: dup ? "rgba(139,224,139,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${dup ? "rgba(139,224,139,0.5)" : theme.borderColor}`,
                  borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer",
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: dup ? "#8be08b" : theme.headingColor }}>
                    {dup ? "✓ Déjà importé — ouvrir" : "▶ Importer"}
                  </div>
                  {/* v0.43.16: full title WRAPS (was nowrap → overflowed the card, unreadable) */}
                  <div style={{ fontWeight: 700, color: theme.textColor, whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.25 }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.75 }}>{r.site}</div>
                  {r.snippet ? <div style={{ fontSize: "0.78rem", opacity: 0.85, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.snippet}</div> : null}
                </Focusable>
              );
            })}
            {results.length > visibleCount ? (
              <DialogButton disabled={busy} onClick={() => setVisibleCount((v) => v + SEARCH_PAGE_SIZE)}>
                ⬇ Charger plus de guides ({results.length - visibleCount} restant{results.length - visibleCount > 1 ? "s" : ""})
              </DialogButton>
            ) : null}
          </Focusable>
        </div>
      </div>
    </div>
  );
}

/**
 * v0.43.1 (Phase 2b): full-screen browser for SCANNED INSTALLED GAMES.
 * Mirrors FullScreenLibrary but for the ROM/game library scan. Grid of games
 * with filter/sort/favorites; clicking a game shows its detail with the guides
 * already imported for it (open) + favorite toggle.
 */
function FullScreenGameLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [textFilter, setTextFilter] = useState<string>("");
  const [letterFilter, setLetterFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");  // v0.43.2
  const [sortMode, setSortMode] = useState<"name" | "platform">("name");
  const [favOnly, setFavOnly] = useState<boolean>(false);
  const [groupByPlatform, setGroupByPlatform] = useState<boolean>(false);  // v0.43.2
  const [fiche, setFiche] = useState<LibraryItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [its, gs, prefs] = await Promise.all([listLibraryItems(), listGuides(), getReaderPreferences()]);
        setItems(its); setGuides(gs); setPreferences(prefs);
      } catch { /* keep empty */ }
      finally { setLoading(false); }
    })();
  }, []);

  const titleOf = (it: LibraryItem) => (it.custom_title || it.title || "").trim();

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const c = (titleOf(it)[0] || "").toUpperCase();
      set.add(/[A-Z]/.test(c) ? c : "#");
    }
    return ["", ...Array.from(set).sort()];
  }, [items]);

  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) { const p = (it.platform || "").trim(); if (p) set.add(p); }
    return ["", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const needle = textFilter.trim().toLowerCase();
    let list = items.filter((it) => {
      if (favOnly && !it.is_favorite) return false;
      if (needle && !`${it.title} ${it.custom_title} ${it.platform}`.toLowerCase().includes(needle)) return false;
      if (platformFilter && (it.platform || "") !== platformFilter) return false;
      if (letterFilter) {
        const c = (titleOf(it)[0] || "").toUpperCase();
        if (letterFilter === "#") { if (/[A-Z]/.test(c)) return false; }
        else if (c !== letterFilter) return false;
      }
      return true;
    });
    if (sortMode === "platform") list = list.slice().sort((a, b) => (a.platform || "zzz").localeCompare(b.platform || "zzz") || titleOf(a).localeCompare(titleOf(b)));
    else list = list.slice().sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    return list;
  }, [items, textFilter, letterFilter, platformFilter, sortMode, favOnly]);

  // v0.43.2: group filtered games by platform (for the group-by-platform mode).
  const groupedByPlatform = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const it of filtered) {
      const key = (it.platform || "Autre").trim() || "Autre";
      (map.get(key) || map.set(key, []).get(key)!).push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // v0.43.2: B/back closes the game fiche instead of exiting the route.
  useEffect(() => {
    if (!fiche) return;
    try { window.history.pushState({ osFiche: true }, ""); } catch {}
    const onPop = () => setFiche(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [fiche?.id]);

  const guidesForItem = (it: LibraryItem) => guides.filter((g) => guideMatchesLibraryItem(g, it));

  const theme = preferences ? themeStyle(preferences.theme)
    : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966", preBg: "rgba(0,0,0,0.3)", preText: "#ddd" };
  const layoutStyle: React.CSSProperties = {
    width: "100vw", height: "100vh",
    paddingTop: `${STEAM_UI_TOP_BAR_PX}px`, paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
    boxSizing: "border-box", display: "flex", flexDirection: "column",
    background: theme.background, color: theme.textColor,
    fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
  };
  const headerStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
    borderBottom: `1px solid ${theme.borderColor}`, background: "rgba(0,0,0,0.35)", flexShrink: 0,
  };
  const openGuide = (id: string) => { requestFullScreenGuide(id); try { Router.Navigate(FULL_SCREEN_ROUTE); } catch {} };
  const letterLabel = letterFilter === "" ? "Toutes" : letterFilter === "#" ? "#" : letterFilter;
  const letterIdx = Math.max(0, availableLetters.indexOf(letterFilter));

  // Game detail fiche.
  if (fiche) {
    const rel = guidesForItem(fiche);
    return (
      <div style={layoutStyle}>
        <div style={headerStyle}>
          <DialogButton onClick={() => setFiche(null)} style={{ minWidth: "auto", width: "auto" }}>← Liste</DialogButton>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleOf(fiche)}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "640px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.8rem", opacity: 0.9, marginBottom: "12px" }}>
            {fiche.platform ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{fiche.platform}</span> : null}
            {fiche.emulator ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{fiche.emulator}</span> : null}
            <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{fiche.instance_count} copie(s)</span>
            {fiche.is_favorite ? <span style={{ background: "rgba(255,217,102,0.2)", borderRadius: "4px", padding: "2px 8px" }}>★ Favori</span> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px", marginBottom: "18px" }}>
            <DialogButton style={{ minWidth: "auto", width: "100%", justifyContent: "flex-start" }}
              onClick={() => { requestSearch(titleOf(fiche)); try { Router.Navigate(SEARCH_ROUTE); } catch {} }}>
              🔍 Rechercher des guides pour ce jeu
            </DialogButton>
            <DialogButton style={{ minWidth: "auto", width: "100%", justifyContent: "flex-start" }}
              onClick={() => void (async () => { try { await toggleLibraryFavorite(fiche.id); const its = await listLibraryItems(); setItems(its); setFiche(its.find((x) => x.id === fiche.id) || null); } catch {} })()}>
              {fiche.is_favorite ? "☆ Retirer des favoris" : "★ Ajouter aux favoris"}
            </DialogButton>
          </div>
          <div style={{ fontWeight: 700, color: theme.headingColor, marginBottom: "8px" }}>Guides pour ce jeu ({rel.length})</div>
          {rel.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: "0.85rem" }}>Aucun guide importé pour ce jeu. Utilise 🔍 Rechercher depuis le menu Decky pour en importer un.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "520px" }}>
              {rel.map((g) => (
                <DialogButton key={g.id} style={{ minWidth: "auto", width: "100%", justifyContent: "flex-start" }} onClick={() => openGuide(g.id)}>
                  ▶ {g.title} {g.site ? `· ${g.site}` : ""}
                </DialogButton>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const gameGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" };
  const renderGameCard = (it: LibraryItem) => {
    const nGuides = guidesForItem(it).length;
    return (
      <Focusable key={it.id} onActivate={() => setFiche(it)} style={{
        background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.borderColor}`,
        borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px", cursor: "pointer",
      }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: theme.headingColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {it.is_favorite ? "★ " : ""}{titleOf(it)}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.72rem", opacity: 0.85 }}>
          {it.platform ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }}>{it.platform}</span> : null}
          <span style={{ background: nGuides > 0 ? "rgba(139,224,139,0.2)" : "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }}>
            {nGuides > 0 ? `${nGuides} guide(s)` : "aucun guide"}
          </span>
        </div>
      </Focusable>
    );
  };

  return (
    <div style={layoutStyle}>
      <div style={headerStyle}>
        <DialogButton onClick={() => safeNavigateBack()} style={{ minWidth: "auto", width: "auto" }}>← Retour</DialogButton>
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>🎮 Mes jeux ({filtered.length}/{items.length})</div>
        <div style={{ flex: 1 }} />
        <div style={{ width: "200px" }}>
          <TextField value={textFilter} onChange={(e: any) => setTextFilter(e.target.value)} placeholder="Filtrer…" bShowClearAction />
        </div>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={availablePlatforms.length <= 1}
          onClick={() => { const i = Math.max(0, availablePlatforms.indexOf(platformFilter)); setPlatformFilter(availablePlatforms[(i + 1) % availablePlatforms.length]); }}>
          {platformFilter ? `▸ ${platformFilter}` : "▸ Plateforme"}
        </DialogButton>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => setGroupByPlatform((v) => !v)}>{groupByPlatform ? "🗂 Groupé" : "🗂 Grouper"}</DialogButton>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => setFavOnly((v) => !v)}>{favOnly ? "★" : "☆"}</DialogButton>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={availableLetters.length <= 1}
          onClick={() => setLetterFilter(availableLetters[(letterIdx + 1) % availableLetters.length])}>{letterLabel}</DialogButton>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loading ? (
          <div style={{ padding: "24px", opacity: 0.8 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px", opacity: 0.8 }}>{items.length === 0 ? "Aucun jeu scanné. Configure les sources dans Réglages puis rescanne." : "Aucun jeu ne correspond au filtre."}</div>
        ) : groupByPlatform ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {groupedByPlatform.map(([plat, its]) => (
              <div key={plat}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: theme.headingColor, marginBottom: "8px", borderBottom: `1px solid ${theme.borderColor}`, paddingBottom: "4px" }}>
                  {plat} <span style={{ opacity: 0.6, fontWeight: 400 }}>({its.length})</span>
                </div>
                <Focusable style={gameGridStyle}>{its.map(renderGameCard)}</Focusable>
              </div>
            ))}
          </div>
        ) : (
          <Focusable style={gameGridStyle}>{filtered.map(renderGameCard)}</Focusable>
        )}
      </div>
    </div>
  );
}

/**
 * v0.42.17 (Levier D): full-screen guide browser. A comfortable library
 * screen mounted on `/decky-offline-soluce/library` — full-width grid of guide
 * cards with text/letter filter + sort, so 20-30+ guides are easy to browse
 * (the cramped QAM prev/next cycling doesn't scale). Clicking a card opens that
 * guide in the reader route.
 */
function FullScreenLibrary() {
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [textFilter, setTextFilter] = useState<string>("");
  const [letterFilter, setLetterFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");  // v0.43.2
  const [sortMode, setSortMode] = useState<"recent" | "name" | "platform">("recent");
  const [groupByGame, setGroupByGame] = useState<boolean>(false);
  // v0.43.1 (Phase 2a): guide fiche — clicking a card opens a detail panel with
  // Ouvrir + per-guide actions (re-download, reconstruct, clean, delete).
  const [ficheGuide, setFicheGuide] = useState<GuideSummary | null>(null);
  const [ficheBusy, setFicheBusy] = useState<boolean>(false);
  const [ficheMsg, setFicheMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [gs, prefs] = await Promise.all([listGuides(), getReaderPreferences()]);
        setGuides(gs);
        setPreferences(prefs);
      } catch { /* keep empty */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Refresh the guides list after an action (keeps the fiche in sync).
  const refreshGuides = async () => {
    try { const gs = await listGuides(); setGuides(gs); return gs; } catch { return guides; }
  };
  const ficheAction = async (
    label: string,
    fn: (id: string) => Promise<unknown>,
  ) => {
    if (!ficheGuide) return;
    setFicheBusy(true); setFicheMsg(`${label}…`);
    try {
      await fn(ficheGuide.id);
      const gs = await refreshGuides();
      const updated = gs.find((g) => g.id === ficheGuide.id) || null;
      setFicheGuide(updated);
      setFicheMsg(updated ? `${label} : OK` : `${label} : terminé`);
    } catch (e) {
      setFicheMsg(`${label} : échec — ${e instanceof Error ? e.message : e}`);
    } finally {
      setFicheBusy(false);
    }
  };

  // v0.43.2: B/back closes the fiche (returns to the list) instead of exiting the
  // whole full-screen route. When the fiche opens we push a history entry; the
  // Deck's B maps to history-back → popstate → we close the fiche and swallow it.
  useEffect(() => {
    if (!ficheGuide) return;
    try { window.history.pushState({ osFiche: true }, ""); } catch {}
    const onPop = () => setFicheGuide(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ficheGuide?.id]);

  const titleOf = (g: GuideSummary) => (g.game.game_title || g.title || "").trim();

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const g of guides) {
      const c = (titleOf(g)[0] || "").toUpperCase();
      set.add(/[A-Z]/.test(c) ? c : "#");
    }
    return ["", ...Array.from(set).sort()];
  }, [guides]);

  // v0.43.2: platforms actually present among the guides (for the platform filter).
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const g of guides) { const p = (g.game.platform || "").trim(); if (p) set.add(p); }
    return ["", ...Array.from(set).sort()];
  }, [guides]);

  const filtered = useMemo(() => {
    const needle = textFilter.trim().toLowerCase();
    let list = guides.filter((g) => {
      if (needle) {
        const hay = `${g.title} ${g.game.game_title || ""} ${g.site || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (platformFilter && (g.game.platform || "") !== platformFilter) return false;
      if (letterFilter) {
        const c = (titleOf(g)[0] || "").toUpperCase();
        if (letterFilter === "#") { if (/[A-Z]/.test(c)) return false; }
        else if (c !== letterFilter) return false;
      }
      return true;
    });
    if (sortMode === "name") list = list.slice().sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    else if (sortMode === "platform") list = list.slice().sort((a, b) => (a.game.platform || "zzz").localeCompare(b.game.platform || "zzz") || titleOf(a).localeCompare(titleOf(b)));
    else list = list.slice().sort((a, b) => (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "") || titleOf(a).localeCompare(titleOf(b)));
    return list;
  }, [guides, textFilter, letterFilter, platformFilter, sortMode]);

  const theme = preferences ? themeStyle(preferences.theme)
    : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966", preBg: "rgba(0,0,0,0.3)", preText: "#ddd" };

  const layoutStyle: React.CSSProperties = {
    width: "100vw", height: "100vh",
    paddingTop: `${STEAM_UI_TOP_BAR_PX}px`, paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
    boxSizing: "border-box", display: "flex", flexDirection: "column",
    background: theme.background, color: theme.textColor,
    fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
  };
  const headerStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
    borderBottom: `1px solid ${theme.borderColor}`, background: "rgba(0,0,0,0.35)", flexShrink: 0,
  };

  const openGuide = (id: string) => {
    requestFullScreenGuide(id);
    try { Router.Navigate(FULL_SCREEN_ROUTE); } catch {}
  };

  const sortLabel = sortMode === "recent" ? "Récemment ouvert" : sortMode === "name" ? "Nom A→Z" : "Plateforme";
  const letterLabel = letterFilter === "" ? "Toutes" : letterFilter === "#" ? "#" : letterFilter;
  const letterIdx = Math.max(0, availableLetters.indexOf(letterFilter));

  const renderCard = (g: GuideSummary) => {
    const pct = g.section_count > 0 && (g.progress?.last_section_index ?? -1) >= 0
      ? Math.round(100 * ((g.progress.last_section_index + 1) / g.section_count)) : 0;
    return (
      <Focusable
        key={g.id}
        onActivate={() => { setFicheMsg(""); setFicheGuide(g); }}
        style={{
          background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.borderColor}`,
          borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px",
          cursor: "pointer",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1rem", color: theme.headingColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {/* In grouped mode the game name is the section header, so show the
              guide's own title (site variant) on the card instead. */}
          {groupByGame ? (g.title || g.game.game_title) : (g.game.game_title || g.title)}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.72rem", opacity: 0.85 }}>
          {g.game.platform ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }}>{g.game.platform}</span> : null}
          {g.site ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }}>{g.site}</span> : null}
          <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }}>{g.section_count} sect.</span>
          {g.has_resume ? <span style={{ background: "rgba(255,217,102,0.2)", borderRadius: "4px", padding: "1px 6px" }}>Reprise</span> : null}
        </div>
        <div style={{ height: "6px", background: "rgba(255,255,255,0.12)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: theme.headingColor }} />
        </div>
      </Focusable>
    );
  };

  const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" };

  // v0.42.19: group filtered guides by game_title (for the "Grouper" mode).
  const grouped = useMemo(() => {
    const map = new Map<string, GuideSummary[]>();
    for (const g of filtered) {
      const key = (g.game.game_title || g.title || "?").trim();
      (map.get(key) || map.set(key, []).get(key)!).push(g);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // v0.43.1: guide fiche — detail panel with Ouvrir + per-guide actions.
  if (ficheGuide) {
    const g = ficheGuide;
    const pct = g.section_count > 0 && (g.progress?.last_section_index ?? -1) >= 0
      ? Math.round(100 * ((g.progress.last_section_index + 1) / g.section_count)) : 0;
    const actBtn: React.CSSProperties = { minWidth: "auto", width: "100%", justifyContent: "flex-start" };
    return (
      <div style={layoutStyle}>
        <div style={headerStyle}>
          <DialogButton onClick={() => setFicheGuide(null)} style={{ minWidth: "auto", width: "auto" }}>← Liste</DialogButton>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {g.game.game_title || g.title}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: "640px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.8rem", opacity: 0.9, marginBottom: "10px" }}>
            {g.game.platform ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{g.game.platform}</span> : null}
            {g.site ? <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{g.site}</span> : null}
            <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{g.section_count} sections</span>
            <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }}>{g.page_count} page(s)</span>
          </div>
          <div style={{ fontSize: "0.82rem", opacity: 0.8, marginBottom: "6px" }}>{g.title}</div>
          <div style={{ height: "8px", background: "rgba(255,255,255,0.12)", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: theme.headingColor }} />
          </div>
          {ficheMsg ? <div style={{ fontSize: "0.82rem", color: theme.headingColor, marginBottom: "12px" }}>{ficheMsg}</div> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }}>
            <DialogButton style={actBtn} disabled={ficheBusy} onClick={() => { openGuide(g.id); }}>▶ Ouvrir le guide</DialogButton>
            <DialogButton style={actBtn} disabled={ficheBusy || !g.url} onClick={() => void ficheAction("Re-téléchargement", (id) => reloadGuideContent(id))}>🔄 Re-télécharger</DialogButton>
            <DialogButton style={actBtn} disabled={ficheBusy} onClick={() => void ficheAction("Reconstruction", (id) => reconstructSections(id))}>🔧 Reconstruire les sections</DialogButton>
            <DialogButton style={actBtn} disabled={ficheBusy} onClick={() => void ficheAction("Nettoyage", (id) => cleanExistingGuide(id))}>🧹 Nettoyer le contenu</DialogButton>
            <DialogButton style={{ ...actBtn, borderColor: "rgba(255,100,100,0.4)" }} disabled={ficheBusy} onClick={() => void (async () => {
              setFicheBusy(true); setFicheMsg("Suppression…");
              try { await deleteGuide(g.id); await refreshGuides(); setFicheGuide(null); }
              catch (e) { setFicheMsg(`Suppression : échec — ${e instanceof Error ? e.message : e}`); }
              finally { setFicheBusy(false); }
            })()}>🗑 Supprimer ce guide</DialogButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      <div style={headerStyle}>
        <DialogButton onClick={() => safeNavigateBack()} style={{ minWidth: "auto", width: "auto" }}>← Retour</DialogButton>
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>📚 Bibliothèque ({filtered.length}/{guides.length})</div>
        <div style={{ flex: 1 }} />
        <div style={{ width: "230px" }}>
          <TextField value={textFilter} onChange={(e: any) => setTextFilter(e.target.value)} placeholder="Filtrer…" bShowClearAction />
        </div>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={availablePlatforms.length <= 1}
          onClick={() => { const i = Math.max(0, availablePlatforms.indexOf(platformFilter)); setPlatformFilter(availablePlatforms[(i + 1) % availablePlatforms.length]); }}>
          {platformFilter ? `▸ ${platformFilter}` : "▸ Plateforme"}
        </DialogButton>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => setGroupByGame((v) => !v)}>{groupByGame ? "🎮 Groupé" : "🎮 Grouper"}</DialogButton>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => setSortMode((m) => m === "recent" ? "name" : m === "name" ? "platform" : "recent")}>Tri : {sortLabel}</DialogButton>
        <DialogButton style={{ minWidth: "auto", width: "auto" }} disabled={availableLetters.length <= 1}
          onClick={() => setLetterFilter(availableLetters[(letterIdx + 1) % availableLetters.length])}>{letterLabel}</DialogButton>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loading ? (
          <div style={{ padding: "24px", opacity: 0.8 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px", opacity: 0.8 }}>{guides.length === 0 ? "Aucun guide importé." : "Aucun guide ne correspond au filtre."}</div>
        ) : groupByGame ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {grouped.map(([game, gs]) => (
              <div key={game}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: theme.headingColor, marginBottom: "8px", borderBottom: `1px solid ${theme.borderColor}`, paddingBottom: "4px" }}>
                  {game} <span style={{ opacity: 0.6, fontWeight: 400 }}>({gs.length})</span>
                </div>
                <Focusable style={gridStyle}>
                  {gs.map(renderCard)}
                </Focusable>
              </div>
            ))}
          </div>
        ) : (
          <Focusable style={gridStyle}>
            {filtered.map(renderCard)}
          </Focusable>
        )}
      </div>
    </div>
  );
}

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
  const [showDisplay, setShowDisplay] = useState<boolean>(false);  // v0.43.4: display settings panel in the reader
  const [showFlags, setShowFlags] = useState<boolean>(false);  // v0.43.33: "À ne pas rater" checklist
  const [confortOn, setConfortOn] = useState<boolean>(false);  // v0.43.6: Confort Deck toggle
  const confortSnapRef = useRef<{ prefs: ReaderPreferences; font: number; toc: boolean } | null>(null);
  // v0.43.6: page-scroll pulse — L1/R1 bump this; GuideReader scrolls ~80% of a screen.
  const [scrollPulse, setScrollPulse] = useState<{ n: number; dir: 1 | -1 }>({ n: 0, dir: 1 });
  const [loadError, setLoadError] = useState<string>("");
  const lastScrollFractionRef = useRef<number>(0);
  const restoreFractionRef = useRef<number | null>(null);
  const initialScrollRef = useRef<boolean>(true);
  // L4: state mirror of the scroll fraction so the intra-section progress bar can re-render.
  // Separate from the ref because the ref is updated on every scroll tick and we want React
  // to know about it.
  const [displayScrollFraction, setDisplayScrollFraction] = useState<number>(0);
  // v0.25: track which section indices we've already auto-marked as read this session
  // (avoids spamming setSectionNote on every scroll tick once the threshold is crossed).
  const autoMarkedRef = useRef<Set<number>>(new Set());
  // Mirror of latest section/font so the unmount cleanup persists the freshest values,
  // not the values captured at first effect run (closure trap on the [guide?.id]-only dep).
  const latestStateRef = useRef<{ sectionIndex: number; fontScale: number }>({ sectionIndex: -1, fontScale: 1.0 });
  // v0.33: flag set by "Go to bookmark" so the section-change effect doesn't wipe
  // the restore fraction we just set.
  const intentionalRestoreRef = useRef<boolean>(false);
  // v0.33: scroll-debounced save timer ref — saves the latest position 1.5s after
  // the user stops scrolling, even if section doesn't change. Without this the
  // only persistence point was the unmount cleanup, which may not always fire.
  const scrollSaveTimerRef = useRef<number | null>(null);
  // v0.34: incremented on each "Go to bookmark" click. Passed to GuideReader as a
  // prop so the scroll-restore effect re-fires even when sectionIndex doesn't change
  // (clicking "Aller au marque-page" while already in that section).
  const [restoreGeneration, setRestoreGeneration] = useState<number>(0);
  // v0.34: last bookmark-click timestamp for cheap double-fire protection
  const lastBookmarkClickRef = useRef<number>(0);
  // v0.35: collapsible named-bookmarks panel — when ON the reader pane is replaced
  // by the list (saves space; OFF gives reader maximum width).
  const [showBookmarksPanel, setShowBookmarksPanel] = useState<boolean>(false);
  const [bookmarksBusy, setBookmarksBusy] = useState<boolean>(false);
  // Sidebar TOC UX state
  const [tocFilter, setTocFilter] = useState<string>("");
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set());
  const [showHiddenSections, setShowHiddenSections] = useState<boolean>(false);

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

  // v0.43.6: controller shortcuts in the reader.
  //   L2 (28) / R2 (29) → previous / next SECTION
  //   L1 (30) / R1 (31) → scroll one screen up / down (~80%) within the section
  // Registered while a guide is loaded; unregistered on unmount.
  useEffect(() => {
    if (!guide) return;
    const sc: any = (window as any).SteamClient;
    const inputApi: any = sc?.Input;
    if (!inputApi?.RegisterForControllerInputMessages) return;
    const count = guide.sections.length;
    let active = true;
    const handle = inputApi.RegisterForControllerInputMessages((_idx: number, button: number, pressed: boolean) => {
      if (!active || !pressed) return;
      if (button === 28) setSectionIndex((v) => Math.max(0, v - 1));          // L2 → prev section
      else if (button === 29) setSectionIndex((v) => Math.min(count - 1, v + 1));  // R2 → next section
      else if (button === 30) setScrollPulse((p) => ({ n: p.n + 1, dir: -1 }));    // L1 → page up
      else if (button === 31) setScrollPulse((p) => ({ n: p.n + 1, dir: 1 }));     // R1 → page down
    });
    return () => { active = false; try { handle?.unregister?.(); } catch {} };
  }, [guide?.id]);

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

  // Reset restore fraction AND last-scroll-fraction when section changes after initial load.
  // v0.32 fix: also reset lastScrollFractionRef so old section's scroll doesn't leak.
  // v0.33: preserve restoreFractionRef when "Go to bookmark" intentionally set it.
  useEffect(() => {
    if (initialScrollRef.current) {
      initialScrollRef.current = false;
      return;
    }
    if (intentionalRestoreRef.current) {
      intentionalRestoreRef.current = false; // consume the flag, keep restoreFractionRef as-is
    } else {
      restoreFractionRef.current = 0;
    }
    lastScrollFractionRef.current = 0;
  }, [sectionIndex]);

  // v0.25: auto-mark a section as "lu" (done) when the user scrolls past ~97%.
  // Only fires once per section per mount. Preserves existing flagged/note when
  // promoting a section from "no note" to "done".
  useEffect(() => {
    if (!guide || sectionIndex < 0) return;
    if (displayScrollFraction < 0.97) return;
    if (autoMarkedRef.current.has(sectionIndex)) return;
    const existing = (guide.progress?.section_notes || []).find((n) => n.section_index === sectionIndex);
    autoMarkedRef.current.add(sectionIndex); // mark immediately to avoid re-fire
    if (existing?.done) return; // already done, nothing to persist
    const flagged = existing?.flagged ?? false;
    const note = existing?.note ?? "";
    void setSectionNote(guide.id, sectionIndex, true, flagged, note)
      .then((updated) => setGuide(updated))
      .catch(() => { autoMarkedRef.current.delete(sectionIndex); /* allow retry */ });
  }, [displayScrollFraction, sectionIndex, guide?.id]);

  // Reset the in-session "already marked" set when guide changes
  useEffect(() => {
    autoMarkedRef.current = new Set();
  }, [guide?.id]);

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
    // v0.43.5: trimmed 300→240px to give the text column ~60px more width.
    width: "240px",
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
  // v0.42.18: compact header-button style — auto width so 6 buttons fit on the
  // Deck without pushing the last one (🔍) off-screen.
  const hdrBtnStyle: React.CSSProperties = {
    minWidth: "auto", width: "auto", padding: "6px 12px", flexShrink: 0,
  };

  if (loadError) {
    return (
      <div style={layoutStyle}>
        <div style={headerStyle}>
          <DialogButton onClick={() => safeNavigateBack()}>← Retour</DialogButton>
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
          <DialogButton onClick={() => safeNavigateBack()}>← Retour</DialogButton>
          <div style={{ flex: 1, fontWeight: 700 }}>Chargement…</div>
        </div>
      </div>
    );
  }

  const sectionCount = guide.sections.length;
  const currentSection = sectionIndex >= 0 ? guide.sections[sectionIndex] : null;
  const sectionLabel = currentSection ? currentSection.title : "—";

  // v0.43.4: apply + persist a reader preference change live (theme, font,
  // line-height, width, highlight, numbered). Updates local state so the reader
  // re-renders instantly, then persists to the backend.
  const savePrefs = (next: ReaderPreferences) => {
    setPreferences(next);
    try {
      void updateReaderPreferences(
        next.theme, next.font_family, next.line_height, next.max_width,
        next.highlight_keywords, next.numbered_sections, next.resume_hotkey || "",
        typeof next.resume_button === "number" ? next.resume_button : -1,
        next.resume_enabled !== false,
      );
    } catch { /* keep local change even if persist fails */ }
  };
  const cyclePref = <K extends keyof ReaderPreferences>(key: K, choices: ReaderPreferences[K][]) => {
    const i = choices.indexOf(preferences[key]);
    savePrefs({ ...preferences, [key]: choices[(i + 1) % choices.length] });
  };
  // v0.43.6: Confort Deck is a TOGGLE — first click applies the comfort combo +
  // hides the sidebar (snapshotting the prior state); second click restores it.
  const toggleConfort = () => {
    if (!confortOn) {
      confortSnapRef.current = { prefs: preferences, font: fontScale, toc: showToc };
      savePrefs({ ...preferences, font_family: "sans", line_height: "airy", max_width: "normal" });
      setFontScale(1.1); setShowToc(false); setConfortOn(true);
    } else {
      const s = confortSnapRef.current;
      if (s) { savePrefs(s.prefs); setFontScale(s.font); setShowToc(s.toc); }
      else { setShowToc(true); }
      confortSnapRef.current = null; setConfortOn(false);
    }
  };
  const prefLabels: Record<string, string> = {
    dark: "Sombre", sepia: "Sépia", sans: "Sans", serif: "Serif", mono: "Mono",
    tight: "Serré", normal: "Normal", airy: "Aéré", narrow: "Étroit", full: "Plein",
  };

  return (
    <div style={layoutStyle}>
      <div style={headerStyle}>
        {/* v0.42.18: compact header — DialogButton has a wide default min-width;
            with 6 buttons the last one (🔍) fell off-screen on the Deck. Force
            auto width + short icon labels so they all fit. */}
        <DialogButton style={hdrBtnStyle} onClick={() => safeNavigateBack()}>←</DialogButton>
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
        <DialogButton style={hdrBtnStyle} onClick={() => setShowToc((v) => !v)}>📚</DialogButton>
        <DialogButton style={hdrBtnStyle} onClick={() => setShowBookmarksPanel((v) => !v)}>
          🔖{(guide.progress?.named_bookmarks?.length || 0) > 0 ? ` ${guide.progress.named_bookmarks.length}` : ""}
        </DialogButton>
        <DialogButton style={hdrBtnStyle} onClick={() => setFontScale((v) => Math.max(0.85, +(v - 0.1).toFixed(2)))}>A−</DialogButton>
        <DialogButton style={hdrBtnStyle} onClick={() => setFontScale((v) => Math.min(2.0, +(v + 0.1).toFixed(2)))}>A+</DialogButton>
        <DialogButton style={hdrBtnStyle} onClick={() => setShowDisplay((v) => !v)}>⚙</DialogButton>
        <DialogButton style={hdrBtnStyle} onClick={() => setShowSearch((v) => !v)}>🔍</DialogButton>
        {(guide.important_flags?.length || 0) > 0 ? (
          <DialogButton style={hdrBtnStyle} onClick={() => setShowFlags((v) => !v)}>
            ⚠️{(() => { const n = guide.important_flags!.filter((f) => f.category === "missable").length; return n > 0 ? ` ${n}` : ""; })()}
          </DialogButton>
        ) : null}
      </div>

      {showFlags && (guide.important_flags?.length || 0) > 0 ? (
        <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.35)", flexShrink: 0, maxHeight: "40vh", overflowY: "auto" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px", color: "#ffd966" }}>
            ⚠️ À ne pas rater dans ce guide
          </div>
          {(["missable", "key_item", "side_quest"] as const).map((cat) => {
            const catFlags = guide.important_flags!.filter((f) => f.category === cat);
            if (!catFlags.length) return null;
            const meta = HIGHLIGHT_CATEGORIES.find((c) => c.category === cat)!;
            const label = cat === "missable" ? "Manquables / point de non-retour" : cat === "key_item" ? "Objets clés / uniques" : "Quêtes secondaires / optionnel";
            return (
              <div key={cat} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: meta.color, marginBottom: "4px" }}>
                  {meta.icon} {label} ({catFlags.length})
                </div>
                {catFlags.map((f, i) => (
                  <Focusable
                    key={`${cat}-${i}`}
                    onActivate={() => { setSectionIndex(f.section_index >= 0 ? f.section_index : sectionIndex); setShowFlags(false); }}
                    style={{
                      padding: "6px 8px", marginBottom: "3px", borderRadius: "5px", cursor: "pointer",
                      background: "rgba(255,255,255,0.05)", borderLeft: `3px solid ${meta.color}`,
                      fontSize: "0.76rem", lineHeight: 1.3,
                    }}
                  >
                    <div style={{ opacity: 0.6, fontSize: "0.68rem" }}>
                      {f.section_index >= 0 && guide.sections[f.section_index] ? `▸ ${guide.sections[f.section_index].title.slice(0, 34)}` : "▸ (guide)"}
                    </div>
                    <div>{f.snippet}</div>
                  </Focusable>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}

      {showDisplay ? (
        <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.3)", flexShrink: 0, display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>Affichage :</span>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => cyclePref("theme", ["dark", "sepia"])}>Thème : {prefLabels[preferences.theme]}</DialogButton>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => cyclePref("font_family", ["sans", "serif", "mono"])}>Police : {prefLabels[preferences.font_family]}</DialogButton>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => cyclePref("line_height", ["tight", "normal", "airy"])}>Interligne : {prefLabels[preferences.line_height]}</DialogButton>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => cyclePref("max_width", ["narrow", "normal", "full"])}>Largeur : {prefLabels[preferences.max_width]}</DialogButton>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => savePrefs({ ...preferences, highlight_keywords: !preferences.highlight_keywords })}>Surlignage : {preferences.highlight_keywords ? "Oui" : "Non"}</DialogButton>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={() => savePrefs({ ...preferences, numbered_sections: !preferences.numbered_sections })}>Numéros : {preferences.numbered_sections ? "Oui" : "Non"}</DialogButton>
          <DialogButton style={{ minWidth: "auto", width: "auto" }} onClick={toggleConfort}>
            {confortOn ? "🛋 Confort ✓ (désactiver)" : "🛋 Confort Deck"}
          </DialogButton>
        </div>
      ) : null}

      {showSearch ? (
        <div style={{ padding: "8px 16px", background: "rgba(0,0,0,0.25)", flexShrink: 0 }}>
          <TextField
            value={searchPattern}
            onChange={(e: any) => setSearchPattern(e.target.value)}
            placeholder="Surligner dans la section…"
            bShowClearAction
          />
        </div>
      ) : null}

      <div style={mainAreaStyle}>
        {showToc ? (
          <TocSidebar
            guide={guide}
            preferences={preferences}
            theme={theme}
            sidebarStyle={sidebarStyle}
            sectionIndex={sectionIndex}
            setSectionIndex={setSectionIndex}
            tocFilter={tocFilter}
            setTocFilter={setTocFilter}
            collapsedParents={collapsedParents}
            setCollapsedParents={setCollapsedParents}
            showHiddenSections={showHiddenSections}
            setShowHiddenSections={setShowHiddenSections}
          />
        ) : null}

        <div style={readerPaneStyle}>
          {showBookmarksPanel ? (
            <NamedBookmarksPanel
              guide={guide}
              currentSectionIndex={sectionIndex}
              currentScrollFraction={lastScrollFractionRef.current}
              busy={bookmarksBusy}
              theme={theme}
              onClose={() => setShowBookmarksPanel(false)}
              onAdd={async () => {
                if (!guide) return;
                setBookmarksBusy(true);
                try {
                  const sec = guide.sections[sectionIndex];
                  const secTitle = (sec?.title || "Début").slice(0, 40);
                  const now = new Date();
                  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                  const name = `${secTitle} — ${hhmm}`;
                  const updated = await addNamedBookmark(guide.id, name, sectionIndex, lastScrollFractionRef.current);
                  setGuide(updated);
                  try { toaster.toast({ title: "Marque-page ajouté", body: name, duration: 2500 }); } catch {}
                } catch (e: any) {
                  try { toaster.toast({ title: "Ajout KO", body: String(e?.message || e), critical: true, duration: 4000 }); } catch {}
                } finally {
                  setBookmarksBusy(false);
                }
              }}
              onDelete={async (bookmarkId: string) => {
                if (!guide) return;
                setBookmarksBusy(true);
                try {
                  const updated = await deleteNamedBookmark(guide.id, bookmarkId);
                  setGuide(updated);
                } catch (e: any) {
                  try { toaster.toast({ title: "Suppression KO", body: String(e?.message || e), critical: true, duration: 3500 }); } catch {}
                } finally {
                  setBookmarksBusy(false);
                }
              }}
              onGoTo={(bm) => {
                restoreFractionRef.current = bm.scroll_fraction || 0;
                intentionalRestoreRef.current = true;
                setRestoreGeneration((g) => g + 1);
                setSectionIndex(bm.section_index >= 0 ? bm.section_index : 0);
                setShowBookmarksPanel(false); // auto-close so user sees content
                try { toaster.toast({ title: bm.name, body: `Section ${(bm.section_index >= 0 ? bm.section_index : 0) + 1} · ${Math.round((bm.scroll_fraction || 0) * 100)}%`, duration: 1800 }); } catch {}
              }}
            />
          ) : (
            <>
              {/* L4: thin progress bar at top of reader showing intra-section scroll % */}
              <div style={{
                height: "3px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "2px",
                marginBottom: "6px",
                overflow: "hidden",
                flexShrink: 0,
              }}>
                <div style={{
                  width: `${Math.round(displayScrollFraction * 100)}%`,
                  height: "100%",
                  background: "#ffd966",
                  transition: "width 80ms linear",
                }} />
              </div>
            </>
          )}
          {!showBookmarksPanel ? (
          <GuideReader
            guide={guide}
            sectionIndex={sectionIndex}
            fontScale={fontScale}
            preferences={preferences}
            searchPattern={searchPattern}
            scrollRestoreFraction={restoreFractionRef.current}
            restoreGeneration={restoreGeneration}
            onScrollChange={(f) => {
              lastScrollFractionRef.current = f;
              setDisplayScrollFraction(f);
              if (restoreFractionRef.current !== null) restoreFractionRef.current = null;
              // v0.33: debounce-save 1.5s after scroll stops so position is persisted
              // even if user exits without triggering the unmount cleanup.
              if (scrollSaveTimerRef.current !== null) window.clearTimeout(scrollSaveTimerRef.current);
              scrollSaveTimerRef.current = window.setTimeout(() => {
                if (!guide) return;
                const si = latestStateRef.current.sectionIndex;
                const fs = latestStateRef.current.fontScale;
                saveProgress(guide.id, si, fs, lastScrollFractionRef.current).catch(() => {});
              }, 1500) as unknown as number;
            }}
            maxHeight={`calc(100vh - ${240 + (showSearch ? 50 : 0) + (showDisplay ? 50 : 0)}px)`}
            onJumpToSection={(idx) => setSectionIndex(idx)}
            scrollPulse={scrollPulse}
          />
          ) : null}
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
            // v0.34: double-fire protection — ignore clicks within 800ms of last one
            const now = Date.now();
            if (now - lastBookmarkClickRef.current < 800) {
              try { console.log("[Offline Soluce] bookmark click ignored (debounce)"); } catch {}
              return;
            }
            lastBookmarkClickRef.current = now;
            if (!guide) return;
            const sec = sectionIndex;
            const frac = lastScrollFractionRef.current;
            // Log with a stack trace fragment so we can identify accidental triggers
            try {
              const stack = new Error().stack?.split("\n").slice(1, 4).join(" → ") || "(no stack)";
              console.log("[Offline Soluce] set bookmark click", { sec, frac, stack });
            } catch {}
            void setBookmark(guide.id, sec, frac)
              .then((g) => {
                setGuide(g);
                try { toaster.toast({ title: "Marque-page posé", body: `Section ${sec + 1} · position ${Math.round(frac * 100)}%`, duration: 2500 }); } catch {}
              })
              .catch((err: any) => {
                try { toaster.toast({ title: "Marque-page KO", body: String(err?.message || err), critical: true, duration: 4000 }); } catch {}
              });
          }}
        >
          🔖 Poser marque-page
        </DialogButton>
        {guide.progress?.bookmark_set_at ? (
          <DialogButton
            onClick={() => {
              const tgtSection = guide.progress?.bookmark_section_index ?? -1;
              const tgtScroll = guide.progress?.bookmark_scroll_fraction ?? 0;
              if (tgtSection < 0) return;
              try { console.log("[Offline Soluce] go to bookmark", { tgtSection, tgtScroll, currentSection: sectionIndex }); } catch {}
              // Set restore fraction + flag so the section-change effect doesn't wipe it
              restoreFractionRef.current = tgtScroll;
              intentionalRestoreRef.current = true;
              // Bump generation FIRST so even if sectionIndex doesn't change (same section
              // case), the GuideReader's effect re-fires and restores the scroll.
              setRestoreGeneration((g) => g + 1);
              setSectionIndex(tgtSection);
              try { toaster.toast({ title: "Marque-page", body: `Section ${tgtSection + 1} · ${Math.round(tgtScroll * 100)}%`, duration: 2000 }); } catch {}
            }}
          >
            📍 Aller au marque-page
          </DialogButton>
        ) : null}
        {currentSection ? (() => {
          const currentTitle = (currentSection.title || "").trim();
          const currentIsHidden = currentTitle.length > 0
            && (guide.progress?.hidden_section_titles || []).includes(currentTitle);
          return (
            <DialogButton
              onClick={() => {
                if (!currentTitle) return;
                void toggleSectionHidden(guide.id, sectionIndex)
                  .then((updated) => setGuide(updated))
                  .catch(() => {});
              }}
              disabled={!currentTitle}
            >
              {currentIsHidden ? "👁 Afficher" : "🙈 Masquer"}
            </DialogButton>
          );
        })() : null}
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

// Controller button indices the user can pick for the "open last guide" trigger.
// Sourced from ControllerInputGamepadButton enum in @decky/ui Input.d.ts.
// We focus on the back paddles + bumpers + special buttons — the analog/dpad/face
// buttons are kept for Steam UI navigation so binding our action to them would
// hijack the UI.
const RESUME_BUTTON_CHOICES: { value: number; label: string }[] = [
  { value: -1, label: "L4/L5 + R4/R5 (palettes, défaut)" },
  { value: 32, label: "Palette gauche (LBACK = L4/L5)" },
  { value: 33, label: "Palette droite (RBACK = R4/R5)" },
  { value: 30, label: "L1 (LSHOULDER)" },
  { value: 31, label: "R1 (RSHOULDER)" },
  { value: 28, label: "L2 (LTRIGGER click)" },
  { value: 29, label: "R2 (RTRIGGER click)" },
  { value: 25, label: "L3 (LEFTSTICK click)" },
];

// Default buttons (LBACK + RBACK both trigger when prefs.resume_button === -1)
const RESUME_BUTTON_DEFAULTS = new Set([32, 33]);

// Module-level cache of the user's selected resume button. -1 means use defaults.
// Updated by Content's prefs UI AND read by the controller listener. Plain mutable
// because the listener mounts outside the QAM React tree.
let _currentResumeButton: number = -1;
function setCurrentResumeButton(btn: number): void {
  _currentResumeButton = Number.isFinite(btn) ? btn : -1;
}
// v0.40: master enable/disable for the resume action. Same mirror pattern.
let _currentResumeEnabled: boolean = true;
function setCurrentResumeEnabled(enabled: boolean): void {
  _currentResumeEnabled = !!enabled;
}
// v0.40: transient guard set while the QAM is in "capture a palette" mode.
// Suppresses the main resume action so the captured press doesn't ALSO open
// a guide. Not persisted — purely a runtime mute.
let _captureInProgress: boolean = false;
function setCaptureInProgress(active: boolean): void {
  _captureInProgress = !!active;
}

// NOTE: previous versions had a GlobalHotkeyListener React component registered
// via routerHook.addGlobalComponent. That approach failed because Decky only mounts
// global components when the plugin's tab is opened in QAM. v0.35 moved the
// SteamClient.Input registration into definePlugin's factory directly (see bottom
// of file), so the listener registers at plugin frontend load (first time the user
// opens our plugin tab after a Decky restart) and stays alive across QAM open/close.


/**
 * v0.43.18: ongoing background imports, visible from the Home view so the user
 * always knows where a long (60-page) import stands even after leaving the search
 * screen. Polls list_imports every 2s; running jobs show a progress bar, finished
 * ones a tap-to-open (or error) row that clears itself when tapped.
 */
function ActiveImports() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try { const j = await listImports(); if (alive) setJobs(j); } catch {}
    };
    void poll();
    const t = window.setInterval(poll, 2000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  if (!jobs.length) return null;
  const running = jobs.filter((j) => j.state === "running");
  const finished = jobs.filter((j) => j.state !== "running");
  const openGuide = (id: string) => {
    requestFullScreenGuide(id);
    try { Router.CloseSideMenus(); } catch {}
    try { Router.Navigate(FULL_SCREEN_ROUTE); } catch {}
  };
  const clear = (jobId: string) => {
    void dismissImport(jobId).catch(() => {});
    setJobs((js) => js.filter((x) => x.job_id !== jobId));
  };
  return (
    <PanelSection title="Imports en cours">
      {running.map((j) => {
        const pct = j.total > 0 ? Math.min(100, Math.round((100 * j.done) / Math.max(1, j.total))) : 0;
        return (
          <PanelSectionRow key={j.job_id}>
            <div style={{ width: "100%", fontSize: "0.82rem" }}>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⏳ {j.title}</div>
              <div style={{ opacity: 0.8, fontSize: "0.76rem" }}>{j.msg}{j.total > 0 ? ` — ${j.done}/${j.total}` : ""}</div>
              {j.total > 0 ? (
                <div style={{ height: 5, background: "rgba(255,255,255,0.15)", borderRadius: 3, marginTop: 5 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#8be08b", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              ) : null}
            </div>
          </PanelSectionRow>
        );
      })}
      {finished.map((j) => (
        <PanelSectionRow key={j.job_id}>
          <ButtonItem layout="below" onClick={() => { if (j.state === "done" && j.guide_id) openGuide(j.guide_id); clear(j.job_id); }}>
            {j.state === "done"
              ? `✓ ${j.title.slice(0, 30)} — ouvrir (${j.section_count} sect.)`
              : `⚠ ${j.title.slice(0, 24)} : ${(j.error || "échec").slice(0, 26)}`}
          </ButtonItem>
        </PanelSectionRow>
      ))}
    </PanelSection>
  );
}

// ========== Main Content component ==========

function Content() {
  // Core state
  const [activeView, setActiveView] = useState<ViewMode>("home");
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
  // v0.27: free-text search input + multi-site filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Sites the user wants in the result list. Empty = no filter (= "all"). Filters CLIENT-SIDE
  // after the backend returns up to ~12 results across all sites — no extra network calls.
  const [searchSiteFilter, setSearchSiteFilter] = useState<Set<string>>(new Set());
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
  // v0.42.13: filter + sort for the GUIDES view (A+B). Text filter, letter
  // filter, and a 3-way sort so 20-30 guides stay navigable.
  const [guideTextFilter, setGuideTextFilter] = useState<string>("");
  const [guideLetterFilter, setGuideLetterFilter] = useState<string>("");
  const [guideSortMode, setGuideSortMode] = useState<"recent" | "name" | "platform">("recent");

  // Reader preferences
  const [preferences, setPreferences] = useState<ReaderPreferences>({
    theme: "dark", font_family: "sans", line_height: "normal",
    max_width: "normal", highlight_keywords: true, numbered_sections: true,
    resume_hotkey: "", resume_button: -1, resume_enabled: true,
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
  const [backupConfig, setBackupConfigState] = useState<BackupConfig | null>(null);
  // v0.30/v0.31: cycle through predefined hotkey choices + test mode (toast every controller button received)
  const [hotkeyTestMode, setHotkeyTestMode] = useState<boolean>(false);
  // v0.32: remember the last button pressed during test mode so user can bind it without knowing its index
  const [lastTestButton, setLastTestButton] = useState<number | null>(null);
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
  // v0.42.13: apply text + letter filter and sort to the guides list.
  const guideTitleOf = (g: GuideSummary) => (g.game.game_title || g.title || "").trim();
  const filteredGuides = useMemo(() => {
    const needle = guideTextFilter.trim().toLowerCase();
    let list = guides.filter((g) => {
      // Text filter: match title OR game_title OR site
      if (needle) {
        const hay = `${g.title} ${g.game.game_title || ""} ${g.site || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      // Letter filter on the display title's first character
      if (guideLetterFilter) {
        const first = (guideTitleOf(g)[0] || "").toUpperCase();
        if (guideLetterFilter === "#") {
          if (/[A-Z]/.test(first)) return false;  // keep only non-letters
        } else if (first !== guideLetterFilter) {
          return false;
        }
      }
      return true;
    });
    if (guideSortMode === "name") {
      list = list.slice().sort((a, b) => guideTitleOf(a).localeCompare(guideTitleOf(b)));
    } else if (guideSortMode === "platform") {
      list = list.slice().sort((a, b) => {
        const pa = a.game.platform || "zzz", pb = b.game.platform || "zzz";
        return pa.localeCompare(pb) || guideTitleOf(a).localeCompare(guideTitleOf(b));
      });
    } else {
      // recent: most-recently-opened first, then never-opened by name
      list = list.slice().sort((a, b) =>
        (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "")
        || guideTitleOf(a).localeCompare(guideTitleOf(b))
      );
    }
    return list;
  }, [guides, guideTextFilter, guideLetterFilter, guideSortMode]);

  // Letters that actually have at least one guide (for the A-Z cycle).
  const guideAvailableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const g of guides) {
      const first = (guideTitleOf(g)[0] || "").toUpperCase();
      set.add(/[A-Z]/.test(first) ? first : "#");
    }
    return ["", ...Array.from(set).sort()];
  }, [guides]);

  const selectedGuideSummary = filteredGuides[guideIndex] || null;
  // A5: similar-guides suggestions for the currently selected guide
  const similarGuides = useMemo(() => findSimilarGuides(selectedGuideSummary, guides), [selectedGuideSummary, guides]);

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
      // Sync the global controller listener with the loaded user preference
      setCurrentResumeButton(typeof prefs.resume_button === "number" ? prefs.resume_button : -1);
      setCurrentResumeEnabled(prefs.resume_enabled !== false);
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
      // A2: load backup config (non-blocking, separate from loadAll because not all users use it)
      try {
        const cfg = await getBackupConfig();
        setBackupConfigState(cfg);
      } catch { /* silent — backup is optional */ }
    })();
    return () => {
      if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // v0.31 / v0.40: capture mode — listen for the next controller press and remember
  // its raw button index so the user can bind a SPECIFIC palette (L4 vs L5, etc.),
  // not just the LBACK/RBACK group exposed by the preset list. Sets the module-level
  // `_captureInProgress` flag while active so the main resume listener stays muted
  // (otherwise the captured press would ALSO trigger the resume action).
  useEffect(() => {
    if (!hotkeyTestMode) {
      setCaptureInProgress(false);
      return;
    }
    setCaptureInProgress(true);
    const sc: any = (window as any).SteamClient;
    const inputApi: any = sc?.Input;
    if (!inputApi?.RegisterForControllerInputMessages) {
      try { toaster.toast({ title: "Capture KO", body: "SteamClient.Input indisponible", duration: 3500, critical: true }); } catch {}
      setCaptureInProgress(false);
      return;
    }
    let lastToastAt = 0;
    let active = true; // v0.33: guard against unregister failing to free the listener
    const unregisterable = inputApi.RegisterForControllerInputMessages(
      (idx: number, button: number, pressed: boolean) => {
        if (!active) return;
        if (!pressed) return;
        // Remember the last button so user can confirm without typing.
        setLastTestButton(button);
        // Rate-limit toasts so a held paddle doesn't spam
        const now = Date.now();
        if (now - lastToastAt < 350) return;
        lastToastAt = now;
        try {
          toaster.toast({
            title: "Bouton capté",
            body: `#${button} — confirme dans le QAM`,
            duration: 2500,
          });
        } catch {}
        try { console.log("[Offline Soluce] capture button:", { idx, button }); } catch {}
      }
    );
    return () => {
      active = false; // disable callback even if unregister doesn't work
      try { unregisterable?.unregister?.(); } catch {}
      setCaptureInProgress(false);
    };
  }, [hotkeyTestMode]);

  useEffect(() => { if (sourceIndex >= sources.length) setSourceIndex(0); }, [sourceIndex, sources.length]);
  useEffect(() => { if (libraryIndex >= filteredItems.length) setLibraryIndex(0); }, [libraryIndex, filteredItems.length]);
  useEffect(() => { if (guideIndex >= filteredGuides.length) setGuideIndex(0); }, [guideIndex, filteredGuides.length]);

  // v0.43.3: the game-library "search for this game" now opens the full-screen
  // search route directly (FullScreenSearch consumes the query on mount), so no
  // QAM interval is needed. The old QAM "search" view remains for manual use.
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
    // v0.27: free-text query takes priority over library item
    const fallbackQuery = selectedLibraryItem
      ? (selectedLibraryItem.custom_title || selectedLibraryItem.title)
      : "";
    const effectiveQuery = (searchQuery.trim() || fallbackQuery).trim();
    if (!effectiveQuery) {
      setError("Tape un nom de jeu ou choisis un jeu dans la bibliothèque.");
      return;
    }
    const effectivePlatform = selectedLibraryItem?.platform || "Autre";
    setIsBusy(true); setError("");
    try {
      // v0.42.1: respect the selected site picker. When "all", backend does
      // a generic search and filters post-hoc. When specific (e.g. "ign"),
      // backend prepends site:DOMAIN so the engine returns only that site.
      const results = await searchGuides(effectiveQuery, effectivePlatform, selectedSearchSite.value, selectedLanguage.value);
      setSearchResults(results);
      setSearchResultIndex(0);
      if (!results.length) setError("Aucun résultat. Change de langue ou affine le titre, puis relance.");
    } catch (e) {
      setSearchResults([]);
      setError(e instanceof Error ? e.message : "Recherche impossible");
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportSelectedResult = async () => {
    if (!selectedSearchResult) {
      setError("Aucun résultat sélectionné à importer.");
      return;
    }
    return handleImportResultDirect(selectedSearchResult);
  };

  /** v0.27: import a specific search result. Uses the library item info if one is
   * selected; otherwise falls back to the free-text query as game_title.
   *
   * v0.42.6 fix: previously when ANY library item was selected (e.g. "7 Sins"
   * which is alphabetically first in PS2 ROMs), it silently overrode the user's
   * search intent. If the user typed a query AND that query doesn't match the
   * library item's title (case-insensitive substring either direction), respect
   * the user's typed intent: use the query as game_title, NOT the library item.
   */
  const handleImportResultDirect = async (result: GuideSearchResult) => {
    setIsBusy(true); setError("");
    try {
      let importTitle: string;
      let importPlatform: string;
      let importRomHint: string;
      let importAliases: string;
      let importEmulator: string;

      // Determine if the user's typed query reflects intent that overrides
      // the silently-selected library item.
      const query = searchQuery.trim();
      const libTitle = selectedLibraryItem
        ? (selectedLibraryItem.custom_title || selectedLibraryItem.title)
        : "";
      const queryMatchesLib = query && libTitle && (
        query.toLowerCase().includes(libTitle.toLowerCase()) ||
        libTitle.toLowerCase().includes(query.toLowerCase())
      );

      if (selectedLibraryItem && (!query || queryMatchesLib)) {
        // Library item is the intent (no query, or query aligns with it).
        importTitle = libTitle;
        importPlatform = selectedLibraryItem.platform;
        importRomHint = selectedLibraryItem.primary_path || importTitle;
        importAliases = selectedLibraryItem.aliases.join("; ");
        importEmulator = selectedLibraryItem.emulator || "";
      } else {
        // Free-text search import: use the query (or fallback to result title) as game_title.
        importTitle = (query || result.title).slice(0, 120);
        importPlatform = "Autre";
        importRomHint = importTitle;
        importAliases = "";
        importEmulator = "";
      }
      const detail = await saveGuide(
        result.url, importTitle, importPlatform,
        importRomHint, importAliases, importEmulator,
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

  /** v0.27: toggle a site in the multi-site filter */
  const toggleSearchSite = (siteLabel: string) => {
    setSearchSiteFilter((prev) => {
      const next = new Set(prev);
      if (next.has(siteLabel)) next.delete(siteLabel);
      else next.add(siteLabel);
      return next;
    });
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

  const handlePolishAllGuides = async () => {
    setIsBusy(true); setError("");
    setDebugOutput("Nettoyage et reconstruction de tous les guides en cours…");
    try {
      const summary = await polishAllGuides();
      // Reload guide list so the UI shows the freshly polished titles
      try {
        const fresh = await listGuides();
        setGuides(fresh);
        if (selectedGuide) {
          const updated = fresh.find((g) => g.id === selectedGuide.id);
          if (updated) {
            const detail = await getGuide(updated.id);
            setSelectedGuide(detail);
            setSelectedSectionIndex(detail.progress.last_section_index ?? -1);
          }
        }
      } catch {}
      // Build a compact human-readable report for the debugOutput pane
      const lines: string[] = [];
      lines.push(
        `Traités: ${summary.guides_processed} guides — ` +
        `${summary.total_chars_removed.toLocaleString()} chars retirés, ` +
        `${summary.total_titles_changed} titres modifiés`,
      );
      lines.push("");
      for (const g of summary.per_guide) {
        if (g.error) {
          lines.push(`❌ ${g.title || g.guide_id} — ${g.error}`);
          continue;
        }
        const cr = g.chars_removed ?? 0;
        const tc = g.titles_changed ?? 0;
        const sd = g.section_delta ?? 0;
        const flag = (cr > 0 || tc > 0 || sd !== 0) ? "✓" : "·";
        lines.push(
          `${flag} ${(g.title || g.guide_id).slice(0, 35).padEnd(35)} ` +
          `[${(g.site || "?").padEnd(20)}] ` +
          `chars ${(g.before_chars || 0)}→${(g.after_chars || 0)} (-${cr.toLocaleString()}), ` +
          `sect ${(g.before_sections || 0)}→${(g.after_sections || 0)}, ` +
          `titles_changed=${tc}`,
        );
      }
      setDebugOutput(lines.join("\n"));
      try {
        toaster.toast({
          title: "Nettoyage terminé",
          body: `${summary.guides_processed} guides traités, ${summary.total_titles_changed} titres modifiés, ${summary.total_chars_removed.toLocaleString()} chars retirés`,
          duration: 5000,
        });
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nettoyage en lot impossible");
      setDebugOutput("");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCleanExistingGuide = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    const beforeChars = selectedGuide.content?.length ?? 0;
    const beforeSecs = selectedGuide.sections?.length ?? 0;
    setDebugOutput("Nettoyage du contenu…");
    try {
      const updated = await cleanExistingGuide(selectedGuide.id);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
      const afterChars = updated.content?.length ?? 0;
      const afterSecs = updated.sections?.length ?? 0;
      const charsRemoved = beforeChars - afterChars;
      const secsRemoved = beforeSecs - afterSecs;
      const pctRaw = beforeChars ? (100 * charsRemoved) / beforeChars : 0;
      // v0.41.2: GameFAQs strips ~500 chars (UI header) on a 500k-char guide =
      // 0.1%, which Math.round → 0% and confused the user. Show absolute count
      // when the percentage is small, and 2 decimals between 0 and 1%.
      const pctDisplay =
        pctRaw === 0
          ? "0%"
          : pctRaw < 1
            ? `${pctRaw.toFixed(2)}%`
            : pctRaw < 10
              ? `${pctRaw.toFixed(1)}%`
              : `${Math.round(pctRaw)}%`;
      setDebugOutput(
        `Nettoyé : ${beforeChars}→${afterChars} chars ` +
        `(−${charsRemoved.toLocaleString()} = ${pctDisplay}), ` +
        `${beforeSecs}→${afterSecs} sections.`,
      );
      let body: string;
      if (charsRemoved > 0) {
        body = `${charsRemoved.toLocaleString()} caractères retirés (${pctDisplay})`;
        if (secsRemoved > 0) body += `, ${secsRemoved} sections fusionnées`;
        else if (secsRemoved < 0) body += `, ${-secsRemoved} sections ajoutées`;
      } else if (charsRemoved === 0 && secsRemoved !== 0) {
        body = `Contenu déjà propre — ${beforeSecs}→${afterSecs} sections recalculées`;
      } else {
        body = `Aucun changement (déjà propre)`;
      }
      try {
        toaster.toast({ title: "Guide nettoyé", body, duration: 3500 });
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nettoyage impossible");
      setDebugOutput("");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReloadGuideContent = async () => {
    if (!selectedGuide) return;
    setIsBusy(true); setError("");
    setDebugOutput("Re-téléchargement en cours…");
    try {
      const updated = await reloadGuideContent(selectedGuide.id);
      setSelectedGuide(updated);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
      setDebugOutput(`Re-téléchargement OK : ${updated.page_count} page(s), ${updated.section_count} section(s) — méthode ${updated.detection_method || "?"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-téléchargement impossible (ancien contenu conservé)");
      setDebugOutput("");
    } finally {
      setIsBusy(false);
    }
  };

  // v0.42.12: re-download the CURRENTLY SELECTED summary without needing to
  // open the guide first. Wired to a button in the top guide-selection panel
  // so re-download is one click away (the "Lecture offline" button is buried
  // far down and only appears after opening the guide).
  const handleReloadSelectedSummary = async () => {
    if (!selectedGuideSummary) return;
    setIsBusy(true); setError("");
    setDebugOutput(`Re-téléchargement de « ${selectedGuideSummary.title.slice(0, 40)} »…`);
    try {
      const updated = await reloadGuideContent(selectedGuideSummary.id);
      setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
      // If this guide is also the one currently opened, refresh its detail too.
      if (selectedGuide && selectedGuide.id === updated.id) {
        setSelectedGuide(updated);
        setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
      }
      setDebugOutput(`Re-téléchargement OK : ${updated.page_count} page(s), ${updated.section_count} section(s) — méthode ${updated.detection_method || "?"}`);
      try { toaster.toast({ title: "Re-téléchargé", body: `${updated.page_count} page(s), ${updated.section_count} section(s)`, duration: 3000 }); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-téléchargement impossible (ancien contenu conservé)");
      setDebugOutput("");
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
    // Sync the global controller listener immediately (no wait for backend round-trip)
    setCurrentResumeButton(typeof next.resume_button === "number" ? next.resume_button : -1);
    setCurrentResumeEnabled(next.resume_enabled !== false);
    try {
      await updateReaderPreferences(
        next.theme, next.font_family, next.line_height, next.max_width,
        next.highlight_keywords, next.numbered_sections, next.resume_hotkey || "",
        typeof next.resume_button === "number" ? next.resume_button : -1,
        next.resume_enabled !== false,
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

  const handleReloadAllGuides = async () => {
    if (!guides.length) {
      setError("Aucun guide à re-télécharger.");
      return;
    }
    setIsBusy(true);
    setError("");
    const total = guides.length;
    let ok = 0;
    let failed = 0;
    const errors: string[] = [];
    // Snapshot the list (loadAll() at the end will refresh state, but we iterate over a stable copy)
    const snapshot = guides.slice();
    for (let i = 0; i < snapshot.length; i++) {
      const g = snapshot[i];
      setDebugOutput(`Re-téléchargement ${i + 1}/${total}: ${g.title} (${g.site}) …`);
      try {
        await reloadGuideContent(g.id);
        ok++;
      } catch (e: any) {
        failed++;
        errors.push(`• ${g.title}: ${e?.message || String(e)}`);
      }
    }
    try { await loadAll(); } catch {}
    const summary = `Terminé : ${ok} OK / ${failed} échec(s) sur ${total} guide(s).`;
    setDebugOutput(failed > 0 ? `${summary}\n\nÉchecs :\n${errors.join("\n")}` : summary);
    setIsBusy(false);
  };

  // A2 auto-backup handlers
  const handleToggleBackupEnabled = async () => {
    if (!backupConfig) return;
    try {
      const next = await setBackupConfig(!backupConfig.enabled, backupConfig.interval_days);
      setBackupConfigState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle backup impossible");
    }
  };
  const handleCycleBackupInterval = async () => {
    if (!backupConfig) return;
    const i = BACKUP_INTERVAL_CHOICES.indexOf(backupConfig.interval_days);
    const next_i = i < 0 ? 0 : (i + 1) % BACKUP_INTERVAL_CHOICES.length;
    try {
      const next = await setBackupConfig(backupConfig.enabled, BACKUP_INTERVAL_CHOICES[next_i]);
      setBackupConfigState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Changement intervalle impossible");
    }
  };
  const handleRunBackupNow = async () => {
    setIsBusy(true); setError("");
    setDebugOutput("Backup en cours…");
    try {
      const result = await runBackupNow();
      setBackupConfigState(result.config);
      setDebugOutput(`Backup OK : ${result.path}\n${result.guide_count} guides, ${bytesToKo(result.size_bytes)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup manuel impossible");
      setDebugOutput("");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReconstructAllSections = async () => {
    if (!guides.length) {
      setError("Aucun guide à reconstruire.");
      return;
    }
    setIsBusy(true);
    setError("");
    const total = guides.length;
    let ok = 0;
    let failed = 0;
    const errors: string[] = [];
    const snapshot = guides.slice();
    for (let i = 0; i < snapshot.length; i++) {
      const g = snapshot[i];
      setDebugOutput(`Reconstruction sommaire ${i + 1}/${total}: ${g.title} …`);
      try {
        await reconstructSections(g.id);
        ok++;
      } catch (e: any) {
        failed++;
        errors.push(`• ${g.title}: ${e?.message || String(e)}`);
      }
    }
    try { await loadAll(); } catch {}
    const summary = `Reconstruction terminée : ${ok} OK / ${failed} échec(s) sur ${total} guide(s). Aucun re-téléchargement réseau, juste re-segmentation locale.`;
    setDebugOutput(failed > 0 ? `${summary}\n\nÉchecs :\n${errors.join("\n")}` : summary);
    setIsBusy(false);
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

  // v0.43.0: navigation is now launcher-based. The home view IS the nav (direct
  // buttons, no cycling). Non-home views get a simple "← Accueil" back button.
  const renderModeHeader = () => {
    if (activeView === "home") return null;
    return (
      <PanelSection title={VIEW_LABELS[activeView] || activeView}>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setActiveView("home")}>
            ← Accueil
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  };

  // v0.43.0: the launcher — quick access to the most-used actions instead of
  // cycling through 4 dense views. Reprendre / Bibliothèque plein écran /
  // Rechercher / Récents / Réglages.
  const renderHomeView = () => {
    const recents = [...guides]
      .filter((g) => g.progress?.last_opened_at)
      .sort((a, b) => (b.progress.last_opened_at || "").localeCompare(a.progress.last_opened_at || ""))
      .slice(0, 5);
    return (
      <>
        <ActiveImports />
        <PanelSection title="Offline Soluce">
          {lastOpenedGuide ? (
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => {
                requestFullScreenGuide(lastOpenedGuide.id);
                try { Router.CloseSideMenus(); } catch {}
                Router.Navigate(FULL_SCREEN_ROUTE);
              }}>
                ▶ Reprendre : {(lastOpenedGuide.game.game_title || lastOpenedGuide.title).slice(0, 30)}
              </ButtonItem>
            </PanelSectionRow>
          ) : null}
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !guides.length} onClick={() => {
              try { Router.CloseSideMenus(); } catch {}
              Router.Navigate(LIBRARY_ROUTE);
            }}>
              📚 Bibliothèque plein écran ({guides.length})
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => {
              try { Router.CloseSideMenus(); } catch {}
              Router.Navigate(GAME_LIBRARY_ROUTE);
            }}>
              🎮 Mes jeux installés (plein écran)
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => {
              try { Router.CloseSideMenus(); } catch {}
              Router.Navigate(SEARCH_ROUTE);
            }}>
              🔍 Rechercher un guide (plein écran)
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>

        {recents.length > 0 ? (
          <PanelSection title="Récents">
            {recents.map((g) => (
              <PanelSectionRow key={g.id}>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => {
                  requestFullScreenGuide(g.id);
                  try { Router.CloseSideMenus(); } catch {}
                  Router.Navigate(FULL_SCREEN_ROUTE);
                }}>
                  {(g.game.game_title || g.title).slice(0, 34)}
                </ButtonItem>
              </PanelSectionRow>
            ))}
          </PanelSection>
        ) : null}

        <PanelSection title=" ">
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => setActiveView("guides")}>
              🗂️ Gérer les guides (QAM)
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => setActiveView("sources")}>
              ⚙️ Réglages · sources · sauvegarde
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  };

  const renderSourcesView = () => (
    <>
      <PanelSection title="Bibliothèque de jeux (scan ROMs)">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={() => setActiveView("library")}>
            🎮 Parcourir mes jeux installés
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

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

      <PanelSection title="Bouton manette pour reprise">
        {preferences ? (() => {
          const currentValue = typeof preferences.resume_button === "number" ? preferences.resume_button : -1;
          const presetMatch = RESUME_BUTTON_CHOICES.find((c) => c.value === currentValue);
          const currentLabel = presetMatch?.label || `Bouton custom #${currentValue}`;
          const enabled = preferences.resume_enabled !== false;
          const cycle = (dir: 1 | -1) => {
            const n = RESUME_BUTTON_CHOICES.length;
            // Start cycling from the current preset if any; else from index 0.
            const currentIdx = presetMatch
              ? RESUME_BUTTON_CHOICES.findIndex((c) => c.value === currentValue)
              : 0;
            const nextIdx = (currentIdx + dir + n) % n;
            void savePrefs({ ...preferences, resume_button: RESUME_BUTTON_CHOICES[nextIdx].value });
          };
          return (
            <>
              <PanelSectionRow>
                <div style={boxStyle}>
                  <div>
                    <strong>État :</strong>{" "}
                    <span style={{ color: enabled ? "#7ee787" : "#ff8080" }}>
                      {enabled ? "✅ Activé" : "⛔ Désactivé"}
                    </span>
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <strong>Bouton :</strong> {currentLabel}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.75, marginTop: "6px" }}>
                    Lecture directe de la manette (SteamClient.Input). Hors-jeu ou en jeu, la pression ouvre le dernier guide / le guide du jeu en cours.
                  </div>
                </div>
              </PanelSectionRow>
              <PanelSectionRow>
                <ToggleField
                  label={enabled ? "Reprise par palette activée" : "Reprise par palette désactivée"}
                  description="Désactive temporairement quand tu veux garder ta palette libre pour le jeu."
                  checked={enabled}
                  onChange={(val: boolean) => {
                    void savePrefs({ ...preferences, resume_enabled: !!val });
                  }}
                />
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem
                  layout="below"
                  disabled={!enabled || hotkeyTestMode}
                  onClick={() => { setLastTestButton(null); setHotkeyTestMode(true); }}
                >
                  🎯 Capturer une palette précise
                </ButtonItem>
              </PanelSectionRow>
              {hotkeyTestMode ? (
                <>
                  <PanelSectionRow>
                    <div style={{ fontSize: "0.78rem", padding: "4px 6px", color: "#ffd966" }}>
                      <strong>Presse maintenant la palette voulue</strong> (L4, L5, R4, R5, ou tout autre bouton non utilisé par les jeux). Le bouton sera mémorisé automatiquement.
                    </div>
                  </PanelSectionRow>
                  {lastTestButton !== null ? (
                    <PanelSectionRow>
                      <ButtonItem
                        layout="below"
                        onClick={() => {
                          if (!preferences) return;
                          void savePrefs({ ...preferences, resume_button: lastTestButton });
                          setHotkeyTestMode(false);
                          try { toaster.toast({ title: "Offline Soluce", body: `Bouton #${lastTestButton} enregistré`, duration: 2200 }); } catch {}
                        }}
                      >
                        ✅ Confirmer : utiliser le bouton #{lastTestButton}
                      </ButtonItem>
                    </PanelSectionRow>
                  ) : (
                    <PanelSectionRow>
                      <div style={{ fontSize: "0.7rem", opacity: 0.7, padding: "2px 6px" }}>
                        En attente d'une pression…
                      </div>
                    </PanelSectionRow>
                  )}
                  <PanelSectionRow>
                    <ButtonItem layout="below" onClick={() => { setHotkeyTestMode(false); setLastTestButton(null); }}>
                      ✋ Annuler la capture
                    </ButtonItem>
                  </PanelSectionRow>
                </>
              ) : (
                <>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={!enabled} onClick={() => cycle(1)}>
                      → Preset suivant
                    </ButtonItem>
                  </PanelSectionRow>
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={!enabled} onClick={() => cycle(-1)}>
                      ← Preset précédent
                    </ButtonItem>
                  </PanelSectionRow>
                </>
              )}
            </>
          );
        })() : (
          <PanelSectionRow>
            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Chargement préférences…</div>
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Auto-backup">
        {backupConfig ? (
          <>
            <PanelSectionRow>
              <div style={boxStyle}>
                <div><strong>État :</strong> {backupConfig.enabled ? "✅ activé" : "❌ désactivé"}</div>
                <div><strong>Intervalle :</strong> tous les {backupConfig.interval_days} jour(s)</div>
                <div><strong>Dernier :</strong> {backupConfig.last_backup_at ? formatDate(backupConfig.last_backup_at) : "Jamais"}</div>
                {backupConfig.last_backup_size_bytes > 0 ? (
                  <div style={{ fontSize: "0.72rem", opacity: 0.78 }}>
                    {bytesToKo(backupConfig.last_backup_size_bytes)} — {backupConfig.last_backup_path}
                  </div>
                ) : null}
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleToggleBackupEnabled()}>
                {backupConfig.enabled ? "Désactiver" : "Activer"} l'auto-backup
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleCycleBackupInterval()}>
                Intervalle: {backupConfig.interval_days}j → suivant ({BACKUP_INTERVAL_CHOICES.join("/")})
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy || !guides.length} onClick={() => void handleRunBackupNow()}>
                💾 Sauver maintenant
              </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
              <div style={{ fontSize: "0.7rem", opacity: 0.65, padding: "4px 6px" }}>
                Vérification 30s après chaque démarrage de Decky. Export vers ~/Documents/OfflineSoluce/exports/
              </div>
            </PanelSectionRow>
          </>
        ) : (
          <PanelSectionRow>
            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Chargement config…</div>
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Maintenance">
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || !guides.length} onClick={() => void handleReloadAllGuides()}>
            🔄 Re-télécharger TOUS les guides ({guides.length})
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ fontSize: "0.72rem", opacity: 0.7, padding: "4px 6px" }}>
            Refait passer chaque guide par le crawler à jour (multi-page, nouvelles stratégies de découpage). Réseau + lent. Garde tes marque-pages/notes/progression.
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy || !guides.length} onClick={() => void handleReconstructAllSections()}>
            🔧 Reconstruire le sommaire de TOUS ({guides.length})
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ fontSize: "0.72rem", opacity: 0.7, padding: "4px 6px" }}>
            Re-segmente tous les guides avec la dernière logique (split-large-sections, banners, TOC). Pas de réseau, rapide. Utile après un update plugin sans changement de contenu.
          </div>
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
          <ButtonItem layout="below" disabled={isBusy} onClick={() => void handlePolishAllGuides()}>
            {isBusy ? "Nettoyage en cours…" : "🧹 Nettoyer + reconstruire TOUS les guides"}
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

  const renderSearchView = () => {
    // Compute distinct sites present in current results (for the multi-site filter chips)
    const sitesInResults = Array.from(new Set(searchResults.map((r) => r.site).filter(Boolean)));
    // Apply client-side multi-site filter (empty = no filter)
    const filteredResults = searchSiteFilter.size === 0
      ? searchResults
      : searchResults.filter((r) => searchSiteFilter.has(r.site));
    const queryInputStyle: React.CSSProperties = {
      width: "100%",
      padding: "8px 10px",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.18)",
      background: "rgba(0,0,0,0.4)",
      color: "inherit",
      fontSize: "0.92rem",
      boxSizing: "border-box",
    };
    return (
      <>
        <PanelSection title="Recherche">
          <PanelSectionRow>
            {/* v0.36 critical fix: TextField (Decky native) au lieu d'input HTML.
               Au focus, le clavier virtuel Steam s'ouvre proprement; l'input HTML
               brut fermait le QAM sur le Deck → impossible de saisir. */}
            <TextField
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              placeholder={selectedLibraryItem
                ? `Cherche autre que « ${selectedLibraryItem.title.slice(0, 35)} »…`
                : "Tape le nom du jeu (ex: Suikoden V)…"}
              label="Recherche"
              bShowClearAction
            />
          </PanelSectionRow>
          {selectedLibraryItem ? (
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => setSearchQuery(selectedLibraryItem.custom_title || selectedLibraryItem.title)}>
                ↘ Remplir avec « {(selectedLibraryItem.custom_title || selectedLibraryItem.title).slice(0, 40)} »
              </ButtonItem>
            </PanelSectionRow>
          ) : null}
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => setLanguageIndex((v) => cycleIndex(v, LANGUAGE_CHOICES.length, 1))}>
              Langue : {selectedLanguage.label} (cycle)
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            {/* v0.42.1: cycle de site cible. Quand != "Tous", la backend prefixe
                site:DOMAIN à la query, ce qui force le moteur à ne retourner que
                les URLs de ce site (utile pour IGN/Neoseeker qui sont
                systématiquement déclassés dans les résultats génériques). */}
            <ButtonItem layout="below" disabled={isBusy} onClick={() => setSearchSiteIndex((v) => cycleIndex(v, SEARCH_SITE_CHOICES.length, 1))}>
              Site cible : {selectedSearchSite.label} (cycle)
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleSearch()}>
              {isBusy ? "Recherche en cours…" : "🔍 Lancer la recherche"}
            </ButtonItem>
          </PanelSectionRow>
          {searchQuery ? (
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => setSearchQuery("")}>
                Effacer le texte
              </ButtonItem>
            </PanelSectionRow>
          ) : null}
        </PanelSection>

        {searchResults.length > 0 ? (
          <PanelSection title={`Résultats (${filteredResults.length}${searchSiteFilter.size > 0 ? ` / ${searchResults.length}` : ""})`}>
            {sitesInResults.length > 1 ? (
              <>
                <PanelSectionRow>
                  <div style={{ fontSize: "0.72rem", opacity: 0.75, padding: "2px 6px" }}>
                    Filtre par site (clic = toggle) :
                  </div>
                </PanelSectionRow>
                {sitesInResults.map((siteLabel) => {
                  const active = searchSiteFilter.has(siteLabel);
                  const count = searchResults.filter((r) => r.site === siteLabel).length;
                  return (
                    <PanelSectionRow key={siteLabel}>
                      <ButtonItem layout="below" disabled={isBusy} onClick={() => toggleSearchSite(siteLabel)}>
                        {active ? "☑" : "☐"} {siteLabel} ({count})
                      </ButtonItem>
                    </PanelSectionRow>
                  );
                })}
                {searchSiteFilter.size > 0 ? (
                  <PanelSectionRow>
                    <ButtonItem layout="below" disabled={isBusy} onClick={() => setSearchSiteFilter(new Set())}>
                      Tout afficher (vide le filtre)
                    </ButtonItem>
                  </PanelSectionRow>
                ) : null}
              </>
            ) : null}

            {filteredResults.map((result, idx) => (
              <div key={result.url + idx}>
                <PanelSectionRow>
                  <div style={{ ...boxStyle, padding: "8px 10px" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: "0.86rem" }}>{result.title}</div>
                    <div style={{ marginBottom: "4px" }}>
                      <span style={pillStyle}>{result.site}</span>
                      <span style={pillStyle}>Score {result.score}</span>
                    </div>
                    {result.snippet ? (
                      <div style={{ fontSize: "0.72rem", opacity: 0.85, lineHeight: 1.3 }}>
                        {result.snippet.length > 180 ? result.snippet.slice(0, 178) + "…" : result.snippet}
                      </div>
                    ) : null}
                  </div>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleImportResultDirect(result)}>
                    💾 Importer offline
                  </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" disabled={isBusy} onClick={() => void openUrlExternal(result.url)}>
                    🌐 Ouvrir dans le navigateur
                  </ButtonItem>
                </PanelSectionRow>
              </div>
            ))}
            {filteredResults.length === 0 && searchSiteFilter.size > 0 ? (
              <PanelSectionRow>
                <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "8px 6px", textAlign: "center" }}>
                  Aucun résultat ne correspond aux sites filtrés.
                </div>
              </PanelSectionRow>
            ) : null}
          </PanelSection>
        ) : null}
      </>
    );
  };

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

    // v0.42.13: filter + sort controls for the guides list.
    const gLetterIdx = guideAvailableLetters.indexOf(guideLetterFilter) >= 0
      ? guideAvailableLetters.indexOf(guideLetterFilter) : 0;
    const gLetterLabel = (l: string) => l === "" ? "Toutes" : l === "#" ? "Chiffres / symboles" : l;
    const sortLabel = guideSortMode === "recent" ? "Récemment ouvert"
      : guideSortMode === "name" ? "Nom (A→Z)" : "Plateforme";
    const anyFilter = !!(guideTextFilter.trim() || guideLetterFilter);

    return (
      <>
        {!expandedReader ? (
        <PanelSection title={`Filtrer (${filteredGuides.length}/${guides.length})`}>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !guides.length} onClick={() => {
              try { Router.CloseSideMenus(); } catch {}
              Router.Navigate(LIBRARY_ROUTE);
            }}>
              📚 Bibliothèque plein écran ({guides.length})
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              value={guideTextFilter}
              onChange={(e: any) => { setGuideTextFilter(e.target.value); setGuideIndex(0); }}
              placeholder="Filtrer par titre / jeu / site…"
              label="Filtre texte"
              bShowClearAction
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={() => setGuideSortMode((m) => m === "recent" ? "name" : m === "name" ? "platform" : "recent")}>
              Tri : {sortLabel} (cycle)
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || guideAvailableLetters.length <= 1}
              onClick={() => { setGuideLetterFilter(guideAvailableLetters[cycleIndex(gLetterIdx, guideAvailableLetters.length, 1)]); setGuideIndex(0); }}>
              Initiale : {gLetterLabel(guideLetterFilter)} ▶
            </ButtonItem>
          </PanelSectionRow>
          {anyFilter ? (
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={() => { setGuideTextFilter(""); setGuideLetterFilter(""); setGuideIndex(0); }}>
                ✕ Effacer les filtres
              </ButtonItem>
            </PanelSectionRow>
          ) : null}
        </PanelSection>
        ) : null}

        {!expandedReader ? (
        <PanelSection title={selectedGuideSummary ? `Guide ${guideIndex + 1}/${filteredGuides.length}` : "Guides importés"}>
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
            <ButtonItem layout="below" disabled={isBusy || filteredGuides.length <= 1} onClick={() => setGuideIndex((v) => cycleIndex(v, filteredGuides.length, -1))}>◀ Guide précédent</ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || filteredGuides.length <= 1} onClick={() => setGuideIndex((v) => cycleIndex(v, filteredGuides.length, 1))}>Guide suivant ▶</ButtonItem>
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
            <ButtonItem layout="below" disabled={isBusy || !selectedGuideSummary || !selectedGuideSummary.url} onClick={() => void handleReloadSelectedSummary()}>
              🔄 Re-télécharger ce guide
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || !selectedGuideSummary} onClick={() => void handleDeleteSelectedGuide()}>
              Supprimer ce guide
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
        ) : null}

        {!expandedReader && selectedGuideSummary && similarGuides.length > 0 ? (
          <PanelSection title={`Guides similaires (${similarGuides.length})`}>
            <PanelSectionRow>
              <div style={{ fontSize: "0.72rem", opacity: 0.7, padding: "2px 6px 6px" }}>
                Basé sur titre / plateforme / site.
              </div>
            </PanelSectionRow>
            {similarGuides.map((sg) => (
              <PanelSectionRow key={sg.id}>
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void openGuideById(sg.id)}>
                  → {sg.title} {sg.site ? `(${sg.site})` : ""}
                </ButtonItem>
              </PanelSectionRow>
            ))}
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
                <ButtonItem layout="below" disabled={isBusy} onClick={() => void handleCleanExistingGuide()}>
                  🧹 Nettoyer le contenu (menu, footer, parasites)
                </ButtonItem>
              </PanelSectionRow>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy || !selectedGuide.url} onClick={() => void handleReloadGuideContent()}>
                  🔄 Re-télécharger le contenu (multi-page si dispo)
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
      {activeView === "home" ? renderHomeView() : null}
      {activeView === "sources" ? renderSourcesView() : null}
      {activeView === "library" ? renderLibraryView() : null}
      {activeView === "search" ? renderSearchView() : null}
      {activeView === "guides" ? renderGuidesView() : null}
    </div>
  );
}

export default definePlugin(() => {
  routerHook.addRoute(FULL_SCREEN_ROUTE, FullScreenReader, { exact: true });
  routerHook.addRoute(LIBRARY_ROUTE, FullScreenLibrary, { exact: true });  // v0.42.17
  routerHook.addRoute(GAME_LIBRARY_ROUTE, FullScreenGameLibrary, { exact: true });  // v0.43.1
  routerHook.addRoute(SEARCH_ROUTE, FullScreenSearch, { exact: true });  // v0.43.3

  // v0.35 fix: register the controller listener AT PLUGIN LOAD (in the factory),
  // not inside a React component via addGlobalComponent. Previously addGlobalComponent
  // would only run when the global component actually mounted, which depended on
  // the QAM being open. Now the listener stays alive regardless of QAM state.
  let listenerActive = true;
  let listenerHandle: any = null;
  const setupListener = async () => {
    try {
      const prefs = await getReaderPreferences();
      setCurrentResumeButton(typeof prefs.resume_button === "number" ? prefs.resume_button : -1);
      setCurrentResumeEnabled(prefs.resume_enabled !== false);
      try { console.log("[Offline Soluce] resume button at startup:", _currentResumeButton === -1 ? "(defaults LBACK/RBACK)" : _currentResumeButton, "enabled:", _currentResumeEnabled); } catch {}
    } catch {}
    const sc: any = (window as any).SteamClient;
    const inputApi: any = sc?.Input;
    if (!inputApi?.RegisterForControllerInputMessages) {
      try { console.warn("[Offline Soluce] SteamClient.Input.RegisterForControllerInputMessages unavailable"); } catch {}
      return;
    }
    try { console.log("[Offline Soluce] controller listener installed at plugin load"); } catch {}
    listenerHandle = inputApi.RegisterForControllerInputMessages(
      (_idx: number, gamepadButton: number, isButtonPressed: boolean) => {
        if (!listenerActive) return;
        if (!isButtonPressed) return;
        if (!_currentResumeEnabled) return;
        // v0.40: don't trigger the resume action while the user is capturing
        // a button via the settings UI — otherwise the captured press would
        // also open a guide.
        if (_captureInProgress) return;
        const wanted = _currentResumeButton;
        const matches = wanted === -1
          ? RESUME_BUTTON_DEFAULTS.has(gamepadButton)
          : gamepadButton === wanted;
        if (!matches) return;
        void (async () => {
          try {
            const guides = await listGuides();
            if (!guides.length) {
              try { toaster.toast({ title: "Offline Soluce", body: "Aucun guide importé.", duration: 2500 }); } catch {}
              return;
            }

            // A3: try to match the currently running Steam app first
            let target: GuideSummary | null = null;
            let matchedByGame = false;
            try {
              const runningApp: any = (Router as any).MainRunningApp;
              const displayName = runningApp?.display_name || "";
              if (displayName) {
                const matched = findGuideForRunningApp(guides, displayName);
                if (matched) {
                  target = matched;
                  matchedByGame = true;
                  try { console.log("[Offline Soluce] matched running app:", displayName, "→", matched.title); } catch {}
                }
              }
            } catch (e) {
              try { console.warn("[Offline Soluce] running-app match failed:", e); } catch {}
            }

            // A3 ES-DE: if no Steam match, scan emulator processes (PCSX2, RetroArch, etc.)
            // for the loaded ROM — covers games launched via EmulationStation DE.
            if (!target) {
              try {
                const hint = await getRunningEmulatorGameHint();
                if (hint?.hint) {
                  const matched = findGuideForRunningApp(guides, hint.hint);
                  if (matched) {
                    target = matched;
                    matchedByGame = true;
                    try { console.log(`[Offline Soluce] matched emulator (${hint.emulator}) ROM "${hint.hint}" → ${matched.title}`); } catch {}
                  } else {
                    try { console.log(`[Offline Soluce] emulator hint "${hint.hint}" had no matching guide`); } catch {}
                  }
                }
              } catch (e) {
                try { console.warn("[Offline Soluce] emulator hint failed:", e); } catch {}
              }
            }

            // Fallback: most-recently-opened guide
            if (!target) {
              const sorted = [...guides].sort((a, b) =>
                (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "")
              );
              target = sorted[0];
            }
            if (!target?.id) {
              try { toaster.toast({ title: "Offline Soluce", body: "Pas de guide récent.", duration: 2500 }); } catch {}
              return;
            }

            // Toast tells the user WHICH path matched — useful when game match vs fallback
            try {
              toaster.toast({
                title: matchedByGame ? "Guide du jeu en cours" : "Dernier guide ouvert",
                body: target.title,
                duration: 2000,
              });
            } catch {}

            requestFullScreenGuide(target.id);
            try { Router.CloseSideMenus(); } catch {}
            Router.Navigate(FULL_SCREEN_ROUTE);
          } catch (err: any) {
            try { toaster.toast({ title: "Offline Soluce", body: `Erreur reprise: ${err?.message || err}`, duration: 4000, critical: true }); } catch {}
          }
        })();
      }
    );
  };
  void setupListener();

  return {
    title: <div className="title">Offline Soluce</div>,
    content: <Content />,
    icon: <FaBookOpen />,
    onDismount() {
      listenerActive = false;
      try { listenerHandle?.unregister?.(); } catch {}
      routerHook.removeRoute(FULL_SCREEN_ROUTE);
      try { routerHook.removeRoute(LIBRARY_ROUTE); } catch {}
      try { routerHook.removeRoute(GAME_LIBRARY_ROUTE); } catch {}
      try { routerHook.removeRoute(SEARCH_ROUTE); } catch {}
    },
  };
});
