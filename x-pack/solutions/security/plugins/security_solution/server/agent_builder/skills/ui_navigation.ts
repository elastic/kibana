/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APP_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_HOME_PAGE_PATH,
} from '../../../common/constants';

/**
 * Constants and content for "UI-guided navigation" skill sections.
 *
 * Some operations are intentionally not performed in chat but we want the agent to redirect
 * the user to the right page using the `security.build_redirect_url` tool.
 *
 * This module is the single source of truth for the app-relative paths and the flyout
 * panel keys that the skill content references. The values are mirrored from public-side constants
 * (server code can't import from `public/`); `ui_navigation.test.ts` asserts they stay in sync.
 */

const ENTITY_ANALYTICS_MANAGEMENT_BASE = `${APP_PATH}${ENTITY_ANALYTICS_MANAGEMENT_PATH}`;
const ENTITY_ANALYTICS_HOME_PAGE_BASE = `${APP_PATH}${ENTITY_ANALYTICS_HOME_PAGE_PATH}`;

export const ENTITY_ANALYTICS_UI_PATHS = {
  /** Management page — global enable/disable + clear all entity data controls. */
  settings: ENTITY_ANALYTICS_MANAGEMENT_BASE,
  /** Risk Score management tab — scoring config + re-score Run button. */
  riskScore: `${ENTITY_ANALYTICS_MANAGEMENT_BASE}/risk_score`,
  /** Asset Criticality management tab — CSV / bulk criticality. */
  assetCriticality: `${ENTITY_ANALYTICS_MANAGEMENT_BASE}/asset_criticality`,
  /** Entity Resolution management tab — bulk CSV import. */
  entityResolutionBulk: `${ENTITY_ANALYTICS_MANAGEMENT_BASE}/entity_resolution`,
  /** Entity Store / engine Status tab. */
  status: `${ENTITY_ANALYTICS_MANAGEMENT_BASE}/status`,
  /** Watchlists management tab (also hosts the per-watchlist edit flyout). */
  watchlists: `${ENTITY_ANALYTICS_MANAGEMENT_BASE}/watchlists`,
  /** Entity Analytics home page — surface the single-entity Resolution flyout opens on. */
  entityResolutionHomePage: ENTITY_ANALYTICS_HOME_PAGE_BASE,
} as const;

// Legacy expandable-flyout panel keys
export const ENTITY_RESOLUTION_GROUP_TAB = 'resolution_group';
export const WATCHLISTS_FLYOUT_KEY = 'watchlists-flyout';
// Flyout `scopeId` / `contextID`. We use the id the Entity Analytics home page's own entities table
// passes (`ENTITY_ANALYTICS_TABLE_ID`), since the deep-link opens the flyout on that page.
export const ENTITY_ANALYTICS_HOME_TABLE_SCOPE = 'entity-analytics-home-table';

export const ENTITY_RESOLUTION_PANEL = {
  host: { right: 'host-panel', left: 'host_details' },
  user: { right: 'user-panel', left: 'user_details' },
  service: { right: 'service-panel', left: 'service_details' },
} as const;

export type EntityResolutionType = keyof typeof ENTITY_RESOLUTION_PANEL;

// Placeholder tokens the model substitutes with runtime values when it calls the tool.
const ENTITY_ID = '<ENTITY_ID>';
const ENTITY_NAME = '<ENTITY_NAME>';
const WATCHLIST_ID = '<WATCHLIST_ID>';

/**
 * Expandable-flyout panels that open Resolution. When the new flyout is enabled,
 * `security.build_redirect_url` translates this to flyoutV2 descriptors.
 */
