const manifest = {"name":"Offline Soluce"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const routerHook = api.routerHook;
const toaster = api.toaster;

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaBookOpen (props) {
  return GenIcon({"attr":{"viewBox":"0 0 576 512"},"child":[{"tag":"path","attr":{"d":"M542.22 32.05c-54.8 3.11-163.72 14.43-230.96 55.59-4.64 2.84-7.27 7.89-7.27 13.17v363.87c0 11.55 12.63 18.85 23.28 13.49 69.18-34.82 169.23-44.32 218.7-46.92 16.89-.89 30.02-14.43 30.02-30.66V62.75c.01-17.71-15.35-31.74-33.77-30.7zM264.73 87.64C197.5 46.48 88.58 35.17 33.78 32.05 15.36 31.01 0 45.04 0 62.75V400.6c0 16.24 13.13 29.78 30.02 30.66 49.49 2.6 149.59 12.11 218.77 46.95 10.62 5.35 23.21-1.94 23.21-13.46V100.63c0-5.29-2.62-10.14-7.27-12.99z"},"child":[]}]})(props);
}

/** v0.33: robust back navigation. Router.NavigateBack doesn't exist on every
 * Steam UI build. Try Navigation.NavigateBack first (the documented API),
 * then Router.NavigateBack, then window.history.back() as last resort. */
function safeNavigateBack() {
    try {
        const nav = DFL.Navigation;
        if (nav?.NavigateBack) {
            nav.NavigateBack();
            return true;
        }
    }
    catch { }
    try {
        const rt = DFL.Router;
        if (rt?.NavigateBack) {
            rt.NavigateBack();
            return true;
        }
    }
    catch { }
    try {
        window.history.back();
        return true;
    }
    catch { }
    return false;
}
// Module-level handoff for the full-screen reader.
// QAM sets the target guide id, then navigates to the route; FullScreenReader
// reads (and clears) it on mount. Avoids URL params + global state libs.
let pendingFullScreenGuideId = null;
function requestFullScreenGuide(guideId) {
    pendingFullScreenGuideId = guideId;
}
function consumeFullScreenGuideId() {
    const id = pendingFullScreenGuideId;
    pendingFullScreenGuideId = null;
    return id;
}
// v0.43.2: handoff for "search guides for this game" — the full-screen game
// library requests a search; the QAM Content picks it up and opens the search
// view pre-filled. (The QAM is always mounted, just not visible during full-screen.)
let pendingSearchQuery = null;
function requestSearch(q) { pendingSearchQuery = q; }
function consumeSearch() {
    const q = pendingSearchQuery;
    pendingSearchQuery = null;
    return q;
}
const FULL_SCREEN_ROUTE = "/decky-offline-soluce/reader";
const LIBRARY_ROUTE = "/decky-offline-soluce/library"; // v0.42.17: full-screen guide browser (Levier D)
const GAME_LIBRARY_ROUTE = "/decky-offline-soluce/games"; // v0.43.1: full-screen installed-games browser
const SEARCH_ROUTE = "/decky-offline-soluce/search"; // v0.43.3: full-screen search + import
const SEARCH_PAGE_SIZE = 8; // v0.43.12: initial results shown; "charger plus" reveals +8
// Steam Big Picture overlays at top (status / battery / time ~40px) and bottom (back
// hint / system shortcuts ~40px). Pad full-screen routes so our header & footer
// aren't covered. Tuned for SteamOS 3.8.x — bump if Steam changes the chrome height.
const STEAM_UI_TOP_BAR_PX = 40;
const STEAM_UI_BOTTOM_BAR_PX = 40;
// ========== Backend callables ==========
const listGuides = callable("list_guides");
const getGuide = callable("get_guide");
const searchGuides = callable("search_guides");
const saveGuide = callable("save_guide");
const startImport = callable("start_import");
const getImportStatus = callable("get_import_status");
const listImports = callable("list_imports");
const dismissImport = callable("dismiss_import");
const deleteGuide = callable("delete_guide");
const findJunkGuides = callable("find_junk_guides");
const saveProgress = callable("save_progress");
const setBookmark = callable("set_bookmark");
const clearBookmark = callable("clear_bookmark");
const clearProgress = callable("clear_progress");
const addNamedBookmark = callable("add_named_bookmark");
const deleteNamedBookmark = callable("delete_named_bookmark");
const setSectionNote = callable("set_section_note");
const clearSectionNote = callable("clear_section_note");
const reconstructSections = callable("reconstruct_sections");
const reloadGuideContent = callable("reload_guide_content");
// v0.41: strip site-specific chrome (rpgsoluce nav menu, footer, citation, HTML
// comment leak) from an already-stored guide, then rebuild sections. Uses the
// stored content as-is — no re-download. Auto-remaps progress/notes/bookmarks.
const cleanExistingGuide = callable("clean_existing_guide");
const polishAllGuides = callable("polish_all_guides");
const toggleSectionHidden = callable("toggle_section_hidden");
callable("show_all_sections");
const getBackupConfig = callable("get_backup_config");
const setBackupConfig = callable("set_backup_config");
const runBackupNow = callable("run_backup_now");
// A3 ES-DE: returns the cleaned game-title of the ROM currently loaded by a running emulator,
// or empty fields if no emulator is detected.
const getRunningEmulatorGameHint = callable("get_running_emulator_game_hint");
const BACKUP_INTERVAL_CHOICES = [1, 3, 7, 14, 30];
const findInGuide = callable("find_in_guide");
const exportGuide = callable("export_guide");
const exportAllGuides = callable("export_all_guides");
const listExportFiles = callable("list_export_files");
const importGuideFromPath = callable("import_guide_from_path");
const openUrlExternal = callable("open_url_external");
const getReaderPreferences = callable("get_reader_preferences");
const updateReaderPreferences = callable("update_reader_preferences");
const listScanSources = callable("list_scan_sources");
const toggleScanSource = callable("toggle_scan_source");
const getLibraryStatus = callable("get_library_status");
const rescanLibrary = callable("rescan_library");
const listLibraryItems = callable("list_library_items");
const renameLibraryItem = callable("rename_library_item");
const toggleLibraryFavorite = callable("toggle_library_favorite");
const debugInfo = callable("debug_info");
const testNetwork = callable("test_network");
const testSearch = callable("test_search");
const clearDebugLog = callable("clear_debug_log");
const VIEW_LABELS = {
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
const THEME_CHOICES = ["dark", "sepia"];
const THEME_LABELS = { dark: "Sombre", sepia: "Sépia" };
const FONT_CHOICES = ["sans", "serif", "mono"];
const FONT_LABELS = { sans: "Sans-serif", serif: "Serif", mono: "Monospace" };
const LINE_HEIGHT_CHOICES = ["tight", "normal", "airy"];
const LINE_HEIGHT_LABELS = { tight: "Serré", normal: "Normal", airy: "Aéré" };
const MAX_WIDTH_CHOICES = ["narrow", "normal", "full"];
const MAX_WIDTH_LABELS = { narrow: "Étroit", normal: "Normal", full: "Plein" };
const KIND_CHOICES = ["Tous", "ROMs", "Games", "Steam"];
const STORAGE_CHOICES = ["Tous", "Interne", "SD / externe"];
// Preset search terms for the in-guide finder (keyboard-free)
const FIND_PRESETS = [
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
const HIGHLIGHT_CATEGORIES = [
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
function themeStyle(theme) {
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
function fontFamily(family) {
    if (family === "serif")
        return "Georgia, 'Times New Roman', Times, serif";
    if (family === "mono")
        return "'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace";
    return "-apple-system, system-ui, 'Segoe UI', 'Noto Sans', sans-serif";
}
function lineHeightValue(level) {
    if (level === "tight")
        return 1.4;
    if (level === "airy")
        return 2.0;
    return 1.7;
}
function maxWidthValue(level) {
    // v0.43.5: "normal" calibrated to ~72ch — the typographic sweet spot for
    // comfortable reading (66-80 chars/line). The column is centered by the reader.
    if (level === "narrow")
        return "58ch";
    if (level === "normal")
        return "72ch";
    return "100%";
}
// ========== Shared styles ==========
const boxStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
};
const pillStyle = {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.08)",
    fontSize: "0.75rem",
    marginRight: "6px",
    marginBottom: "6px",
};
// ========== Utility functions ==========
function formatDetectionMethod(value) {
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
function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value || "Jamais";
    return date.toLocaleString();
}
function bytesToKo(value) {
    return `${Math.max(1, Math.round(value / 1024))} Ko`;
}
function normalizeText(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function cycleIndex(current, total, delta) {
    if (total <= 0)
        return 0;
    return (current + delta + total) % total;
}
function getSectionText(guide, sectionIndex) {
    if (!guide)
        return "";
    if (sectionIndex < 0)
        return guide.content;
    const section = guide.sections[sectionIndex];
    if (!section)
        return guide.content;
    const lines = guide.content.split(/\r?\n/);
    return lines.slice(section.line_start, section.line_end + 1).join("\n");
}
function fieldLine(label, value) {
    if (!value)
        return null;
    return (SP_JSX.jsxs("div", { style: { fontSize: "0.8rem", opacity: 0.88 }, children: [SP_JSX.jsxs("strong", { children: [label, " :"] }), " ", value] }));
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
function findGuideForRunningApp(guides, appName) {
    if (!appName || !guides.length)
        return null;
    const normApp = normalizeText(appName);
    if (!normApp)
        return null;
    // Tiebreak helper: within a match tier, pick the most-recently-opened guide.
    const pickMostRecent = (candidates) => {
        if (candidates.length === 0)
            return null;
        if (candidates.length === 1)
            return candidates[0];
        return candidates.slice().sort((a, b) => (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || ""))[0];
    };
    // Tier 1: exact match on normalized game_title or title
    const tier1 = guides.filter((g) => normalizeText(g.game.game_title || "") === normApp ||
        normalizeText(g.title) === normApp);
    if (tier1.length)
        return pickMostRecent(tier1);
    // Tier 2: alias match
    const tier2 = guides.filter((g) => (g.game.aliases || []).some((a) => normalizeText(a) === normApp));
    if (tier2.length)
        return pickMostRecent(tier2);
    // Tier 3: substring containment (either direction). Skips matches where one side
    // is too short (<4 chars) to avoid false positives like "II" matching "Civ II".
    if (normApp.length >= 4) {
        const tier3 = guides.filter((g) => {
            const gt = normalizeText(g.game.game_title || g.title);
            if (!gt || gt.length < 4)
                return false;
            return gt.includes(normApp) || normApp.includes(gt);
        });
        if (tier3.length)
            return pickMostRecent(tier3);
    }
    return null;
}
/** A5: find guides similar to the current one — same series (shared title words),
 *  same platform, same site. Returns up to 5 results sorted by relevance. */
function findSimilarGuides(current, all) {
    if (!current)
        return [];
    const currentText = `${current.title} ${current.game.game_title || ""}`;
    const currentWords = new Set(normalizeText(currentText)
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)));
    if (currentWords.size === 0)
        return [];
    const scored = [];
    for (const g of all) {
        if (g.id === current.id)
            continue;
        let score = 0;
        const gWords = normalizeText(`${g.title} ${g.game.game_title || ""}`).split(/\s+/);
        for (const w of gWords) {
            if (w.length >= 4 && currentWords.has(w))
                score += 5;
        }
        if (g.game.platform && g.game.platform === current.game.platform)
            score += 2;
        if (g.site && g.site === current.site)
            score += 1;
        if (score >= 5)
            scored.push({ guide: g, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((s) => s.guide);
}
const STOPWORDS = new Set([
    "the", "and", "for", "with", "from", "this", "that", "guide", "walkthrough",
    "soluce", "cheminement", "dans", "avec", "pour", "complet", "complete", "full",
    "version", "final", "english", "francais", "french",
]);
function guideMatchesLibraryItem(guide, item) {
    const guidePlatform = guide.game.platform || "Autre";
    const itemPlatform = item.platform || "Autre";
    const platformCompatible = guidePlatform === itemPlatform ||
        (guidePlatform === "Steam" && itemPlatform === "PC") ||
        (guidePlatform === "PC" && itemPlatform === "Steam");
    if (!platformCompatible)
        return false;
    if (guide.game.disc_code && item.disc_code && guide.game.disc_code === item.disc_code)
        return true;
    const displayTitle = item.custom_title || item.title;
    const guideNames = new Set([
        normalizeText(guide.game.normalized_title || guide.game.game_title || guide.title),
        normalizeText(guide.game.game_title || guide.title),
        normalizeText(guide.title),
        ...guide.game.aliases.map((alias) => normalizeText(alias)),
    ]);
    if (guideNames.has(normalizeText(displayTitle)))
        return true;
    if (guideNames.has(item.normalized_title))
        return true;
    return item.aliases.some((alias) => guideNames.has(normalizeText(alias)));
}
// Parse text containing \x01H{n}\x02...\x01/H\x02 and \x01PRE\x02...\x01/PRE\x02 markers
function parseBlocks(raw) {
    const blocks = [];
    if (!raw)
        return blocks;
    // Split by PRE markers first
    const preRegex = /\x01PRE\x02\n?([\s\S]*?)\n?\x01\/PRE\x02/g;
    let cursor = 0;
    let match;
    while ((match = preRegex.exec(raw)) !== null) {
        const before = raw.slice(cursor, match.index);
        if (before.trim()) {
            blocks.push(...parseParagraphsAndHeadings(before));
        }
        const preText = match[1].replace(/^\n+|\n+$/g, "");
        if (preText)
            blocks.push({ kind: "pre", text: preText });
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
function smartCollapseParagraph(text) {
    const lines = text.split(/\n/);
    if (lines.length <= 1)
        return text;
    const isHardBreak = (idx) => {
        if (idx === 0)
            return false;
        const rawLine = lines[idx];
        const line = rawLine.trim();
        const prev = lines[idx - 1].trim();
        if (!line)
            return true;
        // Bullet/list items
        if (/^[-*•·●▪▫►▼>+]\s+\S/.test(line))
            return true;
        if (/^\d{1,3}[.):]\s+\S/.test(line))
            return true;
        if (/^[a-z]\)\s+\S/.test(line))
            return true;
        if (/^\d+[a-z]\.\s+\S/.test(line))
            return true;
        // Labeled stat lines, with or without colon ("HP : 950", "Level 27", "BOSS:")
        if (/^(BOSS|Boss|HP|MP|SP|XP|EXP|Level|Niveau|Item|Objet|Items|Attack|Defend|Defense|Special|Magic|Stats|Stat|Rune|Skill|Skills|Equipement|Equipment)\b/i.test(line))
            return true;
        // Previous line was short header ending with colon ("Stats:" / "Items:")
        if (prev.length < 60 && /[:：]\s*$/.test(prev))
            return true;
        // Short ALL-CAPS / dashed-banner line (small headers like "STORMFIST" or "------")
        if (line.length < 80 && /^[A-Z][A-Z0-9\s\-]{2,}$/.test(line))
            return true;
        if (line.length < 80 && /^[=\-_*#~+]{4,}/.test(line))
            return true;
        // Indented line (preserved code/stat blocks)
        if (/^\s{2,}\S/.test(rawLine))
            return true;
        // Short numeric-heavy line ("Level 1 6 9", "100 200 300") — likely table row
        if (line.length < 60 && (line.match(/\d/g) || []).length >= 3 && !/[.!?]$/.test(line))
            return true;
        return false;
    };
    const out = [];
    let buffer = lines[0];
    for (let i = 1; i < lines.length; i++) {
        if (isHardBreak(i)) {
            out.push(buffer);
            buffer = lines[i];
        }
        else {
            // Soft-wrap continuation → join with single space
            buffer = buffer.replace(/\s+$/, "") + " " + lines[i].replace(/^\s+/, "");
        }
    }
    out.push(buffer);
    return out.join("\n");
}
function parseParagraphsAndHeadings(raw) {
    const blocks = [];
    const headingRegex = /\x01H(\d)\x02(.*?)\x01\/H\x02/g;
    // Expand headings into own blocks, then split remaining by blank lines
    const lines = raw.split(/\n/);
    let paragraphBuffer = [];
    const flushParagraph = () => {
        if (paragraphBuffer.length === 0)
            return;
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
        }
        else if (stripped === "") {
            paragraphBuffer.push("");
        }
        else {
            paragraphBuffer.push(line);
        }
    }
    flushParagraph();
    return blocks;
}
/** L5: resolve a "section/chapter/chap. N[letter]" reference in text to a section index.
 * Heuristic: looks for a section whose title starts with `Nx.` or `Nx ` (case-insensitive).
 * Returns -1 if no plausible target. */
function resolveSectionReference(refId, sections) {
    const id = refId.toLowerCase().trim();
    if (!id)
        return -1;
    // Pattern A: title starts with "<id>." or "<id> "
    for (let i = 0; i < sections.length; i++) {
        const t = (sections[i].title || "").trim().toLowerCase();
        if (t.startsWith(id + ".") || t.startsWith(id + " ") || t.startsWith(id + ":"))
            return i;
    }
    // Pattern B: title contains "[<id>]" — for TOC code-style anchors
    for (let i = 0; i < sections.length; i++) {
        const t = (sections[i].title || "").trim().toLowerCase();
        if (t.includes("[" + id + "]"))
            return i;
    }
    return -1;
}
// v0.43.49: inline bold sentinels (mirror of the backend BOLD_MARK_*). Rendered
// as <strong>; stripped everywhere text is *analysed* (search, snippets) so they
// stay invisible to matching and never leak into displayed strings.
function stripBoldMarkers(s) {
    return s.indexOf("\x01") === -1 ? s : s.replace(/\x01\/?B\x02/g, "");
}
// Highlight keywords + search matches + cross-references in a text block
function renderHighlightedText(text, highlightKeywords, searchPattern, sections, onJumpToSection, renderBold = true) {
    if (!text)
        return text;
    // v0.43.49: pull bold ranges out of the \x01B\x02…\x01/B\x02 markers, then run
    // ALL highlighting on the marker-free "visible" text so match indices match the
    // no-bold behaviour exactly (keeps find-nav aligned with computeSearchMatches,
    // which counts on the same stripped text). Bold is drawn only on the GAPS
    // between highlight spans, never splitting a span, so os-find mark count is
    // unchanged. Keyword spans already render semibold, so skipping bold inside a
    // highlight is visually a no-op.
    let visible = text;
    const boldRanges = [];
    if (renderBold && text.indexOf("\x01B\x02") !== -1) {
        const boldRe = /\x01B\x02([\s\S]*?)\x01\/B\x02/g;
        let rebuilt = "";
        let last = 0;
        let bm;
        while ((bm = boldRe.exec(text)) !== null) {
            rebuilt += stripBoldMarkers(text.slice(last, bm.index));
            const bStart = rebuilt.length;
            rebuilt += bm[1];
            boldRanges.push([bStart, rebuilt.length]);
            last = bm.index + bm[0].length;
        }
        rebuilt += stripBoldMarkers(text.slice(last));
        visible = rebuilt;
    }
    else {
        visible = stripBoldMarkers(text);
    }
    text = visible;
    const inBold = (i) => {
        for (const [a, b] of boldRanges)
            if (i >= a && i < b)
                return true;
        return false;
    };
    // Emit visible.slice(from,to), wrapping maximal bold runs in <strong>.
    const pushRange = (from, to, keyBase, sink) => {
        if (to <= from)
            return;
        if (boldRanges.length === 0) {
            sink.push(text.slice(from, to));
            return;
        }
        let i = from;
        while (i < to) {
            const b = inBold(i);
            let j = i + 1;
            while (j < to && inBold(j) === b)
                j++;
            const chunk = text.slice(i, j);
            if (b)
                sink.push(SP_JSX.jsx("strong", { children: chunk }, `b-${keyBase}-${i}`));
            else
                sink.push(chunk);
            i = j;
        }
    };
    // Build a combined regex of keywords (word-ish boundaries) and the search pattern.
    const pieces = [];
    if (searchPattern && searchPattern.trim().length >= 2) {
        const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        pieces.push({ regex: new RegExp(escaped, "gi"), className: "os-find" });
    }
    if (highlightKeywords) {
        for (const cat of HIGHLIGHT_CATEGORIES) {
            try {
                pieces.push({ regex: new RegExp(cat.source, "gi"), className: "os-kw", color: cat.color });
            }
            catch { /* skip a bad pattern rather than break rendering */ }
        }
    }
    // L5: cross-references — only active when we have sections + a jump callback
    if (sections && sections.length > 0 && onJumpToSection) {
        pieces.push({
            regex: /\b(?:section|chapitre|chapter|chap\.?)\s+(\d{1,3}[a-z]?)\b/gi,
            className: "os-ref",
        });
    }
    if (pieces.length === 0) {
        if (boldRanges.length === 0)
            return text;
        const only = [];
        pushRange(0, text.length, "only", only);
        return only;
    }
    const spans = [];
    for (const piece of pieces) {
        piece.regex.lastIndex = 0;
        let m;
        while ((m = piece.regex.exec(text)) !== null) {
            if (m.index === piece.regex.lastIndex)
                piece.regex.lastIndex++;
            const span = { start: m.index, end: m.index + m[0].length, className: piece.className, color: piece.color };
            if (piece.className === "os-ref" && sections && m[1]) {
                const target = resolveSectionReference(m[1], sections);
                if (target < 0)
                    continue; // skip cross-refs that don't resolve to anything
                span.refTarget = target;
            }
            spans.push(span);
        }
    }
    if (spans.length === 0) {
        if (boldRanges.length === 0)
            return text;
        const only = [];
        pushRange(0, text.length, "only", only);
        return only;
    }
    // Sort, then merge overlaps (search match wins, then ref, then keyword)
    const priority = { "os-find": 3, "os-ref": 2, "os-kw": 1 };
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    const merged = [];
    for (const s of spans) {
        const last = merged[merged.length - 1];
        if (last && s.start < last.end) {
            const lastP = priority[last.className] || 0;
            const sP = priority[s.className] || 0;
            if (sP > lastP)
                merged[merged.length - 1] = s;
            continue;
        }
        merged.push(s);
    }
    const out = [];
    let cursor = 0;
    for (let i = 0; i < merged.length; i++) {
        const s = merged[i];
        if (s.start > cursor)
            pushRange(cursor, s.start, `g${i}`, out);
        const substr = text.slice(s.start, s.end);
        if (s.className === "os-find") {
            out.push(SP_JSX.jsx("mark", { style: { background: "#ffe066", color: "#1a1a1a", borderRadius: "2px", padding: "0 2px" }, children: substr }, `m-${i}`));
        }
        else if (s.className === "os-ref" && typeof s.refTarget === "number" && onJumpToSection) {
            const target = s.refTarget;
            out.push(SP_JSX.jsx("span", { onClick: () => onJumpToSection(target), style: {
                    color: "#8fd0ff",
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                    cursor: "pointer",
                    fontWeight: 500,
                }, children: substr }, `r-${i}`));
        }
        else {
            out.push(SP_JSX.jsx("span", { style: { color: s.color, fontWeight: 600 }, children: substr }, `k-${i}`));
        }
        cursor = s.end;
    }
    if (cursor < text.length)
        pushRange(cursor, text.length, "gt", out);
    return out;
}
/**
 * Shared reading surface: themed, per-block rendering with keyword highlighting,
 * search-match highlighting, and monospace rendering for ASCII-art blocks.
 */
function GuideReader(props) {
    const { guide, sectionIndex, fontScale, preferences, searchPattern, scrollRestoreFraction, onScrollChange, maxHeight, onJumpToSection, restoreGeneration, scrollPulse, scrollToFirstMatch, scrollMatchOcc, } = props;
    const scrollRef = SP_REACT.useRef(null);
    // v0.43.34: tracks the last scrollToFirstMatch value we handled, so the restore
    // effect can tell a "focus the search match" fire from a normal section change.
    const lastFindScrollRef = SP_REACT.useRef(0);
    const raw = SP_REACT.useMemo(() => getSectionText(guide, sectionIndex), [guide, sectionIndex]);
    const blocks = SP_REACT.useMemo(() => parseBlocks(raw), [raw]);
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
    SP_REACT.useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        let cancelled = false;
        let rafId = 0;
        // Snapshot the target fraction at effect-run time so a subsequent prop change can't
        // override our intent mid-restore.
        const targetFrac = scrollRestoreFraction;
        // v0.43.34: is this a "focus the search match" fire? (sidebar content search)
        // Consume the counter so a later normal restore doesn't re-trigger the mark scroll.
        const wantFind = (scrollToFirstMatch || 0) !== lastFindScrollRef.current;
        lastFindScrollRef.current = scrollToFirstMatch || 0;
        const attempt = (tries) => {
            if (cancelled)
                return;
            const currentMax = Math.max(1, el.scrollHeight - el.clientHeight);
            let targetTop;
            if (wantFind) {
                const marks = el.querySelectorAll("mark");
                if (marks.length === 0 && tries < 6) {
                    // Highlighted marks not laid out yet — retry next frame before giving up.
                    rafId = window.requestAnimationFrame(() => attempt(tries + 1));
                    return;
                }
                const occ = Math.min(Math.max(0, scrollMatchOcc || 0), Math.max(0, marks.length - 1));
                const mark = (marks[occ] || marks[0]);
                if (mark) {
                    const cRect = el.getBoundingClientRect();
                    const mRect = mark.getBoundingClientRect();
                    // Place the match ~30% down the viewport so surrounding context is visible.
                    targetTop = el.scrollTop + (mRect.top - cRect.top) - el.clientHeight * 0.3;
                    targetTop = Math.max(0, Math.min(currentMax, targetTop));
                }
                else {
                    targetTop = 0;
                }
            }
            else {
                targetTop = targetFrac !== null ? currentMax * targetFrac : 0;
            }
            el.scrollTop = targetTop;
            // Re-check next frame: if scrollHeight changed (content still rendering), redo with new max
            rafId = window.requestAnimationFrame(() => {
                if (cancelled)
                    return;
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
    }, [sectionIndex, guide.id, restoreGeneration, scrollToFirstMatch]);
    // v0.43.6: page scroll (L1/R1) — jump ~80% of a screen when the pulse changes.
    SP_REACT.useEffect(() => {
        const el = scrollRef.current;
        if (!el || !scrollPulse || scrollPulse.n === 0)
            return;
        el.scrollBy({ top: Math.round(el.clientHeight * 0.8) * scrollPulse.dir, behavior: "smooth" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollPulse?.n]);
    // v0.43.18: right-stick continuous scroll REMOVED — all three controller APIs
    // failed on this Steam build (RegisterForControllerStateChanges absent;
    // RegisterForControllerAnalogInputMessages → "unknown method"; the browser
    // Gamepad API reports no pad because Steam Input captures the controller first).
    // L1/R1 (page scroll ~80%) and L2/R2 (prev/next section) cover navigation.
    const containerStyle = {
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
    const innerStyle = {
        fontSize: `${fontScale}rem`,
        lineHeight: lh,
        maxWidth: widthCap,
        marginLeft: "auto",
        marginRight: "auto",
    };
    const paragraphStyle = {
        // Tightened in v0.22: was 0.8em which combined with HTML's per-line blank-line
        // emission made the rendered text look airy and broken. 0.4em keeps paragraphs
        // distinguishable but compacts the visual rhythm.
        margin: "0 0 0.4em",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
    };
    const preStyle = {
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
    const headingStyle = (level) => ({
        margin: level <= 2 ? "1em 0 0.5em" : "0.8em 0 0.4em",
        fontSize: level <= 2 ? `${fontScale * 1.3}rem` : `${fontScale * 1.15}rem`,
        fontWeight: 700,
        color: theme.headingColor,
        lineHeight: 1.3,
    });
    return (SP_JSX.jsx("div", { ref: scrollRef, style: containerStyle, onScroll: (e) => {
            const el = e.currentTarget;
            const max = Math.max(1, el.scrollHeight - el.clientHeight);
            onScrollChange(Math.max(0, Math.min(1, el.scrollTop / max)));
        }, children: SP_JSX.jsx("div", { style: innerStyle, children: blocks.length === 0 ? (SP_JSX.jsx("p", { style: paragraphStyle, children: "Aucun contenu" })) : (blocks.map((block, idx) => {
                if (block.kind === "heading") {
                    return SP_JSX.jsx("div", { style: headingStyle(block.level), children: block.text }, idx);
                }
                if (block.kind === "pre") {
                    return SP_JSX.jsx("pre", { style: preStyle, children: block.text }, idx);
                }
                return (SP_JSX.jsx("p", { style: paragraphStyle, children: renderHighlightedText(block.text, preferences.highlight_keywords, searchPattern, guide.sections, onJumpToSection, preferences.render_bold !== false) }, idx));
            })) }) }));
}
/**
 * v0.43.34: build a short excerpt of `line` centred on the first occurrence of
 * `needleLower` (already lower-cased), so a content match in the sidebar shows
 * WHY it matched rather than just the (non-matching) section title.
 */
function buildContentSnippet(line, needleLower) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    const pos = trimmed.toLowerCase().indexOf(needleLower);
    if (pos < 0)
        return trimmed.slice(0, 90);
    const radius = 42;
    const start = Math.max(0, pos - radius);
    const end = Math.min(trimmed.length, pos + needleLower.length + radius);
    let out = trimmed.slice(start, end);
    if (start > 0)
        out = "…" + out;
    if (end < trimmed.length)
        out = out + "…";
    return out;
}
/**
 * v0.43.34: scan every section's body (not just its title) for `needleLower`
 * and return a Map<sectionIndex, snippet> for the sections whose CONTENT matches
 * but whose TITLE does not — those are the rows that would otherwise be invisible
 * to the sidebar filter. Title matches are skipped (they already surface).
 */
function buildContentMatches(sections, content, needleLower) {
    const map = new Map();
    if (!needleLower)
        return map;
    const lines = content.split(/\r?\n/);
    sections.forEach((sec, idx) => {
        if ((sec.title || "").toLowerCase().includes(needleLower))
            return; // title already matches
        const start = Math.max(0, sec.line_start);
        const end = Math.min(lines.length - 1, sec.line_end);
        for (let i = start; i <= end; i++) {
            const l = stripBoldMarkers(lines[i] || ""); // v0.43.49: bold invisible to search
            if (l && l.toLowerCase().includes(needleLower)) {
                map.set(idx, buildContentSnippet(l, needleLower));
                break;
            }
        }
    });
    return map;
}
function computeSearchMatches(content, sections, needle) {
    const n = needle.trim().toLowerCase();
    const out = [];
    if (n.length < 2)
        return out;
    const lines = content.split(/\r?\n/);
    sections.forEach((sec, si) => {
        let occ = 0;
        const start = Math.max(0, sec.line_start);
        const end = Math.min(lines.length - 1, sec.line_end);
        for (let i = start; i <= end; i++) {
            let raw = lines[i];
            if (!raw)
                continue;
            // v0.43.49: bold markers are stripped before <mark>s render, so count on the
            // same stripped text; skip lines still carrying a heading/pre marker.
            if (raw.includes("\x01")) {
                raw = stripBoldMarkers(raw);
                if (raw.includes("\x01"))
                    continue;
            }
            const l = raw.toLowerCase();
            let from = 0;
            let idx = l.indexOf(n, from);
            while (idx !== -1) {
                out.push({ section: si, occ });
                occ++;
                from = idx + n.length;
                idx = l.indexOf(n, from);
            }
        }
    });
    return out;
}
/** Group consecutive sections so heading_level <= 2 starts a group, deeper levels nest under it. */
function buildTocGroups(sections) {
    const groups = [];
    let current = null;
    sections.forEach((sec, idx) => {
        const level = sec.heading_level || 2;
        if (level <= 2 || current === null) {
            current = { parent: { index: idx, sec }, children: [] };
            groups.push(current);
        }
        else {
            current.children.push({ index: idx, sec });
        }
    });
    return groups;
}
/** Sidebar TOC with filter + collapsible groups + hide-section toggle + auto-scroll. */
function TocSidebar(props) {
    const { guide, preferences, theme, sidebarStyle, sectionIndex, setSectionIndex, tocFilter, setTocFilter, collapsedParents, setCollapsedParents, showHiddenSections, setShowHiddenSections, onJumpToMatch, } = props;
    // v0.43.34: activate a row — a body-only match focuses the matched line via the
    // reader; a title match just switches section.
    const activateSection = (index) => {
        if (contentMatches.has(index) && onJumpToMatch)
            onJumpToMatch(index);
        else
            setSectionIndex(index);
    };
    const currentRowRef = SP_REACT.useRef(null);
    // L3: auto-scroll the sidebar so the current section's row is visible whenever sectionIndex changes
    SP_REACT.useEffect(() => {
        const el = currentRowRef.current;
        if (el && typeof el.scrollIntoView === "function") {
            try {
                el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
            catch { /* older browsers */ }
        }
    }, [sectionIndex]);
    const hiddenTitles = new Set((guide.progress?.hidden_section_titles || []).map((t) => (t || "").trim()));
    const isHidden = (sec) => hiddenTitles.has((sec.title || "").trim());
    const hiddenCount = guide.sections.reduce((n, s) => n + (isHidden(s) ? 1 : 0), 0);
    // v0.25: which sections are marked as "done" (manually or auto via scroll-to-bottom)
    const doneIndices = new Set();
    const flaggedIndices = new Set();
    for (const n of guide.progress?.section_notes || []) {
        if (n.done)
            doneIndices.add(n.section_index);
        if (n.flagged)
            flaggedIndices.add(n.section_index);
    }
    // v0.43.44: sections holding a MISSABLE flag get a 🔴 in the sidebar so the
    // "à ne pas rater" moments are visible at a glance. Only missable (≈4% of
    // sections) — key-item/side-quest are too common and would clutter the TOC.
    const missableIndices = new Set();
    for (const f of guide.important_flags || []) {
        if (f.category === "missable" && f.section_index >= 0)
            missableIndices.add(f.section_index);
    }
    const sectionBadge = (idx) => {
        let out = "";
        if (missableIndices.has(idx))
            out += "🔴 ";
        if (doneIndices.has(idx))
            out += "✅ ";
        if (flaggedIndices.has(idx))
            out += "⚐ ";
        return out;
    };
    const groups = buildTocGroups(guide.sections);
    const filterNeedle = tocFilter.trim().toLowerCase();
    // v0.43.34: the filter also searches section BODIES, not just titles. A section
    // whose content matches (but whose title doesn't) shows with a snippet so the
    // user sees why it matched. Memoised: only rescans when the query or guide changes.
    const contentMatches = SP_REACT.useMemo(() => buildContentMatches(guide.sections, guide.content, filterNeedle), [guide.sections, guide.content, filterNeedle]);
    const nodeMatches = (node) => (node.sec.title || "").toLowerCase().includes(filterNeedle) || contentMatches.has(node.index);
    // Apply hide filter first (unless "show hidden" toggle is on), then text filter.
    let working = showHiddenSections
        ? groups
        : groups
            .map((g) => {
            const childrenVisible = g.children.filter((c) => !isHidden(c.sec));
            if (isHidden(g.parent.sec)) {
                // Parent hidden: surface children that aren't hidden by making the FIRST visible
                // child a new pseudo-parent. If none, drop the group entirely.
                if (childrenVisible.length === 0)
                    return null;
                return { parent: childrenVisible[0], children: childrenVisible.slice(1) };
            }
            return { parent: g.parent, children: childrenVisible };
        })
            .filter((g) => g !== null);
    // Then text filter: keep groups whose parent OR any child title matches; drop non-matching children.
    const filtered = filterNeedle
        ? working
            .map((g) => {
            const parentTitleMatch = (g.parent.sec.title || "").toLowerCase().includes(filterNeedle);
            const parentMatches = parentTitleMatch || contentMatches.has(g.parent.index);
            const matchingChildren = g.children.filter(nodeMatches);
            if (parentMatches || matchingChildren.length > 0) {
                // Title match on the parent = category search → show the whole group.
                // Body-only match → show just the parent (with snippet) + any matching children.
                return { parent: g.parent, children: parentTitleMatch ? g.children : matchingChildren };
            }
            return null;
        })
            .filter((g) => g !== null)
        : working;
    const toggle = (parentIdx) => {
        setCollapsedParents((prev) => {
            const next = new Set(prev);
            if (next.has(parentIdx))
                next.delete(parentIdx);
            else
                next.add(parentIdx);
            return next;
        });
    };
    const filterWrapStyle = {
        padding: "8px 10px 6px",
        position: "sticky",
        top: 0,
        background: "rgba(0,0,0,0.55)",
        borderBottom: `1px solid ${theme.borderColor}`,
        zIndex: 1,
    };
    const hiddenToggleStyle = {
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
    const parentRowStyleBase = (isCurrent) => ({
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
    const childRowStyleBase = (isCurrent) => ({
        padding: "5px 10px 5px 30px",
        borderLeft: isCurrent ? "3px solid #ffd966" : "3px solid transparent",
        background: isCurrent ? "rgba(255, 217, 102, 0.18)" : "transparent",
        cursor: "pointer",
        fontSize: "0.76rem",
        fontWeight: isCurrent ? 700 : 400,
        color: theme.textColor,
        opacity: 0.92,
    });
    // v0.43.34: sub-line under a row that matched on body text (not its title).
    const snippetStyle = {
        display: "block",
        fontSize: "0.66rem",
        fontWeight: 400,
        lineHeight: 1.25,
        opacity: 0.75,
        color: "#9ecbff",
        marginTop: "2px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    };
    return (SP_JSX.jsxs("div", { style: sidebarStyle, children: [SP_JSX.jsxs("div", { style: filterWrapStyle, children: [SP_JSX.jsx(DFL.TextField, { value: tocFilter, onChange: (e) => setTocFilter(e.target.value), placeholder: "Rechercher (titres + texte)\u2026", bShowClearAction: true }), hiddenCount > 0 ? (SP_JSX.jsx(DFL.Focusable, { onActivate: () => setShowHiddenSections((v) => !v), style: hiddenToggleStyle, children: showHiddenSections
                            ? `👁 Cacher les ${hiddenCount} masquée(s)`
                            : `🙈 Afficher les ${hiddenCount} masquée(s)` })) : null] }), SP_JSX.jsxs(DFL.Focusable, { children: [filtered.length === 0 && filterNeedle ? (SP_JSX.jsxs("div", { style: { padding: "16px", textAlign: "center", opacity: 0.6, fontSize: "0.8rem" }, children: ["Aucune section ne correspond \u00E0 \u00AB ", tocFilter, " \u00BB"] })) : null, filtered.map((group) => {
                        const containsCurrent = sectionIndex === group.parent.index
                            || group.children.some((c) => c.index === sectionIndex);
                        // Always expand the group containing the current section, and when filtering.
                        const effectiveCollapsed = !filterNeedle && !containsCurrent && collapsedParents.has(group.parent.index);
                        const hasChildren = group.children.length > 0;
                        const parentIsCurrent = sectionIndex === group.parent.index;
                        const parentHidden = isHidden(group.parent.sec);
                        const parentStyle = { ...parentRowStyleBase(parentIsCurrent), opacity: parentHidden ? 0.45 : 1 };
                        return (SP_JSX.jsxs("div", { children: [SP_JSX.jsxs(DFL.Focusable, { ref: parentIsCurrent ? currentRowRef : undefined, onActivate: () => {
                                        if (hasChildren && !filterNeedle)
                                            toggle(group.parent.index);
                                        activateSection(group.parent.index);
                                    }, style: parentStyle, children: [SP_JSX.jsx("span", { style: { width: "12px", display: "inline-block", opacity: hasChildren ? 0.7 : 0, fontSize: "0.7rem" }, children: hasChildren ? (effectiveCollapsed ? "▶" : "▼") : "" }), SP_JSX.jsxs("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }, children: [SP_JSX.jsxs("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [parentHidden ? "🙈 " : "", sectionBadge(group.parent.index), preferences.numbered_sections ? `${group.parent.index + 1}. ` : "", group.parent.sec.title || "(sans titre)"] }), contentMatches.has(group.parent.index) ? (SP_JSX.jsxs("span", { style: snippetStyle, children: ["\uD83D\uDD0E ", contentMatches.get(group.parent.index)] })) : null] }), hasChildren ? (SP_JSX.jsx("span", { style: { fontSize: "0.66rem", opacity: 0.55, padding: "1px 5px", borderRadius: "3px", background: "rgba(255,255,255,0.08)" }, children: group.children.length })) : null] }), !effectiveCollapsed && group.children.map((child) => {
                                    const isCurrent = child.index === sectionIndex;
                                    const childHidden = isHidden(child.sec);
                                    const childStyle = { ...childRowStyleBase(isCurrent), opacity: childHidden ? 0.45 : 0.92 };
                                    return (SP_JSX.jsxs(DFL.Focusable, { ref: isCurrent ? currentRowRef : undefined, onActivate: () => activateSection(child.index), style: childStyle, children: [SP_JSX.jsxs("span", { style: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [childHidden ? "🙈 " : "", sectionBadge(child.index), preferences.numbered_sections ? `${child.index + 1}. ` : "", child.sec.title || "(sans titre)"] }), contentMatches.has(child.index) ? (SP_JSX.jsxs("span", { style: snippetStyle, children: ["\uD83D\uDD0E ", contentMatches.get(child.index)] })) : null] }, child.index));
                                })] }, group.parent.index));
                    })] })] }));
}
/**
 * v0.35: collapsible named-bookmarks panel for the FullScreenReader.
 * Replaces the GuideReader pane when toggled on, so it doesn't permanently
 * eat reading space. List of bookmarks is sorted newest-first.
 */
function NamedBookmarksPanel(props) {
    const { guide, currentSectionIndex, currentScrollFraction, busy, theme, onClose, onAdd, onDelete, onGoTo } = props;
    const bookmarks = (guide.progress?.named_bookmarks || []).slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const containerStyle = {
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
    const headerRowStyle = {
        display: "flex",
        gap: "8px",
        alignItems: "center",
        paddingBottom: "8px",
        borderBottom: `1px solid ${theme.borderColor}`,
    };
    const itemStyle = {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        borderRadius: "6px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${theme.borderColor}`,
    };
    const currentSectionTitle = guide.sections[currentSectionIndex]?.title || "Début";
    return (SP_JSX.jsxs("div", { style: containerStyle, children: [SP_JSX.jsxs("div", { style: headerRowStyle, children: [SP_JSX.jsxs("div", { style: { flex: 1, fontWeight: 700, fontSize: "0.95rem" }, children: ["\uD83D\uDCDA Marques-pages (", bookmarks.length, ")"] }), SP_JSX.jsx(DFL.DialogButton, { onClick: onClose, children: "Fermer \u2715" })] }), SP_JSX.jsxs("div", { style: { fontSize: "0.75rem", opacity: 0.78 }, children: ["Position actuelle : ", SP_JSX.jsx("strong", { children: currentSectionTitle.slice(0, 50) }), " \u00B7 ", Math.round(currentScrollFraction * 100), "%"] }), SP_JSX.jsx(DFL.DialogButton, { disabled: busy, onClick: onAdd, children: "\u2795 Ajouter le point actuel comme marque-page" }), bookmarks.length === 0 ? (SP_JSX.jsxs("div", { style: { padding: "20px", textAlign: "center", opacity: 0.6, fontSize: "0.85rem" }, children: ["Aucun marque-page nomm\u00E9 pour ce guide.", SP_JSX.jsx("br", {}), "Clique \u00AB Ajouter \u00BB ci-dessus pour en cr\u00E9er un."] })) : (bookmarks.map((bm) => {
                const sec = guide.sections[bm.section_index] || null;
                const secLabel = sec?.title || (bm.section_index >= 0 ? `Section ${bm.section_index + 1}` : "Début");
                return (SP_JSX.jsxs("div", { style: itemStyle, children: [SP_JSX.jsxs(DFL.Focusable, { onActivate: () => onGoTo(bm), style: { flex: 1, minWidth: 0, cursor: "pointer", padding: "2px 4px" }, children: [SP_JSX.jsxs("div", { style: { fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: ["\uD83D\uDCCD ", bm.name || "(sans nom)"] }), SP_JSX.jsxs("div", { style: { fontSize: "0.72rem", opacity: 0.72, marginTop: "2px" }, children: [secLabel.slice(0, 60), " \u00B7 ", Math.round((bm.scroll_fraction || 0) * 100), "%", bm.created_at ? ` · ${formatDate(bm.created_at)}` : ""] })] }), SP_JSX.jsx(DFL.DialogButton, { disabled: busy, onClick: () => onDelete(bm.bookmark_id), children: "\u2715" })] }, bm.bookmark_id));
            }))] }));
}
/**
 * v0.43.3: full-screen search + import. Reachable from the launcher and from a
 * game fiche ("Rechercher des guides pour ce jeu" — pre-fills the query). Keeps
 * the whole search→import flow in the full-screen context instead of bouncing
 * back to the cramped QAM.
 */
function FullScreenSearch() {
    const [query, setQuery] = SP_REACT.useState("");
    const [langIndex, setLangIndex] = SP_REACT.useState(0);
    const [siteIndex, setSiteIndex] = SP_REACT.useState(0);
    const [results, setResults] = SP_REACT.useState([]);
    const [preferences, setPreferences] = SP_REACT.useState(null);
    const [busy, setBusy] = SP_REACT.useState(false);
    const [msg, setMsg] = SP_REACT.useState("");
    const [imported, setImported] = SP_REACT.useState([]); // v0.43.7: for anti-duplicate
    const [zeroSecGuide, setZeroSecGuide] = SP_REACT.useState(null); // v0.43.7: 0-section delete prompt
    const [visibleCount, setVisibleCount] = SP_REACT.useState(SEARCH_PAGE_SIZE); // v0.43.12: show 8, "charger plus"
    const ranInitial = SP_REACT.useRef(false);
    const lang = LANGUAGE_CHOICES[langIndex] || LANGUAGE_CHOICES[0];
    const site = SEARCH_SITE_CHOICES[siteIndex] || SEARCH_SITE_CHOICES[0];
    // v0.43.7: normalize a URL for duplicate matching (strip scheme, www, trailing /).
    const normUrl = (u) => (u || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").replace(/#.*$/, "");
    const importedByUrl = SP_REACT.useMemo(() => {
        const m = new Map();
        for (const g of imported)
            if (g.url)
                m.set(normUrl(g.url), g);
        return m;
    }, [imported]);
    const findImported = (url) => importedByUrl.get(normUrl(url)) || null;
    const runSearch = async (q) => {
        const query2 = q.trim();
        if (!query2) {
            setMsg("Tape un nom de jeu.");
            return;
        }
        setBusy(true);
        setMsg("Recherche…");
        setResults([]);
        setVisibleCount(SEARCH_PAGE_SIZE);
        try {
            const r = await searchGuides(query2, "Autre", site.value, lang.value);
            setResults(r);
            setMsg(r.length ? `${r.length} résultat(s)` : "Aucun résultat. Change de langue/site et réessaie.");
        }
        catch (e) {
            setMsg(`Échec : ${e instanceof Error ? e.message : e}`);
        }
        finally {
            setBusy(false);
        }
    };
    SP_REACT.useEffect(() => {
        (async () => {
            try {
                setPreferences(await getReaderPreferences());
            }
            catch { }
            try {
                setImported(await listGuides());
            }
            catch { }
            const q = consumeSearch();
            if (q && !ranInitial.current) {
                ranInitial.current = true;
                setQuery(q);
                runSearch(q);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const openGuideId = (id) => { requestFullScreenGuide(id); try {
        DFL.Router.Navigate(FULL_SCREEN_ROUTE);
    }
    catch { } };
    const importResult = async (r) => {
        if (busy)
            return;
        // v0.43.7 anti-duplicate: if this URL is already imported, open it instead.
        const existing = findImported(r.url);
        if (existing) {
            openGuideId(existing.id);
            return;
        }
        // v0.43.14: background import — the backend crawls (up to 60 pages) in a
        // thread and we poll for progress. No more frozen UI on big Neoseeker guides;
        // the import even keeps running if you leave this screen.
        setBusy(true);
        setMsg(`Démarrage de l'import de « ${r.title.slice(0, 40)} »…`);
        try {
            const resp = await startImport(r.url, query.trim() || r.title, "Autre", query.trim() || r.title, "", "");
            // v0.43.21: backend anti-duplicate — if this guide (by root URL) already
            // exists, open it instead of making a second copy.
            if (resp.duplicate_guide_id) {
                try {
                    setImported(await listGuides());
                }
                catch { }
                setMsg("Déjà importé — ouverture…");
                openGuideId(resp.duplicate_guide_id);
                return;
            }
            const job_id = resp.job_id;
            if (!job_id) {
                setMsg("Import : réponse inattendue");
                return;
            }
            let status = null;
            for (let i = 0; i < 600; i++) { // ~15 min ceiling at 1.5s/poll
                await new Promise((res) => setTimeout(res, 1500));
                try {
                    status = await getImportStatus(job_id);
                }
                catch {
                    continue;
                }
                if (!status || status.state === "unknown")
                    continue;
                if (status.state === "running") {
                    const prog = status.total > 0 ? ` — ${status.done}/${status.total} pages` : "";
                    setMsg(`⏳ ${status.msg || "Import en cours"}${prog}  ·  (tu peux quitter, l'import continue en arrière-plan)`);
                    continue;
                }
                break; // done | error
            }
            try {
                setImported(await listGuides());
            }
            catch { }
            if (!status || status.state !== "done" || !status.guide_id) {
                setMsg(`Import échoué : ${status?.error || "délai dépassé"}`);
                return;
            }
            // v0.43.7: 0 sections = failed extraction — propose immediate delete.
            if ((status.section_count || 0) === 0) {
                try {
                    setZeroSecGuide(await getGuide(status.guide_id));
                    setMsg("");
                    return;
                }
                catch { }
            }
            // v0.43.37: junk (thin/1-section) → warn but keep + open so the user decides.
            setMsg(status.warning
                ? status.warning
                : `✓ Importé : ${status.section_count} section(s). Ouverture…`);
            openGuideId(status.guide_id);
        }
        catch (e) {
            setMsg(`Import échoué : ${e instanceof Error ? e.message : e}`);
        }
        finally {
            setBusy(false);
        }
    };
    const theme = preferences ? themeStyle(preferences.theme)
        : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966"};
    const layoutStyle = {
        width: "100vw", height: "100vh",
        paddingTop: `${STEAM_UI_TOP_BAR_PX}px`, paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        background: theme.background, color: theme.textColor,
        fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
    };
    const headerStyle = {
        display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
        borderBottom: `1px solid ${theme.borderColor}`, background: "rgba(0,0,0,0.35)", flexShrink: 0,
    };
    return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => safeNavigateBack(), style: { minWidth: "auto", width: "auto" }, children: "\u2190 Retour" }), SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "1.1rem" }, children: "\uD83D\uDD0D Rechercher un guide" })] }), SP_JSX.jsx("div", { style: { flex: 1, overflowY: "auto", padding: "16px" }, children: SP_JSX.jsxs("div", { style: { maxWidth: "640px" }, children: [zeroSecGuide ? (SP_JSX.jsxs("div", { style: { border: "1px solid rgba(255,100,100,0.4)", borderRadius: "8px", padding: "14px", marginBottom: "14px", background: "rgba(255,100,100,0.08)" }, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: "\u26A0 Extraction rat\u00E9e" }), SP_JSX.jsxs("div", { style: { fontSize: "0.85rem", opacity: 0.9, marginBottom: "12px" }, children: ["\u00AB ", zeroSecGuide.title, " \u00BB a \u00E9t\u00E9 import\u00E9 mais ne contient ", SP_JSX.jsx("strong", { children: "aucune section" }), " (le site n'a pas fourni de contenu exploitable). Inutile de le garder."] }), SP_JSX.jsxs("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" }, children: [SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => void (async () => {
                                                try {
                                                    await deleteGuide(zeroSecGuide.id);
                                                    setImported(await listGuides());
                                                }
                                                catch { }
                                                setZeroSecGuide(null);
                                                setMsg("Guide supprimé.");
                                            })(), children: "\uD83D\uDDD1 Supprimer" }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => { const g = zeroSecGuide; setZeroSecGuide(null); openGuideId(g.id); }, children: "Garder quand m\u00EAme" })] })] })) : null, SP_JSX.jsx("div", { style: { marginBottom: "10px" }, children: SP_JSX.jsx(DFL.TextField, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Nom du jeu (ex : Suikoden V)\u2026", bShowClearAction: true }) }), SP_JSX.jsxs("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }, children: [SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: busy, onClick: () => setLangIndex((v) => (v + 1) % LANGUAGE_CHOICES.length), children: ["Langue : ", lang.label] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: busy, onClick: () => setSiteIndex((v) => (v + 1) % SEARCH_SITE_CHOICES.length), children: ["Site : ", site.label] }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: busy, onClick: () => void runSearch(query), children: "\uD83D\uDD0D Lancer" })] }), msg ? SP_JSX.jsx("div", { style: { fontSize: "0.85rem", color: theme.headingColor, marginBottom: "12px" }, children: msg }) : null, SP_JSX.jsxs(DFL.Focusable, { style: { display: "flex", flexDirection: "column", gap: "10px" }, children: [results.slice(0, visibleCount).map((r, i) => {
                                    const dup = findImported(r.url);
                                    return (SP_JSX.jsxs(DFL.Focusable, { onActivate: () => void importResult(r), style: {
                                            background: dup ? "rgba(139,224,139,0.12)" : "rgba(255,255,255,0.05)",
                                            border: `1px solid ${dup ? "rgba(139,224,139,0.5)" : theme.borderColor}`,
                                            borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer",
                                        }, children: [SP_JSX.jsx("div", { style: { fontSize: "0.72rem", fontWeight: 700, color: dup ? "#8be08b" : theme.headingColor }, children: dup ? "✓ Déjà importé — ouvrir" : "▶ Importer" }), (() => {
                                                const gameName = (r.game || "").trim();
                                                const pageTitle = (r.title || "").trim();
                                                const heading = gameName || pageTitle || "(sans titre)";
                                                const uglyTitle = pageTitle.includes("›") || /wikis-soluce-astuces/i.test(pageTitle)
                                                    || /^(rpg soluce|le coin de|walkthrough|full walkthrough|guide|soluce|wiki)\b/i.test(pageTitle);
                                                const showSub = pageTitle && pageTitle.toLowerCase() !== heading.toLowerCase()
                                                    && !(gameName && (uglyTitle || pageTitle.toLowerCase().includes(gameName.toLowerCase())));
                                                return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, color: "#ffd966", fontSize: "0.98rem", whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.25 }, children: ["\uD83C\uDFAE ", heading] }), showSub ? (SP_JSX.jsx("div", { style: { fontSize: "0.8rem", color: theme.textColor, opacity: 0.85, whiteSpace: "normal", overflowWrap: "anywhere" }, children: pageTitle })) : null] }));
                                            })(), SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.75 }, children: r.site }), r.snippet ? SP_JSX.jsx("div", { style: { fontSize: "0.78rem", opacity: 0.85, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }, children: r.snippet }) : null] }, `${r.url}-${i}`));
                                }), results.length > visibleCount ? (SP_JSX.jsxs(DFL.DialogButton, { disabled: busy, onClick: () => setVisibleCount((v) => v + SEARCH_PAGE_SIZE), children: ["\u2B07 Charger plus de guides (", results.length - visibleCount, " restant", results.length - visibleCount > 1 ? "s" : "", ")"] })) : null] })] }) })] }));
}
/**
 * v0.43.1 (Phase 2b): full-screen browser for SCANNED INSTALLED GAMES.
 * Mirrors FullScreenLibrary but for the ROM/game library scan. Grid of games
 * with filter/sort/favorites; clicking a game shows its detail with the guides
 * already imported for it (open) + favorite toggle.
 */
