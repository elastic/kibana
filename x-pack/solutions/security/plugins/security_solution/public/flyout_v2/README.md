# Security Solution Flyout (v2)

This document is the entry point for developers **and AI agents** modifying or extending the new flyout. Read it before
touching code here.

## TL;DR

- There is **one developer-facing hook**: `useFlyoutApi()` (`use_flyout_api.tsx`). It returns every open method,
  namespaced by type (`openDocumentFlyoutFromIndex`, `openHostFlyout`, `openAttackCorrelations`, `openNotes`, …).
- Everything must run **inside the Security Solution app shell** (Redux store + router + Kibana services).
- Adding a new flyout is mostly mechanical: write a per-type `use_<type>_flyout_api` hook, wire it into the facade, add
  a URL descriptor, add a restorer, add telemetry constants.

## Folder structure

```
flyout_v2/
├─ use_flyout_api.tsx          # THE facade. Composes every per-type hook into one FlyoutApi.
├─ use_flyout_api.mock.ts      # Composed jest mock (mirrors the facade).
├─ session_context.tsx         # Ambient { session, historyKey } threaded into nested opens.
│
├─ document/                   # One folder per flyout "type".
│  ├─ use_document_flyout_api.tsx   # Per-type open methods (+ .test.tsx, + .mock.ts).
│  ├─ main/                    # The top-level flyout panel (header/footer/tabs/components).
│  └─ tools/                   # The secondary "tool" panels (analyzer, correlations, …).
│
├─ attack/  entity/  csp/  ioc/  network/  rule/    # Same main/tools shape.
│  └─ entity/ is further split: host/ user/ service/ generic/ + shared/ (tools reused across them).
│
└─ shared/                     # Everything cross-cutting, not owned by a single type.
   ├─ tools/                   # Tools reused across types (e.g. notes) + use_shared_tools_flyout_api.
   ├─ url_state/               # URL sync writer, restore-on-mount, and legacy interop.
   ├─ hooks/                   # use_open_flyout, use_flyout_telemetry, use_tabs, use_default_flyout_properties, …
   ├─ components/              # Shared UI (tools_flyout_header, flyout_provider, cell_actions, tables, …).
   ├─ constants/               # flyout_titles.ts, flyout_history.ts.
   └─ utils/                   # build_flyout_nav_title, build_flyout_content, get_field_format.
```

### `main` vs `tools`

- **`main/`** is the primary, top-level flyout panel for a type (e.g. the document details flyout with its Overview /
  Table / JSON tabs). Opened with `session: 'start'` from outside any flyout, or `session: 'inherit'` when opened as a
  child.
- **`tools/`** are the secondary panels historically shown in the legacy flyout's "left" (expanded) panel — Analyzer,
  Session View, Correlations, Prevalence, Entities, Response, Threat Intelligence, Investigation Guide, Graph, Notes,
  and the entity insight tools. **Tools always open as their own root (`session: 'start'`)**; they are not persisted as
  a child of the main flyout.

## The public API (`useFlyoutApi`)

`useFlyoutApi()` is a thin **facade**. It composes the per-type hooks and spreads their methods into one object:

```tsx
export type FlyoutApi = DocumentFlyoutApi & AttackFlyoutApi & CspFlyoutApi &
  EntityFlyoutApi & IocFlyoutApi & NetworkFlyoutApi & RuleFlyoutApi & SharedToolsFlyoutApi;
```

Conventions:

- **Namespaced method names**: `open<Type>Flyout...` / `open<Type><Tool>`. Callers never touch the flyout `session`
  directly.
- **Main vs `...AsChild`**: most types expose two variants. `openXFlyout` opens a new **top-level** flyout (fresh
  session). `openXFlyoutAsChild` opens **nested** in the currently open flyout's history stack (back button returns to
  the parent). Use the child variant only from within an already-open flyout (e.g. a graph node click).
- The facade is a one-line change per new type. The **per-type hook owns the real wiring** (lazy-loading, provider
  setup, flyout properties, URL writes, telemetry). That's the unit each team maintains.