export function buildResolutionFlyoutTemplate(entityType: EntityResolutionType) {
  const { right, left } = ENTITY_RESOLUTION_PANEL[entityType];
  const scopeId = ENTITY_ANALYTICS_HOME_TABLE_SCOPE;
  const contextID = ENTITY_ANALYTICS_HOME_TABLE_SCOPE;
  const path = { tab: ENTITY_RESOLUTION_GROUP_TAB };

  switch (entityType) {
    case 'host':
      return {
        left: {
          id: left,
          params: {
            entityId: ENTITY_ID,
            hostName: ENTITY_NAME,
            scopeId,
            isRiskScoreExist: true,
            path,
            hasMisconfigurationFindings: false,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
            entityStoreEntityId: ENTITY_ID,
          },
        },
        right: {
          id: right,
          params: { contextID, scopeId, hostName: ENTITY_NAME, entityId: ENTITY_ID },
        },
      };
    case 'user':
      return {
        left: {
          id: left,
          params: {
            userName: ENTITY_NAME,
            identityFields: { 'user.name': ENTITY_NAME },
            isRiskScoreExist: true,
            scopeId,
            path,
            entityId: ENTITY_ID,
            hasMisconfigurationFindings: false,
            hasNonClosedAlerts: false,
            entityStoreEntityId: ENTITY_ID,
          },
        },
        right: {
          id: right,
          params: {
            contextID,
            userName: ENTITY_NAME,
            identityFields: { 'user.name': ENTITY_NAME },
            entityId: ENTITY_ID,
            scopeId,
          },
        },
      };
    case 'service':
      return {
        left: {
          id: left,
          params: {
            isRiskScoreExist: true,
            identityFields: { 'service.name': ENTITY_NAME },
            scopeId,
            entityId: ENTITY_ID,
            serviceName: ENTITY_NAME,
            entityStoreEntityId: ENTITY_ID,
            path,
          },
        },
        right: {
          id: right,
          params: { contextID, scopeId, entityId: ENTITY_ID, serviceName: ENTITY_NAME },
        },
      };
  }
}

/** Builds the `flyout` template that opens a specific watchlist's edit flyout. */
export function buildWatchlistEditFlyoutTemplate() {
  return {
    right: {
      id: WATCHLISTS_FLYOUT_KEY,
      params: { mode: 'edit', watchlistId: WATCHLIST_ID },
    },
  };
}

