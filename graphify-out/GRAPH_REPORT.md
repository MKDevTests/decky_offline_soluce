# Graph Report - decky-offline-soluce  (2026-07-04)

## Corpus Check
- 15 files · ~841,616 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2011 nodes · 3110 edges · 99 communities (88 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac0af2f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]

## God Nodes (most connected - your core abstractions)
1. `Plugin` - 203 edges
2. `str` - 199 edges
3. `Any` - 68 edges
4. `GuideSection` - 24 edges
5. `bool` - 18 edges
6. `int` - 18 edges
7. `compilerOptions` - 16 edges
8. `Path` - 15 edges
9. `/graphify` - 15 edges
10. `_ReadableTextParser` - 14 edges

## Surprising Connections (you probably didn't know these)
- `_html_unescape()` --references--> `str`  [EXTRACTED]
  main.py → main.py  _Bridges community 48 → community 90_
- `_regex_extract_links()` --calls--> `_html_unescape()`  [EXTRACTED]
  main.py → main.py  _Bridges community 48 → community 85_
- `_regex_extract_links()` --references--> `str`  [EXTRACTED]
  main.py → main.py  _Bridges community 90 → community 85_
- `_regex_parse_ddg_results()` --references--> `str`  [EXTRACTED]
  main.py → main.py  _Bridges community 90 → community 69_
- `_DuckDuckGoSearchParser` --inherits--> `_StdHTMLParser`  [EXTRACTED]
  main.py → main.py  _Bridges community 93 → community 84_

