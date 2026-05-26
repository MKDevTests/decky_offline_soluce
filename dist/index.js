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
const FULL_SCREEN_ROUTE = "/decky-offline-soluce/reader";
// ========== Backend callables ==========
const listGuides = callable("list_guides");
const getGuide = callable("get_guide");
const searchGuides = callable("search_guides");
const saveGuide = callable("save_guide");
const deleteGuide = callable("delete_guide");
const saveProgress = callable("save_progress");
const setBookmark = callable("set_bookmark");
const clearBookmark = callable("clear_bookmark");
const clearProgress = callable("clear_progress");
const addNamedBookmark = callable("add_named_bookmark");
const deleteNamedBookmark = callable("delete_named_bookmark");
const setSectionNote = callable("set_section_note");
const clearSectionNote = callable("clear_section_note");
const reconstructSections = callable("reconstruct_sections");
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
// ========== Constants ==========
const VIEW_SEQUENCE = ["sources", "library", "search", "guides"];
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
// Keywords that get auto-highlighted in guides (grouped by style)
const KEYWORD_GROUPS = [
    { color: "#ff6e6e", words: ["boss", "final boss", "mini-boss", "miniboss"] },
    { color: "#ffd166", words: ["item", "objet", "équipement", "equipement", "key item", "weapon", "arme"] },
    { color: "#8be08b", words: ["save", "sauvegarde", "save point", "point de sauvegarde"] },
    { color: "#8bb3ff", words: ["quête", "quest", "mission", "side quest", "quête annexe"] },
    { color: "#ff8bd1", words: ["secret", "spoiler", "caché", "hidden"] },
    { color: "#fca55e", words: ["attention", "warning", "danger", "piège", "trap"] },
    { color: "#b59bff", words: ["astuce", "tip", "conseil", "hint"] },
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
    if (level === "narrow")
        return "62ch";
    if (level === "normal")
        return "82ch";
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
            if (trimmed)
                blocks.push({ kind: "paragraph", text: trimmed });
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
// Highlight keywords + search matches in a text block
function renderHighlightedText(text, highlightKeywords, searchPattern) {
    if (!text)
        return text;
    // Build a combined regex of keywords (word-ish boundaries) and the search pattern.
    const pieces = [];
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
    if (pieces.length === 0)
        return text;
    const spans = [];
    for (const piece of pieces) {
        piece.regex.lastIndex = 0;
        let m;
        while ((m = piece.regex.exec(text)) !== null) {
            if (m.index === piece.regex.lastIndex)
                piece.regex.lastIndex++;
            spans.push({ start: m.index, end: m.index + m[0].length, className: piece.className, color: piece.color });
        }
    }
    if (spans.length === 0)
        return text;
    // Sort, then merge overlaps (search match wins over keyword)
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    const merged = [];
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
    const out = [];
    let cursor = 0;
    for (let i = 0; i < merged.length; i++) {
        const s = merged[i];
        if (s.start > cursor)
            out.push(text.slice(cursor, s.start));
        const substr = text.slice(s.start, s.end);
        if (s.className === "os-find") {
            out.push(SP_JSX.jsx("mark", { style: { background: "#ffe066", color: "#1a1a1a", borderRadius: "2px", padding: "0 2px" }, children: substr }, `m-${i}`));
        }
        else {
            out.push(SP_JSX.jsx("span", { style: { color: s.color, fontWeight: 600 }, children: substr }, `k-${i}`));
        }
        cursor = s.end;
    }
    if (cursor < text.length)
        out.push(text.slice(cursor));
    return out;
}
/**
 * Shared reading surface: themed, per-block rendering with keyword highlighting,
 * search-match highlighting, and monospace rendering for ASCII-art blocks.
 */
function GuideReader(props) {
    const { guide, sectionIndex, fontScale, preferences, searchPattern, scrollRestoreFraction, onScrollChange, maxHeight, } = props;
    const scrollRef = SP_REACT.useRef(null);
    const raw = SP_REACT.useMemo(() => getSectionText(guide, sectionIndex), [guide, sectionIndex]);
    const blocks = SP_REACT.useMemo(() => parseBlocks(raw), [raw]);
    const theme = themeStyle(preferences.theme);
    const lh = lineHeightValue(preferences.line_height);
    const widthCap = maxWidthValue(preferences.max_width);
    const ff = fontFamily(preferences.font_family);
    // Restore scroll when section switches / on first render if requested
    SP_REACT.useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        const raf = window.requestAnimationFrame(() => {
            if (scrollRestoreFraction !== null) {
                const max = Math.max(1, el.scrollHeight - el.clientHeight);
                el.scrollTop = max * scrollRestoreFraction;
            }
            else {
                el.scrollTop = 0;
            }
            const max = Math.max(1, el.scrollHeight - el.clientHeight);
            onScrollChange(Math.max(0, Math.min(1, el.scrollTop / max)));
        });
        return () => window.cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sectionIndex, guide.id, scrollRestoreFraction]);
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
        margin: "0 0 0.8em",
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
                return (SP_JSX.jsx("p", { style: paragraphStyle, children: renderHighlightedText(block.text, preferences.highlight_keywords, searchPattern) }, idx));
            })) }) }));
}
// ========== Full-screen reader component ==========
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
    const [loadError, setLoadError] = SP_REACT.useState("");
    const lastScrollFractionRef = SP_REACT.useRef(0);
    const restoreFractionRef = SP_REACT.useRef(null);
    const initialScrollRef = SP_REACT.useRef(true);
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
    // Final persist on unmount
    SP_REACT.useEffect(() => () => {
        if (guide) {
            saveProgress(guide.id, sectionIndex, fontScale, lastScrollFractionRef.current).catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guide?.id]);
    // Reset restore fraction when section changes after initial load
    SP_REACT.useEffect(() => {
        if (initialScrollRef.current) {
            initialScrollRef.current = false;
            return;
        }
        restoreFractionRef.current = 0;
    }, [sectionIndex]);
    const theme = preferences ? themeStyle(preferences.theme) : { background: "#111", textColor: "#eee", borderColor: "rgba(255,255,255,0.1)"};
    const layoutStyle = {
        width: "100vw",
        height: "100vh",
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
        width: "300px",
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
    if (loadError) {
        return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => DFL.Router.NavigateBack(), children: "\u2190 Retour" }), SP_JSX.jsx("div", { style: { flex: 1, fontWeight: 700 }, children: "Lecteur plein \u00E9cran" })] }), SP_JSX.jsx("div", { style: { padding: "24px", fontSize: "0.95rem" }, children: loadError })] }));
    }
    if (!guide || !preferences) {
        return (SP_JSX.jsx("div", { style: layoutStyle, children: SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => DFL.Router.NavigateBack(), children: "\u2190 Retour" }), SP_JSX.jsx("div", { style: { flex: 1, fontWeight: 700 }, children: "Chargement\u2026" })] }) }));
    }
    const sectionCount = guide.sections.length;
    const currentSection = sectionIndex >= 0 ? guide.sections[sectionIndex] : null;
    const sectionLabel = currentSection ? currentSection.title : "—";
    return (SP_JSX.jsxs("div", { style: layoutStyle, children: [SP_JSX.jsxs("div", { style: headerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: () => DFL.Router.NavigateBack(), children: "\u2190 Retour" }), SP_JSX.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: guide.game.game_title || guide.title }), SP_JSX.jsx("div", { style: { fontSize: "0.78rem", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: sectionCount > 0 && sectionIndex >= 0
                                    ? `Section ${sectionIndex + 1}/${sectionCount} · ${sectionLabel}`
                                    : "Aucune section" })] }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => setShowToc((v) => !v), children: showToc ? "Masquer sommaire" : "📚 Sommaire" }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => setFontScale((v) => Math.max(0.85, +(v - 0.1).toFixed(2))), children: "A\u2212" }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => setFontScale((v) => Math.min(2.0, +(v + 0.1).toFixed(2))), children: "A+" }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => setShowSearch((v) => !v), children: showSearch ? "Fermer 🔍" : "🔍" })] }), showSearch ? (SP_JSX.jsx("div", { style: { padding: "8px 16px", background: "rgba(0,0,0,0.25)", flexShrink: 0 }, children: SP_JSX.jsx("input", { type: "text", value: searchPattern, onChange: (e) => setSearchPattern(e.target.value), placeholder: "Surligner dans la section\u2026", style: {
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${theme.borderColor}`,
                        background: "rgba(0,0,0,0.4)",
                        color: theme.textColor,
                        fontSize: "0.9rem",
                    } }) })) : null, SP_JSX.jsxs("div", { style: mainAreaStyle, children: [showToc ? (SP_JSX.jsx(DFL.Focusable, { style: sidebarStyle, children: guide.sections.map((sec, idx) => {
                            const isCurrent = idx === sectionIndex;
                            const indent = Math.max(0, (sec.heading_level || 0) - 1) * 12;
                            return (SP_JSX.jsxs(DFL.Focusable, { onActivate: () => setSectionIndex(idx), style: {
                                    padding: "8px 10px",
                                    paddingLeft: `${10 + indent}px`,
                                    borderLeft: isCurrent ? "3px solid #ffd966" : "3px solid transparent",
                                    background: isCurrent ? "rgba(255, 217, 102, 0.18)" : "transparent",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    fontWeight: isCurrent ? 700 : 400,
                                    color: theme.textColor,
                                }, children: [preferences.numbered_sections ? `[${idx + 1}] ` : "", sec.title || "(sans titre)"] }, idx));
                        }) })) : null, SP_JSX.jsx("div", { style: readerPaneStyle, children: SP_JSX.jsx(GuideReader, { guide: guide, sectionIndex: sectionIndex, fontScale: fontScale, preferences: preferences, searchPattern: searchPattern, scrollRestoreFraction: restoreFractionRef.current, onScrollChange: (f) => {
                                lastScrollFractionRef.current = f;
                                if (restoreFractionRef.current !== null)
                                    restoreFractionRef.current = null;
                            }, maxHeight: showSearch ? "calc(100vh - 200px)" : "calc(100vh - 150px)" }) })] }), SP_JSX.jsxs("div", { style: footerStyle, children: [SP_JSX.jsx(DFL.DialogButton, { disabled: sectionIndex <= 0, onClick: () => setSectionIndex((v) => Math.max(0, v - 1)), children: "\u25C0 Section pr\u00E9c\u00E9dente" }), SP_JSX.jsx("div", { style: { flex: 1, textAlign: "center", fontSize: "0.78rem", opacity: 0.7 }, children: sectionCount > 0 && sectionIndex >= 0 ? `${sectionIndex + 1} / ${sectionCount}` : "" }), SP_JSX.jsx(DFL.DialogButton, { onClick: () => {
                            if (!guide)
                                return;
                            void setBookmark(guide.id, sectionIndex, lastScrollFractionRef.current)
                                .then((g) => setGuide(g))
                                .catch(() => { });
                        }, children: "\uD83D\uDD16 Marque-page" }), SP_JSX.jsx("div", { style: { flex: 1 } }), SP_JSX.jsx(DFL.DialogButton, { disabled: sectionCount === 0 || sectionIndex >= sectionCount - 1, onClick: () => setSectionIndex((v) => Math.min(sectionCount - 1, v + 1)), children: "Section suivante \u25B6" })] })] }));
}
// ========== Main Content component ==========
function Content() {
    // Core state
    const [activeView, setActiveView] = SP_REACT.useState("sources");
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
    // Reader preferences
    const [preferences, setPreferences] = SP_REACT.useState({
        theme: "dark", font_family: "sans", line_height: "normal",
        max_width: "normal", highlight_keywords: true, numbered_sections: true,
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
    const selectedSearchResult = searchResults[searchResultIndex] || null;
    const selectedGuideSummary = guides[guideIndex] || null;
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
        })();
        return () => {
            if (saveTimeoutRef.current !== null)
                window.clearTimeout(saveTimeoutRef.current);
        };
    }, []);
    SP_REACT.useEffect(() => { if (sourceIndex >= sources.length)
        setSourceIndex(0); }, [sourceIndex, sources.length]);
    SP_REACT.useEffect(() => { if (libraryIndex >= filteredItems.length)
        setLibraryIndex(0); }, [libraryIndex, filteredItems.length]);
    SP_REACT.useEffect(() => { if (guideIndex >= guides.length)
        setGuideIndex(0); }, [guideIndex, guides.length]);
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
        if (!selectedLibraryItem) {
            setError("Aucun jeu sélectionné dans la bibliothèque locale.");
            return;
        }
        setIsBusy(true);
        setError("");
        try {
            const searchTitle = selectedLibraryItem.custom_title || selectedLibraryItem.title;
            const results = await searchGuides(searchTitle, selectedLibraryItem.platform, selectedSearchSite.value, selectedLanguage.value);
            setSearchResults(results);
            setSearchResultIndex(0);
            if (!results.length)
                setError("Aucun résultat. Change de site ou de langue, puis relance.");
        }
        catch (e) {
            setSearchResults([]);
            setError(e instanceof Error ? e.message : "Recherche impossible");
        }
        finally {
            setIsBusy(false);
        }
    };
    const handleImportSelectedResult = async () => {
        if (!selectedLibraryItem || !selectedSearchResult) {
            setError("Aucun résultat sélectionné à importer.");
            return;
        }
        setIsBusy(true);
        setError("");
        try {
            const importTitle = selectedLibraryItem.custom_title || selectedLibraryItem.title;
            const detail = await saveGuide(selectedSearchResult.url, importTitle, selectedLibraryItem.platform, selectedLibraryItem.primary_path || importTitle, selectedLibraryItem.aliases.join("; "), selectedLibraryItem.emulator || "");
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
        try {
            await updateReaderPreferences(next.theme, next.font_family, next.line_height, next.max_width, next.highlight_keywords, next.numbered_sections);
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
    const renderModeHeader = () => (SP_JSX.jsxs(DFL.PanelSection, { title: "Vue active", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: activeView.toUpperCase() }), SP_JSX.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.86 }, children: "Sources \u2192 biblioth\u00E8que \u2192 recherche \u2192 guides offline." })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setActiveView(VIEW_SEQUENCE[cycleIndex(VIEW_SEQUENCE.indexOf(activeView), VIEW_SEQUENCE.length, -1)]), children: "Vue pr\u00E9c\u00E9dente" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setActiveView(VIEW_SEQUENCE[cycleIndex(VIEW_SEQUENCE.indexOf(activeView), VIEW_SEQUENCE.length, 1)]), children: "Vue suivante" }) })] }));
    const renderSourcesView = () => (SP_JSX.jsxs(SP_JSX.Fragment, { children: [lastOpenedGuide ? (SP_JSX.jsxs(DFL.PanelSection, { title: "Reprendre la lecture", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { ...boxStyle, borderColor: "rgba(255, 217, 102, 0.35)" }, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "4px" }, children: lastOpenedGuide.game.game_title || lastOpenedGuide.title }), SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.85 }, children: [lastOpenedGuide.resume_label, lastOpenedGuide.progress?.last_opened_at
                                            ? ` — ${formatDate(lastOpenedGuide.progress.last_opened_at)}`
                                            : ""] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void openGuideById(lastOpenedGuide.id), children: "\u23F1 Reprendre o\u00F9 j'\u00E9tais" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => {
                                requestFullScreenGuide(lastOpenedGuide.id);
                                DFL.Router.CloseSideMenus();
                                DFL.Router.Navigate(FULL_SCREEN_ROUTE);
                            }, children: "\uD83D\uDDA5\uFE0F Reprendre en plein \u00E9cran" }) })] })) : null, SP_JSX.jsxs(DFL.PanelSection, { title: "R\u00E9sum\u00E9 scan", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Sources activ\u00E9es :" }), " ", libraryStatus.enabled_source_count] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Jeux index\u00E9s :" }), " ", libraryStatus.item_count] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Occurrences trouv\u00E9es :" }), " ", libraryStatus.instance_count] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Dernier scan :" }), " ", libraryStatus.scanned_at ? formatDate(libraryStatus.scanned_at) : "Jamais"] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleRescan(), children: isBusy ? "Scan en cours..." : "Rescanner les dossiers activés" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void loadSourcesAndLibrary(), children: "Red\u00E9tecter les dossiers" }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: selectedSource ? `Source ${sourceIndex + 1}/${sources.length}` : "Sources détectées", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedSource ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedSource.label }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.kind === "roms" ? "ROMs" : selectedSource.kind === "games" ? "Games" : "Steam" }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.storage }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.enabled ? "Activée" : "Désactivée" }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSource.exists ? "Présente" : "Absente" })] }), fieldLine("Chemin", selectedSource.path)] })) : (SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.86 }, children: "Aucune source d\u00E9tect\u00E9e. V\u00E9rifie tes dossiers Emulation/roms et Games." })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || sources.length <= 1, onClick: () => setSourceIndex((v) => cycleIndex(v, sources.length, -1)), children: "Source pr\u00E9c\u00E9dente" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || sources.length <= 1, onClick: () => setSourceIndex((v) => cycleIndex(v, sources.length, 1)), children: "Source suivante" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedSource, onClick: () => void handleToggleCurrentSource(), children: selectedSource?.enabled ? "Désactiver cette source" : "Activer cette source" }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Sauvegarde / restauration", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !guides.length, onClick: () => void handleExportAll(), children: "Exporter tous les guides (bundle JSON)" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleListExports(), children: "Lister les exports disponibles" }) }), showExports && exportFiles.length ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "4px" }, children: ["Export ", exportIndex + 1, "/", exportFiles.length] }), SP_JSX.jsx("div", { style: { fontSize: "0.85rem" }, children: exportFiles[exportIndex]?.name }), SP_JSX.jsxs("div", { style: { fontSize: "0.72rem", opacity: 0.75 }, children: [formatDate(exportFiles[exportIndex]?.modified_at || ""), " \u00B7 ", bytesToKo(exportFiles[exportIndex]?.size_bytes || 0)] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || exportFiles.length <= 1, onClick: () => setExportIndex((v) => cycleIndex(v, exportFiles.length, -1)), children: "Export pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || exportFiles.length <= 1, onClick: () => setExportIndex((v) => cycleIndex(v, exportFiles.length, 1)), children: "Export suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !exportFiles[exportIndex], onClick: () => void handleImportSelectedExport(), children: "Importer cet export" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setShowExports(false), children: "Masquer la liste" }) })] })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Diagnostic", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleDebug(), children: isBusy ? "Diagnostic en cours..." : "Lancer le diagnostic" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleTestNetwork(), children: isBusy ? "Test réseau en cours..." : "Tester la connexion aux moteurs" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleTestSearch(), children: isBusy ? "Test recherche en cours..." : "Tester le parsing des résultats" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleClearDebug(), children: "Effacer le fichier debug" }) }), debugOutput ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: {
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
    const renderSearchView = () => (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Base de recherche", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedLibraryItem ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedLibraryItem.custom_title || selectedLibraryItem.title }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedLibraryItem.platform }), SP_JSX.jsx("span", { style: pillStyle, children: selectedSearchSite.label }), SP_JSX.jsxs("span", { style: pillStyle, children: ["Langue : ", selectedLanguage.label] }), selectedLibraryItem.disc_code ? SP_JSX.jsx("span", { style: pillStyle, children: selectedLibraryItem.disc_code }) : null] }), selectedLibraryItem.custom_title ? fieldLine("Titre original", selectedLibraryItem.title) : null] })) : (SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.86 }, children: "Choisis d'abord un jeu dans la vue biblioth\u00E8que." })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setSearchSiteIndex((v) => cycleIndex(v, SEARCH_SITE_CHOICES.length, 1)), children: ["Site : ", selectedSearchSite.label, " (suivant)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setLanguageIndex((v) => cycleIndex(v, LANGUAGE_CHOICES.length, 1)), children: ["Langue : ", selectedLanguage.label, " (suivant)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedLibraryItem, onClick: () => void handleSearch(), children: isBusy ? "Recherche en cours..." : "Lancer la recherche" }) })] }), selectedSearchResult ? (SP_JSX.jsxs(DFL.PanelSection, { title: `Résultat ${searchResultIndex + 1}/${searchResults.length}`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedSearchResult.title }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedSearchResult.site }), SP_JSX.jsxs("span", { style: pillStyle, children: ["Score ", selectedSearchResult.score] })] }), fieldLine("URL", selectedSearchResult.url), fieldLine("Extrait", selectedSearchResult.snippet)] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || searchResults.length <= 1, onClick: () => setSearchResultIndex((v) => cycleIndex(v, searchResults.length, -1)), children: "R\u00E9sultat pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || searchResults.length <= 1, onClick: () => setSearchResultIndex((v) => cycleIndex(v, searchResults.length, 1)), children: "R\u00E9sultat suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void openUrlExternal(selectedSearchResult.url), children: "Ouvrir dans le navigateur" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedLibraryItem, onClick: () => void handleImportSelectedResult(), children: "Importer ce r\u00E9sultat offline" }) })] })) : null] }));
    const renderReaderPreferences = () => (SP_JSX.jsxs(DFL.PanelSection, { title: "Pr\u00E9f\u00E9rences de lecture", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Th\u00E8me :" }), " ", THEME_LABELS[preferences.theme]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Police :" }), " ", FONT_LABELS[preferences.font_family]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Interligne :" }), " ", LINE_HEIGHT_LABELS[preferences.line_height]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Largeur :" }), " ", MAX_WIDTH_LABELS[preferences.max_width]] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Surligner mots-cl\u00E9s :" }), " ", preferences.highlight_keywords ? "Oui" : "Non"] }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("strong", { children: "Num\u00E9roter sections :" }), " ", preferences.numbered_sections ? "Oui" : "Non"] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleTheme, children: "Changer le th\u00E8me" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleFont, children: "Changer la police" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleLineHeight, children: "Changer l'interligne" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: cycleMaxWidth, children: "Changer la largeur" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: toggleHighlight, children: [preferences.highlight_keywords ? "Désactiver" : "Activer", " le surlignage des mots-cl\u00E9s"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: toggleNumbered, children: [preferences.numbered_sections ? "Cacher" : "Afficher", " les num\u00E9ros de section"] }) })] }));
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
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [!expandedReader ? (SP_JSX.jsxs(DFL.PanelSection, { title: selectedGuideSummary ? `Guide importé ${guideIndex + 1}/${guides.length}` : "Guides importés", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: boxStyle, children: selectedGuideSummary ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: selectedGuideSummary.title }), SP_JSX.jsxs("div", { children: [SP_JSX.jsx("span", { style: pillStyle, children: selectedGuideSummary.site }), SP_JSX.jsx("span", { style: pillStyle, children: selectedGuideSummary.game.platform }), selectedGuideSummary.has_resume ? SP_JSX.jsx("span", { style: pillStyle, children: "Reprise" }) : null, selectedGuideSummary.has_bookmark ? SP_JSX.jsx("span", { style: pillStyle, children: "Marque-page" }) : null, selectedGuideSummary.progress.named_bookmarks.length > 0 ? (SP_JSX.jsxs("span", { style: pillStyle, children: ["\uD83D\uDD16 ", selectedGuideSummary.progress.named_bookmarks.length] })) : null, selectedGuideSummary.progress.section_notes.length > 0 ? (SP_JSX.jsxs("span", { style: pillStyle, children: ["\uD83D\uDCDD ", selectedGuideSummary.progress.section_notes.length] })) : null] }), fieldLine("Jeu lié", selectedGuideSummary.game.game_title), fieldLine("Extrait", selectedGuideSummary.snippet), SP_JSX.jsxs("div", { style: { fontSize: "0.8rem", opacity: 0.86 }, children: [SP_JSX.jsx("strong", { children: "Pages :" }), " ", selectedGuideSummary.page_count, " \u00B7 ", SP_JSX.jsx("strong", { children: "Sections :" }), " ", selectedGuideSummary.section_count, " \u00B7 ", SP_JSX.jsx("strong", { children: "Taille :" }), " ", bytesToKo(selectedGuideSummary.size_bytes)] })] })) : (SP_JSX.jsx("div", { style: { fontSize: "0.82rem", opacity: 0.86 }, children: "Aucun guide import\u00E9 pour le moment." })) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || guides.length <= 1, onClick: () => setGuideIndex((v) => cycleIndex(v, guides.length, -1)), children: "Guide pr\u00E9c\u00E9dent" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || guides.length <= 1, onClick: () => setGuideIndex((v) => cycleIndex(v, guides.length, 1)), children: "Guide suivant" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary, onClick: () => void openGuideById(selectedGuideSummary.id), children: "Ouvrir ce guide" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary, onClick: () => {
                                    if (!selectedGuideSummary)
                                        return;
                                    requestFullScreenGuide(selectedGuideSummary.id);
                                    DFL.Router.CloseSideMenus();
                                    DFL.Router.Navigate(FULL_SCREEN_ROUTE);
                                }, children: "\uD83D\uDDA5\uFE0F Ouvrir en plein \u00E9cran" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuideSummary, onClick: () => void handleDeleteSelectedGuide(), children: "Supprimer ce guide" }) })] })) : null, !expandedReader ? renderReaderPreferences() : null, selectedGuide ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Lecture offline", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsx("div", { style: { fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }, children: selectedGuide.game.game_title || selectedGuide.title }), SP_JSX.jsxs("div", { style: { fontSize: "0.82rem", opacity: 0.9, marginBottom: "2px" }, children: [SP_JSX.jsx("strong", { children: "Section :" }), " ", preferences.numbered_sections && sectionCount > 0 && selectedSectionIndex >= 0 ? `[${selectedSectionIndex + 1}/${sectionCount}] ` : "", currentSectionLabel] }), currentSectionNote ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.85 }, children: [currentSectionNote.done ? "✅ " : "", currentSectionNote.flagged ? "⚐ " : "", currentSectionNote.note ? `"${currentSectionNote.note}"` : ""] })) : null, selectedGuide.has_bookmark ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.85 }, children: ["\uD83D\uDD16 Marque-page rapide : ", selectedGuide.bookmark_label] })) : null, miniMap] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(GuideReader, { guide: selectedGuide, sectionIndex: selectedSectionIndex, fontScale: fontScale, preferences: preferences, searchPattern: findPattern, scrollRestoreFraction: scrollRestoreFraction, onScrollChange: (f) => {
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
                                                        }, children: "Supprimer ce marque-page" }) })] })) : null, SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedSectionIndex < 0, onClick: () => void handleToggleDone(), children: currentSectionNote?.done ? "✅ Marquer NON faite" : "Marquer cette section comme faite" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || selectedSectionIndex < 0, onClick: () => void handleToggleFlag(), children: currentSectionNote?.flagged ? "⚐ Retirer le drapeau" : "⚐ Marquer à revoir" }) }), currentSectionNote ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleClearSectionNote(), children: "Retirer les marqueurs de cette section" }) })) : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Outils", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setFontScale((v) => Math.max(0.85, Math.round((v - 0.05) * 100) / 100)), children: ["A- R\u00E9duire le texte (", fontScale.toFixed(2), "x)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => setFontScale((v) => Math.min(2.0, Math.round((v + 0.05) * 100) / 100)), children: ["A+ Agrandir le texte (", fontScale.toFixed(2), "x)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || !selectedGuide.url, onClick: () => void handleOpenExternal(), children: "\uD83C\uDF10 Ouvrir la source dans le navigateur" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleExportCurrent(), children: "\uD83D\uDCBE Exporter ce guide en JSON" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleReconstructSections(), children: ["\uD83D\uDD27 Reconstruire le sommaire (", selectedGuide.sections.length, " sections)"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: () => void handleClearProgress(), children: "Effacer la reprise (garde marque-pages et notes)" }) }), selectedGuide.source_pages.length > 1 ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: boxStyle, children: [SP_JSX.jsxs("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: ["Pages source (", selectedGuide.source_pages.length, ")"] }), selectedGuide.source_pages.slice(0, 6).map((page) => (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.84, marginBottom: "4px" }, children: ["\u2022 ", page.title] }, `${page.url}-${page.title}`))), selectedGuide.source_pages.length > 6 ? (SP_JSX.jsxs("div", { style: { fontSize: "0.78rem", opacity: 0.74 }, children: ["\u2026 ", selectedGuide.source_pages.length - 6, " pages de plus"] })) : null] }) })) : null] })] })) : null] })) : null] }));
    };
    return (SP_JSX.jsxs("div", { style: { width: "100%", boxSizing: "border-box", paddingBottom: "12px" }, children: [renderModeHeader(), error ? (SP_JSX.jsx(DFL.PanelSection, { title: "\u00C9tat", children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { ...boxStyle, borderColor: "rgba(255,100,100,0.35)" }, children: error }) }) })) : null, activeView === "sources" ? renderSourcesView() : null, activeView === "library" ? renderLibraryView() : null, activeView === "search" ? renderSearchView() : null, activeView === "guides" ? renderGuidesView() : null] }));
}
var index = DFL.definePlugin(() => {
    routerHook.addRoute(FULL_SCREEN_ROUTE, FullScreenReader, { exact: true });
    return {
        title: SP_JSX.jsx("div", { className: "title", children: "Offline Soluce" }),
        content: SP_JSX.jsx(Content, {}),
        icon: SP_JSX.jsx(FaBookOpen, {}),
        onDismount() {
            routerHook.removeRoute(FULL_SCREEN_ROUTE);
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
