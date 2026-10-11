/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { WATCHLISTS_UI_NAVIGATION_CONTENT } from '../ui_navigation';
import {
  SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
  SECURITY_CREATE_WATCHLIST_TOOL_ID,
  SECURITY_DELETE_WATCHLIST_TOOL_ID,
  SECURITY_LIST_WATCHLISTS_TOOL_ID,
  SECURITY_GET_WATCHLIST_ID_TOOL_ID,
  SECURITY_REMOVE_ENTITIES_FROM_WATCHLIST_TOOL_ID,
  SECURITY_UPDATE_WATCHLIST_TOOL_ID,
  SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
  SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
  SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID,
  SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
} from '../../tools';

const content = `
# Watchlist Management

This skill exposes tools to **manage** Entity Analytics watchlists in the current space — create, update, and delete watchlists; add or remove entities; enumerate existing watchlists; and resolve a watchlist name to its id.

## When to use this skill

Use when the user asks to **create**, **modify**, **delete** a watchlist, **add/remove entities** to/from a watchlist, **automatically add entities that match a query or pattern to a watchlist (or stop doing so)**, **inspect what's feeding a watchlist**, or **enumerate** the watchlists that exist. Trigger phrases: "create a watchlist", "rename the X watchlist", "change the risk modifier of Y", "delete the Z watchlist", "add these users to the X watchlist", "put host:server01 on watchlist Y", "remove this user from the Z watchlist", "add anything matching X to this watchlist, automatically", "keep adding X to this watchlist automatically", "stop auto-adding X to this watchlist", "what are the data sources on the X watchlist", "what's keeping this watchlist in sync", "why is this entity on the watchlist", "what watchlists do we have", "list watchlists", "is there a watchlist called X".

Do **NOT** use this skill for:
- "Which watchlists is this entity on?" — use \`security.get_entity\` (entity-analytics skill); watchlists are on the entity profile as \`entity.attributes.watchlists\`.
- "Who is on watchlist X?" / "list the members of X" — use \`security.get_watchlist_id\` then \`security.search_entities\` with the resolved id (entity-analytics skill). This is different from "what are the data sources of X" (this skill, \`security.list_watchlist_data_sources\`) — one lists *entities*, the other lists *what's adding them*. Don't substitute one for the other.

### One-time vs. automatic membership
- \`add\`/\`remove_entities_from_watchlist\` — add or remove specific entities, right now, once.
- \`set\`/\`remove_watchlist_rule_based_data_source\` — set up (or stop) an automatic rule that keeps membership in sync going forward, based on a query. If the user wants to "stop adding X automatically" or "make this permanent going forward", they mean this pair, not the one above. The APIs call this an **entity source** — expect that term in error messages and when explaining results to the user.

## Available tools

| Tool | Confirmation | Use for |
| --- | --- | --- |
| \`security.get_watchlist_id\` | none | Resolve a name/id reference to the canonical \`id\` — call first whenever the user names a watchlist and another tool below needs its id. |
| \`security.list_watchlists\` | none | Enumerate the watchlists in the current space. |
| \`security.create_watchlist\` | required | Create a new watchlist. |
| \`security.update_watchlist\` | required | Rename / change description / change risk modifier — pass only the fields that are changing. |
| \`security.delete_watchlist\` | required | Permanently delete a watchlist and its linked sources. Managed watchlists cannot be deleted this way. |
| \`security.add_entities_to_watchlist\` | required | Add specific entities (by EUID), right now, once. |
| \`security.remove_entities_from_watchlist\` | required | Remove specific entities from **manual** membership. Source-derived entities report as \`not_found\` — use the two tools below instead. |
| \`security.set_watchlist_rule_based_data_source\` | required | Create or update the rule-based data source (\`store\` or \`index\`) that keeps membership in sync going forward. |
| \`security.remove_watchlist_rule_based_data_source\` | required | Remove the rule-based data source of a given type. |
| \`security.list_watchlist_data_sources\` | none | List every source (rule-based + managed integration) on a watchlist — check before \`set\`, list the candidate sources that could explain an entity's presence, spot a broken \`index\` source. |

## Example flows

### Enumerate
User: "What watchlists do we have?"

1. Call \`security.list_watchlists\` (no arguments; pass \`nameContains\` only if the user named part of one).
2. Summarize in prose — name, risk modifier, and description per watchlist; use a short markdown table when 4+ are returned. This is read-only; no confirmation and no rich attachment.

### Create
User: "Create a watchlist called Compromised Accounts for users we suspect have been compromised."

1. Call \`security.create_watchlist\` with \`{ name: "Compromised Accounts", description: "Users suspected to be compromised" }\`.
2. The tool handles user confirmation. On accept, it returns the created watchlist. Summarize: "Created watchlist 'Compromised Accounts' (id: \`<id>\`)."
3. On reject, state that the watchlist was not created.

### Update
User: "Rename the Privileged Users watchlist to 'Senior Privileged Users'."

1. Call \`security.get_watchlist_id\` with \`{ identifier: "Privileged Users" }\` to resolve the id.
2. Call \`security.update_watchlist\` with \`{ watchlistId: "<id>", name: "Senior Privileged Users" }\`.
3. On accept, summarize the rename. On reject, state that no change was made.

### Delete
User: "Delete the Compromised Accounts watchlist."

1. Call \`security.get_watchlist_id\` with \`{ identifier: "Compromised Accounts" }\` to resolve the id.
2. Call \`security.delete_watchlist\` with \`{ watchlistId: "<id>" }\`. The tool shows a confirmation naming the watchlist and warning that the action cannot be undone.
3. On accept, summarize the deletion. On reject, state that the watchlist was not deleted.

### Create and populate (headline flow)
User: "Create a watchlist called Compromised Accounts and add users user:jsmith123 and user:rjones456."

1. Call \`security.create_watchlist\` with \`{ name: "Compromised Accounts" }\`. Confirm and create.
2. With the new watchlist's id from step 1, call \`security.add_entities_to_watchlist\` with \`{ watchlistId: "<id from step 1>", entityIds: ["user:jsmith123", "user:rjones456"] }\`. Confirm and add.
3. Summarize both outcomes: the watchlist was created and N of M entities were added (mention \`not_found\` or \`failed\` items if any).

### Query-then-add flow (one-time)
User: "Add all critical-risk users to the Privileged Users watchlist."

1. Call \`security.get_watchlist_id\` with \`{ identifier: "Privileged Users" }\` to resolve the id.
2. Call \`security.search_entities\` with \`{ entityTypes: ["user"], riskLevels: ["Critical"] }\` to find the candidate entities. Collect each result's \`entity.id\` field.
3. Call \`security.add_entities_to_watchlist\` with \`{ watchlistId: "<id from step 1>", entityIds: <ids from step 2> }\`. Confirm; the prompt names the watchlist and shows the entity-id preview.
4. Summarize: how many entities were added, how many failed, how many were not found. This is a **one-time, point-in-time** add — it does not track new critical-risk users going forward. If the user wants that, see the rule-based data source flow below.

### Rule-based data source
Sets up (or replaces) the automatic rule — a KQL query against the entity store, or a correlated index — that keeps membership in sync going forward, as opposed to a one-time add.

**Ask before guessing concrete details.** \`queryRule\` and \`indexPattern\` are free text the tool uses as-is — a plausible-sounding guess for either can silently match nothing, or the wrong entities, and the user may not notice until much later. It's safe to translate the user's wording into a field/value or index pattern **without asking** only when that translation relies on a standard, known schema — e.g. ECS fields on the entity store (\`host.os.name\`, \`entity.risk.calculated_level\`, ...), which are fixed and documented regardless of the user's own data. It is **not** safe to guess when the source or condition is customer-specific — a bespoke index ("our HR index") or a field/value with no standard meaning ("contract terminated") — because there's no schema to fall back on; only the user knows their own data. In that case, ask for the concrete field, value, or pattern *before* calling \`security.set_watchlist_rule_based_data_source\`. \`identifierField\` doesn't need this treatment either way; it's a fixed enum (\`host.name\`, \`user.name\`, \`user.email\`, ...) — pick it from the entity type the watchlist tracks, and ask only if that's genuinely ambiguous.

#### Example: the condition maps to a standard (ECS) field
User: "Any time a host running Ubuntu shows up, add it to the Server Fleet watchlist automatically."

1. Call \`security.get_watchlist_id\` with \`{ identifier: "Server Fleet" }\` to resolve the id.
2. (Optional but recommended) Call \`security.list_watchlist_data_sources\` with \`{ watchlistId: "<id>" }\` to see whether a \`store\` source already exists — if so, the confirmation will show current → new instead of a fresh creation.
3. "Ubuntu" maps to \`host.os.name\`, a standard ECS field on the entity store's own well-known schema — there's nothing customer-specific to ask about, unlike a bespoke index/field in the user's own data (see the next example). Call \`security.set_watchlist_rule_based_data_source\` with \`{ type: "store", watchlistId: "<id>", queryRule: "host.os.name: Ubuntu*" }\`. Note the trailing, **unquoted** \`*\`: \`host.os.name\` values look like "Ubuntu 22.04.3 LTS", so an exact match on \`"Ubuntu"\` would silently match nothing — and a *quoted* \`"Ubuntu*"\` is parsed as that literal string (asterisk included), not a wildcard, so it would also silently match nothing.
4. On accept, tell the user the watchlist now updates automatically (within about 10 minutes) as hosts start or stop matching.

#### Example: the source/condition is customer-specific — ask first
User: "Add users to Departing Employees based on our HR index where the employee is listed as having their contract terminated."

Neither "our HR index" nor "contract terminated" names an actual index pattern or field/value — do not guess \`hr-*\` or \`employee.status: "Terminated"\`.

1. Ask, in one message, for both missing specifics: "What's the index pattern for your HR data, and which field/value marks a terminated contract (e.g. \`employee.status: \\"Terminated\\"\`)?"
2. User replies: "The index is \`hr-workday-*\`, and terminated employees have \`employment.status\` set to \`Terminated\`."
3. Call \`security.get_watchlist_id\` with \`{ identifier: "Departing Employees" }\` to resolve the id.
4. Now that both specifics are concrete, call \`security.set_watchlist_rule_based_data_source\` with \`{ type: "index", watchlistId: "<id>", indexPattern: "hr-workday-*", identifierField: "user.name", queryRule: "employment.status: \\"Terminated\\"" }\` — \`identifierField\` is \`user.name\`/\`user.email\` since this watchlist tracks users; ask which the HR index actually carries if that's unclear.
5. On accept, tell the user the watchlist now updates automatically as employees are marked terminated in that index.

### Deciding one-time vs. rule-based
- "Add X to the watchlist" / a specific, named set of entities, with no mention of staying in sync → one-time: \`security.add_entities_to_watchlist\` (optionally preceded by \`security.search_entities\` to resolve the set).
- "Keep adding X to the watchlist" / "make sure future X land on this watchlist" / "automatically" / "going forward" / "as they appear" / "current and future" → rule-based: \`security.set_watchlist_rule_based_data_source\` alone. Setting the source also syncs today's matches immediately — do NOT additionally call \`security.add_entities_to_watchlist\` for the same matches: that tags them as manual membership, and manual entries are never cleaned up by the automatic sync, so they'd wrongly outlive the rule (e.g. after they stop matching, or after the source itself is removed).
When in doubt, ask.

### Remove a rule-based data source
User: "Stop automatically adding Ubuntu hosts to the Server Fleet watchlist."

1. Call \`security.get_watchlist_id\` with \`{ identifier: "Server Fleet" }\` to resolve the id.
2. Call \`security.remove_watchlist_rule_based_data_source\` with \`{ watchlistId: "<id>", type: "store" }\`. Confirm.
3. On accept, clarify that hosts added by this query will be automatically removed from the watchlist on the next sync (within about 10 minutes) — same cadence as they were added. This does not affect entities added manually or via another source. There is no tool to remove them immediately; \`security.remove_entities_from_watchlist\` only targets manual assignments and will report these as \`not_found\` until the automatic cleanup runs.

### Remove (manual entity)
User: "Remove user:jsmith123 from the Privileged Users watchlist."

1. Call \`security.get_watchlist_id\` with \`{ identifier: "Privileged Users" }\` to resolve the id.
2. Call \`security.remove_entities_from_watchlist\` with \`{ watchlistId: "<id>", entityIds: ["user:jsmith123"] }\`. Confirm.
3. On accept, report the result. If the entity is reported as \`not_found\` with the "Entity not manually assigned" message, it's on the watchlist via an entity source, not manually — call \`security.list_watchlist_data_sources\` to show what's adding it, then offer \`security.remove_watchlist_rule_based_data_source\` if the user wants to stop that source (this removes the *source*, not just this one entity).

${WATCHLISTS_UI_NAVIGATION_CONTENT}
`;