### Anatomy of an open method

Every open method follows the same shape (see `document/use_document_flyout_api.tsx` for the canonical examples):

```tsx
const openThing = useCallback((params) => {
  writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.thing, ...serializableIds });  // 1. URL sync
  const onClose = buildOnClose(fallbackDescriptorOrNull);                    // 2. close → URL revert
  open(
    <ThingPanel {...params} />,                       // 3a. lazy-loaded content
    { ...defaultProps, historyKey, session, title, onClose },  // 3b. EUI flyout properties
    { surface, flyoutType, tool?, session, origin },  // 3c. telemetry meta
    FLYOUT_SESSION_KIND.INHERIT                        // 3d. optional session override (see below)
  );
}, [open, historyKey, writeOnOpen, buildOnClose, ...]);
```

Key points:

- **Content is lazy-loaded** (`React.lazy` + dynamic `import`) so consumers don't statically pull the whole tool graph
  into their bundle. The chunk only loads when a flyout is actually opened.
- **`title`** is built from `flyout_titles.ts` via `formatFlyoutTitle(CANONICAL, dynamicValue)` (e.g.
  `Analyzer: my-host`). For child opens, wrap with `buildFlyoutNavTitle(...)` to get `"<root title> -> <child title>"`
  history breadcrumbs.
- Tool flyouts pass `FLYOUT_SESSION_KIND.INHERIT` as the 4th `open` arg (`sessionOverride`) so that the context threaded
  into anything they subsequently open inherits, while the tool itself is written with `session: 'start'`.

## Sessions and history keys

`session_context.tsx` defines ambient state threaded from a flyout into whatever it opens next, so nested opens inherit
it without prop-drilling:

```ts
interface FlyoutSessionContextValue {
  session: 'start' | 'inherit';  // should the next flyout start fresh or nest?
  historyKey?: symbol;           // which flyout history stack this belongs to
}
```

- **`session`**: `'start'` replaces the top-level flyout; `'inherit'` nests into the current one's history/back stack.
- **`historyKey`** scopes back-navigation and "close all in group" behavior. Two keys exist
  (`shared/constants/flyout_history.ts`):
    - `documentFlyoutHistoryKey` — the app-wide default, shared by alert/event/IOC/etc. flyouts inside Security.
    - `timelineFlyoutHistoryKey` — used by flyouts opened from within Timeline, so a Timeline-spawned chain stays
      isolated from whatever was already open on the page.
- Outside Security (e.g. Discover), `useFlyoutSessionContext()` falls back to `DOC_VIEWER_FLYOUT_HISTORY_KEY`.

The history key maps directly onto the URL param key (below) via `urlParamKeyForHistoryKey`.

## URL synchronization

State lives in the URL as a rison-encoded ordered array of up to **2** `FlyoutDescriptor`s: index 0 is the root
(`session: 'start'`), index 1 is the child (`session: 'inherit'`). This mirrors what EUI's flyout-manager can show at
once.

Two independent param keys, one per history context (`shared/url_state/flyout_v2_url_param.ts`):

- `flyoutV2` — page context.
- `flyoutV2Timeline` — Timeline context.

These are **separate** from the legacy `flyout` param and the pre-existing `attackFlyoutV2` param — do not unify them.

### Descriptors (`flyout_v2_url_param.ts`)

- `FLYOUT_DESCRIPTOR_KIND` is the registry of every kind. Each kind has a matching `*Descriptor` interface, all joined
  into the `FlyoutDescriptor` discriminated union.
- **Descriptors must be cheaply, fully serializable.** They store only identifying ids (e.g.
  `{ documentId, indexName }`, `{ hostName, entityId, scopeId }`), never React nodes or full documents. Enum values
  (EntityType, FlowTargetSourceDest) are stored as plain strings and cast back on restore.
- If a flyout's props can't be serialized, **omit it** rather than storing a partial. Example: `entityFieldsTable` is
  intentionally not restorable (its prop is a full flattened document); its restorer opens the parent entity flyout
  instead.
