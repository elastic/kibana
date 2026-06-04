/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { createFindPrebuiltRulesInlineTool } from './find_prebuilt_rules_tool';
import { createGetUserDataInventoryTool } from './get_user_data_inventory_tool';
import { createGetInstallableCatalogOverviewTool } from './get_installable_catalog_overview_tool';
import { createGetInstalledRulesMitreCoverageTool } from './get_installed_rules_mitre_coverage_tool';

interface RecommendPrebuiltRulesSkillDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

// NOTE: This is a minimal placeholder prompt. The full system prompt (data-source
// reasoning, MITRE routing, runnability inference, rendering rules) is authored in a
// separate, eval-driven step. See the Phase 1 plan, "Skill prompt structure".
const PLACEHOLDER_CONTENT = `# Recommend Prebuilt Rules

> Placeholder content — the full skill prompt is authored separately (eval-driven).

## Use This Skill

Use this skill to discover and recommend Elastic prebuilt detection rules to **install** on
this deployment, and to answer browse/coverage questions about the installable catalog.

## Read-Only

This skill does not install, enable, edit, or delete rules. Installation happens through the
Detection Rules UI flyout. For queries about currently-installed rules, use the
\`find-security-rules\` skill.

## Tools

| Tool | Purpose |
|---|---|
| \`security.find_prebuilt_rules\` | Search installable rules by structured filters |
| \`security.get_user_data_inventory\` | List installed Fleet integrations (for runnability inference) |
| \`security.get_installable_catalog_overview\` | Total installable count + available tag values |
| \`security.get_installed_rules_mitre_coverage\` | MITRE coverage of installed rules |

**Before any \`security.find_prebuilt_rules\` call that uses a \`tags\` filter, call
\`security.get_installable_catalog_overview\` in the same turn** to enumerate valid tag values.

## Grounding

Every tag, rule name, count, and tactic in a response must come from a tool result in this
conversation. Do not invent values.`;

export const createRecommendPrebuiltRulesSkill = ({
  getStartServices,
  logger,
}: RecommendPrebuiltRulesSkillDeps): SkillDefinition<
  'recommend-prebuilt-rules',
  'skills/security/rules'
> =>
  defineSkillType({
    id: 'recommend-prebuilt-rules',
    name: 'recommend-prebuilt-rules',
    basePath: 'skills/security/rules',
    description:
      'Discover and recommend Elastic prebuilt detection rules to install on this deployment. ' +
      'Handles install recommendations and browse/coverage questions about the installable ' +
      'catalog (by tag, MITRE, rule type, integration, or keyword). Read-only.',
    content: PLACEHOLDER_CONTENT,
    getInlineTools: () => [
      createFindPrebuiltRulesInlineTool({ getStartServices, logger }),
      createGetUserDataInventoryTool({ getStartServices, logger }),
      createGetInstallableCatalogOverviewTool({ getStartServices, logger }),
      createGetInstalledRulesMitreCoverageTool({ getStartServices, logger }),
    ],
  });
