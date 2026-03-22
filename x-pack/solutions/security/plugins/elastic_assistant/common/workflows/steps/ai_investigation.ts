/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const AI_INVESTIGATION_STEP_TYPE_ID = 'elastic_assistant.ai_investigation';

/**
 * Input schema for AI Investigation workflow step
 */
export const AiInvestigationInputSchema = z.object({
  /** Alert ID to investigate */
  alert_id: z.string().min(1, 'alert_id is required'),
  /** Index where alert is stored */
  alert_index: z.string().min(1, 'alert_index is required'),
  /** Connector ID for LLM (Claude recommended) */
  connector_id: z.string().min(1, 'connector_id is required'),
  /** Optional case ID to attach investigation to */
  case_id: z.string().optional(),
  /** Enable/disable specific agents (optional overrides) */
  enabled_agents: z
    .object({
      triage: z.boolean().default(true),
      mitre: z.boolean().default(true),
      cti: z.boolean().default(false), // Future agents disabled by default
      investigation: z.boolean().default(false),
      remediation: z.boolean().default(false),
    })
    .optional(),
});

/**
 * Output schema for AI Investigation workflow step
 */
export const AiInvestigationOutputSchema = z.object({
  /** Alert ID that was investigated */
  alert_id: z.string(),
  /** Case ID (if attached to case) */
  case_id: z.string().optional(),
  /** Investigation timestamp */
  timestamp: z.string(),
  /** Triage result */
  triage: z
    .object({
      classification: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      attack_type: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
      similar_alerts_count: z.number().optional(),
    })
    .optional(),
  /** MITRE ATT&CK mapping */
  mitre_mapping: z
    .object({
      techniques: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
        })
      ),
      tactics: z.array(z.object({ id: z.string(), name: z.string() })),
      phase: z.string(),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      reasoning: z.string(),
    })
    .optional(),
  /** Formatted investigation text (markdown for case comments) */
  investigation_text: z.string(),
  /** Total investigation latency in milliseconds */
  latency_ms: z.number(),
  /** Any errors that occurred during investigation */
  errors: z.array(z.string()).optional(),
});

export type AiInvestigationStepInput = z.infer<typeof AiInvestigationInputSchema>;
export type AiInvestigationStepOutput = z.infer<typeof AiInvestigationOutputSchema>;

/**
 * Common workflow step definition for AI Investigation
 *
 * This wraps the LangGraph multi-agent system as a single workflow step
 */
export const aiInvestigationStepCommonDefinition: CommonStepDefinition<
  typeof AiInvestigationInputSchema,
  typeof AiInvestigationOutputSchema
> = {
  id: AI_INVESTIGATION_STEP_TYPE_ID,
  category: StepCategory.Kibana,
  label: 'AI-Powered Alert Investigation',
  description:
    'Execute autonomous multi-agent investigation using AI (Triage + MITRE Mapper + CTI Enrichment + Investigation + Remediation)',
  documentation: {
    details: `Runs autonomous AI-powered investigation on a security alert using multiple specialized agents:

1. **Triage Agent** - Classifies severity and attack type
2. **MITRE Mapper** - Maps to ATT&CK framework
3. **CTI Enrichment** (future) - Looks up threat intelligence
4. **Investigation Agent** (future) - Deep analysis and hypothesis testing
5. **Remediation Agent** (future) - Response recommendations

The investigation runs autonomously (no user input required) and returns a complete analysis in <30 seconds.

**LLM Requirements:**
- Requires a configured Claude (Anthropic) connector
- Foundation spike uses 2 agents (~15-30s latency)
- Production uses 5 agents with parallel execution (~30-60s latency)

**Output:**
- Structured investigation result (JSON)
- Formatted markdown text for case comments
- MITRE ATT&CK mapping with Navigator visualization
`,
    examples: [
      `## Investigate alert and attach to case
\`\`\`yaml
- name: ai_investigation
  type: ${AI_INVESTIGATION_STEP_TYPE_ID}
  with:
    alert_id: "\${{ trigger.alert_id }}"
    alert_index: ".alerts-security.alerts-default"
    connector_id: "my-claude-connector-id"
    case_id: "\${{ steps.create_case.outputs.case.id }}"
\`\`\``,
      `## Investigate with custom agent configuration
\`\`\`yaml
- name: ai_investigation
  type: ${AI_INVESTIGATION_STEP_TYPE_ID}
  with:
    alert_id: "\${{ trigger.alert_id }}"
    alert_index: "\${{ trigger.alert_index }}"
    connector_id: "my-claude-connector-id"
    enabled_agents:
      triage: true
      mitre: true
      cti: false        # Disable CTI for faster investigations
      investigation: false
      remediation: false
\`\`\``,
    ],
  },
  inputSchema: AiInvestigationInputSchema,
  outputSchema: AiInvestigationOutputSchema,
};