- `decodeFlyoutV2UrlParam` never throws: it returns `null` for missing/malformed/unknown-kind input.

### Writer (`flyout_v2_url_writer.ts`)

`useFlyoutV2UrlWriter(urlParamKey, historyKey)` returns:

- `writeOnOpen(descriptor, mode = 'start' | 'inherit')` — `'start'` replaces the array with `[descriptor]`; `'inherit'`
  keeps the root and sets the child slot.
- `buildOnClose(fallback)` — returns the `onClose` handler. Writes `[fallback]` (or clears the param when `null`) unless
  a newer open is still on screen.

Two invariants worth understanding before you touch this file:

- **Writes use `history.replace`, never `push`** — no extra Back/Forward stops.
- **Cascade-close guard.** EUI fires `onClose` both on a genuine close and on a cascade-eviction (a deeper flyout
  evicting the current slot). A naive pop corrupts the stack. The writer tracks a module-scoped monotonic **generation**
  per param key, plus an `openGenerationStacks` mirror of the URL array, so `buildOnClose` can ask precisely: "is
  anything newer than me still open?" and swallow stale eviction callbacks correctly. Don't replace this with a simpler
  check.

### Restore on mount (`use_flyout_v2_restore.ts`)

`useFlyoutV2RestoreFromUrl(urlParamKey)` runs once per mount (gated on `useIsNewFlyoutEnabled()`):

1. Reads the param once (via a `useState` initializer).
2. For kinds that need a document/attack `DataTableRecord` or an IOC `Indicator`, resolves it via `useEsDocSearch` (the
   same single-doc search the document flyout uses — deliberately **not** `useTimelineEventsDetails`, which can't
   resolve a concrete alerts backing index). Uses `PageScope.default`, and `PageScope.attacks` for attack descriptors.
3. Once fetches are settled, replays the array: first entry via `openDescriptorAsStart`, second via
   `openDescriptorAsChild`, deferred to a macrotask (`setTimeout(…, 0)`) to avoid z-index races with Timeline restore.

`openDescriptorAsStart` / `openDescriptorAsChild` are the exhaustive `switch` mapping each descriptor kind back to the
right `useFlyoutApi()` method. **When you add a descriptor kind, you must add a case here** (and the child variant, or
fall through to the `default` for tools). Tool restorers rebuild header callbacks (e.g. `buildShowEntityCallback`)
because tools open as `'start'` and don't persist their parent.

## Providers (`shared/components/flyout_provider.tsx`)

`overlays.openSystemFlyout` mounts each flyout into its **own React root** (an EUI portal), so it is outside the app's
provider tree. `flyoutProviders({ services, store, history, children })` re-establishes everything the content needs:
Kibana context, cell actions, navigation, Redux, react-query, user privileges, upselling, cases, ML capabilities, the
entity-store EUID API, and (still, temporarily) `ExpandableFlyoutProvider` (needed by Analyzer until the legacy flyout
is dropped).

Notable behaviors to be aware of when adding content:

- **Own React root** ⇒ hook-computed callbacks handed to `openSystemFlyout` can freeze with stale context. Prefer
  reading fresh state at call time (see `buildFlyoutNavTitle`, which reads the flyout-manager store directly rather than
  via a hook).
- `TimeRangeSync` seeds the Redux global time range from Kibana's timefilter **only outside** the Security app (guarded
  by a synchronous `window.location.pathname` check, not an observable, to win the first-render race).
- `FlyoutRouter` reuses the host Router if present, otherwise creates a memory history.

## Telemetry

All telemetry flows through `useFlyoutTelemetry()` (`shared/hooks/use_flyout_telemetry.ts`), the single place that maps
a "what happened" description onto an EBT event. Event types and schemas live in
`public/common/lib/telemetry/events/flyout_v2/` (`types.ts` + `index.ts`).

- **Open/close is automatic.** `useOpenFlyout` fires `FlyoutOpened` immediately and `FlyoutClosed` (with dwell time from
  the `OverlayRef.onClose` promise) when passed a `meta`. Every open method already passes one — you get it for free.
