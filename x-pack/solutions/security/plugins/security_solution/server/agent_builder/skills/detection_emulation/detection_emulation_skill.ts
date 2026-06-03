/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { createValidateRuleTool } from './validate_rule_tool';

export interface DetectionEmulationSkillContext {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

export const getDetectionEmulationSkill = (ctx: DetectionEmulationSkillContext) =>
  defineSkillType({
    id: 'detection-emulation',
    name: 'detection-emulation',
    basePath: 'skills/security/endpoint',
    description: `Validate Elastic Security detection rules by running attack emulation scenarios and measuring whether the rules fire on MITRE ATT&CK techniques.`,
    content: `# Detection Emulation Skill

## When to Use

Use this skill when the user asks to:
- Validate, test, or score a detection rule against a known attack technique
- Check whether a rule fires on MITRE ATT\&CK techniques mapped to its tags

Do **not** use this skill for:
- General alert investigation or threat hunting (no emulation involved)
- Modifying or creating rules (use detection rule management tools)
- Checking rule syntax or ES|QL correctness

## Process

### Standard flow: validate a rule

1. **Run validation** — Call \`security.detection-emulation.validate-rule\` with \`mode: 'log_injection'\` (safe default;
   no real endpoints touched). For \`endpointIds\`, log_injection accepts any non-empty
   string — use the relevant host name or a synthetic ID like \`"emulation-host-1"\`.
2. **Present results** — Report \`tp\`, \`fp\`, \`matched_signals\`, \`unmatched_signals\`,
   and interpret the results for the user.

## Examples

**Validate a rule:**
> "Test my PowerShell rule (ID: abc-123) against host ws-001"
1. \`security.detection-emulation.validate-rule({ ruleId: 'abc-123', endpointIds: ['ws-001'], mode: 'log_injection' })\`
2. Report which signals fired / missed

## Operator Guardrails (informational)

These are enforced by the framework — you do not need to check them yourself:

- **Feature flag.** The skill is only available when \`detectionEmulationLogInjection\` is enabled.
- **Log injection mode.** Injects synthetic ECS documents — no real endpoint actions dispatched.

## Response Format

Always include in your response to the user:
- **Matched signals** — rule names that fired as expected
- **Unmatched signals** — expected rule names that did not fire (flag for investigation)
- **TP/FP counts** — true positives and false positives observed
`,
    getInlineTools: () => [createValidateRuleTool(ctx)],
  });
