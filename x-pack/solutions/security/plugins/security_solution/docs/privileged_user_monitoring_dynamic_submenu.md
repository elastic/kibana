# Privileged User Monitoring: API-driven sub-menu items (current limitations + required changes)

## Current behavior (what exists today)

### Privileged User Monitoring is defined as a `LinkItem` (static)

- **File**: `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/links.ts`

```ts
const privMonLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsPrivilegedUserMonitoring,
  title: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING,
  path: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  uiSettingRequired: ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};
```

### That `LinkItem` is included in the global Security Solution `appLinks` list (static)

- **File**: `x-pack/solutions/security/plugins/security_solution/public/app/links/app_links.ts`

```ts
export const appLinks: AppLinkItems = Object.freeze([
  // ...
  entityAnalyticsLinks, // contains privMonLinks as a child
  // ...
]);
```

### Deep links (what Chrome uses for the side nav) are derived from:
- **a navigation tree** (`NavigationTreeDefinition`, “solution nav”), and
- **a normalized link map** (`NormalizedLinks`, derived from `appLinks`)

- **File**: `x-pack/solutions/security/plugins/security_solution/public/app/links/deep_links.ts`

```ts
export const registerDeepLinksUpdater = (
  appUpdater$: Subject<AppUpdater>,
  navigationTree$: Subject<NavigationTreeDefinition | null>
): Subscription => {
  return navigationTree$
    .pipe(
      combineLatestWith(applicationLinksUpdater.links$, applicationLinksUpdater.normalizedLinks$),
      debounceTime(100)
    )
    .subscribe(([navigationTree, appLinks, normalizedLinks]) => {
      const deepLinks =
        navigationTree == null
          ? classicFormatter(appLinks)
          : solutionFormatter(navigationTree, normalizedLinks);
      appUpdater$.next(() => ({ deepLinks }));
    });
};
```

## Why API-driven sub-menu items under Privileged User Monitoring are not possible today

### 1) The “solution navigation” tree is created once and provided as `Rx.of(...)` (not dynamic)

Because the tree is a constant value observable, there is no built-in mechanism to “append children after an API call”.

- **File**: `x-pack/solutions/security/plugins/security_solution_ess/public/navigation/solution_navigation.ts`

```ts
const navigationTree = createNavigationTree(services, initialChatExperience);

navigation.addSolutionNavigation({
  // ...
  navigationTree$: Rx.of(navigationTree),
});
```

### 2) Privileged User Monitoring is a leaf in the navigation tree (no `children`)

There is no “submenu under PUM” node for anything to appear under, even if you could update it later.

- **File**: `x-pack/solutions/security/packages/navigation/src/navigation_tree/entity_analytics_navigation_tree.ts`

```ts
{
  id: SecurityPageName.entityAnalyticsPrivilegedUserMonitoring,
  link: securityLink(SecurityPageName.entityAnalyticsPrivilegedUserMonitoring),
}
```

### 3) Nav nodes point to deep link IDs, not arbitrary API-defined destinations

Even if you make the tree dynamic, each new item must map to a valid `AppDeepLinkId` / registered deep link (or a known external/cloud link).

- **File**: `src/core/packages/chrome/browser/src/project_navigation.ts`

```ts
export interface NodeDefinition<LinkId extends AppDeepLinkId = AppDeepLinkId> {
  link?: LinkId; // "App id or deeplink id"
  children?: Array<NodeDefinition<LinkId>>;
}
```

### 4) The link registry (`appLinks`) is also currently static (no API merge step)

There is a runtime updater, but it is only fed from a static link list filtered by license/capabilities/uiSettings.

- **File**: `x-pack/solutions/security/plugins/security_solution/public/plugin.tsx`

```ts
const appLinksToUpdate$ = new BehaviorSubject<AppLinkItems>(initialAppLinks);
appLinksToUpdate$.pipe(combineLatestWith(license$)).subscribe(([appLinks, license]) => {
  applicationLinksUpdater.update(appLinks, params);
});

const filteredLinks = await getFilteredLinks(core, plugins);
appLinksToUpdate$.next(filteredLinks);
```

## What changes are required to make it possible (pragmatic options)

### Option A (recommended): API-driven *show/hide* of a fixed set of predefined sub-items

This is the lowest-risk approach that aligns with how Kibana navigation works.

- **What you do**
  - Predefine a small set of PUM sub-pages as **real routes + deep links** (compile-time).
  - Add those as `children` under the PUM node in the navigation tree.
  - After an API call, dynamically decide which of those children to include (or mark unavailable/unauthorized).

- **Changes needed**
  - **Add PUM children to the navigation tree**
    - Edit: `x-pack/solutions/security/packages/navigation/src/navigation_tree/entity_analytics_navigation_tree.ts`
  - **Ensure each child has a real deep link ID / page route**
    - Add new `SecurityPageName` + deep link definitions as needed (Security deeplinks package)
  - **Make the navigation tree observable updateable (see Option C)**, OR rebuild the tree on relevant changes and re-emit it.

### Option B: Keep nav static, put “sub-menu” inside the Privileged User Monitoring page UI

If “submenu” really means “secondary navigation once the user is on the page”, you can load items from an API and render a page-local nav (tabs/side panel) without touching Chrome side nav.

- **What you do**
  - Fetch API data inside the PUM page.
  - Render dynamic tabs/sections based on that data.
  - No deep-link-level navigation changes required.

- **Changes needed**
  - Implement inside the page: `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_analytics_privileged_user_monitoring_page.tsx`

### Option C: True dynamic side-nav children driven by an API (heavier)

To literally add/remove submenu items under PUM based on an API response, you need **two dynamic layers**:

1) **Dynamic navigation tree observable**
   - Replace `Rx.of(navigationTree)` with something you can `.next()` (e.g., a `BehaviorSubject`)
   - Re-emit a new `NavigationTreeDefinition` after the API call completes
   - Edit: `x-pack/solutions/security/plugins/security_solution_ess/public/navigation/solution_navigation.ts`

2) **Dynamic link registry (`appLinks`) update**
   - Create/merge `LinkItem`s representing the dynamic children (or toggle existing ones)
   - Push them through `applicationLinksUpdater.update(...)` by emitting a new value into `appLinksToUpdate$`
   - Edit: `x-pack/solutions/security/plugins/security_solution/public/plugin.tsx`

**Important constraint**: even with C, each child must still navigate somewhere valid:
- Either map API items to **pre-existing deep links** (most realistic), or
- Build a single generic route (e.g., `/entity_analytics/privileged_user_monitoring/:section`) and keep the side-nav children linking to that parameterized route (still needs deep link IDs you can register).