export const manageWatchlistsSkill = defineSkillType({
  id: 'manage-watchlists',
  name: 'manage-watchlists',
  basePath: 'skills/security/watchlists',
  description:
    'Manage Entity Analytics watchlists: create, update, delete, and add/remove entity membership (one-time or standing/rule-based); enumerate existing watchlists and resolve a watchlist name to its canonical id. Also covers rule-based data sources — the queries/index correlations that automatically keep a watchlist in sync — including listing the candidate sources behind "what/how are we tracking/syncing this watchlist" or "why is this entity on this watchlist" (watchlist-level source list, not a definitive per-entity lookup), and setting or removing them. All mutating actions in this skill require explicit user confirmation before executing. Do NOT use for which watchlists a specific entity belongs to (that is on the entity profile via the entity-analytics skill).',
  content,
  getRegistryTools: () => [
    SECURITY_LIST_WATCHLISTS_TOOL_ID,
    SECURITY_GET_WATCHLIST_ID_TOOL_ID,
    SECURITY_CREATE_WATCHLIST_TOOL_ID,
    SECURITY_UPDATE_WATCHLIST_TOOL_ID,
    SECURITY_DELETE_WATCHLIST_TOOL_ID,
    SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
    SECURITY_REMOVE_ENTITIES_FROM_WATCHLIST_TOOL_ID,
    SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
    SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
    SECURITY_LIST_WATCHLIST_DATA_SOURCES_TOOL_ID,
    SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
  ],
});