## Communities (99 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (93): addNamedBookmark, BACKUP_INTERVAL_CHOICES, BackupConfig, boxStyle, cleanExistingGuide, clearBookmark, clearDebugLog, clearProgress (+85 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (13): v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid, v0.43.10: for the fragment-heavy French sites, keep ONE result per         guid (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (38): Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real, Merge sections whose body has fewer than MIN_SECTION_CONTENT_LINES         real (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (4): Any, GuideRecord, float, int

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (21): code:powershell (New-Item -ItemType Directory -Force -Path graphify-out | Out), code:powershell (@'), code:powershell (@'), code:powershell (@'), code:powershell (# Detect Python with graphify — uv/pipx-aware (fixes #831)), code:powershell (@'), code:powershell (@'), code:powershell (@') (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (18): code:block1 (/graphify                                             # full), code:powershell (@'), code:powershell (@'), code:powershell (& (Get-Content graphify-out\.graphify_python) -m graphify.wa), code:bash (graphify hook install    # install), code:bash (graphify claude install), code:bash (graphify claude uninstall  # remove the section), For --cluster-only (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (25): Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S, Determine the URL path prefix used to discover sibling guide pages.          S (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (25): author, dependencies, @decky/api, react-icons, tslib, description, devDependencies, @decky/rollup (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (34): Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co, Detect TOCs that use numbered/lettered IDs without [CODE] markers.          Co (+26 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): compilerOptions, allowSyntheticDefaultImports, declaration, esModuleInterop, jsx, module, moduleResolution, noImplicitAny (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (14): 1. Vue `SOURCES`, 2. Vue `LIBRARY`, 3. Vue `SEARCH`, 4. Vue `GUIDES`, Ce que fait cette version, code:powershell (pnpm i), code:text (release\decky-offline-soluce-v0.11.0.zip), code:powershell (cd .\release) (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (8): Avertissement, Build local, Ce que fait cette V3, code:bash (pnpm i), Decky Offline Soluce, Données stockées, Limites actuelles, Structure

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (7): api_version, author, flags, name, publish, description, tags

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (10): consumeFullScreenGuideId(), fontFamily(), FullScreenGameLibrary(), FullScreenLibrary(), FullScreenReader(), FullScreenSearch(), GuideReader(), lineHeightValue() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (25): v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.0: clean up section titles for sidebar readability.          Three trans (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): CSSProperties, IntrinsicElements, ReactNode

### Community 17 - "Community 17"
Cohesion: 0.50
Nodes (3): hooks, PostToolUse, PreToolUse

### Community 19 - "Community 19"
Cohesion: 0.50
Nodes (4): findGuideForRunningApp(), findSimilarGuides(), guideMatchesLibraryItem(), normalizeText()

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (28): When N+ consecutive sections share the same base title (ignoring any         ``, When N+ consecutive sections share the same base title (ignoring any         ``, When N+ consecutive sections share the same base title (ignoring any         ``, When N+ consecutive sections share the same base title (ignoring any         ``, When N+ consecutive sections share the same base title (ignoring any         ``, When N+ consecutive sections share the same base title (ignoring any         ``, v0.42.0: clean up section titles for sidebar readability.          Three trans, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (4): getReaderPreferences, setCurrentResumeButton(), setCurrentResumeEnabled(), setupListener()

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (18): Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint., Detect a running emulator and extract the loaded ROM/ISO as a game-title hint. (+10 more)

### Community 29 - "Community 29"
Cohesion: 0.04
Nodes (42): Perform a real search on each engine and report raw result counts., Perform a real search on each engine and report raw result counts., Perform a real search on each engine and report raw result counts., Perform a real search on each engine and report raw result counts., Perform a real search on each engine and report raw result counts., Perform a real search on each engine and report raw result counts., Test network connectivity by trying multiple URLs and reporting detailed results, Test network connectivity by trying multiple URLs and reporting detailed results (+34 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (17): Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at., Trigger an export immediately and stamp last_backup_at. (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.05
Nodes (36): Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica, Detect a GameFAQs-style Table of Contents with [CODE] markers.          Typica (+28 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (37): One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter, One pass of the split algorithm (see _split_large_sections for the         iter (+29 more)

### Community 34 - "Community 34"
Cohesion: 0.07
Nodes (26): v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor, v0.42.2: shorten titles > TITLE_MAX_CHARS by cutting at the nearest         wor (+18 more)

### Community 35 - "Community 35"
Cohesion: 0.06
Nodes (35): Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav, Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav, v0.42.0: clean up section titles for sidebar readability.          Three trans, Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav, Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav, Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav, Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav, Last-resort heuristic. Stricter than before:          - ALL-CAPS lines must hav (+27 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (27): Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When, Strip Wayback Machine capture chrome that wraps the actual page.          When (+19 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (28): Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.05
Nodes (38): Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header., Find a TOC by detecting a run of code-bearing lines without a header. (+30 more)

### Community 39 - "Community 39"
Cohesion: 0.07
Nodes (27): Return internal URLs whose path starts with base_prefix.          Used to foll, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr, Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extr (+19 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (29): v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si, v0.41.1: drop the GameFAQs sidebar/nav/widget noise (~55 lines)         that si (+21 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (16): Re-run the section detector on an existing guide's content.         Preserves p, Re-run the section detector on an existing guide's content.         Preserves p, Re-run the section detector on an existing guide's content.         Preserves p, Re-run the section detector on an existing guide's content.         Preserves p, Clear all hidden flags for this guide., Re-run the section detector on an existing guide's content.         Preserves p, Re-run the section detector on an existing guide's content.         Preserves p, Re-run the section detector on an existing guide's content.         Preserves p (+8 more)

### Community 42 - "Community 42"
Cohesion: 0.07
Nodes (26): v0.43.31: modern IGN wikis (Next.js) put the walkthrough content in the, Turn a list of (line_index, title, heading_level) into GuideSection         rec, Turn a list of (line_index, title, heading_level) into GuideSection         rec, Turn a list of (line_index, title, heading_level) into GuideSection         rec, Turn a list of (line_index, title, heading_level) into GuideSection         rec, Turn a list of (line_index, title, heading_level) into GuideSection         rec, One pass of the split algorithm (see _split_large_sections for the         iter, Turn a list of (line_index, title, heading_level) into GuideSection         rec (+18 more)

### Community 43 - "Community 43"
Cohesion: 0.07
Nodes (26): v0.42.3: identify section titles that look like FAQ meta-content         (autho, v0.42.3: identify section titles that look like FAQ meta-content         (autho, v0.42.3: identify section titles that look like FAQ meta-content         (autho, v0.42.3: identify section titles that look like FAQ meta-content         (autho, v0.42.3: identify section titles that look like FAQ meta-content         (autho, v0.42.3: identify section titles that look like FAQ meta-content         (autho, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bou, v0.42.3: identify section titles that look like FAQ meta-content         (autho (+18 more)

### Community 44 - "Community 44"
Cohesion: 0.05
Nodes (37): Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Detect banner-style headings common in plain-text FAQs:          Pattern A (bo, Turn a list of (line_index, title, heading_level) into GuideSection         rec (+29 more)

### Community 45 - "Community 45"
Cohesion: 0.06
Nodes (31): When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a, When 3+ consecutive sections share a prefix of >= 25 chars ending at         a (+23 more)

### Community 46 - "Community 46"
Cohesion: 0.06
Nodes (33): Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method)., Detect section boundaries in a guide's plain text. Returns (sections, method). (+25 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (17): Clear all hidden flags for this guide., Clear all hidden flags for this guide., Clear all hidden flags for this guide., Clear all hidden flags for this guide., v0.43.14: SYNC import body (validate → crawl → sections → save). Runs         in, Clear all hidden flags for this guide., Clear all hidden flags for this guide., Clear all hidden flags for this guide. (+9 more)

### Community 48 - "Community 48"
Cohesion: 0.06
Nodes (37): _html_unescape(), Minimal HTML entity unescaping fallback., v0.41.1: site-specific extractor for vally8.free.fr (old fan site).         Use, v0.41.1: site-specific extractor for vally8.free.fr (old fan site).         Use, v0.41.1: site-specific extractor for vally8.free.fr (old fan site).         Use, v0.41.1: site-specific extractor for vally8.free.fr (old fan site).         Use, v0.41.1: site-specific extractor for vally8.free.fr (old fan site).         Use, v0.41.1: site-specific extractor for vally8.free.fr (old fan site).         Use (+29 more)

### Community 49 - "Community 49"
Cohesion: 0.07
Nodes (26): Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll, Return internal URLs whose path starts with base_prefix.          Used to foll (+18 more)

### Community 50 - "Community 50"
Cohesion: 0.08
Nodes (23): Strip Wayback Machine capture chrome that wraps the actual page.          When a, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Targe, v0.42.9: absorb prose-titled sections into their neighbor (previous,         or, v0.42.9: absorb prose-titled sections into their neighbor (previous,         or, v0.42.9: absorb prose-titled sections into their neighbor (previous,         or, v0.42.9: absorb prose-titled sections into their neighbor (previous,         or, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Targe, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them         w (+15 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (27): Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a (+19 more)

### Community 52 - "Community 52"
Cohesion: 0.06
Nodes (30): Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect, Back-compat wrapper that drops the detection method.         Prefer _build_sect (+22 more)

### Community 53 - "Community 53"
Cohesion: 0.06
Nodes (35): Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam, Iterative wrapper around _split_large_sections_once: re-applies the         sam (+27 more)

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (28): Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar, Remove rpgsoluce.com boilerplate that the generic strippers miss.          Tar (+20 more)

### Community 55 - "Community 55"
Cohesion: 0.07
Nodes (28): v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo, v0.41.1: strip vally8.free.fr boilerplate that repeats at every         page bo (+20 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (11): Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines., Detect CAPTCHA pages from various search engines. (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (15): GuideSection, v0.43.14: SYNC import body (validate → crawl → sections → save). Runs         i, v0.43.20: shared sectioning used by BOTH import and Re-DL/reload.          MUL, v0.43.20: shared sectioning used by BOTH import and Re-DL/reload.          MUL, v0.43.14: SYNC import body (validate → crawl → sections → save). Runs         i, v0.43.14: SYNC import body (validate → crawl → sections → save). Runs         i, v0.43.14: SYNC import body (validate → crawl → sections → save). Runs         i, v0.43.20: shared sectioning used by BOTH import and Re-DL/reload.          MUL (+7 more)

### Community 58 - "Community 58"
Cohesion: 0.08
Nodes (25): Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped)., Find sibling URLs + next-page URL, append them to queue (deduped). (+17 more)

### Community 59 - "Community 59"
Cohesion: 0.08
Nodes (23): bytes, v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).          Return, v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).          Return, Find sibling URLs + next-page URL, append them to queue (deduped)., v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).          Return, v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).          Return, v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).          Return, v0.42.8: fetch a URL via the `curl` binary (fresh subprocess).          Return (+15 more)

### Community 60 - "Community 60"
Cohesion: 0.10
Nodes (20): v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s, v0.43.8: STEP 0 of title polishing — clean dotted-leader tails and         un-s (+12 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (18): v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit, v0.42.7: extract explicit chapter links from the page HTML when the         sit (+10 more)

### Community 62 - "Community 62"
Cohesion: 0.07
Nodes (26): Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates., Detect the correct charset by looking at HTML meta tag and scoring candidates. (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.11
Nodes (18): v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p, v0.42.14: extract JV guide chapter links. The 'guide complet' landing         p (+10 more)

### Community 64 - "Community 64"
Cohesion: 0.09
Nodes (22): v0.42.9: True if `title` looks like a prose sentence / mid-content         frag, v0.42.18: split a line range into (start, end) chunks, each capped at         B, v0.42.18: split a line range into (start, end) chunks, each capped at         B, v0.42.9: True if `title` looks like a prose sentence / mid-content         fragm, Back-compat wrapper that drops the detection method.         Prefer _build_secti, v0.42.18: split a line range into (start, end) chunks, each capped at         B, v0.42.18: split a line range into (start, end) chunks, each capped at         B, Iterative wrapper around _split_large_sections_once: re-applies the         sam (+14 more)

### Community 65 - "Community 65"
Cohesion: 0.04
Nodes (46): Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections., Re-fetch the guide from its source URL, refreshing content + sections. (+38 more)

### Community 66 - "Community 66"
Cohesion: 0.09
Nodes (21): v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur, v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur, v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur, v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur, Detect dense runs of non-prose lines (tables, ascii-art) and wrap them         w, v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur, v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur, v0.43.8: rebuild a letter-spaced banner into words. Word boundaries         sur (+13 more)

### Community 67 - "Community 67"
Cohesion: 0.09
Nodes (21): v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban, v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban, v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban, v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban, v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban, v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban, v0.42.9: absorb prose-titled sections into their neighbor (previous,         or, v0.43.8: True if `title` is a GameFAQs-style letter-spaced ALL-CAPS         ban (+13 more)

### Community 69 - "Community 69"
Cohesion: 0.25
Nodes (8): GuideSearchResult, Multi-engine search result parser.          Strategy: First try engine-specifi, Multi-engine search result parser.          Strategy: First try engine-specifi, Multi-engine search result parser.          Strategy: First try engine-specifi, Multi-engine search result parser.          Strategy: First try engine-specific, Multi-engine search result parser.          Strategy: First try engine-specifi, Multi-engine search result parser.          Strategy: First try engine-specific, _regex_parse_ddg_results()

### Community 70 - "Community 70"
Cohesion: 0.09
Nodes (19): v0.43.14: kick off a background import, return a job_id immediately.         Th, v0.43.21: (host-without-www, guide-root-path) — the identity of a guide, v0.43.21: (host-without-www, guide-root-path) — the identity of a guide, v0.43.14: kick off a background import, return a job_id immediately.         Th, v0.43.21: (host-without-www, guide-root-path) — the identity of a guide, v0.43.14: kick off a background import, return a job_id immediately.         Th, v0.43.21: id of an already-saved guide whose URL maps to the same guide, v0.43.27: True if `url` is a GameFAQs GAME landing page (…/<platform>/         < (+11 more)

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (17): Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it, Toggle the "hidden" flag on a section. Stored by title (not index) so it (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (12): v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra, v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra, v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra, v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra, v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra, v0.43.10: map a guide URL path to its guide-root key so per-chapter         fra (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.11
Nodes (18): Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget., Wait 30s after plugin load, then run auto-backup if due. Fire-and-forget. (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (10): The readable context for a flag: the line, widened to neighbours when         th, v0.43.33: scan the guide for missable / key-item / side-quest phrases., v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a, v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a, v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a, v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a, v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a, v0.43.20: sync body of Re-DL — runs in a thread pool so re-downloading a (+2 more)

### Community 75 - "Community 75"
Cohesion: 0.09
Nodes (21): v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is, v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is, v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is, Back-compat wrapper that drops the detection method.         Prefer _build_secti, v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is, v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is, v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is, v0.43.8: drop the dotted-leader TOC tail, then un-space if the title         is (+13 more)

### Community 76 - "Community 76"
Cohesion: 0.12
Nodes (15): v0.41+: re-apply site-specific noise stripping to a stored guide.          Use, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.41+: re-apply site-specific noise stripping to a stored guide.          Use, v0.41+: re-apply site-specific noise stripping to a stored guide.          Use, v0.41+: re-apply site-specific noise stripping to a stored guide.          Use, v0.41+: re-apply site-specific noise stripping to a stored guide.          Use, v0.41+: re-apply site-specific noise stripping to a stored guide.          Use, v0.41+: re-apply site-specific noise stripping to a stored guide.          Use (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.13
Nodes (14): v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each, v0.42.2: batch reconstruct + polish for every stored guide.          For each (+6 more)

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (7): v0.43.14: poll target for the import-progress UI., v0.43.14: poll target for the import-progress UI., v0.43.14: poll target for the import-progress UI., v0.43.14: poll target for the import-progress UI., v0.43.14: poll target for the import-progress UI., v0.43.14: poll target for the import-progress UI., v0.43.14: poll target for the import-progress UI.

### Community 79 - "Community 79"
Cohesion: 0.50
Nodes (3): v0.43.30: IGN wiki walkthroughs (`/wikis/<game>/<Chapter>`) render their, v0.43.30: IGN wiki walkthroughs (`/wikis/<game>/<Chapter>`) render their, v0.43.30: IGN wiki walkthroughs (`/wikis/<game>/<Chapter>`) render their

### Community 80 - "Community 80"
Cohesion: 0.07
Nodes (28): v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t, v0.42.3: detect the Wayback Machine "Organization: Alexa Crawls"         page t (+20 more)

### Community 81 - "Community 81"
Cohesion: 0.17
Nodes (12): code:powershell (& (Get-Content graphify-out\.graphify_python) -c "), code:powershell (@'), code:powershell (@'), code:powershell (@'), code:powershell (@'), code:powershell (@'), code:block8 ([Agent tool call 1: files 1-15]), code:block9 (You are a graphify extraction subagent. Read the files liste) (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.29
Nodes (6): v0.43.18: all import jobs (running first, then recently finished), each, v0.43.18: all import jobs (running first, then recently finished), each, v0.43.18: all import jobs (running first, then recently finished), each, v0.43.18: all import jobs (running first, then recently finished), each, v0.43.18: all import jobs (running first, then recently finished), each, v0.43.18: all import jobs (running first, then recently finished), each

### Community 83 - "Community 83"
Cohesion: 0.07
Nodes (26): Collapse runs of 3+ consecutive newlines down to exactly 2.          HTML extrac, v0.42.9: True if `title` looks like a prose sentence / mid-content         frag, v0.42.9: True if `title` looks like a prose sentence / mid-content         frag, v0.42.9: True if `title` looks like a prose sentence / mid-content         frag, Detect and remove the rpgsoluce sidebar nav menu block.          Signature: a, v0.42.9: True if `title` looks like a prose sentence / mid-content         frag, v0.42.9: True if `title` looks like a prose sentence / mid-content         frag, v0.42.9: True if `title` looks like a prose sentence / mid-content         frag (+18 more)

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (7): Fallback link extractor when html.parser is unavailable., Fallback link extractor when html.parser is unavailable., Fallback link extractor when html.parser is unavailable., Fallback link extractor when html.parser is unavailable., Fallback link extractor when html.parser is unavailable., Fallback link extractor when html.parser is unavailable., _regex_extract_links()

### Community 86 - "Community 86"
Cohesion: 0.20
Nodes (9): v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec, v0.43.22: enforce MAX_SECTION_COUNT WITHOUT losing content. The old         `sec (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (6): code:powershell (@'), code:powershell (@'), code:powershell (if (-not (Test-Path graphify-out\.graphify_extract.json)) {), code:powershell (@'), code:powershell (@'), For --update (incremental re-extraction)

### Community 89 - "Community 89"
Cohesion: 0.15
Nodes (11): GuideFlag, GuideReadingProgress, GuideSectionNote, GuideSourcePage, NamedBookmark, v0.43.14: run the (blocking, possibly multi-page) import in a thread         po, v0.43.14: run the (blocking, possibly multi-page) import in a thread         po, v0.43.14: run the (blocking, possibly multi-page) import in a thread         poo (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.11
Nodes (5): bool, Plugin, v0.43.27: True if `url` is a GameFAQs GAME landing page (…/<platform>/         <, ShortcutEntry, str

### Community 91 - "Community 91"
Cohesion: 0.50
Nodes (4): code:powershell (@'), code:powershell (@'), code:powershell (& (Get-Content graphify-out\.graphify_python) -m graphify sa), For /graphify query

### Community 92 - "Community 92"
Cohesion: 0.50
Nodes (4): code:powershell (@'), code:powershell (@'), code:powershell (& (Get-Content graphify-out\.graphify_python) -m graphify sa), For /graphify path

### Community 93 - "Community 93"
Cohesion: 0.08
Nodes (10): _LinkParser, HTML → text parser that preserves heading level metadata inline.      Headings, HTML → text parser that preserves heading level metadata inline.      Headings, HTML → text parser that preserves heading level metadata inline.      Headings, HTML → text parser that preserves heading level metadata inline.      Headings g, HTML → text parser that preserves heading level metadata inline.      Headings, HTML → text parser that preserves heading level metadata inline.      Headings g, Dummy fallback when html.parser is not available. (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.15
Nodes (12): v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars, v0.43.9: parse a SERP HTML page with both the stdlib and the regex         pars (+4 more)

### Community 95 - "Community 95"
Cohesion: 0.50
Nodes (4): code:powershell (@'), code:powershell (@'), code:powershell (& (Get-Content graphify-out\.graphify_python) -m graphify sa), For /graphify explain

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (3): code:powershell (@'), code:powershell (@'), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag)

### Community 97 - "Community 97"
Cohesion: 0.67
Nodes (3): code:powershell (& (Get-Content graphify-out\.graphify_python) -m graphify.se), code:json ({), Step 7d - MCP server (only if --mcp flag)

### Community 98 - "Community 98"
Cohesion: 0.67
Nodes (3): code:powershell (@'), code:block26 (Graph complete. Outputs in PATH_TO_DIR/graphify-out/), Step 9 - Save manifest, update cost tracker, clean up, and report

## Knowledge Gaps
- **209 isolated node(s):** `name`, `version`, `description`, `type`, `build` (+204 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Plugin` connect `Community 90` to `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 8`, `Community 14`, `Community 26`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 86`, `Community 88`, `Community 89`, `Community 94`?**
  _High betweenness centrality (0.333) - this node is a cross-community bridge._
- **Why does `str` connect `Community 90` to `Community 2`, `Community 3`, `Community 6`, `Community 8`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 88`, `Community 89`, `Community 93`, `Community 94`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **Why does `GuideSection` connect `Community 57` to `Community 2`, `Community 8`, `Community 14`, `Community 26`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 50`, `Community 52`, `Community 53`, `Community 60`, `Community 74`, `Community 86`, `Community 89`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `Minimal HTML entity unescaping fallback.`, `Dummy fallback when html.parser is not available.`, `v0.43.33: an auto-detected high-value moment in a guide — a missable/point     o` to the rest of the system?**
  _1432 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.018018018018018018 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._