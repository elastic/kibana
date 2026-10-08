/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { RESOLUTION_UI_NAVIGATION_CONTENT } from '../ui_navigation';
import {
  SECURITY_GET_RESOLUTION_GROUP_TOOL_ID,
  SECURITY_LINK_ENTITIES_TOOL_ID,
  SECURITY_UNLINK_ENTITIES_TOOL_ID,
  SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
  SECURITY_SET_RESOLUTION_RULES_TOOL_ID,
  SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
  SECURITY_GET_ENTITY_TOOL_ID,
} from '../../tools';

const content = `
# Entity Resolution Management

This skill exposes tools to **manage** entity resolution in the current space — inspect a resolution group, link or unlink entities, and enumerate/enable/disable the automated resolution rules.

## When to use this skill

Use when the user asks to **link** / **merge** / **resolve** entities together, **unlink** / **unmerge** / **split** them apart, **inspect** a resolution group (what aliases an entity has, which entities are linked to it, what it resolves to), or **list** / **enable** / **disable** resolution rules. Trigger phrases: "merge these two accounts", "link host:laptop-a to host:laptop-b", "these are the same user, resolve them", "unlink this alias", "split these apart", "who is this entity resolved with", "what aliases does X have", "which entities are linked to X", "what does X resolve to", "show the resolution group for X", "what resolution rules do we have", "is the email matching rule enabled", "disable the Windows SID bridge rule".

Do **NOT** use this skill for:
- **Resolution-group risk score trend** (not group membership) — that's a *scoring* concern, not a *linking* one; use \`security.get_entity_risk_score_history\` with \`scoreType: 'resolution'\` (entity-analytics skill). This is a historical chart only — it does not recalculate anything.

**\`security.link_entities\` and \`security.unlink_entities\` don't recalculate risk scores.** They only change resolution-group membership. Changing group membership *can* eventually change an entity's risk score, but only the next time scoring runs on its own schedule in the background. Don't say or imply that linking/unlinking itself changed or will change a risk score.

## Available tools

- **\`security.get_resolution_group\`**: Get an entity's resolution group — the target plus every linked alias. Works from either the target or an alias.
- **\`security.link_entities\`** — **requires confirmation**: Link one or more entities to a target, creating/extending a resolution group. All entities must be the same type.
- **\`security.unlink_entities\`** — **requires confirmation**: Unlink one or more entities from their resolution group, making each standalone again.
- **\`security.list_resolution_rules\`**: List the managed resolution rules and their effective enabled state. Use this first to resolve a rule name to its stable id.
- **\`security.set_resolution_rules\`** — **requires confirmation**: Enable and/or disable one or more resolution rules by their stable \`ruleId\`s in a single call — pass every rule the user asked about (e.g. "enable all the rules", "turn off A and turn on B").

${RESOLUTION_UI_NAVIGATION_CONTENT}

## Example flows

### Inspect
User: "Who is host:laptop-a resolved with?" — same flow for "What aliases does host:laptop-a have?", "Which entities are linked to host:laptop-a?", and "What does host:laptop-a resolve to?"

1. Call \`security.get_resolution_group\` with \`{ entityId: 'host:laptop-a' }\`.
2. Summarize in prose: the target, the alias count, and each alias's identity. If \`groupSize\` is 1, say the entity is standalone.

### Link
User: "These two are the same user, jsmith123 and jsmith.contractor — merge them."

1. If the user named the target (the account that should remain canonical), pass it as \`targetId\`. If they didn't, omit \`targetId\` and list every entity in \`entityIds\` — the tool proposes a target.
2. Call \`security.link_entities\` with \`{ targetId: 'jsmith123', entityIds: ['jsmith.contractor'] }\`, or \`{ entityIds: ['jsmith123', 'jsmith.contractor'] }\` when no target was named.
3. The tool handles user confirmation. On accept, report which entities were \`linked\` vs \`skipped\` (already linked); if the target was proposed (\`targetSelection: 'suggested'\`), say which one and why. On reject, state that no change was made.

### Unlink
User: "Unlink jsmith.contractor from that group."

1. Call \`security.unlink_entities\` with \`{ entityIds: ['jsmith.contractor'] }\`. Confirm.
2. On accept, report the result — \`unlinked\` vs \`skipped\`. Skipped entities are described in \`nonAliases\`: \`standalone\` (not part of any group) or \`group_target\` (the primary of a group).
3. A group target can't be unlinked. When one comes back (in \`nonAliases\`, or as a \`group_target\` mismatch), tell the user it is the primary of a group and offer to unlink some of the listed \`aliases\` instead — don't call it "not linked". If the user wants the whole group broken up, unlink every alias (\`security.get_resolution_group\` lists them all).

### Rules — enumerate then toggle
User: "What resolution rules do we have, and can you turn off/on the Windows SID one?"

1. Call \`security.list_resolution_rules\` (no arguments). Summarize each rule's id, description, and enabled state — use a short markdown table when there are several.
2. Identify the matching rule id(s) from the list (e.g. \`windows_sid_bridge\`) — never guess an id the tool didn't return.
3. Call \`security.set_resolution_rules\` with \`{ rules: [{ ruleId: 'windows_sid_bridge', enabled: false }] }\`. For a request touching several rules (e.g. "enable all of them", "disable A and enable B"), pass every rule in the same \`rules\` array so there's one confirmation, not one call per rule.
4. The tool handles user confirmation. Do not say you will enable or disable the rule(s), and do not say they already changed. On accept, report each rule's new \`enabled\` state from the tool result. On reject, state that no change was made.

## Best Practices
- Always resolve entity references before linking/unlinking — pass whatever the user gave you (name or EUID); the tools resolve it internally. If a reference is ambiguous or not found, relay the tool's message and candidate ids rather than guessing.
- If a prior tool call in this conversation already returned an entity's EUID (e.g. \`target\`/\`aliases\` from \`security.get_resolution_group\`), pass that EUID to the next call instead of the original name — it resolves as a cheap exact match instead of a fuzzy lookup. Don't call \`security.get_entity\` solely to fetch an id for another tool; these tools already resolve names internally.
- Resolution rule ids are stable strings (e.g. \`email_exact_match\`, \`windows_sid_bridge\`) — always get them from \`security.list_resolution_rules\`, never invent one from the user's wording.
`;

export const entityResolutionSkill = defineSkillType({
  id: 'entity-resolution',
  name: 'entity-resolution',
  basePath: 'skills/security/entity_resolution',
  description:
    'Manage Entity Analytics entity resolution: inspect a resolution group — what aliases an entity has, which entities are linked to it, and what it resolves to — link or unlink entities into/out of a group, and enumerate/enable/disable the automated resolution rules. All mutating actions in this skill require explicit user confirmation before executing. Do NOT use for the resolution-group risk score trend (entity-analytics skill).',
  content,
  getRegistryTools: () => [
    SECURITY_GET_RESOLUTION_GROUP_TOOL_ID,
    SECURITY_LINK_ENTITIES_TOOL_ID,
    SECURITY_UNLINK_ENTITIES_TOOL_ID,
    SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
    SECURITY_SET_RESOLUTION_RULES_TOOL_ID,
    SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
    SECURITY_GET_ENTITY_TOOL_ID,
  ],
});
