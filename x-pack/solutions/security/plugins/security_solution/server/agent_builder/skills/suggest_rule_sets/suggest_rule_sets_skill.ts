/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { StartPlugins } from '../../../plugin_contract';
import {
  RULE_SETS_INVENTORY_TOOL_ID,
  RULE_SETS_PROPOSE_TOOL_ID,
  ruleSetsInventoryTool,
  ruleSetsProposeTool,
} from './inline_tools';

export const SUGGEST_RULE_SETS_SKILL_ID = 'suggest-rule-sets';

export const getSuggestRuleSetsSkill = (getStartServices: StartServicesAccessor<StartPlugins>) =>
  defineSkillType({
    id: SUGGEST_RULE_SETS_SKILL_ID,
    name: SUGGEST_RULE_SETS_SKILL_ID,
    basePath: 'skills/security/rules',
    description:
      'Analyzes the installed detection rules and suggests rule sets: saved views of the rules page that group rules by team, project, platform, data source or threat. Use when the user asks to suggest, organize, group or structure their detection rules, or to create rule sets.',
    content: `# Suggest rule sets

## What a rule set is
A rule set is a saved view of the detection rules page. It selects rules with conditions on rule fields: tags (a rule must have all of them), integrations, rule types, severities, source (Elastic or custom) and a search text. New rules that match the conditions join the set automatically. A rule can be in many sets.

A rule set cannot select rules by alerts (noisy rules) or by run state (failing rules, gaps). Do not suggest such sets: the Rule Monitoring tab shows that state.

## Process
1. Call '${RULE_SETS_INVENTORY_TOOL_ID}' once. It returns counts per tag, integration, tactic, rule type, severity and source, the installed integrations, sample names of custom rules per custom tag, and the existing rule sets.
2. Find the structure of THIS customer's rules. Look first at what is specific to the customer:
   - custom tags that name a team, owner, project, migration, environment or customer (for example "Team: SOC-EU", "Migrated from Splunk"). Use the sample rule names to understand a tag;
   - integrations that are installed and have many rules;
   - the custom rules as a whole, when there are custom rules.
   Then add a few general sets only when they are clearly useful (for example critical and high severity rules for the main platform).
3. Select 5 to 8 sets. Each set must be useful on its own, have at least 3 rules, and be different from the other suggestions and from the existing rule sets. Prefer tags and integrations over free text search.
4. For each set, call '${RULE_SETS_PROPOSE_TOOL_ID}' with a short name, one sentence of reason and the conditions. Use only exact values from the inventory.
5. Render each returned attachment inline with <render_attachment id="..." version="...">, one after the other.
6. End with one short sentence: the user creates a set with the "Create rule set" button on its card, and a created set is private until the user shares it.

## Rules
- Do not invent tag, integration or tactic values. Copy them from the inventory.
- If a proposal returns an error, fix the conditions or skip that set.
- If a proposal says the set already exists, still render it: the card links to the existing set.
- Do not list the rules of a set in the answer. The card shows the count.
- Keep the text short. The cards carry the details.
`,
    getInlineTools: () => [
      ruleSetsInventoryTool(getStartServices),
      ruleSetsProposeTool(getStartServices),
    ],
  });