function FullScreenGameLibrary() {
    const [items, setItems] = SP_REACT.useState([]);
    const [refreshing, setRefreshing] = SP_REACT.useState(false); // v0.43.46: rescan installed games
    const [guides, setGuides] = SP_REACT.useState([]);
    const [preferences, setPreferences] = SP_REACT.useState(null);
    const [loading, setLoading] = SP_REACT.useState(true);
    const [textFilter, setTextFilter] = SP_REACT.useState("");
    const [letterFilter, setLetterFilter] = SP_REACT.useState("");
    const [platformFilter, setPlatformFilter] = SP_REACT.useState(""); // v0.43.2
    const [sortMode] = SP_REACT.useState("name");
    const [favOnly, setFavOnly] = SP_REACT.useState(false);
    const [groupByPlatform, setGroupByPlatform] = SP_REACT.useState(false); // v0.43.2
    const [fiche, setFiche] = SP_REACT.useState(null);
    SP_REACT.useEffect(() => {
        (async () => {
            try {
                const [its, gs, prefs] = await Promise.all([listLibraryItems(), listGuides(), getReaderPreferences()]);
                setItems(its);
                setGuides(gs);
                setPreferences(prefs);
            }
            catch { /* keep empty */ }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    const titleOf = (it) => (it.custom_title || it.title || "").trim();
    const availableLetters = SP_REACT.useMemo(() => {
        const set = new Set();
        for (const it of items) {
            const c = (titleOf(it)[0] || "").toUpperCase();
            set.add(/[A-Z]/.test(c) ? c : "#");
        }
        return ["", ...Array.from(set).sort()];
    }, [items]);
    const availablePlatforms = SP_REACT.useMemo(() => {
        const set = new Set();
        for (const it of items) {
            const p = (it.platform || "").trim();
            if (p)
                set.add(p);
        }
        return ["", ...Array.from(set).sort()];
    }, [items]);
    const filtered = SP_REACT.useMemo(() => {
        const needle = textFilter.trim().toLowerCase();
        let list = items.filter((it) => {
            if (favOnly && !it.is_favorite)
                return false;
            if (needle && !`${it.title} ${it.custom_title} ${it.platform}`.toLowerCase().includes(needle))
                return false;
            if (platformFilter && (it.platform || "") !== platformFilter)
                return false;
            if (letterFilter) {
                const c = (titleOf(it)[0] || "").toUpperCase();
                if (letterFilter === "#") {
                    if (/[A-Z]/.test(c))
                        return false;
                }
                else if (c !== letterFilter)
                    return false;
            }
            return true;
        });
        if (sortMode === "platform")
            list = list.slice().sort((a, b) => (a.platform || "zzz").localeCompare(b.platform || "zzz") || titleOf(a).localeCompare(titleOf(b)));
        else
            list = list.slice().sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
        return list;
    }, [items, textFilter, letterFilter, platformFilter, sortMode, favOnly]);
    // v0.43.2: group filtered games by platform (for the group-by-platform mode).
    const groupedByPlatform = SP_REACT.useMemo(() => {
        const map = new Map();
        for (const it of filtered) {
            const key = (it.platform || "Autre").trim() || "Autre";
            (map.get(key) || map.set(key, []).get(key)).push(it);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filtered]);
    // v0.43.2: B/back closes the game fiche instead of exiting the route.
    SP_REACT.useEffect(() => {
        if (!fiche)
            return;
        try {
            window.history.pushState({ osFiche: true }, "");
        }
        catch { }
        const onPop = () => setFiche(null);
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [fiche?.id]);
    const guidesForItem = (it) => guides.filter((g) => guideMatchesLibraryItem(g, it));
    const theme = preferences ? themeStyle(preferences.theme)
        : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966"};
    const layoutStyle = {
        width: "100vw", height: "100vh",
        paddingTop: `${STEAM_UI_TOP_BAR_PX}px`, paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        background: theme.background, color: theme.textColor,
        fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
    };
    const headerStyle = {
        display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
        borderBottom: `1px solid ${theme.borderColor}`, background: "rgba(0,0,0,0.35)", flexShrink: 0,
    };
    const openGuide = (id) => { requestFullScreenGuide(id); try {
        DFL.Router.Navigate(FULL_SCREEN_ROUTE);
    }
    catch { } };
    const letterLabel = letterFilter === "" ? "Toutes" : letterFilter === "#" ? "#" : letterFilter;
    const letterIdx = Math.max(0, availableLetters.indexOf(letterFilter));
    // Game detail fiche.
    if (fiche) {
        const rel = guidesForItem(fiche);
        return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => setFiche(null), style: { minWidth: "auto", width: "auto" }, children: "\u2190 Liste" }), SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: titleOf(fiche) })] }), SP_JSX.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "16px", maxWidth: "640px" }, children: [SP_JSX.jsxs("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.8rem", opacity: 0.9, marginBottom: "12px" }, children: [fiche.platform ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: fiche.platform }) : null, fiche.emulator ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: fiche.emulator }) : null, SP_JSX.jsxs("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: [fiche.instance_count, " copie(s)"] }), fiche.is_favorite ? SP_JSX.jsx("span", { style: { background: "rgba(255,217,102,0.2)", borderRadius: "4px", padding: "2px 8px" }, children: "\u2605 Favori" }) : null] }), SP_JSX.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px", marginBottom: "18px" }, children: [SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "100%", justifyContent: "flex-start" }, onClick: () => { requestSearch(titleOf(fiche)); try {
                                        DFL.Router.Navigate(SEARCH_ROUTE);
                                    }
                                    catch { } }, children: "\uD83D\uDD0D Rechercher des guides pour ce jeu" }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "100%", justifyContent: "flex-start" }, onClick: () => void (async () => { try {
                                        await toggleLibraryFavorite(fiche.id);
                                        const its = await listLibraryItems();
                                        setItems(its);
                                        setFiche(its.find((x) => x.id === fiche.id) || null);
                                    }
                                    catch { } })(), children: fiche.is_favorite ? "☆ Retirer des favoris" : "★ Ajouter aux favoris" })] }), SP_JSX.jsxs("div", { style: { fontWeight: 700, color: theme.headingColor, marginBottom: "8px" }, children: ["Guides pour ce jeu (", rel.length, ")"] }), rel.length === 0 ? (SP_JSX.jsx("div", { style: { opacity: 0.75, fontSize: "0.85rem" }, children: "Aucun guide import\u00E9 pour ce jeu. Utilise \uD83D\uDD0D Rechercher depuis le menu Decky pour en importer un." })) : (SP_JSX.jsx("div", { style: { display: "flex", flexDirection: "column", gap: "8px", maxWidth: "520px" }, children: rel.map((g) => (SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "100%", justifyContent: "flex-start" }, onClick: () => openGuide(g.id), children: ["\u25B6 ", g.title, " ", g.site ? `· ${g.site}` : ""] }, g.id))) }))] })] }));
    }
    const gameGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" };
    const renderGameCard = (it) => {
        const nGuides = guidesForItem(it).length;
        return (SP_JSX.jsxs(DFL.Focusable, { onActivate: () => setFiche(it), style: {
                background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.borderColor}`,
                borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px", cursor: "pointer",
            }, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, fontSize: "1rem", color: theme.headingColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [it.is_favorite ? "★ " : "", titleOf(it)] }), SP_JSX.jsxs("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.72rem", opacity: 0.85 }, children: [it.platform ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }, children: it.platform }) : null, SP_JSX.jsx("span", { style: { background: nGuides > 0 ? "rgba(139,224,139,0.2)" : "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }, children: nGuides > 0 ? `${nGuides} guide(s)` : "aucun guide" })] })] }, it.id));
    };
    return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => safeNavigateBack(), style: { minWidth: "auto", width: "auto" }, children: "\u2190 Retour" }), SP_JSX.jsxs("div", { style: { fontWeight: 700, fontSize: "1.1rem" }, children: ["\uD83C\uDFAE Mes jeux (", filtered.length, "/", items.length, ")"] }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: refreshing, onClick: () => void (async () => {
                            setRefreshing(true);
                            try {
                                await rescanLibrary();
                                setItems(await listLibraryItems());
                            }
                            catch { /* keep old list */ }
                            finally {
                                setRefreshing(false);
                            }
                        })(), children: refreshing ? "⏳ Analyse…" : "🔄 Actualiser" }), SP_JSX.jsx("div", { style: { flex: 1 } }), SP_JSX.jsx("div", { style: { width: "200px" }, children: SP_JSX.jsx(DFL.TextField, { value: textFilter, onChange: (e) => setTextFilter(e.target.value), placeholder: "Filtrer\u2026", bShowClearAction: true }) }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: availablePlatforms.length <= 1, onClick: () => { const i = Math.max(0, availablePlatforms.indexOf(platformFilter)); setPlatformFilter(availablePlatforms[(i + 1) % availablePlatforms.length]); }, children: platformFilter ? `▸ ${platformFilter}` : "▸ Plateforme" }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => setGroupByPlatform((v) => !v), children: groupByPlatform ? "🗂 Groupé" : "🗂 Grouper" }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => setFavOnly((v) => !v), children: favOnly ? "★" : "☆" }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: availableLetters.length <= 1, onClick: () => setLetterFilter(availableLetters[(letterIdx + 1) % availableLetters.length]), children: letterLabel })] }), SP_JSX.jsx("div", { style: { flex: 1, overflowY: "auto", padding: "16px" }, children: loading ? (SP_JSX.jsx("div", { style: { padding: "24px", opacity: 0.8 }, children: "Chargement\u2026" })) : filtered.length === 0 ? (SP_JSX.jsx("div", { style: { padding: "24px", opacity: 0.8 }, children: items.length === 0 ? "Aucun jeu scanné. Configure les sources dans Réglages puis rescanne." : "Aucun jeu ne correspond au filtre." })) : groupByPlatform ? (SP_JSX.jsx("div", { style: { display: "flex", flexDirection: "column", gap: "18px" }, children: groupedByPlatform.map(([plat, its]) => (SP_JSX.jsxs("div", { children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, fontSize: "1.05rem", color: theme.headingColor, marginBottom: "8px", borderBottom: `1px solid ${theme.borderColor}`, paddingBottom: "4px" }, children: [plat, " ", SP_JSX.jsxs("span", { style: { opacity: 0.6, fontWeight: 400 }, children: ["(", its.length, ")"] })] }), SP_JSX.jsx(DFL.Focusable, { style: gameGridStyle, children: its.map(renderGameCard) })] }, plat))) })) : (SP_JSX.jsx(DFL.Focusable, { style: gameGridStyle, children: filtered.map(renderGameCard) })) })] }));
}
/**
 * v0.42.17 (Levier D): full-screen guide browser. A comfortable library
 * screen mounted on `/decky-offline-soluce/library` — full-width grid of guide
 * cards with text/letter filter + sort, so 20-30+ guides are easy to browse
 * (the cramped QAM prev/next cycling doesn't scale). Clicking a card opens that
 * guide in the reader route.
 */
function FullScreenLibrary() {
    const [guides, setGuides] = SP_REACT.useState([]);
    const [preferences, setPreferences] = SP_REACT.useState(null);
    const [loading, setLoading] = SP_REACT.useState(true);
    const [textFilter, setTextFilter] = SP_REACT.useState("");
    const [letterFilter, setLetterFilter] = SP_REACT.useState("");
    const [platformFilter, setPlatformFilter] = SP_REACT.useState(""); // v0.43.2
    const [sortMode, setSortMode] = SP_REACT.useState("recent");
    const [groupByGame, setGroupByGame] = SP_REACT.useState(false);
    // v0.43.1 (Phase 2a): guide fiche — clicking a card opens a detail panel with
    // Ouvrir + per-guide actions (re-download, reconstruct, clean, delete).
    const [ficheGuide, setFicheGuide] = SP_REACT.useState(null);
    const [ficheBusy, setFicheBusy] = SP_REACT.useState(false);
    const [ficheMsg, setFicheMsg] = SP_REACT.useState("");
    SP_REACT.useEffect(() => {
        (async () => {
            try {
                const [gs, prefs] = await Promise.all([listGuides(), getReaderPreferences()]);
                setGuides(gs);
                setPreferences(prefs);
            }
            catch { /* keep empty */ }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    // Refresh the guides list after an action (keeps the fiche in sync).
    const refreshGuides = async () => {
        try {
            const gs = await listGuides();
            setGuides(gs);
            return gs;
        }
        catch {
            return guides;
        }
    };
    const ficheAction = async (label, fn) => {
        if (!ficheGuide)
            return;
        setFicheBusy(true);
        setFicheMsg(`${label}…`);
        try {
            await fn(ficheGuide.id);
            const gs = await refreshGuides();
            const updated = gs.find((g) => g.id === ficheGuide.id) || null;
            setFicheGuide(updated);
            setFicheMsg(updated ? `${label} : OK` : `${label} : terminé`);
        }
        catch (e) {
            setFicheMsg(`${label} : échec — ${e instanceof Error ? e.message : e}`);
        }
        finally {
            setFicheBusy(false);
        }
    };
    // v0.43.2: B/back closes the fiche (returns to the list) instead of exiting the
    // whole full-screen route. When the fiche opens we push a history entry; the
    // Deck's B maps to history-back → popstate → we close the fiche and swallow it.
    SP_REACT.useEffect(() => {
        if (!ficheGuide)
            return;
        try {
            window.history.pushState({ osFiche: true }, "");
        }
        catch { }
        const onPop = () => setFicheGuide(null);
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [ficheGuide?.id]);
    const titleOf = (g) => (g.game.game_title || g.title || "").trim();
    const availableLetters = SP_REACT.useMemo(() => {
        const set = new Set();
        for (const g of guides) {
            const c = (titleOf(g)[0] || "").toUpperCase();
            set.add(/[A-Z]/.test(c) ? c : "#");
        }
        return ["", ...Array.from(set).sort()];
    }, [guides]);
    // v0.43.2: platforms actually present among the guides (for the platform filter).
    const availablePlatforms = SP_REACT.useMemo(() => {
        const set = new Set();
        for (const g of guides) {
            const p = (g.game.platform || "").trim();
            if (p)
                set.add(p);
        }
        return ["", ...Array.from(set).sort()];
    }, [guides]);
    const filtered = SP_REACT.useMemo(() => {
        const needle = textFilter.trim().toLowerCase();
        let list = guides.filter((g) => {
            if (needle) {
                const hay = `${g.title} ${g.game.game_title || ""} ${g.site || ""}`.toLowerCase();
                if (!hay.includes(needle))
                    return false;
            }
            if (platformFilter && (g.game.platform || "") !== platformFilter)
                return false;
            if (letterFilter) {
                const c = (titleOf(g)[0] || "").toUpperCase();
                if (letterFilter === "#") {
                    if (/[A-Z]/.test(c))
                        return false;
                }
                else if (c !== letterFilter)
                    return false;
            }
            return true;
        });
        if (sortMode === "name")
            list = list.slice().sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
        else if (sortMode === "platform")
            list = list.slice().sort((a, b) => (a.game.platform || "zzz").localeCompare(b.game.platform || "zzz") || titleOf(a).localeCompare(titleOf(b)));
        else
            list = list.slice().sort((a, b) => (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "") || titleOf(a).localeCompare(titleOf(b)));
        return list;
    }, [guides, textFilter, letterFilter, platformFilter, sortMode]);
    const theme = preferences ? themeStyle(preferences.theme)
        : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966"};
    const layoutStyle = {
        width: "100vw", height: "100vh",
        paddingTop: `${STEAM_UI_TOP_BAR_PX}px`, paddingBottom: `${STEAM_UI_BOTTOM_BAR_PX}px`,
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        background: theme.background, color: theme.textColor,
        fontFamily: preferences ? fontFamily(preferences.font_family) : undefined,
    };
    const headerStyle = {
        display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
        borderBottom: `1px solid ${theme.borderColor}`, background: "rgba(0,0,0,0.35)", flexShrink: 0,
    };
    const openGuide = (id) => {
        requestFullScreenGuide(id);
        try {
            DFL.Router.Navigate(FULL_SCREEN_ROUTE);
        }
        catch { }
    };
    const sortLabel = sortMode === "recent" ? "Récemment ouvert" : sortMode === "name" ? "Nom A→Z" : "Plateforme";
    const letterLabel = letterFilter === "" ? "Toutes" : letterFilter === "#" ? "#" : letterFilter;
    const letterIdx = Math.max(0, availableLetters.indexOf(letterFilter));
    const renderCard = (g) => {
        const pct = g.section_count > 0 && (g.progress?.last_section_index ?? -1) >= 0
            ? Math.round(100 * ((g.progress.last_section_index + 1) / g.section_count)) : 0;
        return (SP_JSX.jsxs(DFL.Focusable, { onActivate: () => { setFicheMsg(""); setFicheGuide(g); }, style: {
                background: "rgba(255,255,255,0.05)", border: `1px solid ${theme.borderColor}`,
                borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px",
                cursor: "pointer",
            }, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "1rem", color: theme.headingColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: groupByGame ? (g.title || g.game.game_title) : (g.game.game_title || g.title) }), SP_JSX.jsxs("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.72rem", opacity: 0.85 }, children: [g.game.platform ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }, children: g.game.platform }) : null, g.site ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }, children: g.site }) : null, SP_JSX.jsxs("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 6px" }, children: [g.section_count, " sect."] }), g.has_resume ? SP_JSX.jsx("span", { style: { background: "rgba(255,217,102,0.2)", borderRadius: "4px", padding: "1px 6px" }, children: "Reprise" }) : null] }), SP_JSX.jsx("div", { style: { height: "6px", background: "rgba(255,255,255,0.12)", borderRadius: "3px", overflow: "hidden" }, children: SP_JSX.jsx("div", { style: { width: `${pct}%`, height: "100%", background: theme.headingColor } }) })] }, g.id));
    };
    const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" };
    // v0.42.19: group filtered guides by game_title (for the "Grouper" mode).
    const grouped = SP_REACT.useMemo(() => {
        const map = new Map();
        for (const g of filtered) {
            const key = (g.game.game_title || g.title || "?").trim();
            (map.get(key) || map.set(key, []).get(key)).push(g);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filtered]);
    // v0.43.1: guide fiche — detail panel with Ouvrir + per-guide actions.
    if (ficheGuide) {
        const g = ficheGuide;
        const pct = g.section_count > 0 && (g.progress?.last_section_index ?? -1) >= 0
            ? Math.round(100 * ((g.progress.last_section_index + 1) / g.section_count)) : 0;
        const actBtn = { minWidth: "auto", width: "100%", justifyContent: "flex-start" };
        return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => setFicheGuide(null), style: { minWidth: "auto", width: "auto" }, children: "\u2190 Liste" }), SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: g.game.game_title || g.title })] }), SP_JSX.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "16px", maxWidth: "640px" }, children: [SP_JSX.jsxs("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "0.8rem", opacity: 0.9, marginBottom: "10px" }, children: [g.game.platform ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: g.game.platform }) : null, g.site ? SP_JSX.jsx("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: g.site }) : null, SP_JSX.jsxs("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: [g.section_count, " sections"] }), SP_JSX.jsxs("span", { style: { background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 8px" }, children: [g.page_count, " page(s)"] })] }), SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.8, marginBottom: "6px" }, children: g.title }), SP_JSX.jsx("div", { style: { height: "8px", background: "rgba(255,255,255,0.12)", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }, children: SP_JSX.jsx("div", { style: { width: `${pct}%`, height: "100%", background: theme.headingColor } }) }), ficheMsg ? SP_JSX.jsx("div", { style: { fontSize: "0.82rem", color: theme.headingColor, marginBottom: "12px" }, children: ficheMsg }) : null, SP_JSX.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }, children: [SP_JSX.jsx(DFL.DialogButton, { style: actBtn, disabled: ficheBusy, onClick: () => { openGuide(g.id); }, children: "\u25B6 Ouvrir le guide" }), SP_JSX.jsx(DFL.DialogButton, { style: actBtn, disabled: ficheBusy || !g.url, onClick: () => void ficheAction("Re-téléchargement", (id) => reloadGuideContent(id)), children: "\uD83D\uDD04 Re-t\u00E9l\u00E9charger" }), SP_JSX.jsx(DFL.DialogButton, { style: actBtn, disabled: ficheBusy, onClick: () => void ficheAction("Reconstruction", (id) => reconstructSections(id)), children: "\uD83D\uDD27 Reconstruire les sections" }), SP_JSX.jsx(DFL.DialogButton, { style: actBtn, disabled: ficheBusy, onClick: () => void ficheAction("Nettoyage", (id) => cleanExistingGuide(id)), children: "\uD83E\uDDF9 Nettoyer le contenu" }), SP_JSX.jsx(DFL.DialogButton, { style: { ...actBtn, borderColor: "rgba(255,100,100,0.4)" }, disabled: ficheBusy, onClick: () => void (async () => {
                                        setFicheBusy(true);
                                        setFicheMsg("Suppression…");
                                        try {
                                            await deleteGuide(g.id);
                                            await refreshGuides();
                                            setFicheGuide(null);
                                        }
                                        catch (e) {
                                            setFicheMsg(`Suppression : échec — ${e instanceof Error ? e.message : e}`);
                                        }
                                        finally {
                                            setFicheBusy(false);
                                        }
                                    })(), children: "\uD83D\uDDD1 Supprimer ce guide" })] })] })] }));
    }
    return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => safeNavigateBack(), style: { minWidth: "auto", width: "auto" }, children: "\u2190 Retour" }), SP_JSX.jsxs("div", { style: { fontWeight: 700, fontSize: "1.1rem" }, children: ["\uD83D\uDCDA Biblioth\u00E8que (", filtered.length, "/", guides.length, ")"] }), SP_JSX.jsx("div", { style: { flex: 1 } }), SP_JSX.jsx("div", { style: { width: "230px" }, children: SP_JSX.jsx(DFL.TextField, { value: textFilter, onChange: (e) => setTextFilter(e.target.value), placeholder: "Filtrer\u2026", bShowClearAction: true }) }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: availablePlatforms.length <= 1, onClick: () => { const i = Math.max(0, availablePlatforms.indexOf(platformFilter)); setPlatformFilter(availablePlatforms[(i + 1) % availablePlatforms.length]); }, children: platformFilter ? `▸ ${platformFilter}` : "▸ Plateforme" }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => setGroupByGame((v) => !v), children: groupByGame ? "🎮 Groupé" : "🎮 Grouper" }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => setSortMode((m) => m === "recent" ? "name" : m === "name" ? "platform" : "recent"), children: ["Tri : ", sortLabel] }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, disabled: availableLetters.length <= 1, onClick: () => setLetterFilter(availableLetters[(letterIdx + 1) % availableLetters.length]), children: letterLabel })] }), SP_JSX.jsx("div", { style: { flex: 1, overflowY: "auto", padding: "16px" }, children: loading ? (SP_JSX.jsx("div", { style: { padding: "24px", opacity: 0.8 }, children: "Chargement\u2026" })) : filtered.length === 0 ? (SP_JSX.jsx("div", { style: { padding: "24px", opacity: 0.8 }, children: guides.length === 0 ? "Aucun guide importé." : "Aucun guide ne correspond au filtre." })) : groupByGame ? (SP_JSX.jsx("div", { style: { display: "flex", flexDirection: "column", gap: "18px" }, children: grouped.map(([game, gs]) => (SP_JSX.jsxs("div", { children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, fontSize: "1.05rem", color: theme.headingColor, marginBottom: "8px", borderBottom: `1px solid ${theme.borderColor}`, paddingBottom: "4px" }, children: [game, " ", SP_JSX.jsxs("span", { style: { opacity: 0.6, fontWeight: 400 }, children: ["(", gs.length, ")"] })] }), SP_JSX.jsx(DFL.Focusable, { style: gridStyle, children: gs.map(renderCard) })] }, game))) })) : (SP_JSX.jsx(DFL.Focusable, { style: gridStyle, children: filtered.map(renderCard) })) })] }));
}
/**
 * Stand-alone full-page reading surface, mounted via routerHook on the
 * `/decky-offline-soluce/reader` route. Owns its own state — when the user
 * navigates back, progress is persisted and the QAM Content view will pick up
 * the latest record on its next refresh.
 */
function FullScreenReader() {
    const guideIdRef = SP_REACT.useRef(consumeFullScreenGuideId());
    const [guide, setGuide] = SP_REACT.useState(null);
    const [preferences, setPreferences] = SP_REACT.useState(null);
    const [sectionIndex, setSectionIndex] = SP_REACT.useState(-1);
    const [fontScale, setFontScale] = SP_REACT.useState(1.0);
    const [searchPattern, setSearchPattern] = SP_REACT.useState("");
    const [showSearch, setShowSearch] = SP_REACT.useState(false);
    const [showToc, setShowToc] = SP_REACT.useState(true);
    const [showDisplay, setShowDisplay] = SP_REACT.useState(false); // v0.43.4: display settings panel in the reader
    const [showFlags, setShowFlags] = SP_REACT.useState(false); // v0.43.33: "À ne pas rater" checklist
    const [confortOn, setConfortOn] = SP_REACT.useState(false); // v0.43.6: Confort Deck toggle
    const confortSnapRef = SP_REACT.useRef(null);
    // v0.43.6: page-scroll pulse — L1/R1 bump this; GuideReader scrolls ~80% of a screen.
    const [scrollPulse, setScrollPulse] = SP_REACT.useState({ n: 0, dir: 1 });
    const [loadError, setLoadError] = SP_REACT.useState("");
    const lastScrollFractionRef = SP_REACT.useRef(0);
    const restoreFractionRef = SP_REACT.useRef(null);
    const initialScrollRef = SP_REACT.useRef(true);
    // L4: state mirror of the scroll fraction so the intra-section progress bar can re-render.
    // Separate from the ref because the ref is updated on every scroll tick and we want React
    // to know about it.
    const [displayScrollFraction, setDisplayScrollFraction] = SP_REACT.useState(0);
    // v0.25: track which section indices we've already auto-marked as read this session
    // (avoids spamming setSectionNote on every scroll tick once the threshold is crossed).
    const autoMarkedRef = SP_REACT.useRef(new Set());
    // Mirror of latest section/font so the unmount cleanup persists the freshest values,
    // not the values captured at first effect run (closure trap on the [guide?.id]-only dep).
    const latestStateRef = SP_REACT.useRef({ sectionIndex: -1, fontScale: 1.0 });
    // v0.33: flag set by "Go to bookmark" so the section-change effect doesn't wipe
    // the restore fraction we just set.
    const intentionalRestoreRef = SP_REACT.useRef(false);
    // v0.33: scroll-debounced save timer ref — saves the latest position 1.5s after
    // the user stops scrolling, even if section doesn't change. Without this the
    // only persistence point was the unmount cleanup, which may not always fire.
    const scrollSaveTimerRef = SP_REACT.useRef(null);
    // v0.34: incremented on each "Go to bookmark" click. Passed to GuideReader as a
    // prop so the scroll-restore effect re-fires even when sectionIndex doesn't change
    // (clicking "Aller au marque-page" while already in that section).
    const [restoreGeneration, setRestoreGeneration] = SP_REACT.useState(0);
    // v0.34: last bookmark-click timestamp for cheap double-fire protection
    const lastBookmarkClickRef = SP_REACT.useRef(0);
    // v0.35: collapsible named-bookmarks panel — when ON the reader pane is replaced
    // by the list (saves space; OFF gives reader maximum width).
    const [showBookmarksPanel, setShowBookmarksPanel] = SP_REACT.useState(false);
    const [bookmarksBusy, setBookmarksBusy] = SP_REACT.useState(false);
    // Sidebar TOC UX state
    const [tocFilter, setTocFilter] = SP_REACT.useState("");
    const [collapsedParents, setCollapsedParents] = SP_REACT.useState(new Set());
    const [showHiddenSections, setShowHiddenSections] = SP_REACT.useState(false);
    // v0.43.34: bumped to make the reader scroll a highlighted match into view.
    const [findScrollGen, setFindScrollGen] = SP_REACT.useState(0);
    const [scrollMatchOcc, setScrollMatchOcc] = SP_REACT.useState(0);
    // v0.43.35: every occurrence of the reader search term across the guide, for the
    // "i / N" find navigation (prev/next). Recomputed only when the term/guide changes.
    const searchMatches = SP_REACT.useMemo(() => (guide ? computeSearchMatches(guide.content, guide.sections, searchPattern) : []), [guide, searchPattern]);
    const [searchMatchPos, setSearchMatchPos] = SP_REACT.useState(-1);
    // Go to the pos-th match (wraps): switch section, then focus its <mark>.
    const goToSearchMatch = (pos) => {
        if (searchMatches.length === 0)
            return;
        const p = ((pos % searchMatches.length) + searchMatches.length) % searchMatches.length;
        const m = searchMatches[p];
        setSearchMatchPos(p);
        setScrollMatchOcc(m.occ);
        setSectionIndex(m.section);
        setFindScrollGen((g) => g + 1);
    };
    // v0.43.34/35: jump from a sidebar body-match to the section AND focus the match.
    // Sets searchPattern (so the term highlights as <mark>), positions the find cursor
    // on that section's first hit, then bumps findScrollGen to scroll it into view.
    const jumpToContentMatch = (index) => {
        const needle = tocFilter.trim();
        setSearchPattern(needle);
        setShowSearch(true);
        const matches = computeSearchMatches(guide?.content || "", guide?.sections || [], needle);
        const pos = matches.findIndex((m) => m.section === index);
        setSearchMatchPos(pos);
        setScrollMatchOcc(pos >= 0 ? matches[pos].occ : 0);
        setSectionIndex(index);
        setFindScrollGen((g) => g + 1);
    };
    SP_REACT.useEffect(() => {
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
            }
            catch (e) {
                setLoadError(String(e?.message || e || "Erreur de chargement"));
            }
        })();
    }, []);
    // Keep the latest section/font mirrored in a ref so the unmount cleanup is accurate
    SP_REACT.useEffect(() => {
        latestStateRef.current = { sectionIndex, fontScale };
    }, [sectionIndex, fontScale]);
    // v0.43.6: controller shortcuts in the reader.
    //   L2 (28) / R2 (29) → previous / next SECTION
    //   L1 (30) / R1 (31) → scroll one screen up / down (~80%) within the section
    // Registered while a guide is loaded; unregistered on unmount.
    SP_REACT.useEffect(() => {
        if (!guide)
            return;
        const sc = window.SteamClient;
        const inputApi = sc?.Input;
        if (!inputApi?.RegisterForControllerInputMessages)
            return;
        const count = guide.sections.length;
        let active = true;
        const handle = inputApi.RegisterForControllerInputMessages((_idx, button, pressed) => {
            if (!active || !pressed)
                return;
            if (button === 28)
                setSectionIndex((v) => Math.max(0, v - 1)); // L2 → prev section
            else if (button === 29)
                setSectionIndex((v) => Math.min(count - 1, v + 1)); // R2 → next section
            else if (button === 30)
                setScrollPulse((p) => ({ n: p.n + 1, dir: -1 })); // L1 → page up
            else if (button === 31)
                setScrollPulse((p) => ({ n: p.n + 1, dir: 1 })); // R1 → page down
        });
        return () => { active = false; try {
            handle?.unregister?.();
        }
        catch { } };
    }, [guide?.id]);
    // Debounced persist on section / font / scroll changes
    SP_REACT.useEffect(() => {
        if (!guide)
            return;
        const t = setTimeout(() => {
            saveProgress(guide.id, sectionIndex, fontScale, lastScrollFractionRef.current).catch(() => { });
        }, 1500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sectionIndex, fontScale, guide?.id]);
    // Final persist on unmount — uses latestStateRef to capture values right before exit,
    // so "reprendre" lands exactly where the user left off even on fast back-presses.
    SP_REACT.useEffect(() => () => {
        if (guide) {
            const { sectionIndex: si, fontScale: fs } = latestStateRef.current;
            saveProgress(guide.id, si, fs, lastScrollFractionRef.current).catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guide?.id]);
    // Reset restore fraction AND last-scroll-fraction when section changes after initial load.
    // v0.32 fix: also reset lastScrollFractionRef so old section's scroll doesn't leak.
    // v0.33: preserve restoreFractionRef when "Go to bookmark" intentionally set it.
    SP_REACT.useEffect(() => {
        if (initialScrollRef.current) {
            initialScrollRef.current = false;
            return;
        }
        if (intentionalRestoreRef.current) {
            intentionalRestoreRef.current = false; // consume the flag, keep restoreFractionRef as-is
        }
        else {
            restoreFractionRef.current = 0;
        }
        lastScrollFractionRef.current = 0;
    }, [sectionIndex]);
    // v0.25: auto-mark a section as "lu" (done) when the user scrolls past ~97%.
    // Only fires once per section per mount. Preserves existing flagged/note when
    // promoting a section from "no note" to "done".
    SP_REACT.useEffect(() => {
        if (!guide || sectionIndex < 0)
            return;
        if (displayScrollFraction < 0.97)
            return;
        if (autoMarkedRef.current.has(sectionIndex))
            return;
        const existing = (guide.progress?.section_notes || []).find((n) => n.section_index === sectionIndex);
        autoMarkedRef.current.add(sectionIndex); // mark immediately to avoid re-fire
        if (existing?.done)
            return; // already done, nothing to persist
        const flagged = existing?.flagged ?? false;
        const note = existing?.note ?? "";
        void setSectionNote(guide.id, sectionIndex, true, flagged, note)
            .then((updated) => setGuide(updated))
            .catch(() => { autoMarkedRef.current.delete(sectionIndex); /* allow retry */ });
    }, [displayScrollFraction, sectionIndex, guide?.id]);
    // Reset the in-session "already marked" set when guide changes
    SP_REACT.useEffect(() => {
        autoMarkedRef.current = new Set();
    }, [guide?.id]);
    const theme = preferences ? themeStyle(preferences.theme) : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)", headingColor: "#ffd966", preBg: "rgba(0,0,0,0.3)", preText: "#ddd" };
    const layoutStyle = {
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
    const headerStyle = {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px",
        borderBottom: `1px solid ${theme.borderColor}`,
        background: "rgba(0,0,0,0.35)",
        flexShrink: 0,
    };
    const sidebarStyle = {
        // v0.43.5: trimmed 300→240px to give the text column ~60px more width.
        width: "240px",
        overflowY: "auto",
        overflowX: "hidden",
        borderRight: `1px solid ${theme.borderColor}`,
        background: "rgba(0,0,0,0.18)",
        flexShrink: 0,
    };
    const mainAreaStyle = {
        flex: 1,
        display: "flex",
        overflow: "hidden",
    };
    const readerPaneStyle = {
        flex: 1,
        padding: "12px 16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
    };
    const footerStyle = {
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
    const hdrBtnStyle = {
        minWidth: "auto", width: "auto", padding: "6px 12px", flexShrink: 0,
    };
    if (loadError) {
        return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => safeNavigateBack(), children: "\u2190 Retour" }), SP_JSX.jsx("div", { style: { flex: 1, fontWeight: 700 }, children: "Lecteur plein \u00E9cran" })] }), SP_JSX.jsx("div", { style: { padding: "24px", fontSize: "0.95rem" }, children: loadError })] }));
    }
    if (!guide || !preferences) {
        return (SP_JSX.jsx("div", { style: layoutStyle, children: SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => safeNavigateBack(), children: "\u2190 Retour" }), SP_JSX.jsx("div", { style: { flex: 1, fontWeight: 700 }, children: "Chargement\u2026" })] }) }));
    }
    const sectionCount = guide.sections.length;
    const currentSection = sectionIndex >= 0 ? guide.sections[sectionIndex] : null;
    const sectionLabel = currentSection ? currentSection.title : "—";
    // v0.43.4: apply + persist a reader preference change live (theme, font,
    // line-height, width, highlight, numbered). Updates local state so the reader
    // re-renders instantly, then persists to the backend.
    const savePrefs = (next) => {
        setPreferences(next);
        try {
            void updateReaderPreferences(next.theme, next.font_family, next.line_height, next.max_width, next.highlight_keywords, next.numbered_sections, next.resume_hotkey || "", typeof next.resume_button === "number" ? next.resume_button : -1, next.resume_enabled !== false, next.render_bold !== false);
        }
        catch { /* keep local change even if persist fails */ }
    };
    const cyclePref = (key, choices) => {
        const i = choices.indexOf(preferences[key]);
        savePrefs({ ...preferences, [key]: choices[(i + 1) % choices.length] });
    };
    // v0.43.6: Confort Deck is a TOGGLE — first click applies the comfort combo +
    // hides the sidebar (snapshotting the prior state); second click restores it.
    const toggleConfort = () => {
        if (!confortOn) {
            confortSnapRef.current = { prefs: preferences, font: fontScale, toc: showToc };
            savePrefs({ ...preferences, font_family: "sans", line_height: "airy", max_width: "normal" });
            setFontScale(1.1);
            setShowToc(false);
            setConfortOn(true);
        }
        else {
            const s = confortSnapRef.current;
            if (s) {
                savePrefs(s.prefs);
                setFontScale(s.font);
                setShowToc(s.toc);
            }
            else {
                setShowToc(true);
            }
            confortSnapRef.current = null;
            setConfortOn(false);
        }
    };
    const prefLabels = {
        dark: "Sombre", sepia: "Sépia", sans: "Sans", serif: "Serif", mono: "Mono",
        tight: "Serré", normal: "Normal", airy: "Aéré", narrow: "Étroit", full: "Plein",
    };
    return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => safeNavigateBack(), children: "\u2190" }), SP_JSX.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: guide.game.game_title || guide.title }), SP_JSX.jsx("div", { style: { fontSize: "0.78rem", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: sectionCount > 0 && sectionIndex >= 0
                                    ? `Section ${sectionIndex + 1}/${sectionCount} · ${sectionLabel}`
                                    : "Aucune section" })] }), SP_JSX.jsx(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setShowToc((v) => !v), children: "\uD83D\uDCDA" }), SP_JSX.jsxs(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setShowBookmarksPanel((v) => !v), children: ["\uD83D\uDD16", (guide.progress?.named_bookmarks?.length || 0) > 0 ? ` ${guide.progress.named_bookmarks.length}` : ""] }), SP_JSX.jsx(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setFontScale((v) => Math.max(0.85, +(v - 0.1).toFixed(2))), children: "A\u2212" }), SP_JSX.jsx(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setFontScale((v) => Math.min(2.0, +(v + 0.1).toFixed(2))), children: "A+" }), SP_JSX.jsx(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setShowDisplay((v) => !v), children: "\u2699" }), SP_JSX.jsx(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setShowSearch((v) => !v), children: "\uD83D\uDD0D" }), (guide.important_flags?.length || 0) > 0 ? (SP_JSX.jsxs(DFL.DialogButton, { style: hdrBtnStyle, onClick: () => setShowFlags((v) => !v), children: ["\u26A0\uFE0F", (() => { const n = guide.important_flags.filter((f) => f.category === "missable").length; return n > 0 ? ` ${n}` : ""; })()] })) : null] }), showFlags && (guide.important_flags?.length || 0) > 0 ? (SP_JSX.jsxs("div", { style: { padding: "10px 16px", background: "rgba(0,0,0,0.35)", flexShrink: 0, maxHeight: "40vh", overflowY: "auto" }, children: [SP_JSX.jsx("div", { style: { fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px", color: "#ffd966" }, children: "\u26A0\uFE0F \u00C0 ne pas rater dans ce guide" }), ["missable", "key_item", "side_quest"].map((cat) => {
                        const catFlags = guide.important_flags.filter((f) => f.category === cat);
                        if (!catFlags.length)
                            return null;
                        const meta = HIGHLIGHT_CATEGORIES.find((c) => c.category === cat);
                        const label = cat === "missable" ? "Manquables / point de non-retour" : cat === "key_item" ? "Objets clés / uniques" : "Quêtes secondaires / optionnel";
                        return (SP_JSX.jsxs("div", { style: { marginBottom: "10px" }, children: [SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", fontWeight: 700, color: meta.color, marginBottom: "4px" }, children: [meta.icon, " ", label, " (", catFlags.length, ")"] }), catFlags.map((f, i) => (SP_JSX.jsxs(DFL.Focusable, { onActivate: () => { setSectionIndex(f.section_index >= 0 ? f.section_index : sectionIndex); setShowFlags(false); }, style: {
                                        padding: "6px 8px", marginBottom: "3px", borderRadius: "5px", cursor: "pointer",
                                        background: "rgba(255,255,255,0.05)", borderLeft: `3px solid ${meta.color}`,
                                        fontSize: "0.76rem", lineHeight: 1.3,
                                    }, children: [SP_JSX.jsx("div", { style: { opacity: 0.6, fontSize: "0.68rem" }, children: f.section_index >= 0 && guide.sections[f.section_index] ? `▸ ${guide.sections[f.section_index].title.slice(0, 34)}` : "▸ (guide)" }), SP_JSX.jsx("div", { children: f.snippet })] }, `${cat}-${i}`)))] }, cat));
                    })] })) : null, showDisplay ? (SP_JSX.jsxs("div", { style: { padding: "10px 16px", background: "rgba(0,0,0,0.3)", flexShrink: 0, display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }, children: [SP_JSX.jsx("span", { style: { fontSize: "0.8rem", opacity: 0.7 }, children: "Affichage :" }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => cyclePref("theme", ["dark", "sepia"]), children: ["Th\u00E8me : ", prefLabels[preferences.theme]] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => cyclePref("font_family", ["sans", "serif", "mono"]), children: ["Police : ", prefLabels[preferences.font_family]] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => cyclePref("line_height", ["tight", "normal", "airy"]), children: ["Interligne : ", prefLabels[preferences.line_height]] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => cyclePref("max_width", ["narrow", "normal", "full"]), children: ["Largeur : ", prefLabels[preferences.max_width]] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => savePrefs({ ...preferences, highlight_keywords: !preferences.highlight_keywords }), children: ["Surlignage : ", preferences.highlight_keywords ? "Oui" : "Non"] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => savePrefs({ ...preferences, render_bold: preferences.render_bold === false }), children: ["Gras : ", preferences.render_bold !== false ? "Oui" : "Non"] }), SP_JSX.jsxs(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: () => savePrefs({ ...preferences, numbered_sections: !preferences.numbered_sections }), children: ["Num\u00E9ros : ", preferences.numbered_sections ? "Oui" : "Non"] }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "auto", width: "auto" }, onClick: toggleConfort, children: confortOn ? "🛋 Confort ✓ (désactiver)" : "🛋 Confort Deck" })] })) : null, showSearch ? (SP_JSX.jsxs("div", { style: { padding: "8px 16px", background: "rgba(0,0,0,0.25)", flexShrink: 0 }, children: [SP_JSX.jsx(DFL.TextField, { value: searchPattern, onChange: (e) => { setSearchPattern(e.target.value); setSearchMatchPos(-1); }, placeholder: "Rechercher dans le guide\u2026", bShowClearAction: true }), searchPattern.trim().length >= 2 ? (SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }, children: [SP_JSX.jsx("span", { style: { fontSize: "0.8rem", opacity: 0.85, minWidth: "96px" }, children: searchMatches.length === 0
                                    ? "Aucun résultat"
                                    : `${searchMatchPos < 0 ? "—" : searchMatchPos + 1} / ${searchMatches.length} occurrence${searchMatches.length > 1 ? "s" : ""}` }), SP_JSX.jsx(DFL.DialogButton, { disabled: searchMatches.length === 0, onClick: () => goToSearchMatch(searchMatchPos < 0 ? searchMatches.length - 1 : searchMatchPos - 1), style: { minWidth: "52px", padding: "4px 8px" }, children: "\u25B2" }), SP_JSX.jsx(DFL.DialogButton, { disabled: searchMatches.length === 0, onClick: () => goToSearchMatch(searchMatchPos < 0 ? 0 : searchMatchPos + 1), style: { minWidth: "52px", padding: "4px 8px" }, children: "\u25BC" })] })) : null] })) : null, SP_JSX.jsxs("div", { style: mainAreaStyle, children: [showToc ? (SP_JSX.jsx(TocSidebar, { guide: guide, preferences: preferences, theme: theme, sidebarStyle: sidebarStyle, sectionIndex: sectionIndex, setSectionIndex: setSectionIndex, tocFilter: tocFilter, setTocFilter: setTocFilter, collapsedParents: collapsedParents, setCollapsedParents: setCollapsedParents, showHiddenSections: showHiddenSections, setShowHiddenSections: setShowHiddenSections, onJumpToMatch: jumpToContentMatch })) : null, SP_JSX.jsxs("div", { style: readerPaneStyle, children: [showBookmarksPanel ? (SP_JSX.jsx(NamedBookmarksPanel, { guide: guide, currentSectionIndex: sectionIndex, currentScrollFraction: lastScrollFractionRef.current, busy: bookmarksBusy, theme: theme, onClose: () => setShowBookmarksPanel(false), onAdd: async () => {
                                    if (!guide)
                                        return;
                                    setBookmarksBusy(true);
                                    try {
                                        const sec = guide.sections[sectionIndex];
                                        const secTitle = (sec?.title || "Début").slice(0, 40);
                                        const now = new Date();
                                        const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                                        const name = `${secTitle} — ${hhmm}`;
                                        const updated = await addNamedBookmark(guide.id, name, sectionIndex, lastScrollFractionRef.current);
                                        setGuide(updated);
                                        try {
                                            toaster.toast({ title: "Marque-page ajouté", body: name, duration: 2500 });
                                        }
                                        catch { }
                                    }
                                    catch (e) {
                                        try {
                                            toaster.toast({ title: "Ajout KO", body: String(e?.message || e), critical: true, duration: 4000 });
                                        }
                                        catch { }
                                    }
                                    finally {
                                        setBookmarksBusy(false);
                                    }
                                }, onDelete: async (bookmarkId) => {
                                    if (!guide)
                                        return;
                                    setBookmarksBusy(true);
                                    try {
                                        const updated = await deleteNamedBookmark(guide.id, bookmarkId);
                                        setGuide(updated);
                                    }
                                    catch (e) {
                                        try {
                                            toaster.toast({ title: "Suppression KO", body: String(e?.message || e), critical: true, duration: 3500 });
                                        }
                                        catch { }
                                    }
                                    finally {
                                        setBookmarksBusy(false);
                                    }
                                }, onGoTo: (bm) => {
                                    restoreFractionRef.current = bm.scroll_fraction || 0;
                                    intentionalRestoreRef.current = true;
                                    setRestoreGeneration((g) => g + 1);
                                    setSectionIndex(bm.section_index >= 0 ? bm.section_index : 0);
                                    setShowBookmarksPanel(false); // auto-close so user sees content
                                    try {
                                        toaster.toast({ title: bm.name, body: `Section ${(bm.section_index >= 0 ? bm.section_index : 0) + 1} · ${Math.round((bm.scroll_fraction || 0) * 100)}%`, duration: 1800 });
                                    }
                                    catch { }
                                } })) : (SP_JSX.jsx(SP_JSX.Fragment, { children: SP_JSX.jsx("div", { style: {
                                        height: "3px",
                                        background: "rgba(255,255,255,0.08)",
                                        borderRadius: "2px",
                                        marginBottom: "6px",
                                        overflow: "hidden",
                                        flexShrink: 0,
                                    }, children: SP_JSX.jsx("div", { style: {
                                            width: `${Math.round(displayScrollFraction * 100)}%`,
                                            height: "100%",
                                            background: "#ffd966",
                                            transition: "width 80ms linear",
                                        } }) }) })), !showBookmarksPanel ? (SP_JSX.jsx(GuideReader, { guide: guide, sectionIndex: sectionIndex, fontScale: fontScale, preferences: preferences, searchPattern: searchPattern, scrollRestoreFraction: restoreFractionRef.current, restoreGeneration: restoreGeneration, onScrollChange: (f) => {
                                    lastScrollFractionRef.current = f;
                                    setDisplayScrollFraction(f);
                                    if (restoreFractionRef.current !== null)
                                        restoreFractionRef.current = null;
                                    // v0.33: debounce-save 1.5s after scroll stops so position is persisted
                                    // even if user exits without triggering the unmount cleanup.
                                    if (scrollSaveTimerRef.current !== null)
                                        window.clearTimeout(scrollSaveTimerRef.current);
                                    scrollSaveTimerRef.current = window.setTimeout(() => {
                                        if (!guide)
                                            return;
                                        const si = latestStateRef.current.sectionIndex;
                                        const fs = latestStateRef.current.fontScale;
                                        saveProgress(guide.id, si, fs, lastScrollFractionRef.current).catch(() => { });
                                    }, 1500);
                                }, maxHeight: `calc(100vh - ${240 + (showSearch ? 50 : 0) + (showDisplay ? 50 : 0)}px)`, onJumpToSection: (idx) => setSectionIndex(idx), scrollPulse: scrollPulse, scrollToFirstMatch: findScrollGen, scrollMatchOcc: scrollMatchOcc })) : null] })] }), SP_JSX.jsxs("div", { style: footerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { disabled: sectionIndex <= 0, onClick: () => setSectionIndex((v) => Math.max(0, v - 1)), children: "\u25C0 Section pr\u00E9c\u00E9dente" }), SP_JSX.jsx("div", { style: { flex: 1, textAlign: "center", fontSize: "0.78rem", opacity: 0.7 }, children: sectionCount > 0 && sectionIndex >= 0 ? `${sectionIndex + 1} / ${sectionCount}` : "" }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => {
                            // v0.34: double-fire protection — ignore clicks within 800ms of last one
                            const now = Date.now();
                            if (now - lastBookmarkClickRef.current < 800) {
                                try {
                                    console.log("[Offline Soluce] bookmark click ignored (debounce)");
                                }
                                catch { }
                                return;
                            }
                            lastBookmarkClickRef.current = now;
                            if (!guide)
                                return;
                            const sec = sectionIndex;
                            const frac = lastScrollFractionRef.current;
                            // Log with a stack trace fragment so we can identify accidental triggers
                            try {
                                const stack = new Error().stack?.split("\n").slice(1, 4).join(" → ") || "(no stack)";
                                console.log("[Offline Soluce] set bookmark click", { sec, frac, stack });
                            }
                            catch { }
                            void setBookmark(guide.id, sec, frac)
                                .then((g) => {
                                setGuide(g);
                                try {
                                    toaster.toast({ title: "Marque-page posé", body: `Section ${sec + 1} · position ${Math.round(frac * 100)}%`, duration: 2500 });
                                }
                                catch { }
                            })
                                .catch((err) => {
                                try {
                                    toaster.toast({ title: "Marque-page KO", body: String(err?.message || err), critical: true, duration: 4000 });
                                }
                                catch { }
                            });
                        }, children: "\uD83D\uDD16 Poser marque-page" }), guide.progress?.bookmark_set_at ? (SP_JSX.jsx(DFL.DialogButton, { onClick: () => {
                            const tgtSection = guide.progress?.bookmark_section_index ?? -1;
                            const tgtScroll = guide.progress?.bookmark_scroll_fraction ?? 0;
                            if (tgtSection < 0)
                                return;
                            try {
                                console.log("[Offline Soluce] go to bookmark", { tgtSection, tgtScroll, currentSection: sectionIndex });
                            }
                            catch { }
                            // Set restore fraction + flag so the section-change effect doesn't wipe it
                            restoreFractionRef.current = tgtScroll;
                            intentionalRestoreRef.current = true;
                            // Bump generation FIRST so even if sectionIndex doesn't change (same section
                            // case), the GuideReader's effect re-fires and restores the scroll.
                            setRestoreGeneration((g) => g + 1);
                            setSectionIndex(tgtSection);
                            try {
                                toaster.toast({ title: "Marque-page", body: `Section ${tgtSection + 1} · ${Math.round(tgtScroll * 100)}%`, duration: 2000 });
                            }
                            catch { }
                        }, children: "\uD83D\uDCCD Aller au marque-page" })) : null, currentSection ? (() => {
                        const currentTitle = (currentSection.title || "").trim();
                        const currentIsHidden = currentTitle.length > 0
                            && (guide.progress?.hidden_section_titles || []).includes(currentTitle);
                        return (SP_JSX.jsx(DFL.DialogButton, { onClick: () => {
                                if (!currentTitle)
                                    return;
                                void toggleSectionHidden(guide.id, sectionIndex)
                                    .then((updated) => setGuide(updated))
                                    .catch(() => { });
                            }, disabled: !currentTitle, children: currentIsHidden ? "👁 Afficher" : "🙈 Masquer" }));
                    })() : null, SP_JSX.jsx("div", { style: { flex: 1 } }), SP_JSX.jsx(DFL.DialogButton, { disabled: sectionCount === 0 || sectionIndex >= sectionCount - 1, onClick: () => setSectionIndex((v) => Math.min(sectionCount - 1, v + 1)), children: "Section suivante \u25B6" })] })] }));
}
// ========== Global hotkey listener ==========
// Controller button indices the user can pick for the "open last guide" trigger.
// Sourced from ControllerInputGamepadButton enum in @decky/ui Input.d.ts.
// We focus on the back paddles + bumpers + special buttons — the analog/dpad/face
// buttons are kept for Steam UI navigation so binding our action to them would
// hijack the UI.
const RESUME_BUTTON_CHOICES = [
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
let _currentResumeButton = -1;
function setCurrentResumeButton(btn) {
    _currentResumeButton = Number.isFinite(btn) ? btn : -1;
}
// v0.40: master enable/disable for the resume action. Same mirror pattern.
let _currentResumeEnabled = true;
function setCurrentResumeEnabled(enabled) {
    _currentResumeEnabled = !!enabled;
}
// v0.40: transient guard set while the QAM is in "capture a palette" mode.
// Suppresses the main resume action so the captured press doesn't ALSO open
// a guide. Not persisted — purely a runtime mute.
let _captureInProgress = false;
function setCaptureInProgress(active) {
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
// v0.43.37: non-blocking "this import looks empty/junk" notice. Mirrors the backend
// _guide_quality_warning (keep the thresholds in sync). Empty string = looks fine.
function guideJunkWarning(sectionCount, wordCount) {
    if (sectionCount < 2 || wordCount < 150) {
        return `⚠️ Ce guide semble vide ou incomplet (${sectionCount} section${sectionCount > 1 ? "s" : ""}, ${wordCount} mots). Ouvre-le pour vérifier — supprime-le s'il est inutilisable.`;
    }
    return "";
}
function ActiveImports() {
    const [jobs, setJobs] = SP_REACT.useState([]);
    SP_REACT.useEffect(() => {
        let alive = true;
        const poll = async () => {
            try {
                const j = await listImports();
                if (alive)
                    setJobs(j);
            }
            catch { }
        };
        void poll();
        const t = window.setInterval(poll, 2000);
        return () => { alive = false; window.clearInterval(t); };
    }, []);
    if (!jobs.length)
        return null;
    const running = jobs.filter((j) => j.state === "running");
    const finished = jobs.filter((j) => j.state !== "running");
    const openGuide = (id) => {
        requestFullScreenGuide(id);
        try {
            DFL.Router.CloseSideMenus();
        }
        catch { }
        try {
            DFL.Router.Navigate(FULL_SCREEN_ROUTE);
        }
        catch { }
    };
    const clear = (jobId) => {
        void dismissImport(jobId).catch(() => { });
        setJobs((js) => js.filter((x) => x.job_id !== jobId));
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Imports en cours", children: [running.map((j) => {
                const pct = j.total > 0 ? Math.min(100, Math.round((100 * j.done) / Math.max(1, j.total))) : 0;
                return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { width: "100%", fontSize: "0.82rem" }, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: ["\u23F3 ", j.title] }), SP_JSX.jsxs("div", { style: { opacity: 0.8, fontSize: "0.76rem" }, children: [j.msg, j.total > 0 ? ` — ${j.done}/${j.total}` : ""] }), j.total > 0 ? (SP_JSX.jsx("div", { style: { height: 5, background: "rgba(255,255,255,0.15)", borderRadius: 3, marginTop: 5 }, children: SP_JSX.jsx("div", { style: { height: "100%", width: `${pct}%`, background: "#8be08b", borderRadius: 3, transition: "width 0.4s" } }) })) : null] }) }, j.job_id));
            }), finished.map((j) => {
                // v0.43.37: junk warning is for a NORMAL download only — never a Re-DL
                // (redl- jobs), even though both share this panel. Re-DL = refreshing a
                // guide the user already has, so no "this looks empty" notice.
                const isRedl = j.job_id.startsWith("redl-");
                const showWarn = j.state === "done" && !!j.warning && !isRedl;
                return (SP_JSX.jsxs("div", { children: [showWarn ? (
                        // Non-blocking: the guide is kept; the user opens it to check and
                        // deletes it from the guide menu if useless.
                        SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: {
                                    width: "100%", fontSize: "0.76rem", lineHeight: 1.3, color: "#ffcf66",
                                    background: "rgba(255,180,0,0.10)", border: "1px solid rgba(255,180,0,0.35)",
                                    borderRadius: 6, padding: "6px 8px",
                                }, children: j.warning }) })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => { if (j.state === "done" && j.guide_id)
                                    openGuide(j.guide_id); clear(j.job_id); }, children: j.state === "done"
                                    ? `${showWarn ? "⚠️" : "✓"} ${j.title.slice(0, 30)} — ouvrir (${j.section_count} sect.)`
                                    : `⚠ ${j.title.slice(0, 24)} : ${(j.error || "échec").slice(0, 26)}` }) })] }, j.job_id));
            })] }));
}
// ========== Main Content component ==========
function Content() {
    // Core state
    const [activeView, setActiveView] = SP_REACT.useState("home");
    const [guides, setGuides] = SP_REACT.useState([]);
    const [selectedGuide, setSelectedGuide] = SP_REACT.useState(null);
    const [sources, setSources] = SP_REACT.useState([]);
    const [libraryStatus, setLibraryStatus] = SP_REACT.useState({
        scanned_at: "", item_count: 0, instance_count: 0, enabled_source_count: 0,
    });
    const [libraryItems, setLibraryItems] = SP_REACT.useState([]);
    const [searchResults, setSearchResults] = SP_REACT.useState([]);
    const [error, setError] = SP_REACT.useState("");
    const [isBusy, setIsBusy] = SP_REACT.useState(false);
    const [isHydratingGuide, setIsHydratingGuide] = SP_REACT.useState(false);
    // Index state
    const [sourceIndex, setSourceIndex] = SP_REACT.useState(0);
    const [kindIndex, setKindIndex] = SP_REACT.useState(0);
    const [storageIndex, setStorageIndex] = SP_REACT.useState(0);
    const [platformIndex, setPlatformIndex] = SP_REACT.useState(0);
    const [libraryIndex, setLibraryIndex] = SP_REACT.useState(0);
    const [searchSiteIndex, setSearchSiteIndex] = SP_REACT.useState(0);
    const [languageIndex, setLanguageIndex] = SP_REACT.useState(0);
    const [searchResultIndex, setSearchResultIndex] = SP_REACT.useState(0);
    // v0.27: free-text search input + multi-site filter
    const [searchQuery, setSearchQuery] = SP_REACT.useState("");
    // Sites the user wants in the result list. Empty = no filter (= "all"). Filters CLIENT-SIDE
    // after the backend returns up to ~12 results across all sites — no extra network calls.
    const [searchSiteFilter, setSearchSiteFilter] = SP_REACT.useState(new Set());
    const [guideIndex, setGuideIndex] = SP_REACT.useState(0);
    const [relatedGuideIndex, setRelatedGuideIndex] = SP_REACT.useState(0);
    const [selectedSectionIndex, setSelectedSectionIndex] = SP_REACT.useState(-1);
    const [fontScale, setFontScale] = SP_REACT.useState(1);
    const [isRenaming, setIsRenaming] = SP_REACT.useState(false);
    const [renameCandidateIndex, setRenameCandidateIndex] = SP_REACT.useState(0);
    const [debugOutput, setDebugOutput] = SP_REACT.useState("");
    const [sortByName, setSortByName] = SP_REACT.useState(true);
    const [letterFilter, setLetterFilter] = SP_REACT.useState(""); // "" = all; otherwise single uppercase char
    const [showFavoritesOnly, setShowFavoritesOnly] = SP_REACT.useState(false);
    // v0.42.13: filter + sort for the GUIDES view (A+B). Text filter, letter
    // filter, and a 3-way sort so 20-30 guides stay navigable.
    const [guideTextFilter, setGuideTextFilter] = SP_REACT.useState("");
    const [guideLetterFilter, setGuideLetterFilter] = SP_REACT.useState("");
    const [guideSortMode, setGuideSortMode] = SP_REACT.useState("recent");
    // v0.43.44: library cleanup scan results (null = not yet scanned)
    const [junkGuides, setJunkGuides] = SP_REACT.useState(null);
    const runJunkScan = async () => {
        setIsBusy(true);
        try {
            setJunkGuides(await findJunkGuides());
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Scan impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const deleteJunkGuide = async (id) => {
        setIsBusy(true);
        try {
            await deleteGuide(id);
            setJunkGuides((prev) => (prev || []).filter((g) => g.id !== id));
            try {
                setGuides(await listGuides());
            }
            catch { }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Suppression impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    // Reader preferences
    const [preferences, setPreferences] = SP_REACT.useState({
        theme: "dark", font_family: "sans", line_height: "normal",
        max_width: "normal", highlight_keywords: true, numbered_sections: true,
        render_bold: true,
        resume_hotkey: "", resume_button: -1, resume_enabled: true,
    });
    // Reading features
    const [findPresetIndex, setFindPresetIndex] = SP_REACT.useState(0);
    const [findPattern, setFindPattern] = SP_REACT.useState("");
    const [findMatches, setFindMatches] = SP_REACT.useState([]);
    const [findIndex, setFindIndex] = SP_REACT.useState(0);
    const [showToc, setShowToc] = SP_REACT.useState(false);
    const [tocIndex, setTocIndex] = SP_REACT.useState(0);
    const [showBookmarks, setShowBookmarks] = SP_REACT.useState(false);
    const [bookmarkIndex, setBookmarkIndex] = SP_REACT.useState(0);
    const [exportFiles, setExportFiles] = SP_REACT.useState([]);
    const [backupConfig, setBackupConfigState] = SP_REACT.useState(null);
    // v0.30/v0.31: cycle through predefined hotkey choices + test mode (toast every controller button received)
    const [hotkeyTestMode, setHotkeyTestMode] = SP_REACT.useState(false);
    // v0.32: remember the last button pressed during test mode so user can bind it without knowing its index
    const [lastTestButton, setLastTestButton] = SP_REACT.useState(null);
    const [exportIndex, setExportIndex] = SP_REACT.useState(0);
    const [showExports, setShowExports] = SP_REACT.useState(false);
    const saveTimeoutRef = SP_REACT.useRef(null);
    const lastScrollFractionRef = SP_REACT.useRef(0);
    const pendingRestoreFractionRef = SP_REACT.useRef(null);
    const [scrollRestoreToken, setScrollRestoreToken] = SP_REACT.useState(0);
    const [expandedReader, setExpandedReader] = SP_REACT.useState(false);
    // Recompute the restore fraction whenever a caller bumps the token.
    // This triggers a re-render so the GuideReader sees the new value.
    const scrollRestoreFraction = SP_REACT.useMemo(() => pendingRestoreFractionRef.current, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollRestoreToken]);
    const platformChoices = SP_REACT.useMemo(() => {
        const dynamic = Array.from(new Set(libraryItems.map((item) => item.platform || "Autre"))).sort((a, b) => a.localeCompare(b));
        return ["Tous", ...dynamic];
    }, [libraryItems]);
    const filteredItems = SP_REACT.useMemo(() => {
        const kindFilter = KIND_CHOICES[kindIndex] || "Tous";
        const storageFilter = STORAGE_CHOICES[storageIndex] || "Tous";
        const platformFilter = platformChoices[platformIndex] || "Tous";
        const items = libraryItems.filter((item) => {
            if (showFavoritesOnly && !item.is_favorite)
                return false;
            if (kindFilter !== "Tous") {
                const kindMap = { "ROMs": "roms", "Games": "games", "Steam": "steam" };
                const wanted = kindMap[kindFilter] || "";
                if (wanted && !item.source_kinds.includes(wanted))
                    return false;
            }
            if (storageFilter !== "Tous" && !item.storages.includes(storageFilter))
                return false;
            if (platformFilter !== "Tous" && item.platform !== platformFilter)
                return false;
            if (letterFilter) {
                const title = (item.custom_title || item.title || "").trim();
                if (!title)
                    return false;
                const firstChar = title
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .charAt(0)
                    .toUpperCase();
                if (letterFilter === "#") {
                    // "#" bucket = non-alphabetic initials (digits, symbols)
                    if (/^[A-Z]$/.test(firstChar))
                        return false;
                }
                else if (firstChar !== letterFilter) {
                    return false;
                }
            }
            return true;
        });
        const getTitle = (item) => (item.custom_title || item.title || "").toLowerCase();
        if (sortByName)
            items.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
        else
            items.sort((a, b) => {
                const pa = (a.platform || "").localeCompare(b.platform || "");
                return pa !== 0 ? pa : getTitle(a).localeCompare(getTitle(b));
            });
        return items;
    }, [kindIndex, storageIndex, platformIndex, libraryItems, platformChoices, sortByName, letterFilter, showFavoritesOnly]);
    // Letters that actually have at least one matching game (ignoring letterFilter itself)
    const availableLetters = SP_REACT.useMemo(() => {
        const present = new Set();
        for (const item of libraryItems) {
            if (showFavoritesOnly && !item.is_favorite)
                continue;
            const title = (item.custom_title || item.title || "").trim();
            if (!title)
                continue;
            const firstChar = title
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .charAt(0)
                .toUpperCase();
            if (/^[A-Z]$/.test(firstChar))
                present.add(firstChar);
            else
                present.add("#");
        }
        // Always prepend "" (= all) and sort alphabetically with "#" last
        const sorted = Array.from(present).sort((a, b) => {
            if (a === "#")
                return 1;
            if (b === "#")
                return -1;
            return a.localeCompare(b);
        });
        return ["", ...sorted]; // "" = Tous
    }, [libraryItems, showFavoritesOnly]);
    const selectedSource = sources[sourceIndex] || null;
    const selectedLibraryItem = filteredItems[libraryIndex] || null;
    const relatedGuides = SP_REACT.useMemo(() => {
        if (!selectedLibraryItem)
            return [];
        return guides.filter((guide) => guideMatchesLibraryItem(guide, selectedLibraryItem));
    }, [guides, selectedLibraryItem]);
    const selectedRelatedGuide = relatedGuides[relatedGuideIndex] || null;
    const renameCandidates = SP_REACT.useMemo(() => {
        if (!selectedLibraryItem)
            return [];
        const candidates = new Set();
        candidates.add(selectedLibraryItem.title);
        if (selectedLibraryItem.custom_title)
            candidates.add(selectedLibraryItem.custom_title);
        for (const alias of selectedLibraryItem.aliases)
            if (alias)
                candidates.add(alias);
        const title = selectedLibraryItem.custom_title || selectedLibraryItem.title;
        const dashSplit = title.split(/\s*[-:]\s*/);
        if (dashSplit.length > 1 && dashSplit[0].length >= 3)
            candidates.add(dashSplit[0].trim());
        return Array.from(candidates).filter((c) => c.length >= 2);
    }, [selectedLibraryItem]);
    const selectedSearchSite = SEARCH_SITE_CHOICES[searchSiteIndex] || SEARCH_SITE_CHOICES[0];
    const selectedLanguage = LANGUAGE_CHOICES[languageIndex] || LANGUAGE_CHOICES[0];
    // v0.42.13: apply text + letter filter and sort to the guides list.
    const guideTitleOf = (g) => (g.game.game_title || g.title || "").trim();
    const filteredGuides = SP_REACT.useMemo(() => {
        const needle = guideTextFilter.trim().toLowerCase();
        let list = guides.filter((g) => {
            // Text filter: match title OR game_title OR site
            if (needle) {
                const hay = `${g.title} ${g.game.game_title || ""} ${g.site || ""}`.toLowerCase();
                if (!hay.includes(needle))
                    return false;
            }
            // Letter filter on the display title's first character
            if (guideLetterFilter) {
                const first = (guideTitleOf(g)[0] || "").toUpperCase();
                if (guideLetterFilter === "#") {
                    if (/[A-Z]/.test(first))
                        return false; // keep only non-letters
                }
                else if (first !== guideLetterFilter) {
                    return false;
                }
            }
            return true;
        });
        if (guideSortMode === "name") {
            list = list.slice().sort((a, b) => guideTitleOf(a).localeCompare(guideTitleOf(b)));
        }
        else if (guideSortMode === "platform") {
            list = list.slice().sort((a, b) => {
                const pa = a.game.platform || "zzz", pb = b.game.platform || "zzz";
                return pa.localeCompare(pb) || guideTitleOf(a).localeCompare(guideTitleOf(b));
            });
        }
        else {
            // recent: most-recently-opened first, then never-opened by name
            list = list.slice().sort((a, b) => (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || "")
                || guideTitleOf(a).localeCompare(guideTitleOf(b)));
        }
        return list;
    }, [guides, guideTextFilter, guideLetterFilter, guideSortMode]);
    // Letters that actually have at least one guide (for the A-Z cycle).
    const guideAvailableLetters = SP_REACT.useMemo(() => {
        const set = new Set();
        for (const g of guides) {
            const first = (guideTitleOf(g)[0] || "").toUpperCase();
            set.add(/[A-Z]/.test(first) ? first : "#");
        }
        return ["", ...Array.from(set).sort()];
    }, [guides]);
    const selectedGuideSummary = filteredGuides[guideIndex] || null;
    // A5: similar-guides suggestions for the currently selected guide
    const similarGuides = SP_REACT.useMemo(() => findSimilarGuides(selectedGuideSummary, guides), [selectedGuideSummary, guides]);
    // Most-recently-opened guide across the whole library (for the "Resume" banner)
    const lastOpenedGuide = SP_REACT.useMemo(() => {
        let best = null;
        for (const g of guides) {
            const when = g.progress?.last_opened_at || "";
            if (!when)
                continue;
            if (!best || when > (best.progress?.last_opened_at || ""))
                best = g;
        }
        return best;
    }, [guides]);
    const currentSectionLabel = selectedSectionIndex < 0
        ? "texte complet"
        : selectedGuide?.sections[selectedSectionIndex]?.title ?? "section";
    const currentSectionNote = SP_REACT.useMemo(() => {
        if (!selectedGuide || selectedSectionIndex < 0)
            return null;
        return selectedGuide.progress.section_notes.find((n) => n.section_index === selectedSectionIndex) || null;
    }, [selectedGuide, selectedSectionIndex]);
    const sectionsWithNotes = SP_REACT.useMemo(() => {
        if (!selectedGuide)
            return new Set();
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
        }
        catch {
            // keep defaults
        }
    };
    SP_REACT.useEffect(() => {
        void (async () => {
            try {
                await loadAll();
            }
            catch (e) {
                setError(e instanceof Error ? e.message : "Chargement initial impossible");
            }
            // A2: load backup config (non-blocking, separate from loadAll because not all users use it)
            try {
                const cfg = await getBackupConfig();
                setBackupConfigState(cfg);
            }
            catch { /* silent — backup is optional */ }
        })();
        return () => {
            if (saveTimeoutRef.current !== null)
                window.clearTimeout(saveTimeoutRef.current);
        };
    }, []);
    // v0.31 / v0.40: capture mode — listen for the next controller press and remember
    // its raw button index so the user can bind a SPECIFIC palette (L4 vs L5, etc.),
    // not just the LBACK/RBACK group exposed by the preset list. Sets the module-level
    // `_captureInProgress` flag while active so the main resume listener stays muted
    // (otherwise the captured press would ALSO trigger the resume action).
    SP_REACT.useEffect(() => {
        if (!hotkeyTestMode) {
            setCaptureInProgress(false);
            return;
        }
        setCaptureInProgress(true);
        const sc = window.SteamClient;
        const inputApi = sc?.Input;
        if (!inputApi?.RegisterForControllerInputMessages) {
            try {
                toaster.toast({ title: "Capture KO", body: "SteamClient.Input indisponible", duration: 3500, critical: true });
            }
            catch { }
            setCaptureInProgress(false);
            return;
        }
        let lastToastAt = 0;
        let active = true; // v0.33: guard against unregister failing to free the listener
        const unregisterable = inputApi.RegisterForControllerInputMessages((idx, button, pressed) => {
            if (!active)
                return;
            if (!pressed)
                return;
            // Remember the last button so user can confirm without typing.
            setLastTestButton(button);
            // Rate-limit toasts so a held paddle doesn't spam
            const now = Date.now();
            if (now - lastToastAt < 350)
                return;
            lastToastAt = now;
            try {
                toaster.toast({
                    title: "Bouton capté",
                    body: `#${button} — confirme dans le QAM`,
                    duration: 2500,
                });
            }
            catch { }
            try {
                console.log("[Offline Soluce] capture button:", { idx, button });
            }
            catch { }
        });
        return () => {
            active = false; // disable callback even if unregister doesn't work
            try {
                unregisterable?.unregister?.();
            }
            catch { }
            setCaptureInProgress(false);
        };
    }, [hotkeyTestMode]);
    SP_REACT.useEffect(() => { if (sourceIndex >= sources.length)
        setSourceIndex(0); }, [sourceIndex, sources.length]);
    SP_REACT.useEffect(() => { if (libraryIndex >= filteredItems.length)
        setLibraryIndex(0); }, [libraryIndex, filteredItems.length]);
    SP_REACT.useEffect(() => { if (guideIndex >= filteredGuides.length)
        setGuideIndex(0); }, [guideIndex, filteredGuides.length]);
    // v0.43.3: the game-library "search for this game" now opens the full-screen
    // search route directly (FullScreenSearch consumes the query on mount), so no
    // QAM interval is needed. The old QAM "search" view remains for manual use.
    SP_REACT.useEffect(() => { if (searchResultIndex >= searchResults.length)
        setSearchResultIndex(0); }, [searchResultIndex, searchResults.length]);
    SP_REACT.useEffect(() => { if (relatedGuideIndex >= relatedGuides.length)
        setRelatedGuideIndex(0); }, [relatedGuideIndex, relatedGuides.length]);
    SP_REACT.useEffect(() => { if (platformIndex >= platformChoices.length)
        setPlatformIndex(0); }, [platformIndex, platformChoices.length]);
    // Debounced progress save
    SP_REACT.useEffect(() => {
        if (!selectedGuide || isHydratingGuide)
            return;
        if (saveTimeoutRef.current !== null)
            window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
            void (async () => {
                try {
                    const updated = await saveProgress(selectedGuide.id, selectedSectionIndex, fontScale, lastScrollFractionRef.current);
                    setSelectedGuide((c) => (c && c.id === updated.id ? updated : c));
                    setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
                }
                catch (e) {
                    setError(e instanceof Error ? e.message : "Impossible de sauvegarder la progression");
                }
            })();
        }, 400);
    }, [selectedGuide?.id, selectedSectionIndex, fontScale, isHydratingGuide]);
    // ========== Handlers ==========
    const openGuideById = async (guideId) => {
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
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Lecture impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleToggleCurrentSource = async () => {
        if (!selectedSource)
            return;
        setIsBusy(true);
        setError("");
        try {
            await toggleScanSource(selectedSource.id);
            await loadSourcesAndLibrary();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible de modifier la source");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleRescan = async () => {
        setIsBusy(true);
        setError("");
        try {
            const status = await rescanLibrary();
            setLibraryStatus(status);
            await loadSourcesAndLibrary();
            setSearchResults([]);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Rescan impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleStartRename = () => {
        if (!selectedLibraryItem)
            return;
        setRenameCandidateIndex(0);
        setIsRenaming(true);
    };
    const handleConfirmRename = async () => {
        if (!selectedLibraryItem || !renameCandidates.length)
            return;
        const chosen = renameCandidates[renameCandidateIndex] || selectedLibraryItem.title;
        setIsBusy(true);
        setError("");
        try {
            const newTitle = chosen === selectedLibraryItem.title ? "" : chosen;
            await renameLibraryItem(selectedLibraryItem.id, newTitle);
            setIsRenaming(false);
            await loadSourcesAndLibrary();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Renommage impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleCancelRename = () => { setIsRenaming(false); setRenameCandidateIndex(0); };
    const handleToggleFavorite = async () => {
        if (!selectedLibraryItem)
            return;
        setIsBusy(true);
        setError("");
        try {
            const result = await toggleLibraryFavorite(selectedLibraryItem.id);
            // Patch local state — no need to rescan the whole library
            setLibraryItems((items) => items.map((it) => (it.id === result.id ? { ...it, is_favorite: result.is_favorite } : it)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible de modifier le favori");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleDebug = async () => {
        setIsBusy(true);
        setError("");
        try {
            const info = await debugInfo();
            setDebugOutput(JSON.stringify(info, null, 2));
        }
        catch (e) {
            setDebugOutput(e instanceof Error ? e.message : "Debug impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleTestNetwork = async () => {
        setIsBusy(true);
        setError("");
        try {
            const info = await testNetwork();
            setDebugOutput(JSON.stringify(info, null, 2));
        }
        catch (e) {
            setDebugOutput(e instanceof Error ? e.message : "Test réseau impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleTestSearch = async () => {
        setIsBusy(true);
        setError("");
        try {
            const q = selectedLibraryItem
                ? `${selectedLibraryItem.custom_title || selectedLibraryItem.title} ${selectedLibraryItem.platform} walkthrough guide`
                : "Suikoden III PS2 faq walkthrough";
            const info = await testSearch(q);
            setDebugOutput(JSON.stringify(info, null, 2));
        }
        catch (e) {
            setDebugOutput(e instanceof Error ? e.message : "Test de recherche impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleClearDebug = async () => {
        setIsBusy(true);
        try {
            await clearDebugLog();
            setDebugOutput("Debug log effacé.");
        }
        catch (e) {
            setDebugOutput(e instanceof Error ? e.message : "Impossible d'effacer");
        }
        finally {
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
        setIsBusy(true);
        setError("");
        try {
            // v0.42.1: respect the selected site picker. When "all", backend does
            // a generic search and filters post-hoc. When specific (e.g. "ign"),
            // backend prepends site:DOMAIN so the engine returns only that site.
            const results = await searchGuides(effectiveQuery, effectivePlatform, selectedSearchSite.value, selectedLanguage.value);
            setSearchResults(results);
            setSearchResultIndex(0);
            if (!results.length)
                setError("Aucun résultat. Change de langue ou affine le titre, puis relance.");
        }
        catch (e) {
            setSearchResults([]);
            setError(e instanceof Error ? e.message : "Recherche impossible");
        }
        finally {
            setIsBusy(false);
        }
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
    const handleImportResultDirect = async (result) => {
        setIsBusy(true);
        setError("");
        try {
            let importTitle;
            let importPlatform;
            let importRomHint;
            let importAliases;
            let importEmulator;
            // Determine if the user's typed query reflects intent that overrides
            // the silently-selected library item.
            const query = searchQuery.trim();
            const libTitle = selectedLibraryItem
                ? (selectedLibraryItem.custom_title || selectedLibraryItem.title)
                : "";
            const queryMatchesLib = query && libTitle && (query.toLowerCase().includes(libTitle.toLowerCase()) ||
                libTitle.toLowerCase().includes(query.toLowerCase()));
            if (selectedLibraryItem && (!query || queryMatchesLib)) {
                // Library item is the intent (no query, or query aligns with it).
                importTitle = libTitle;
                importPlatform = selectedLibraryItem.platform;
                importRomHint = selectedLibraryItem.primary_path || importTitle;
                importAliases = selectedLibraryItem.aliases.join("; ");
                importEmulator = selectedLibraryItem.emulator || "";
            }
            else {
                // Free-text search import: use the query (or fallback to result title) as game_title.
                importTitle = (query || result.title).slice(0, 120);
                importPlatform = "Autre";
                importRomHint = importTitle;
                importAliases = "";
                importEmulator = "";
            }
            const detail = await saveGuide(result.url, importTitle, importPlatform, importRomHint, importAliases, importEmulator);
            // v0.43.37: warn (don't block) if the import looks empty/junk — keep the
            // guide open so the user can inspect and delete it if it's useless.
            const wordCount = (detail.content || "").trim().split(/\s+/).filter(Boolean).length;
            const warn = guideJunkWarning(detail.sections?.length ?? 0, wordCount);
            if (warn) {
                try {
                    toaster.toast({ title: "Guide à vérifier", body: warn, duration: 7000 });
                }
                catch { }
            }
            await loadAll();
            setGuideIndex(0);
            setSearchResults([]);
            setSearchResultIndex(0);
            setActiveView("guides");
            setIsHydratingGuide(true);
            setSelectedGuide(detail);
            setSelectedSectionIndex(detail.progress.last_section_index ?? -1);
            setFontScale(detail.progress.font_scale ?? 1);
            window.setTimeout(() => setIsHydratingGuide(false), 0);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Import impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    /** v0.27: toggle a site in the multi-site filter */
    const toggleSearchSite = (siteLabel) => {
        setSearchSiteFilter((prev) => {
            const next = new Set(prev);
            if (next.has(siteLabel))
                next.delete(siteLabel);
            else
                next.add(siteLabel);
            return next;
        });
    };
    const handleDeleteSelectedGuide = async () => {
        if (!selectedGuideSummary)
            return;
        setIsBusy(true);
        setError("");
        try {
            await deleteGuide(selectedGuideSummary.id);
            if (selectedGuide?.id === selectedGuideSummary.id) {
                setSelectedGuide(null);
                setSelectedSectionIndex(-1);
            }
            const guideItems = await listGuides();
            setGuides(guideItems);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Suppression impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleSetBookmark = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        try {
            let effectiveSection = selectedSectionIndex;
            if (effectiveSection < 0 && selectedGuide.sections.length > 0) {
                effectiveSection = 0;
                setSelectedSectionIndex(0);
            }
            const updated = await setBookmark(selectedGuide.id, effectiveSection, lastScrollFractionRef.current);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible d'enregistrer le marque-page");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleGoToBookmark = () => {
        if (!selectedGuide || !selectedGuide.has_bookmark)
            return;
        const idx = selectedGuide.progress.bookmark_section_index;
        const frac = selectedGuide.progress.bookmark_scroll_fraction || 0;
        pendingRestoreFractionRef.current = frac;
        setScrollRestoreToken((t) => t + 1);
        setSelectedSectionIndex(idx >= 0 ? idx : 0);
    };
    const handleResumeReading = () => {
        if (!selectedGuide)
            return;
        const idx = selectedGuide.progress.last_section_index;
        const frac = selectedGuide.progress.last_scroll_fraction || 0;
        pendingRestoreFractionRef.current = frac;
        setScrollRestoreToken((t) => t + 1);
        setSelectedSectionIndex(idx >= 0 ? idx : 0);
    };
    const handleClearBookmark = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        try {
            const updated = await clearBookmark(selectedGuide.id);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible d'effacer le marque-page");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleClearProgress = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        try {
            const updated = await clearProgress(selectedGuide.id);
            setSelectedGuide(updated);
            setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
            setFontScale(updated.progress.font_scale ?? 1);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible d'effacer la progression");
        }
        finally {
            setIsBusy(false);
        }
    };
    // Find-in-guide
    const handleRunFind = async () => {
        if (!selectedGuide)
            return;
        const preset = FIND_PRESETS[findPresetIndex];
        const pattern = preset?.pattern.trim() || "";
        if (pattern.length < 2) {
            setError("Choisis un mot-clé à chercher.");
            return;
        }
        setIsBusy(true);
        setError("");
        try {
            const result = await findInGuide(selectedGuide.id, pattern);
            setFindPattern(pattern);
            setFindMatches(result.matches);
            setFindIndex(0);
            if (result.matches.length === 0)
                setError(`Aucune occurrence de "${pattern}".`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Recherche impossible");
            setFindMatches([]);
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleReconstructSections = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        try {
            const updated = await reconstructSections(selectedGuide.id);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
            // Reset reader state because section indices changed
            setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Reconstruction impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handlePolishAllGuides = async () => {
        setIsBusy(true);
        setError("");
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
            }
            catch { }
            // Build a compact human-readable report for the debugOutput pane
            const lines = [];
            lines.push(`Traités: ${summary.guides_processed} guides — ` +
                `${summary.total_chars_removed.toLocaleString()} chars retirés, ` +
                `${summary.total_titles_changed} titres modifiés`);
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
                lines.push(`${flag} ${(g.title || g.guide_id).slice(0, 35).padEnd(35)} ` +
                    `[${(g.site || "?").padEnd(20)}] ` +
                    `chars ${(g.before_chars || 0)}→${(g.after_chars || 0)} (-${cr.toLocaleString()}), ` +
                    `sect ${(g.before_sections || 0)}→${(g.after_sections || 0)}, ` +
                    `titles_changed=${tc}`);
            }
            setDebugOutput(lines.join("\n"));
            try {
                toaster.toast({
                    title: "Nettoyage terminé",
                    body: `${summary.guides_processed} guides traités, ${summary.total_titles_changed} titres modifiés, ${summary.total_chars_removed.toLocaleString()} chars retirés`,
                    duration: 5000,
                });
            }
            catch { }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Nettoyage en lot impossible");
            setDebugOutput("");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleCleanExistingGuide = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
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
            const pctDisplay = pctRaw === 0
                ? "0%"
                : pctRaw < 1
                    ? `${pctRaw.toFixed(2)}%`
                    : pctRaw < 10
                        ? `${pctRaw.toFixed(1)}%`
                        : `${Math.round(pctRaw)}%`;
            setDebugOutput(`Nettoyé : ${beforeChars}→${afterChars} chars ` +
                `(−${charsRemoved.toLocaleString()} = ${pctDisplay}), ` +
                `${beforeSecs}→${afterSecs} sections.`);
            let body;
            if (charsRemoved > 0) {
                body = `${charsRemoved.toLocaleString()} caractères retirés (${pctDisplay})`;
                if (secsRemoved > 0)
                    body += `, ${secsRemoved} sections fusionnées`;
                else if (secsRemoved < 0)
                    body += `, ${-secsRemoved} sections ajoutées`;
            }
            else if (charsRemoved === 0 && secsRemoved !== 0) {
                body = `Contenu déjà propre — ${beforeSecs}→${afterSecs} sections recalculées`;
            }
            else {
                body = `Aucun changement (déjà propre)`;
            }
            try {
                toaster.toast({ title: "Guide nettoyé", body, duration: 3500 });
            }
            catch { }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Nettoyage impossible");
            setDebugOutput("");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleReloadGuideContent = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        setDebugOutput("Re-téléchargement en cours…");
        try {
            const updated = await reloadGuideContent(selectedGuide.id);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
            setSelectedSectionIndex(updated.progress.last_section_index ?? -1);
            setDebugOutput(`Re-téléchargement OK : ${updated.page_count} page(s), ${updated.section_count} section(s) — méthode ${updated.detection_method || "?"}`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Re-téléchargement impossible (ancien contenu conservé)");
            setDebugOutput("");
        }
        finally {
            setIsBusy(false);
        }
    };
    // v0.42.12: re-download the CURRENTLY SELECTED summary without needing to
    // open the guide first. Wired to a button in the top guide-selection panel
    // so re-download is one click away (the "Lecture offline" button is buried
    // far down and only appears after opening the guide).
    const handleReloadSelectedSummary = async () => {
        if (!selectedGuideSummary)
            return;
        setIsBusy(true);
        setError("");
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
            try {
                toaster.toast({ title: "Re-téléchargé", body: `${updated.page_count} page(s), ${updated.section_count} section(s)`, duration: 3000 });
            }
            catch { }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Re-téléchargement impossible (ancien contenu conservé)");
            setDebugOutput("");
        }
        finally {
            setIsBusy(false);
        }
    };
    const goToMatch = (idx) => {
        if (!selectedGuide || findMatches.length === 0)
            return;
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
    const jumpToSection = (idx) => {
        if (!selectedGuide)
            return;
        pendingRestoreFractionRef.current = 0;
        setScrollRestoreToken((t) => t + 1);
        setSelectedSectionIndex(idx);
        setShowToc(false);
    };
    // Named bookmarks
    const handleAddNamedBookmark = async () => {
        if (!selectedGuide)
            return;
        // Auto-name from current section + current time — no keyboard needed
        const section = selectedSectionIndex >= 0 ? selectedGuide.sections[selectedSectionIndex] : null;
        const secTitle = section ? section.title.slice(0, 40) : "Début";
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const name = `${secTitle} — ${hhmm}`;
        setIsBusy(true);
        setError("");
        try {
            const updated = await addNamedBookmark(selectedGuide.id, name, selectedSectionIndex, lastScrollFractionRef.current);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible d'ajouter le marque-page");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleDeleteNamedBookmark = async (bookmarkId) => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        try {
            const updated = await deleteNamedBookmark(selectedGuide.id, bookmarkId);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Suppression impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleGoToNamedBookmark = (bm) => {
        if (!selectedGuide)
            return;
        pendingRestoreFractionRef.current = bm.scroll_fraction || 0;
        setScrollRestoreToken((t) => t + 1);
        setSelectedSectionIndex(bm.section_index >= 0 ? bm.section_index : 0);
    };
    // Section notes
    const handleToggleDone = async () => {
        if (!selectedGuide || selectedSectionIndex < 0)
            return;
        const existing = currentSectionNote;
        setIsBusy(true);
        setError("");
        try {
            const updated = await setSectionNote(selectedGuide.id, selectedSectionIndex, !(existing?.done || false), existing?.flagged || false, existing?.note || "");
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleToggleFlag = async () => {
        if (!selectedGuide || selectedSectionIndex < 0)
            return;
        const existing = currentSectionNote;
        setIsBusy(true);
        setError("");
        try {
            const updated = await setSectionNote(selectedGuide.id, selectedSectionIndex, existing?.done || false, !(existing?.flagged || false), existing?.note || "");
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleClearSectionNote = async () => {
        if (!selectedGuide || selectedSectionIndex < 0)
            return;
        setIsBusy(true);
        setError("");
        try {
            const updated = await clearSectionNote(selectedGuide.id, selectedSectionIndex);
            setSelectedGuide(updated);
            setGuides((c) => c.map((i) => (i.id === updated.id ? updated : i)));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    // Preferences
    const savePrefs = async (next) => {
        setPreferences(next);
        // Sync the global controller listener immediately (no wait for backend round-trip)
        setCurrentResumeButton(typeof next.resume_button === "number" ? next.resume_button : -1);
        setCurrentResumeEnabled(next.resume_enabled !== false);
        try {
            await updateReaderPreferences(next.theme, next.font_family, next.line_height, next.max_width, next.highlight_keywords, next.numbered_sections, next.resume_hotkey || "", typeof next.resume_button === "number" ? next.resume_button : -1, next.resume_enabled !== false, next.render_bold !== false);
        }
        catch (e) {
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
    const toggleBold = () => void savePrefs({ ...preferences, render_bold: preferences.render_bold === false });
    const toggleNumbered = () => void savePrefs({ ...preferences, numbered_sections: !preferences.numbered_sections });
    // External URL
    const handleOpenExternal = async () => {
        if (!selectedGuide?.url)
            return;
        setIsBusy(true);
        setError("");
        try {
            await openUrlExternal(selectedGuide.url);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Impossible d'ouvrir dans le navigateur");
        }
        finally {
            setIsBusy(false);
        }
    };
    // Export / Import
    const handleExportCurrent = async () => {
        if (!selectedGuide)
            return;
        setIsBusy(true);
        setError("");
        try {
            const result = await exportGuide(selectedGuide.id);
            setDebugOutput(`Exporté : ${result.path} (${bytesToKo(result.size_bytes)})`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Export impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleExportAll = async () => {
        setIsBusy(true);
        setError("");
        try {
            const result = await exportAllGuides();
            setDebugOutput(`Export complet : ${result.path} (${result.guide_count} guides, ${bytesToKo(result.size_bytes)})`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Export impossible");
        }
        finally {
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
        const errors = [];
        // Snapshot the list (loadAll() at the end will refresh state, but we iterate over a stable copy)
        const snapshot = guides.slice();
        for (let i = 0; i < snapshot.length; i++) {
            const g = snapshot[i];
            setDebugOutput(`Re-téléchargement ${i + 1}/${total}: ${g.title} (${g.site}) …`);
            try {
                await reloadGuideContent(g.id);
                ok++;
            }
            catch (e) {
                failed++;
                errors.push(`• ${g.title}: ${e?.message || String(e)}`);
            }
        }
        try {
            await loadAll();
        }
        catch { }
        const summary = `Terminé : ${ok} OK / ${failed} échec(s) sur ${total} guide(s).`;
        setDebugOutput(failed > 0 ? `${summary}\n\nÉchecs :\n${errors.join("\n")}` : summary);
        setIsBusy(false);
    };
    // A2 auto-backup handlers
    const handleToggleBackupEnabled = async () => {
        if (!backupConfig)
            return;
        try {
            const next = await setBackupConfig(!backupConfig.enabled, backupConfig.interval_days);
            setBackupConfigState(next);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Toggle backup impossible");
        }
    };
    const handleCycleBackupInterval = async () => {
        if (!backupConfig)
            return;
        const i = BACKUP_INTERVAL_CHOICES.indexOf(backupConfig.interval_days);
        const next_i = i < 0 ? 0 : (i + 1) % BACKUP_INTERVAL_CHOICES.length;
        try {
            const next = await setBackupConfig(backupConfig.enabled, BACKUP_INTERVAL_CHOICES[next_i]);
            setBackupConfigState(next);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Changement intervalle impossible");
        }
    };
    const handleRunBackupNow = async () => {
        setIsBusy(true);
        setError("");
        setDebugOutput("Backup en cours…");
        try {
            const result = await runBackupNow();
            setBackupConfigState(result.config);
            setDebugOutput(`Backup OK : ${result.path}\n${result.guide_count} guides, ${bytesToKo(result.size_bytes)}`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Backup manuel impossible");
            setDebugOutput("");
        }
        finally {
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
        const errors = [];
        const snapshot = guides.slice();
        for (let i = 0; i < snapshot.length; i++) {
            const g = snapshot[i];
            setDebugOutput(`Reconstruction sommaire ${i + 1}/${total}: ${g.title} …`);
            try {
                await reconstructSections(g.id);
                ok++;
            }
            catch (e) {
                failed++;
                errors.push(`• ${g.title}: ${e?.message || String(e)}`);
            }
        }
        try {
            await loadAll();
        }
        catch { }
        const summary = `Reconstruction terminée : ${ok} OK / ${failed} échec(s) sur ${total} guide(s). Aucun re-téléchargement réseau, juste re-segmentation locale.`;
        setDebugOutput(failed > 0 ? `${summary}\n\nÉchecs :\n${errors.join("\n")}` : summary);
        setIsBusy(false);
    };
    const handleListExports = async () => {
        setIsBusy(true);
        setError("");
        try {
            const files = await listExportFiles();
            setExportFiles(files);
            setExportIndex(0);
            setShowExports(true);
            if (!files.length)
                setError("Aucun export dans ~/Documents/OfflineSoluce/exports");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Liste impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleImportSelectedExport = async () => {
        const entry = exportFiles[exportIndex];
        if (!entry)
            return;
        setIsBusy(true);
        setError("");
        try {
            const result = await importGuideFromPath(entry.path);
            setDebugOutput(`Importé : ${result.imported_count} guide(s)`);
            await loadAll();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Import impossible");
        }
        finally {
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
        if (activeView === "home")
            return null;
        return (SP_JSX.jsx(DFL.PanelSection, { title: VIEW_LABELS[activeView] || activeView, children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setActiveView("home"), children: "\u2190 Accueil" }) }) }));
    };
    // v0.43.0: the launcher — quick access to the most-used actions instead of
    // cycling through 4 dense views. Reprendre / Bibliothèque plein écran /
    // Rechercher / Récents / Réglages.
    const renderHomeView = () => {
        const recents = [...guides]
            .filter((g) => g.progress?.last_opened_at)
            .sort((a, b) => (b.progress.last_opened_at || "").localeCompare(a.progress.last_opened_at || ""))
            .slice(0, 5);
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(ActiveImports, {}), SP_JSX.jsxs(DFL.PanelSection, { title: "Offline Soluce", children: [lastOpenedGuide ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                    requestFullScreenGuide(lastOpenedGuide.id);
                                    try {
                                        DFL.Router.CloseSideMenus();
                                    }
                                    catch { }
                                    DFL.Router.Navigate(FULL_SCREEN_ROUTE);
                                }, children: ["\u25B6 Reprendre : ", (lastOpenedGuide.game.game_title || lastOpenedGuide.title).slice(0, 30)] }) })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => {
                                    try {
                                        DFL.Router.CloseSideMenus();
                                    }
                                    catch { }
                                    DFL.Router.Navigate(LIBRARY_ROUTE);
                                }, children: ["\uD83D\uDCDA Biblioth\u00E8que plein \u00E9cran (", guides.length, ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                    try {
                                        DFL.Router.CloseSideMenus();
                                    }
                                    catch { }
                                    DFL.Router.Navigate(GAME_LIBRARY_ROUTE);
                                }, children: "\uD83C\uDFAE Mes jeux install\u00E9s (plein \u00E9cran)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                    try {
                                        DFL.Router.CloseSideMenus();
                                    }
                                    catch { }
                                    DFL.Router.Navigate(SEARCH_ROUTE);
                                }, children: "\uD83D\uDD0D Rechercher un guide (plein \u00E9cran)" }) })] }), recents.length > 0 ? (SP_JSX.jsx(DFL.PanelSection, { title: "R\u00E9cents", children: recents.map((g) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                requestFullScreenGuide(g.id);
                                try {
                                    DFL.Router.CloseSideMenus();
                                }
                                catch { }
                                DFL.Router.Navigate(FULL_SCREEN_ROUTE);
                            }, children: (g.game.game_title || g.title).slice(0, 34) }) }, g.id))) })) : null, SP_JSX.jsxs(DFL.PanelSection, { title: " ", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setActiveView("guides"), children: "\uD83D\uDDC2\uFE0F G\u00E9rer les guides (QAM)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setActiveView("sources"), children: "\u2699\uFE0F R\u00E9glages \u00B7 sources \u00B7 sauvegarde" }) })] })] }));
    };
    const renderSourcesView = () => (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSection, { title: "Biblioth\u00E8que de jeux (scan ROMs)", children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setActiveView("library"), children: "\uD83C\uDFAE Parcourir mes jeux install\u00E9s" }) }) }), SP_JSX.jsxs(DFL.PanelSection, { title: "R\u00E9sum\u00E9 scan", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Sources activ\u00E9es :" }), " ", libraryStatus.enabled_source_count] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Jeux index\u00E9s :" }), " ", libraryStatus.item_count] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Occurrences trouv\u00E9es :" }), " ", libraryStatus.instance_count] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Dernier scan :" }), " ", libraryStatus.scanned_at ? formatDate(libraryStatus.scanned_at) : "Jamais"] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleRescan(), children: isBusy ? "Scan en cours..." : "Rescanner les dossiers activés" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void loadSourcesAndLibrary(), children: "Red\u00E9tecter les dossiers" }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: selectedSource ? `Source ${sourceIndex + 1}/${sources.length}` : "Sources détectées", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedSource ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedSource.label }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.kind === "roms" ? "ROMs" : selectedSource.kind === "games" ? "Games" : "Steam" }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.storage }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.enabled ? "Activée" : "Désactivée" }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.exists ? "Présente" : "Absente" })] }), fieldLine("Chemin", selectedSource.path)] })) : (SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.86 }, children: "Aucune source d\u00E9tect\u00E9e. V\u00E9rifie tes dossiers Emulation/roms et Games." })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || sources.length <= 1, onClick: () => setSourceIndex((v) => cycleIndex(v, sources.length, -1)), children: "Source pr\u00E9c\u00E9dente" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || sources.length <= 1, onClick: () => setSourceIndex((v) => cycleIndex(v, sources.length, 1)), children: "Source suivante" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedSource, onClick: () => void handleToggleCurrentSource(), children: selectedSource?.enabled ? "Désactiver cette source" : "Activer cette source" }) })] }), SP_JSX.jsx(DFL.PanelSection, { title: "Bouton manette pour reprise", children: preferences ? (() => {
                    const currentValue = typeof preferences.resume_button === "number" ? preferences.resume_button : -1;
                    const presetMatch = RESUME_BUTTON_CHOICES.find((c) => c.value === currentValue);
                    const currentLabel = presetMatch?.label || `Bouton custom #${currentValue}`;
                    const enabled = preferences.resume_enabled !== false;
                    const cycle = (dir) => {
                        const n = RESUME_BUTTON_CHOICES.length;
                        // Start cycling from the current preset if any; else from index 0.
                        const currentIdx = presetMatch
                            ? RESUME_BUTTON_CHOICES.findIndex((c) => c.value === currentValue)
                            : 0;
                        const nextIdx = (currentIdx + dir + n) % n;
                        void savePrefs({ ...preferences, resume_button: RESUME_BUTTON_CHOICES[nextIdx].value });
                    };
                    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "\u00C9tat :" }), " ", SP_JSX.jsx("span", { style: { color: enabled ? "#7ee787" : "#ff8080" }, children: enabled ? "✅ Activé" : "⛔ Désactivé" })] }), SP_JSX.jsxs("div", { style: { marginTop: "4px" }, children: [SP_JSX.jsx("strong", { children: "Bouton :" }), " ", currentLabel] }), SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.75, marginTop: "6px" }, children: "Lecture directe de la manette (SteamClient.Input). Hors-jeu ou en jeu, la pression ouvre le dernier guide / le guide du jeu en cours." })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: enabled ? "Reprise par palette activée" : "Reprise par palette désactivée", description: "D\u00E9sactive temporairement quand tu veux garder ta palette libre pour le jeu.", checked: enabled, onChange: (val) => {
                                        void savePrefs({ ...preferences, resume_enabled: !!val });
                                    } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: !enabled || hotkeyTestMode, onClick: () => { setLastTestButton(null); setHotkeyTestMode(true); }, children: "\uD83C\uDFAF Capturer une palette pr\u00E9cise" }) }), hotkeyTestMode ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", padding: "4px 6px", color: "#ffd966" }, children: [SP_JSX.jsx("strong", { children: "Presse maintenant la palette voulue" }), " (L4, L5, R4, R5, ou tout autre bouton non utilis\u00E9 par les jeux). Le bouton sera m\u00E9moris\u00E9 automatiquement."] }) }), lastTestButton !== null ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => {
                                                if (!preferences)
                                                    return;
                                                void savePrefs({ ...preferences, resume_button: lastTestButton });
                                                setHotkeyTestMode(false);
                                                try {
                                                    toaster.toast({ title: "Offline Soluce", body: `Bouton #${lastTestButton} enregistré`, duration: 2200 });
                                                }
                                                catch { }
                                            }, children: ["\u2705 Confirmer : utiliser le bouton #", lastTestButton] }) })) : (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.7rem", opacity: 0.7, padding: "2px 6px" }, children: "En attente d'une pression\u2026" }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => { setHotkeyTestMode(false); setLastTestButton(null); }, children: "\u270B Annuler la capture" }) })] })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: !enabled, onClick: () => cycle(1), children: "\u2192 Preset suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: !enabled, onClick: () => cycle(-1), children: "\u2190 Preset pr\u00E9c\u00E9dent" }) })] }))] }));
                })() : (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.75rem", opacity: 0.7 }, children: "Chargement pr\u00E9f\u00E9rences\u2026" }) })) }), SP_JSX.jsx(DFL.PanelSection, { title: "Auto-backup", children: backupConfig ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "\u00C9tat :" }), " ", backupConfig.enabled ? "✅ activé" : "❌ désactivé"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Intervalle :" }), " tous les ", backupConfig.interval_days, " jour(s)"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Dernier :" }), " ", backupConfig.last_backup_at ? formatDate(backupConfig.last_backup_at) : "Jamais"] }), backupConfig.last_backup_size_bytes > 0 ? (SP_JSX.jsxs("div", { style: { fontSize: "0.72rem", opacity: 0.78 }, children: [bytesToKo(backupConfig.last_backup_size_bytes), " \u2014 ", backupConfig.last_backup_path] })) : null] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleToggleBackupEnabled(), children: [backupConfig.enabled ? "Désactiver" : "Activer", " l'auto-backup"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleCycleBackupInterval(), children: ["Intervalle: ", backupConfig.interval_days, "j \u2192 suivant (", BACKUP_INTERVAL_CHOICES.join("/"), ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => void handleRunBackupNow(), children: "\uD83D\uDCBE Sauver maintenant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.7rem", opacity: 0.65, padding: "4px 6px" }, children: "V\u00E9rification 30s apr\u00E8s chaque d\u00E9marrage de Decky. Export vers ~/Documents/OfflineSoluce/exports/" }) })] })) : (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.75rem", opacity: 0.7 }, children: "Chargement config\u2026" }) })) }), SP_JSX.jsxs(DFL.PanelSection, { title: "Maintenance", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => void handleReloadAllGuides(), children: ["\uD83D\uDD04 Re-t\u00E9l\u00E9charger TOUS les guides (", guides.length, ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.7, padding: "4px 6px" }, children: "Refait passer chaque guide par le crawler \u00E0 jour (multi-page, nouvelles strat\u00E9gies de d\u00E9coupage). R\u00E9seau + lent. Garde tes marque-pages/notes/progression." }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => void handleReconstructAllSections(), children: ["\uD83D\uDD27 Reconstruire le sommaire de TOUS (", guides.length, ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.7, padding: "4px 6px" }, children: "Re-segmente tous les guides avec la derni\u00E8re logique (split-large-sections, banners, TOC). Pas de r\u00E9seau, rapide. Utile apr\u00E8s un update plugin sans changement de contenu." }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Sauvegarde / restauration", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => void handleExportAll(), children: "Exporter tous les guides (bundle JSON)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleListExports(), children: "Lister les exports disponibles" }) }), showExports && exportFiles.length ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "4px" }, children: ["Export ", exportIndex + 1, "/", exportFiles.length] }), SP_JSX.jsx("div", { style: { fontSize: "0.85rem" }, children: exportFiles[exportIndex]?.name }), SP_JSX.jsxs("div", { style: { fontSize: "0.72rem", opacity: 0.75 }, children: [formatDate(exportFiles[exportIndex]?.modified_at || ""), " \u00B7 ", bytesToKo(exportFiles[exportIndex]?.size_bytes || 0)] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || exportFiles.length <= 1, onClick: () => setExportIndex((v) => cycleIndex(v, exportFiles.length, -1)), children: "Export pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || exportFiles.length <= 1, onClick: () => setExportIndex((v) => cycleIndex(v, exportFiles.length, 1)), children: "Export suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !exportFiles[exportIndex], onClick: () => void handleImportSelectedExport(), children: "Importer cet export" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setShowExports(false), children: "Masquer la liste" }) })] })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Diagnostic", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleDebug(), children: isBusy ? "Diagnostic en cours..." : "Lancer le diagnostic" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleTestNetwork(), children: isBusy ? "Test réseau en cours..." : "Tester la connexion aux moteurs" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleTestSearch(), children: isBusy ? "Test recherche en cours..." : "Tester le parsing des résultats" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handlePolishAllGuides(), children: isBusy ? "Nettoyage en cours…" : "🧹 Nettoyer + reconstruire TOUS les guides" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleClearDebug(), children: "Effacer le fichier debug" }) }), debugOutput ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: {
                                whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0,
                                padding: "10px 12px", borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)",
                                fontSize: "0.7rem", maxHeight: "30vh", overflowY: "auto",
                                fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
                            }, children: debugOutput }) })) : null] })] }));
    const renderLibraryView = () => {
        const favoriteCount = libraryItems.filter((i) => i.is_favorite).length;
        const letterIdx = availableLetters.indexOf(letterFilter) >= 0 ? availableLetters.indexOf(letterFilter) : 0;
        const letterLabel = (l) => l === "" ? "Tous" : l === "#" ? "Chiffres / symboles" : l;
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Filtrer par lettre", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Initiale :" }), " ", letterLabel(letterFilter)] }), SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.75, marginTop: "4px" }, children: availableLetters.length > 1
                                            ? `${availableLetters.length - 1} lettre(s) disponibles · ${filteredItems.length} jeu(x) visibles`
                                            : "Bibliothèque vide" })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || availableLetters.length <= 1, onClick: () => {
                                    const next = availableLetters[cycleIndex(letterIdx, availableLetters.length, -1)];
                                    setLetterFilter(next);
                                    setLibraryIndex(0);
                                }, children: "\u25C0 Lettre pr\u00E9c\u00E9dente" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || availableLetters.length <= 1, onClick: () => {
                                    const next = availableLetters[cycleIndex(letterIdx, availableLetters.length, 1)];
                                    setLetterFilter(next);
                                    setLibraryIndex(0);
                                }, children: "Lettre suivante \u25B6" }) }), letterFilter ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => { setLetterFilter(""); setLibraryIndex(0); }, children: "Effacer le filtre" }) })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Filtres biblioth\u00E8que", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Type :" }), " ", KIND_CHOICES[kindIndex] || "Tous"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Stockage :" }), " ", STORAGE_CHOICES[storageIndex] || "Tous"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Plateforme :" }), " ", platformChoices[platformIndex] || "Tous"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Tri :" }), " ", sortByName ? "A → Z" : "Plateforme + nom"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Favoris uniquement :" }), " ", showFavoritesOnly ? "Oui" : "Non", " (", favoriteCount, " \u2605)"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "R\u00E9sultats :" }), " ", filteredItems.length] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => { setShowFavoritesOnly((v) => !v); setLibraryIndex(0); }, children: showFavoritesOnly ? "Afficher tous les jeux" : `★ N'afficher que les favoris (${favoriteCount})` }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setKindIndex((v) => cycleIndex(v, KIND_CHOICES.length, 1)), children: "Changer le type" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setStorageIndex((v) => cycleIndex(v, STORAGE_CHOICES.length, 1)), children: "Changer le stockage" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setPlatformIndex((v) => cycleIndex(v, platformChoices.length, 1)), children: "Changer la plateforme" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => { setSortByName((v) => !v); setLibraryIndex(0); }, children: sortByName ? "Trier par plateforme" : "Trier par nom" }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: selectedLibraryItem ? `Jeu ${libraryIndex + 1}/${filteredItems.length}` : "Jeu sélectionné", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedLibraryItem ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: [selectedLibraryItem.is_favorite ? "★ " : "", selectedLibraryItem.custom_title || selectedLibraryItem.title] }), selectedLibraryItem.custom_title ? (SP_JSX.jsxs("div", { style: { fontSize: "0.75rem", opacity: 0.6, marginBottom: "4px" }, children: ["Original : ", selectedLibraryItem.title] })) : null, SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedLibraryItem.platform }), selectedLibraryItem.disc_code ? SP_JSX.jsx("span", { style: pillStyle, children: selectedLibraryItem.disc_code }) : null, selectedLibraryItem.emulator ? SP_JSX.jsx("span", { style: pillStyle, children: selectedLibraryItem.emulator }) : null, selectedLibraryItem.source_kinds.map((kind) => (SP_JSX.jsx("span", { style: pillStyle, children: kind }, kind)))] }), fieldLine("Chemin principal", selectedLibraryItem.primary_path), fieldLine("Alias", selectedLibraryItem.aliases.join(" | ")), SP_JSX.jsxs("div", { style: { fontSize: "0.8rem", opacity: 0.86 }, children: [SP_JSX.jsx("strong", { children: "Sources :" }), " ", selectedLibraryItem.source_count, " / ", SP_JSX.jsx("strong", { children: "Occurrences :" }), " ", selectedLibraryItem.instance_count] }), SP_JSX.jsxs("div", { style: { fontSize: "0.8rem", opacity: 0.86 }, children: [SP_JSX.jsx("strong", { children: "Guides li\u00E9s :" }), " ", relatedGuides.length] })] })) : (SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.86 }, children: "Biblioth\u00E8que vide pour ces filtres. Active des sources, puis rescanne." })) }) }), isRenaming && selectedLibraryItem ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: ["Choisir le titre (", renameCandidateIndex + 1, "/", renameCandidates.length, ")"] }), SP_JSX.jsx("div", { style: { fontSize: "0.95rem", marginBottom: "4px" }, children: renameCandidates[renameCandidateIndex] || selectedLibraryItem.title })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || renameCandidates.length <= 1, onClick: () => setRenameCandidateIndex((v) => cycleIndex(v, renameCandidates.length, -1)), children: "Titre pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || renameCandidates.length <= 1, onClick: () => setRenameCandidateIndex((v) => cycleIndex(v, renameCandidates.length, 1)), children: "Titre suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleConfirmRename(), children: "Valider ce titre" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: handleCancelRename, children: "Annuler" }) })] })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || filteredItems.length <= 1, onClick: () => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, -1)), children: "Jeu pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || filteredItems.length <= 1, onClick: () => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, 1)), children: "Jeu suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || filteredItems.length <= 10, onClick: () => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, -10)), children: "-10 jeux" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || filteredItems.length <= 10, onClick: () => setLibraryIndex((v) => cycleIndex(v, filteredItems.length, 10)), children: "+10 jeux" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedLibraryItem, onClick: () => void handleToggleFavorite(), children: selectedLibraryItem?.is_favorite ? "★ Retirer des favoris" : "☆ Ajouter aux favoris" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedLibraryItem || renameCandidates.length <= 1, onClick: handleStartRename, children: "Changer le titre de recherche" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedLibraryItem, onClick: () => setActiveView("search"), children: "Chercher une soluce pour ce jeu" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedRelatedGuide, onClick: () => void openGuideById(selectedRelatedGuide.id), children: "Ouvrir le guide li\u00E9 s\u00E9lectionn\u00E9" }) })] }))] }), selectedRelatedGuide ? (SP_JSX.jsxs(DFL.PanelSection, { title: `Guide lié ${relatedGuideIndex + 1}/${relatedGuides.length}`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedRelatedGuide.title }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedRelatedGuide.site }), selectedRelatedGuide.has_resume ? SP_JSX.jsxs("span", { style: pillStyle, children: ["Reprise: ", selectedRelatedGuide.resume_label] }) : null] }), fieldLine("Résumé", selectedRelatedGuide.snippet)] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || relatedGuides.length <= 1, onClick: () => setRelatedGuideIndex((v) => cycleIndex(v, relatedGuides.length, -1)), children: "Guide li\u00E9 pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || relatedGuides.length <= 1, onClick: () => setRelatedGuideIndex((v) => cycleIndex(v, relatedGuides.length, 1)), children: "Guide li\u00E9 suivant" }) })] })) : null] }));
    };
    const renderSearchView = () => {
        // Compute distinct sites present in current results (for the multi-site filter chips)
        const sitesInResults = Array.from(new Set(searchResults.map((r) => r.site).filter(Boolean)));
        // Apply client-side multi-site filter (empty = no filter)
        const filteredResults = searchSiteFilter.size === 0
            ? searchResults
            : searchResults.filter((r) => searchSiteFilter.has(r.site));
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Recherche", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: selectedLibraryItem
                                    ? `Cherche autre que « ${selectedLibraryItem.title.slice(0, 35)} »…`
                                    : "Tape le nom du jeu (ex: Suikoden V)…", label: "Recherche", bShowClearAction: true }) }), selectedLibraryItem ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setSearchQuery(selectedLibraryItem.custom_title || selectedLibraryItem.title), children: ["\u2198 Remplir avec \u00AB ", (selectedLibraryItem.custom_title || selectedLibraryItem.title).slice(0, 40), " \u00BB"] }) })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setLanguageIndex((v) => cycleIndex(v, LANGUAGE_CHOICES.length, 1)), children: ["Langue : ", selectedLanguage.label, " (cycle)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setSearchSiteIndex((v) => cycleIndex(v, SEARCH_SITE_CHOICES.length, 1)), children: ["Site cible : ", selectedSearchSite.label, " (cycle)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleSearch(), children: isBusy ? "Recherche en cours…" : "🔍 Lancer la recherche" }) }), searchQuery ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setSearchQuery(""), children: "Effacer le texte" }) })) : null] }), searchResults.length > 0 ? (SP_JSX.jsxs(DFL.PanelSection, { title: `Résultats (${filteredResults.length}${searchSiteFilter.size > 0 ? ` / ${searchResults.length}` : ""})`, children: [sitesInResults.length > 1 ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.75, padding: "2px 6px" }, children: "Filtre par site (clic = toggle) :" }) }), sitesInResults.map((siteLabel) => {
                                    const active = searchSiteFilter.has(siteLabel);
                                    const count = searchResults.filter((r) => r.site === siteLabel).length;
                                    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => toggleSearchSite(siteLabel), children: [active ? "☑" : "☐", " ", siteLabel, " (", count, ")"] }) }, siteLabel));
                                }), searchSiteFilter.size > 0 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setSearchSiteFilter(new Set()), children: "Tout afficher (vide le filtre)" }) })) : null] })) : null, filteredResults.map((result, idx) => {
                            // v0.43.35: lead with the GAME NAME (from the URL) — page titles like
                            // "RPG Soluce" / "Walkthrough" don't say which game. Keep the page title
                            // as a small "type" line, but hide it when it's generic/redundant.
                            const gameName = (result.game || "").trim();
                            const pageTitle = (result.title || "").trim();
                            const heading = gameName || pageTitle || "(sans titre)";
                            const genericTitle = /^(rpg soluce|le coin de|walkthrough|full walkthrough|guide|soluce|wiki)\b/i.test(pageTitle);
                            const showSubtitle = pageTitle
                                && pageTitle.toLowerCase() !== heading.toLowerCase()
                                && !(gameName && genericTitle && pageTitle.toLowerCase().includes(gameName.toLowerCase()));
                            return (SP_JSX.jsxs("div", { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { ...boxStyle, padding: "8px 10px" }, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "2px", fontSize: "0.95rem", color: "#ffd966" }, children: ["\uD83C\uDFAE ", heading] }), showSubtitle ? (SP_JSX.jsx("div", { style: { fontSize: "0.74rem", opacity: 0.82, marginBottom: "4px" }, children: pageTitle })) : null, SP_JSX.jsxs("div", { style: { marginBottom: "4px" }, children: [SP_JSX.jsx("span", { style: pillStyle, children: result.site }), SP_JSX.jsxs("span", { style: pillStyle, children: ["Score ", result.score] })] }), result.snippet ? (SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.85, lineHeight: 1.3 }, children: result.snippet.length > 180 ? result.snippet.slice(0, 178) + "…" : result.snippet })) : null] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleImportResultDirect(result), children: "\uD83D\uDCBE Importer offline" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void openUrlExternal(result.url), children: "\uD83C\uDF10 Ouvrir dans le navigateur" }) })] }, result.url + idx));
                        }), filteredResults.length === 0 && searchSiteFilter.size > 0 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.75rem", opacity: 0.7, padding: "8px 6px", textAlign: "center" }, children: "Aucun r\u00E9sultat ne correspond aux sites filtr\u00E9s." }) })) : null] })) : null] }));
    };
    const renderReaderPreferences = () => (SP_JSX.jsxs(DFL.PanelSection, { title: "Pr\u00E9f\u00E9rences de lecture", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Th\u00E8me :" }), " ", THEME_LABELS[preferences.theme]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Police :" }), " ", FONT_LABELS[preferences.font_family]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Interligne :" }), " ", LINE_HEIGHT_LABELS[preferences.line_height]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Largeur :" }), " ", MAX_WIDTH_LABELS[preferences.max_width]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Surligner mots-cl\u00E9s :" }), " ", preferences.highlight_keywords ? "Oui" : "Non"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Texte en gras :" }), " ", preferences.render_bold !== false ? "Oui" : "Non"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Num\u00E9roter sections :" }), " ", preferences.numbered_sections ? "Oui" : "Non"] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleTheme, children: "Changer le th\u00E8me" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleFont, children: "Changer la police" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleLineHeight, children: "Changer l'interligne" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleMaxWidth, children: "Changer la largeur" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: toggleHighlight, children: [preferences.highlight_keywords ? "Désactiver" : "Activer", " le surlignage des mots-cl\u00E9s"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: toggleBold, children: [preferences.render_bold !== false ? "Désactiver" : "Activer", " le texte en gras"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: toggleNumbered, children: [preferences.numbered_sections ? "Cacher" : "Afficher", " les num\u00E9ros de section"] }) })] }));
    const renderGuidesView = () => {
        const sectionCount = selectedGuide?.sections.length || 0;
        const currentMatch = findMatches[findIndex];
        // Mini-map inline
        const miniMap = selectedGuide && sectionCount > 0 ? (SP_JSX.jsx("div", { style: {
                display: "flex", gap: "2px", marginTop: "4px",
                background: "rgba(255,255,255,0.05)", padding: "3px", borderRadius: "4px",
            }, children: selectedGuide.sections.map((_, i) => {
                let bg = "rgba(255,255,255,0.15)";
                if (i === selectedSectionIndex)
                    bg = "#ffd966";
                else if (i < selectedSectionIndex)
                    bg = "rgba(139, 224, 139, 0.7)";
                if (sectionsWithNotes.has(i))
                    bg = i === selectedSectionIndex ? "#ffd966" : "#ff8bd1";
                return (SP_JSX.jsx("div", { style: {
                        flex: 1, height: "6px", borderRadius: "2px", background: bg,
                    } }, i));
            }) })) : null;
        // v0.42.13: filter + sort controls for the guides list.
        const gLetterIdx = guideAvailableLetters.indexOf(guideLetterFilter) >= 0
            ? guideAvailableLetters.indexOf(guideLetterFilter) : 0;
        const gLetterLabel = (l) => l === "" ? "Toutes" : l === "#" ? "Chiffres / symboles" : l;
        const sortLabel = guideSortMode === "recent" ? "Récemment ouvert"
            : guideSortMode === "name" ? "Nom (A→Z)" : "Plateforme";
        const anyFilter = !!(guideTextFilter.trim() || guideLetterFilter);
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [!expandedReader ? (SP_JSX.jsxs(DFL.PanelSection, { title: "\uD83E\uDDF9 Nettoyage", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void runJunkScan(), children: "Chercher les guides vides / incomplets" }) }), junkGuides !== null ? (junkGuides.length === 0 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.78rem", opacity: 0.75, padding: "4px 6px" }, children: "\u2713 Aucun guide suspect (tous ont \u2265 2 sections et assez de contenu)." }) })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: "0.76rem", opacity: 0.85, padding: "2px 6px" }, children: [junkGuides.length, " guide(s) suspect(s) (< 2 sections ou < 150 mots). V\u00E9rifie et supprime si besoin."] }) }), junkGuides.map((g) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { ...boxStyle, padding: "6px 8px" }, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "0.82rem" }, children: g.title || g.id }), SP_JSX.jsxs("div", { style: { fontSize: "0.7rem", opacity: 0.7 }, children: [g.site, " \u00B7 ", g.section_count, " section(s) \u00B7 ", g.word_count, " mots"] }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void deleteJunkGuide(g.id), children: "\uD83D\uDDD1 Supprimer" })] }) }, g.id)))] }))) : null] })) : null, !expandedReader ? (SP_JSX.jsxs(DFL.PanelSection, { title: `Filtrer (${filteredGuides.length}/${guides.length})`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => {
                                    try {
                                        DFL.Router.CloseSideMenus();
                                    }
                                    catch { }
                                    DFL.Router.Navigate(LIBRARY_ROUTE);
                                }, children: ["\uD83D\uDCDA Biblioth\u00E8que plein \u00E9cran (", guides.length, ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { value: guideTextFilter, onChange: (e) => { setGuideTextFilter(e.target.value); setGuideIndex(0); }, placeholder: "Filtrer par titre / jeu / site\u2026", label: "Filtre texte", bShowClearAction: true }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setGuideSortMode((m) => m === "recent" ? "name" : m === "name" ? "platform" : "recent"), children: ["Tri : ", sortLabel, " (cycle)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || guideAvailableLetters.length <= 1, onClick: () => { setGuideLetterFilter(guideAvailableLetters[cycleIndex(gLetterIdx, guideAvailableLetters.length, 1)]); setGuideIndex(0); }, children: ["Initiale : ", gLetterLabel(guideLetterFilter), " \u25B6"] }) }), anyFilter ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => { setGuideTextFilter(""); setGuideLetterFilter(""); setGuideIndex(0); }, children: "\u2715 Effacer les filtres" }) })) : null] })) : null, !expandedReader ? (SP_JSX.jsxs(DFL.PanelSection, { title: selectedGuideSummary ? `Guide ${guideIndex + 1}/${filteredGuides.length}` : "Guides importés", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedGuideSummary ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedGuideSummary.title }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedGuideSummary.site }), SP_JSX.jsx("span", { style: pillStyle, children: selectedGuideSummary.game.platform }), selectedGuideSummary.detection_method ? (SP_JSX.jsxs("span", { style: pillStyle, title: "M\u00E9thode utilis\u00E9e pour d\u00E9couper les sections", children: ["\u2702 ", formatDetectionMethod(selectedGuideSummary.detection_method)] })) : null, selectedGuideSummary.has_resume ? SP_JSX.jsx("span", { style: pillStyle, children: "Reprise" }) : null, selectedGuideSummary.has_bookmark ? SP_JSX.jsx("span", { style: pillStyle, children: "Marque-page" }) : null, selectedGuideSummary.progress.named_bookmarks.length > 0 ? (SP_JSX.jsxs("span", { style: pillStyle, children: ["\uD83D\uDD16 ", selectedGuideSummary.progress.named_bookmarks.length] })) : null, selectedGuideSummary.progress.section_notes.length > 0 ? (SP_JSX.jsxs("span", { style: pillStyle, children: ["\uD83D\uDCDD ", selectedGuideSummary.progress.section_notes.length] })) : null] }), fieldLine("Jeu lié", selectedGuideSummary.game.game_title), fieldLine("Extrait", selectedGuideSummary.snippet), SP_JSX.jsxs("div", { style: { fontSize: "0.8rem", opacity: 0.86 }, children: [SP_JSX.jsx("strong", { children: "Pages :" }), " ", selectedGuideSummary.page_count, " \u00B7 ", SP_JSX.jsx("strong", { children: "Sections :" }), " ", selectedGuideSummary.section_count, " \u00B7 ", SP_JSX.jsx("strong", { children: "Taille :" }), " ", bytesToKo(selectedGuideSummary.size_bytes)] })] })) : (SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.86 }, children: "Aucun guide import\u00E9 pour le moment." })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || filteredGuides.length <= 1, onClick: () => setGuideIndex((v) => cycleIndex(v, filteredGuides.length, -1)), children: "\u25C0 Guide pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || filteredGuides.length <= 1, onClick: () => setGuideIndex((v) => cycleIndex(v, filteredGuides.length, 1)), children: "Guide suivant \u25B6" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary, onClick: () => void openGuideById(selectedGuideSummary.id), children: "Ouvrir ce guide" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary, onClick: () => {
                                    if (!selectedGuideSummary)
                                        return;
                                    requestFullScreenGuide(selectedGuideSummary.id);
                                    DFL.Router.CloseSideMenus();
                                    DFL.Router.Navigate(FULL_SCREEN_ROUTE);
                                }, children: "\uD83D\uDDA5\uFE0F Ouvrir en plein \u00E9cran" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary || !selectedGuideSummary.url, onClick: () => void handleReloadSelectedSummary(), children: "\uD83D\uDD04 Re-t\u00E9l\u00E9charger ce guide" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary, onClick: () => void handleDeleteSelectedGuide(), children: "Supprimer ce guide" }) })] })) : null, !expandedReader && selectedGuideSummary && similarGuides.length > 0 ? (SP_JSX.jsxs(DFL.PanelSection, { title: `Guides similaires (${similarGuides.length})`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.7, padding: "2px 6px 6px" }, children: "Bas\u00E9 sur titre / plateforme / site." }) }), similarGuides.map((sg) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void openGuideById(sg.id), children: ["\u2192 ", sg.title, " ", sg.site ? `(${sg.site})` : ""] }) }, sg.id)))] })) : null, !expandedReader ? renderReaderPreferences() : null, selectedGuide ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Lecture offline", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }, children: selectedGuide.game.game_title || selectedGuide.title }), SP_JSX.jsxs("div", { style: { fontSize: "0.82rem", opacity: 0.9, marginBottom: "2px" }, children: [SP_JSX.jsx("strong", { children: "Section :" }), " ", preferences.numbered_sections && sectionCount > 0 && selectedSectionIndex >= 0 ? `[${selectedSectionIndex + 1}/${sectionCount}] ` : "", currentSectionLabel] }), currentSectionNote ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.85 }, children: [currentSectionNote.done ? "✅ " : "", currentSectionNote.flagged ? "⚐ " : "", currentSectionNote.note ? `"${currentSectionNote.note}"` : ""] })) : null, selectedGuide.has_bookmark ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.85 }, children: ["\uD83D\uDD16 Marque-page rapide : ", selectedGuide.bookmark_label] })) : null, miniMap] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(GuideReader, { guide: selectedGuide, sectionIndex: selectedSectionIndex, fontScale: fontScale, preferences: preferences, searchPattern: findPattern, scrollRestoreFraction: scrollRestoreFraction, onScrollChange: (f) => {
                                            lastScrollFractionRef.current = f;
                                            pendingRestoreFractionRef.current = null;
                                        }, maxHeight: expandedReader ? "78vh" : "55vh" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: toggleExpandedReader, children: expandedReader ? "🔽 Réduire le lecteur" : "📖 Agrandir le lecteur" }) })] }), !expandedReader ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Navigation rapide", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !sectionCount, onClick: () => {
                                                    if (selectedSectionIndex < 0)
                                                        setSelectedSectionIndex(0);
                                                    else
                                                        setSelectedSectionIndex((v) => Math.max(0, v - 1));
                                                }, children: "\u25C0 Section pr\u00E9c\u00E9dente" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !sectionCount, onClick: () => {
                                                    if (selectedSectionIndex < 0)
                                                        setSelectedSectionIndex(0);
                                                    else
                                                        setSelectedSectionIndex((v) => Math.min(sectionCount - 1, v + 1));
                                                }, children: "Section suivante \u25B6" }) }), sectionCount > 6 ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedSectionIndex <= 0, onClick: () => setSelectedSectionIndex((v) => Math.max(0, v - 5)), children: "\u23EA -5 sections" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedSectionIndex >= sectionCount - 1, onClick: () => setSelectedSectionIndex((v) => Math.min(sectionCount - 1, v + 5)), children: "+5 sections \u23E9" }) })] })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !sectionCount, onClick: () => setShowToc((v) => !v), children: showToc ? "Masquer le sommaire" : "📚 Afficher le sommaire" }) })] }), showToc && sectionCount > 0 ? (SP_JSX.jsxs(DFL.PanelSection, { title: `Sommaire (${tocIndex + 1}/${sectionCount})`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { ...boxStyle, maxHeight: "28vh", overflowY: "auto" }, children: selectedGuide.sections.map((sec, idx) => {
                                                    const isCurrent = idx === selectedSectionIndex;
                                                    const isFocused = idx === tocIndex;
                                                    const hasNote = sectionsWithNotes.has(idx);
                                                    const indent = Math.max(0, (sec.heading_level || 0) - 1) * 12;
                                                    return (SP_JSX.jsxs("div", { style: {
                                                            padding: "4px 6px",
                                                            marginLeft: `${indent}px`,
                                                            borderLeft: isFocused ? "3px solid #ffd966" : "3px solid transparent",
                                                            background: isCurrent ? "rgba(255, 217, 102, 0.15)" : "transparent",
                                                            fontSize: "0.8rem",
                                                            fontWeight: isCurrent ? 700 : 400,
                                                        }, children: [preferences.numbered_sections ? `[${idx + 1}] ` : "", hasNote ? "📝 " : "", sec.title] }, idx));
                                                }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setTocIndex((v) => cycleIndex(v, sectionCount, -1)), children: "Section pr\u00E9c\u00E9dente (sommaire)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setTocIndex((v) => cycleIndex(v, sectionCount, 1)), children: "Section suivante (sommaire)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setTocIndex((v) => cycleIndex(v, sectionCount, -10)), children: "-10 dans le sommaire" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setTocIndex((v) => cycleIndex(v, sectionCount, 10)), children: "+10 dans le sommaire" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => jumpToSection(tocIndex), children: "Aller \u00E0 cette section" }) })] })) : null, SP_JSX.jsxs(DFL.PanelSection, { title: "Rechercher dans le guide", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { style: { fontSize: "0.82rem", marginBottom: "4px" }, children: [SP_JSX.jsx("strong", { children: "Mot-cl\u00E9 :" }), " ", FIND_PRESETS[findPresetIndex]?.label || "— Choisir —"] }), SP_JSX.jsx("div", { style: { fontSize: "0.72rem", opacity: 0.75 }, children: findPresetIndex > 0 ? `Recherche : "${FIND_PRESETS[findPresetIndex].pattern}"` : "Choisis un mot-clé puis lance la recherche." }), findMatches.length > 0 ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.9, marginTop: "6px" }, children: [SP_JSX.jsx("strong", { children: findMatches.length }), " occurrence(s) \u2014 ", findIndex + 1, " / ", findMatches.length, currentMatch ? (SP_JSX.jsxs("div", { style: { marginTop: "4px", fontSize: "0.72rem", opacity: 0.8 }, children: ["Section : ", currentMatch.section_title || "(début)", SP_JSX.jsx("br", {}), SP_JSX.jsxs("em", { children: ["\"", currentMatch.line_text.substring(0, 140), "\""] })] })) : null] })) : null] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setFindPresetIndex((v) => cycleIndex(v, FIND_PRESETS.length, -1)), children: "\u25C0 Mot-cl\u00E9 pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setFindPresetIndex((v) => cycleIndex(v, FIND_PRESETS.length, 1)), children: "Mot-cl\u00E9 suivant \u25B6" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || findPresetIndex === 0, onClick: () => void handleRunFind(), children: "\uD83D\uDD0D Chercher" }) }), findMatches.length > 0 ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => goToMatch(findIndex - 1), children: "\u25C0 Occurrence pr\u00E9c\u00E9dente" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => goToMatch(findIndex + 1), children: "Occurrence suivante \u25B6" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => { setFindMatches([]); setFindPattern(""); setFindIndex(0); setFindPresetIndex(0); }, children: "Effacer la recherche" }) })] })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Marque-pages & notes", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleSetBookmark(), children: "\uD83D\uDD16 Poser le marque-page rapide ici" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuide.has_bookmark, onClick: handleGoToBookmark, children: "\u23F1 Aller au marque-page rapide" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuide.has_bookmark, onClick: () => void handleClearBookmark(), children: "Retirer le marque-page rapide" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedGuide.progress.last_section_index < 0, onClick: handleResumeReading, children: "Reprendre o\u00F9 j'\u00E9tais" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleAddNamedBookmark(), children: "\u2795 Ajouter un marque-page nomm\u00E9 ici" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { ...boxStyle, fontSize: "0.72rem", opacity: 0.75 }, children: "Le marque-page est nomm\u00E9 automatiquement (section courante + heure)." }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuide.progress.named_bookmarks.length, onClick: () => setShowBookmarks((v) => !v), children: [showBookmarks ? "Masquer" : "📚 Voir", " les marque-pages nomm\u00E9s (", selectedGuide.progress.named_bookmarks.length, ")"] }) }), showBookmarks && selectedGuide.progress.named_bookmarks.length > 0 ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedGuide.progress.named_bookmarks.map((bm, i) => {
                                                            const isFocused = i === bookmarkIndex;
                                                            const secTitle = bm.section_index >= 0 && selectedGuide.sections[bm.section_index]
                                                                ? selectedGuide.sections[bm.section_index].title
                                                                : "Début";
                                                            return (SP_JSX.jsxs("div", { style: {
                                                                    padding: "4px 6px",
                                                                    borderLeft: isFocused ? "3px solid #ffd966" : "3px solid transparent",
                                                                    fontSize: "0.8rem",
                                                                    fontWeight: isFocused ? 700 : 400,
                                                                }, children: ["\uD83D\uDD16 ", bm.name, SP_JSX.jsx("div", { style: { fontSize: "0.7rem", opacity: 0.7 }, children: secTitle })] }, bm.bookmark_id));
                                                        }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setBookmarkIndex((v) => cycleIndex(v, selectedGuide.progress.named_bookmarks.length, -1)), children: "MP pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setBookmarkIndex((v) => cycleIndex(v, selectedGuide.progress.named_bookmarks.length, 1)), children: "MP suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                                            const bm = selectedGuide.progress.named_bookmarks[bookmarkIndex];
                                                            if (bm)
                                                                handleGoToNamedBookmark(bm);
                                                        }, children: "Aller \u00E0 ce marque-page" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                                            const bm = selectedGuide.progress.named_bookmarks[bookmarkIndex];
                                                            if (bm)
                                                                void handleDeleteNamedBookmark(bm.bookmark_id);
                                                        }, children: "Supprimer ce marque-page" }) })] })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedSectionIndex < 0, onClick: () => void handleToggleDone(), children: currentSectionNote?.done ? "✅ Marquer NON faite" : "Marquer cette section comme faite" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedSectionIndex < 0, onClick: () => void handleToggleFlag(), children: currentSectionNote?.flagged ? "⚐ Retirer le drapeau" : "⚐ Marquer à revoir" }) }), currentSectionNote ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleClearSectionNote(), children: "Retirer les marqueurs de cette section" }) })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Outils", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setFontScale((v) => Math.max(0.85, Math.round((v - 0.05) * 100) / 100)), children: ["A- R\u00E9duire le texte (", fontScale.toFixed(2), "x)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setFontScale((v) => Math.min(2.0, Math.round((v + 0.05) * 100) / 100)), children: ["A+ Agrandir le texte (", fontScale.toFixed(2), "x)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuide.url, onClick: () => void handleOpenExternal(), children: "\uD83C\uDF10 Ouvrir la source dans le navigateur" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleExportCurrent(), children: "\uD83D\uDCBE Exporter ce guide en JSON" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleReconstructSections(), children: ["\uD83D\uDD27 Reconstruire le sommaire (", selectedGuide.sections.length, " sections)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleCleanExistingGuide(), children: "\uD83E\uDDF9 Nettoyer le contenu (menu, footer, parasites)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuide.url, onClick: () => void handleReloadGuideContent(), children: "\uD83D\uDD04 Re-t\u00E9l\u00E9charger le contenu (multi-page si dispo)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleClearProgress(), children: "Effacer la reprise (garde marque-pages et notes)" }) }), selectedGuide.source_pages.length > 1 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: ["Pages source (", selectedGuide.source_pages.length, ")"] }), selectedGuide.source_pages.slice(0, 6).map((page) => (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.84, marginBottom: "4px" }, children: ["\u2022 ", page.title] }, `${page.url}-${page.title}`))), selectedGuide.source_pages.length > 6 ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.74 }, children: ["\u2026 ", selectedGuide.source_pages.length - 6, " pages de plus"] })) : null] }) })) : null] })] })) : null] })) : null] }));
    };
    return (SP_JSX.jsxs("div", { style: { width: "100%", boxSizing: "border-box", paddingBottom: "12px" }, children: [renderModeHeader(), error ? (SP_JSX.jsx(DFL.PanelSection, { title: "\u00C9tat", children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { ...boxStyle, borderColor: "rgba(255,100,100,0.35)" }, children: error }) }) })) : null, activeView === "home" ? renderHomeView() : null, activeView === "sources" ? renderSourcesView() : null, activeView === "library" ? renderLibraryView() : null, activeView === "search" ? renderSearchView() : null, activeView === "guides" ? renderGuidesView() : null] }));
}
var index = DFL.definePlugin(() => {
    routerHook.addRoute(FULL_SCREEN_ROUTE, FullScreenReader, { exact: true });
    routerHook.addRoute(LIBRARY_ROUTE, FullScreenLibrary, { exact: true }); // v0.42.17
    routerHook.addRoute(GAME_LIBRARY_ROUTE, FullScreenGameLibrary, { exact: true }); // v0.43.1
    routerHook.addRoute(SEARCH_ROUTE, FullScreenSearch, { exact: true }); // v0.43.3
    // v0.35 fix: register the controller listener AT PLUGIN LOAD (in the factory),
    // not inside a React component via addGlobalComponent. Previously addGlobalComponent
    // would only run when the global component actually mounted, which depended on
    // the QAM being open. Now the listener stays alive regardless of QAM state.
    let listenerActive = true;
    let listenerHandle = null;
    const setupListener = async () => {
        try {
            const prefs = await getReaderPreferences();
            setCurrentResumeButton(typeof prefs.resume_button === "number" ? prefs.resume_button : -1);
            setCurrentResumeEnabled(prefs.resume_enabled !== false);
            try {
                console.log("[Offline Soluce] resume button at startup:", _currentResumeButton === -1 ? "(defaults LBACK/RBACK)" : _currentResumeButton, "enabled:", _currentResumeEnabled);
            }
            catch { }
        }
        catch { }
        const sc = window.SteamClient;
        const inputApi = sc?.Input;
        if (!inputApi?.RegisterForControllerInputMessages) {
            try {
                console.warn("[Offline Soluce] SteamClient.Input.RegisterForControllerInputMessages unavailable");
            }
            catch { }
            return;
        }
        try {
            console.log("[Offline Soluce] controller listener installed at plugin load");
        }
        catch { }
        listenerHandle = inputApi.RegisterForControllerInputMessages((_idx, gamepadButton, isButtonPressed) => {
            if (!listenerActive)
                return;
            if (!isButtonPressed)
                return;
            if (!_currentResumeEnabled)
                return;
            // v0.40: don't trigger the resume action while the user is capturing
            // a button via the settings UI — otherwise the captured press would
            // also open a guide.
            if (_captureInProgress)
                return;
            const wanted = _currentResumeButton;
            const matches = wanted === -1
                ? RESUME_BUTTON_DEFAULTS.has(gamepadButton)
                : gamepadButton === wanted;
            if (!matches)
                return;
            void (async () => {
                try {
                    const guides = await listGuides();
                    if (!guides.length) {
                        try {
                            toaster.toast({ title: "Offline Soluce", body: "Aucun guide importé.", duration: 2500 });
                        }
                        catch { }
                        return;
                    }
                    // A3: try to match the currently running Steam app first
                    let target = null;
                    let matchedByGame = false;
                    try {
                        const runningApp = DFL.Router.MainRunningApp;
                        const displayName = runningApp?.display_name || "";
                        if (displayName) {
                            const matched = findGuideForRunningApp(guides, displayName);
                            if (matched) {
                                target = matched;
                                matchedByGame = true;
                                try {
                                    console.log("[Offline Soluce] matched running app:", displayName, "→", matched.title);
                                }
                                catch { }
                            }
                        }
                    }
                    catch (e) {
                        try {
                            console.warn("[Offline Soluce] running-app match failed:", e);
                        }
                        catch { }
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
                                    try {
                                        console.log(`[Offline Soluce] matched emulator (${hint.emulator}) ROM "${hint.hint}" → ${matched.title}`);
                                    }
                                    catch { }
                                }
                                else {
                                    try {
                                        console.log(`[Offline Soluce] emulator hint "${hint.hint}" had no matching guide`);
                                    }
                                    catch { }
                                }
                            }
                        }
                        catch (e) {
                            try {
                                console.warn("[Offline Soluce] emulator hint failed:", e);
                            }
                            catch { }
                        }
                    }
                    // Fallback: most-recently-opened guide
                    if (!target) {
                        const sorted = [...guides].sort((a, b) => (b.progress?.last_opened_at || "").localeCompare(a.progress?.last_opened_at || ""));
                        target = sorted[0];
                    }
                    if (!target?.id) {
                        try {
                            toaster.toast({ title: "Offline Soluce", body: "Pas de guide récent.", duration: 2500 });
                        }
                        catch { }
                        return;
                    }
                    // Toast tells the user WHICH path matched — useful when game match vs fallback
                    try {
                        toaster.toast({
                            title: matchedByGame ? "Guide du jeu en cours" : "Dernier guide ouvert",
                            body: target.title,
                            duration: 2000,
                        });
                    }
                    catch { }
                    requestFullScreenGuide(target.id);
                    try {
                        DFL.Router.CloseSideMenus();
                    }
                    catch { }
                    DFL.Router.Navigate(FULL_SCREEN_ROUTE);
                }
                catch (err) {
                    try {
                        toaster.toast({ title: "Offline Soluce", body: `Erreur reprise: ${err?.message || err}`, duration: 4000, critical: true });
                    }
                    catch { }
                }
            })();
        });
    };
    void setupListener();
    return {
        title: SP_JSX.jsx("div", { className: "title", children: "Offline Soluce" }),
        content: SP_JSX.jsx(Content, {}),
        icon: SP_JSX.jsx(FaBookOpen, {}),
        onDismount() {
            listenerActive = false;
            try {
                listenerHandle?.unregister?.();
            }
            catch { }
            routerHook.removeRoute(FULL_SCREEN_ROUTE);
            try {
                routerHook.removeRoute(LIBRARY_ROUTE);
            }
            catch { }
            try {
                routerHook.removeRoute(GAME_LIBRARY_ROUTE);
            }
            catch { }
            try {
                routerHook.removeRoute(SEARCH_ROUTE);
            }
            catch { }
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
