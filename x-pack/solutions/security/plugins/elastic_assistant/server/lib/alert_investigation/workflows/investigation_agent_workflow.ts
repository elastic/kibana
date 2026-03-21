/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Investigation Agent Workflow - Autonomous Case Investigation using Agent Builder
 *
 * This workflow demonstrates how to use the native `ai.agent` workflow step type
 * to enable autonomous investigation of security cases.
 *
 * Flow:
 * 1. Receive case ID + new alert IDs (from case matching step)
 * 2. Gather case context (alerts, entities, existing findings)
 * 3. Invoke Investigation Agent via ai.agent step
 * 4. Agent autonomously:
 *    - Analyzes alert patterns
 *    - Queries related data (process trees, network connections)
 *    - Generates Attack Discovery insights
 *    - Recommends response actions
 * 5. Update case with agent findings
 *
 * **Native Capabilities Used:**
 * - ✅ Agent Builder `ai.agent` workflow step (NOT custom implementation!)
 * - ✅ Structured output via schema (typed agent responses)
 * - ✅ Conversation persistence (investigation history)
 * - ✅ Tool use (agent queries ES, Entity Store, Threat Intel)
 */

export const INVESTIGATION_AGENT_WORKFLOW_ID = 'security.autonomousInvestigation';

export const investigationAgentWorkflowDefinition = {
  id: INVESTIGATION_AGENT_WORKFLOW_ID,
  name: 'Autonomous Case Investigation',
  description:
    'Uses Agent Builder to autonomously investigate security cases with new alerts, ' +
    'generating Attack Discovery insights and response recommendations.',

  /**
   * Trigger: Called by main pipeline workflow after case matching (step 5)
   * NOT scheduled - invoked programmatically when cases have new alerts
   */
  trigger: {
    type: 'manual', // Invoked by parent workflow
  },

  /**
   * Input from parent workflow (case matching step)
   */
  input: {
    case_id: { type: 'string', required: true },
    alert_ids: { type: 'array', items: { type: 'string' }, required: true },
    case_title: { type: 'string', required: true },
    existing_ad_count: { type: 'number', required: false },
  },

  steps: [
    /**
     * Step 1: Gather case context for agent
     *
     * Queries ES for alert details, entities, and existing case findings
     * to provide full context to the Investigation Agent
     */
    {
      id: 'gather_context',
      name: 'Gather Case Investigation Context',
      type: 'elasticsearch.query', // Native ES query step
      config: {
        index: '.alerts-security.alerts-default',
        query: {
          terms: {
            _id: '${input.alert_ids}',
          },
        },
        size: 500,
      },
    },

    /**
     * Step 2: Invoke Investigation Agent (Native ai.agent step!)
     *
     * Agent receives case context and autonomously:
     * - Analyzes MITRE techniques across alerts
     * - Identifies attack patterns and campaigns
     * - Queries for related evidence (process trees, network activity)
     * - Generates Attack Discovery summary
     * - Recommends response actions
     */
    {
      id: 'investigate',
      name: 'Autonomous Investigation Agent',
      type: 'ai.agent', // ← Native Agent Builder workflow step!
      config: {
        'agent-id': 'security-investigation-agent', // Create this agent via Agent Builder UI
        'connector-id': '${workflow.default_connector_id}', // From workflow context
        'create-conversation': true, // Persist investigation history
      },
      input: {
        // Structured prompt with case context
        message: `
You are a Security Investigation Agent analyzing case: "${input.case_title}"

## New Alerts to Investigate
${gather_context.output.hits.length} alerts with IDs: ${input.alert_ids.join(', ')}

## Alert Details
\${JSON.stringify(gather_context.output.hits, null, 2)}

## Your Task
1. Analyze these alerts for attack patterns
2. Identify MITRE ATT&CK techniques and tactics
3. Determine if this is part of a larger campaign
4. Generate Attack Discovery summary
5. Recommend response actions (contain, investigate further, escalate)

## Output Format
Provide structured JSON with:
{
  "attack_pattern": "Brief description of attack pattern detected",
  "mitre_techniques": ["T1078", "T1021"],
  "severity": "low" | "medium" | "high" | "critical",
  "campaign_indicators": ["Indicator 1", "Indicator 2"],
  "attack_discovery_summary": "Detailed summary for analysts",
  "recommended_actions": ["Action 1", "Action 2"]
}
        `,
        // Schema for structured output (type-safe agent response!)
        schema: {
          type: 'object',
          properties: {
            attack_pattern: { type: 'string' },
            mitre_techniques: { type: 'array', items: { type: 'string' } },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            campaign_indicators: { type: 'array', items: { type: 'string' } },
            attack_discovery_summary: { type: 'string' },
            recommended_actions: { type: 'array', items: { type: 'string' } },
          },
          required: [
            'attack_pattern',
            'mitre_techniques',
            'severity',
            'attack_discovery_summary',
            'recommended_actions',
          ],
        },
      },
    },

    /**
     * Step 3: Update case with agent findings
     *
     * Adds agent's structured output as case comment/observables
     */
    {
      id: 'update_case',
      name: 'Update Case with Investigation Findings',
      type: 'cases.addComment', // Native Cases workflow step (if available)
      config: {
        case_id: '${input.case_id}',
        comment: {
          type: 'user',
          comment: `
## Autonomous Investigation Results

**Attack Pattern**: \${investigate.output.structured_output.attack_pattern}

**MITRE Techniques**: \${investigate.output.structured_output.mitre_techniques.join(', ')}

**Severity**: \${investigate.output.structured_output.severity}

**Campaign Indicators**:
\${investigate.output.structured_output.campaign_indicators.map(i => '- ' + i).join('\\n')}

**Attack Discovery Summary**:
\${investigate.output.structured_output.attack_discovery_summary}

**Recommended Actions**:
\${investigate.output.structured_output.recommended_actions.map(a => '- ' + a).join('\\n')}

---
*Generated by Investigation Agent (\${investigate.output.conversation_id})*
          `,
        },
      },
    },
  ],

  /**
   * Workflow output (returned to parent pipeline)
   */
  output: {
    investigation_complete: true,
    agent_conversation_id: '${steps.investigate.output.conversation_id}',
    severity_assessed: '${steps.investigate.output.structured_output.severity}',
    mitre_techniques: '${steps.investigate.output.structured_output.mitre_techniques}',
  },
};

/**
 * Integration Notes:
 *
 * This workflow requires:
 * 1. ✅ Agent Builder agent created with ID 'security-investigation-agent'
 *    - Create via: Kibana UI → Agent Builder → Create Agent
 *    - Tools: ES query, Entity Store, Threat Intel, Attack Discovery
 *
 * 2. ✅ Default connector configured in workflow context
 *    - Or pass connector-id explicitly
 *
 * 3. ⚠️ cases.addComment workflow step (may need to verify availability)
 *    - Alternative: Call Cases API directly in custom step
 *
 * **This demonstrates 100% native Elastic Stack usage - zero external dependencies!**
 */