- **`meta` describes what**: `{ surface: 'flyout' | 'tool', flyoutType, tool?, session, origin? }`.
- Vocabularies are const maps: `FLYOUT_TYPE`, `FLYOUT_TOOL`, `FLYOUT_SURFACE`, `FLYOUT_SESSION_KIND`, `FLYOUT_ORIGIN`
  (the specific UI trigger — pass this from call sites), plus `FLYOUT_ACTION` / `FLYOUT_HEADER_ITEM` for
  `reportActionClicked` / `reportHeaderItemClicked`, and tab clicks via `useTabs`.
- **To add an event**: add it to `common/lib/telemetry/events/flyout_v2`, then add/extend a reporter method in
  `use_flyout_telemetry.ts`.

## Shared building blocks

- `useOpenFlyout()` — the instrumented wrapper around `overlays.openSystemFlyout(flyoutProviders({...}))`. Handles
  Suspense fallback (`FlyoutLoading`), the `FlyoutSessionContextProvider`, and telemetry. All open methods go through
  it.
- `useDefaultDocumentFlyoutProperties()` / `defaultToolsFlyoutProperties` — consistent size/width/padding options.
  Spread these into your flyout properties.
- `useTabs<T>()` — generic tab selection with localStorage persistence and optional tab-click telemetry. Priority:
  `initialTabId` → localStorage → `validTabIds[0]`.
- `flyout_titles.ts` — the single source of truth for every history/title label. Use `formatFlyoutTitle` and (for
  children) `buildFlyoutNavTitle`.
- Shared UI: `ToolsFlyoutHeader` (tool title + clickable source context), `open_flyout_link`, `cell_actions`,
  `table_field_*`, `expandable_panel/section`, etc.

## Testing conventions

- Each per-type API hook ships a `.mock.ts` exporting `create<Type>FlyoutApiMock()` (every method a `jest.fn()`). The
  top-level `use_flyout_api.mock.ts` composes them, mirroring the real facade.
- Mock the facade in consumers with:

```ts
jest.mock('.../flyout_v2/use_flyout_api');
jest.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
// then assert against the specific method, e.g. openDocumentFlyoutFromIndex
```

- Run the local suite with `node scripts/jest <path>` and validate a change set with
  `node scripts/check.js --scope=branch`.

## How to add a new flyout type or tool

1. **Create the folder** `flyout_v2/<type>/` with `main/` (top-level panel) and `tools/` if it has secondary panels.
2. **Write `use_<type>_flyout_api.tsx`** exposing `open<Type>Flyout` (+ `...AsChild` where it makes sense). Follow the
   open-method anatomy above: lazy-load content, `writeOnOpen` → `buildOnClose` → `open(...)` with title, telemetry
   meta, and session override.
3. **Add a `.test.tsx` and `.mock.ts`** for the hook.
4. **Wire it into the facade** `use_flyout_api.tsx` and its mock (one line each).
5. **URL descriptors**: add kind (s) to `FLYOUT_DESCRIPTOR_KIND`, define the `*Descriptor` interface (s) (serializable
   ids only), and add them to the `FlyoutDescriptor` union in `flyout_v2_url_param.ts`.
6. **Restorers**: add cases to `openDescriptorAsStart` / `openDescriptorAsChild` in `use_flyout_v2_restore.ts` (and to
   `NEEDS_DOC_HIT` / `NEEDS_ATTACK_HIT` if a fetch is required).
7. **Legacy interop** (if the type existed in the old flyout): map its legacy panel id / tabs in
   `use_expandable_flyout_url_interop.ts`.
8. **Telemetry**: add to `FLYOUT_TYPE` / `FLYOUT_TOOL` / `FLYOUT_ORIGIN` as needed in
   `common/lib/telemetry/events/flyout_v2/types.ts`.
9. **Titles**: add i18n labels to `flyout_titles.ts` and build with `formatFlyoutTitle`.