/** Renders an object as a 4-space-indented block for embedding in skill markdown. */
function asIndentedJson(value: unknown) {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

/**
 * The "UI-guided navigation" section of the entity-analytics skill
 */
export const ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT = `## UI-guided navigation — when to redirect instead of acting

Some Entity Analytics operations are intentionally **not performed in chat**: destructive lifecycle changes, bulk / CSV uploads, and configuration that lives in dedicated UI flows. For these intents, **decline the action** and point the user to the right place in the UI with a link.

**How to produce the link.** Call \`security.build_redirect_url\` with the \`path\` for the destination (and, for the flyout destinations below, the \`flyout\` object). It returns a single \`url\` with the deployment base path and current space already applied. Render that \`url\` in your reply as a markdown link \`[title](url)\`. **Never** hand-write, guess, or edit the URL — always use the \`url\` the tool returns. Pass the \`path\` exactly as written below (app-relative, starting with \`/\`); do **not** prepend a base path or \`/s/<space>\` segment yourself.

**Output shape.** Three things, in one short reply:

1. What you can't do in chat (one sentence).
2. Why (one short clause — "lives in the management UI", "needs a CSV upload", "the editing flyout exposes the full configuration").
3. **Where to go** — the markdown link built from the \`security.build_redirect_url\` result.

Do **not** call any *mutating* tool, do **not** prompt for confirmation, and do **not** claim the operation succeeded. The user clicks the link and performs the action themselves. (\`security.build_redirect_url\` is not a mutation — it only builds a link.)

### Entity Analytics — enable / disable & clear all data

Redirect when the user asks to:

- **enable** / **disable** / **turn on** / **turn off** **Entity Analytics**
- **clear** / **delete** / **reset** **all entity data**

These are the global controls at the **top of the Entity Analytics management page**.

Call \`security.build_redirect_url\` with \`path: '${ENTITY_ANALYTICS_UI_PATHS.settings}'\` and render the returned \`url\`.

Example reply: "I can't enable or disable Entity Analytics from chat — that's the switch at the top of the [Entity Analytics management page](<url from build_redirect_url>), where you can also clear all entity data."

### Risk engine — scoring configuration & re-score

Redirect when the user asks to:

- **configure** / **change settings** for risk scoring (alert filters, retainment, schedule, closed-alert handling, etc.)
- **re-score now** / **force a re-score** / **run the risk engine** — the tab has a **Run** button that triggers the risk engine on demand

Call \`security.build_redirect_url\` with \`path: '${ENTITY_ANALYTICS_UI_PATHS.riskScore}'\` and render the returned \`url\`.

Example reply: "I can't change the risk scoring settings from chat — that's managed on the Risk Score page. Open the [Risk Score settings](<url from build_redirect_url>) to reconfigure scoring or trigger a re-score via the Run button."

### Asset criticality — bulk / CSV operations

Redirect when the user asks to:

- **upload a CSV** of asset criticalities
- **bulk-set** / **bulk-import** / **bulk-update** criticality across many entities

Call \`security.build_redirect_url\` with \`path: '${ENTITY_ANALYTICS_UI_PATHS.assetCriticality}'\` and render the returned \`url\`.

Example reply: "I can't import a criticality CSV from chat — that runs through the Asset Criticality page. Open the [Asset Criticality upload](<url from build_redirect_url>) to upload your file."

### Entity store / engine status

Redirect when the user asks to **see the status** of the **entity store** / **entity engines** ("is the entity store running", "entity engine status", "show entity store health").

Call \`security.build_redirect_url\` with \`path: '${ENTITY_ANALYTICS_UI_PATHS.status}'\` and render the returned \`url\`.

Example reply: "You can check that on the [Entity Store status page](<url from build_redirect_url>)."`;

/**
 * The "UI-only operations" section of the manage-watchlists skill
 */
export const WATCHLISTS_UI_NAVIGATION_CONTENT = `## UI-only operations — redirect, do not call a tool

Two watchlist operations are intentionally **not** performed in chat because they live in the watchlist **edit flyout** and this skill's tools don't cover them: **configuring the entity source** and **uploading a CSV** of members. (Editing the name, description, or risk modifier is **not** UI-only — \`security.update_watchlist\` handles those.)

For these intents, **decline the action** and point the user to the right place in the UI. Three things in one short reply: what you can't do in chat, why (one short clause — "the CSV upload lives in the editor", "entity-source configuration lives in the flyout"), and where to go — a clickable markdown link.

**How to produce the link.** Call \`security.build_redirect_url\` with the \`path\` below (and, for the edit flyout, the \`flyout\` object) and render the \`url\` it returns as \`[title](url)\`. The tool applies the deployment base path and current space for you — pass the \`path\` exactly as written (app-relative, starting with \`/\`) and **never** hand-write, guess, or edit the URL. \`security.build_redirect_url\` is **not** a mutation, so calling it for a redirect is expected; do **not** call the mutating tools (\`create\` / \`update\` / \`delete\` / \`add_entities\` / \`remove_entities\`). Do **not** prompt for confirmation, and do **not** claim the operation succeeded.

### Redirect intents

Both of these open the watchlist's **edit flyout**:

- **Configure the entity source** for a watchlist — the persistent source that keeps members in sync from a query, index, or rule. The tools here only do **one-time** add/remove; a source that stays in sync is UI-only.
- **Upload a CSV** of watchlist members — the flyout's "CSV Data Source" adds members in bulk from a file. The tools here take an explicit id list only; a file upload is UI-only.

### Destination

- **The user named a specific watchlist** (by name or id) → open that watchlist's edit flyout.
  1. Resolve the watchlist **id**. If you already have the id, use it. Otherwise call \`security.get_watchlist_id\` with \`{ identifier: <the name the user gave> }\`. 
  2. Call \`security.build_redirect_url\` with \`path: '${
    ENTITY_ANALYTICS_UI_PATHS.watchlists
  }'\` and this \`flyout\` (substitute \`${WATCHLIST_ID}\` with the resolved id):

${asIndentedJson(buildWatchlistEditFlyoutTemplate())}

  3. Render the returned \`url\`.
- **No specific watchlist** ("open the watchlists page") → call \`security.build_redirect_url\` with \`path: '${
  ENTITY_ANALYTICS_UI_PATHS.watchlists
}'\` (no \`flyout\`) and render the returned \`url\` — the bare Watchlists tab.

### Examples

User: "Upload a CSV of members to the Privileged Users watchlist."

1. Call \`security.get_watchlist_id\` with \`{ identifier: 'Privileged Users' }\` to resolve the id.
2. Call \`security.build_redirect_url\` with \`path: '${
  ENTITY_ANALYTICS_UI_PATHS.watchlists
}'\` and \`flyout: { right: { id: '${WATCHLISTS_FLYOUT_KEY}', params: { mode: 'edit', watchlistId: '<id from step 1>' } } }\`.
3. Render the returned \`url\` in a decline-and-redirect reply:
   > "I can't upload a CSV to a watchlist from chat — that runs through the watchlist editor. Open the editor: [Edit Privileged Users](<url from build_redirect_url>)."

User: "Configure the entity source for the High Risk Hosts watchlist."

1. Resolve the id via \`security.get_watchlist_id\` (\`{ identifier: 'High Risk Hosts' }\`), then call \`security.build_redirect_url\` with the watchlists path and the edit \`flyout\` for that id, and explain the tools do one-time membership only:
   > "I can't configure a watchlist's entity source from chat — my tools only do one-time add/remove. Open the editor to set up a persistent source: [Edit High Risk Hosts](<url from build_redirect_url>)."

User: "Open the watchlists page so I can pick one to edit."

1. Call \`security.build_redirect_url\` with \`{ path: '${
  ENTITY_ANALYTICS_UI_PATHS.watchlists
}' }\` (no \`flyout\`) and render the returned \`url\`: [Watchlists](<url from build_redirect_url>).`;

export const RESOLUTION_UI_NAVIGATION_CONTENT = `## UI navigation

### Open the resolution flyout — fallback, not a first choice

\`security.get_resolution_group\` already answers "who is this resolved with" in chat, and \`security.link_entities\` / \`security.unlink_entities\` perform the merge itself — none of these need the UI when they succeed. Redirect to the flyout only when:

- A **link** or **unlink** call couldn't resolve one or more of the entities given (\`unresolvedReferences\`) and you still have the target entity — open that entity's panel so the user can search for the rest. The flyout's "Add entities to resolution group" section has a search bar and browsable entity table for this.
- The user explicitly asks to **see** / **open** the resolution panel in the UI ("show me the resolution panel for this host", "open the resolution flyout", "let me see this visually"), even though the chat tools could answer the same question.

1. Use the entity you already have — its type and id — to fill the flyout below. If you don't have one, name what was not found and stop. Do **not** call \`security.build_redirect_url\` without a flyout.
2. Call \`security.build_redirect_url\` with \`path: '${
  ENTITY_ANALYTICS_UI_PATHS.entityResolutionHomePage
}'\` and the \`flyout\` object for its type.

   Substitute \`${ENTITY_ID}\` with the entity's \`entity.id\` (EUID) and \`${ENTITY_NAME}\` with \`entity.name\` when you have it (use \`entity.id\` as the name fallback when \`entity.name\` is unknown — do **not** omit name fields). Copy every other field **exactly** as shown.

   Host — \`entityType: 'host'\`:

${asIndentedJson(buildResolutionFlyoutTemplate('host'))}

   User — \`entityType: 'user'\`:

${asIndentedJson(buildResolutionFlyoutTemplate('user'))}

   Service — \`entityType: 'service'\`:

${asIndentedJson(buildResolutionFlyoutTemplate('service'))}

3. Render the returned \`url\` as a markdown link.

Example reply (user asked to see the panel for \`host:myserver\`): "Here's the [Resolution panel for host:myserver](<url from build_redirect_url>)."

Example reply (link resolved \`host:server1\` but not \`jsmith.contractor\`): "I couldn't find an entity matching \`jsmith.contractor\`, so I linked what I could confirm. You can search for the rest in the [Resolution panel for host:server1](<url from build_redirect_url>)."

### Bulk / CSV import — redirect, do not call a tool

"**bulk**-link entities", "**import a CSV** of resolutions", "link **many** entities to resolution targets" — the tools in this skill cap \`entityIds\` at 100 per call; anything larger belongs in the CSV import on the Entity Resolution management tab. Decline and redirect; do **not** call \`security.link_entities\` / \`security.unlink_entities\` for this intent.

Call \`security.build_redirect_url\` with \`path: '${
  ENTITY_ANALYTICS_UI_PATHS.entityResolutionBulk
}'\` and render the returned \`url\`.

Example reply: "I can't bulk-link entities from chat — that runs through a CSV import on the [Entity Resolution page](<url from build_redirect_url>)."`;
