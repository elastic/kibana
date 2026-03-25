/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../evaluate';

/**
 * MITRE Analyst Agent eval suite.
 *
 * Validates that the MITRE analyst agent:
 *  - Queries active detection rules and maps them to MITRE techniques
 *  - Identifies uncovered MITRE techniques as gaps
 *  - Prioritizes gaps by severity weighting
 *  - Recommends new detection rules for top gaps
 *  - Produces a coverage percentage between 0 and 100
 */
evaluate.describe('MITRE Analyst Agent', { tag: tags.serverless.security.complete }, () => {
  evaluate(
    'should query active detection rules and map to MITRE techniques',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'mitre-analyst-agent: rule-to-technique-mapping',
          description:
            'Validates the MITRE analyst agent queries active detection rules and maps them to MITRE ATT&CK techniques.',
          examples: [
            {
              input: {
                question:
                  'Analyze our current detection rule coverage against the MITRE ATT&CK framework. Query all active detection rules and map each rule to its corresponding MITRE ATT&CK techniques. Provide a summary of which techniques and tactics are covered by our current rule set.',
              },
              output: {
                criteria: [
                  'The response MUST query active detection rules to enumerate the current rule set',
                  'The response MUST map at least some detection rules to specific MITRE ATT&CK technique IDs (e.g., T1059, T1053)',
                  'The response MUST organize the mapping by MITRE ATT&CK tactic (e.g., Initial Access, Execution, Persistence)',
                  'The response MUST indicate the number of rules mapped per tactic or technique',
                  'The response MUST provide a structured summary showing the technique-to-rule mapping',
                ],
                toolCalls: [
                  {
                    id: 'security.mitre_mapping',
                    criteria: [
                      'The MITRE mapping tool should be called to retrieve or compute the mapping between detection rules and MITRE techniques',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'MITRE Analysis' },
            },
          ],
        },
      });
    }
  );

  evaluate('should identify uncovered MITRE techniques as gaps', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'mitre-analyst-agent: gap-identification',
        description:
          'Validates the MITRE analyst agent identifies MITRE ATT&CK techniques that are not covered by any active detection rule.',
        examples: [
          {
            input: {
              question:
                'Identify gaps in our MITRE ATT&CK detection coverage. Our current detection rules cover the following techniques: T1566 (Phishing), T1059 (Command and Scripting Interpreter), T1053 (Scheduled Task/Job), T1003 (OS Credential Dumping), T1021 (Remote Services). What important MITRE ATT&CK techniques are we missing coverage for? Focus on Enterprise ATT&CK matrix techniques that are commonly used in real-world attacks.',
            },
            output: {
              criteria: [
                'The response MUST identify at least 5 uncovered MITRE ATT&CK techniques that represent detection gaps',
                'The identified gaps MUST be real MITRE ATT&CK Enterprise technique IDs (e.g., T1055, T1071, T1105)',
                'Each gap MUST include the technique name and a brief description of why it represents a risk',
                'The response MUST NOT list the already-covered techniques (T1566, T1059, T1053, T1003, T1021) as gaps',
                'The gaps MUST span multiple MITRE ATT&CK tactics to show breadth of coverage analysis',
              ],
              toolCalls: [
                {
                  id: 'security.mitre_mapping',
                  criteria: [
                    'The MITRE mapping tool should be called to determine current coverage and identify gaps',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'MITRE Analysis' },
          },
        ],
      },
    });
  });

  evaluate('should prioritize gaps by severity weighting', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'mitre-analyst-agent: gap-prioritization',
        description:
          'Validates the MITRE analyst agent prioritizes identified coverage gaps by severity weighting based on threat prevalence and impact.',
        examples: [
          {
            input: {
              question:
                'Prioritize our MITRE ATT&CK detection coverage gaps by severity. We have no detection rules for the following techniques: T1055 (Process Injection), T1071 (Application Layer Protocol), T1105 (Ingress Tool Transfer), T1027 (Obfuscated Files or Information), T1572 (Protocol Tunneling), T1218 (System Binary Proxy Execution), T1547 (Boot or Logon Autostart Execution), T1078 (Valid Accounts), T1048 (Exfiltration Over Alternative Protocol), T1574 (Hijack Execution Flow). Rank these gaps from highest to lowest priority based on severity, threat prevalence in real-world attacks, and potential impact if exploited.',
            },
            output: {
              criteria: [
                'The response MUST rank all 10 provided techniques in a prioritized order from highest to lowest severity',
                'Each technique MUST have an explicit severity or priority score/label (e.g., Critical/High/Medium/Low or numeric score)',
                'The prioritization MUST consider threat prevalence (how commonly the technique is used in real attacks)',
                'The prioritization MUST consider potential impact if the technique is exploited without detection',
                'The response MUST provide justification for why the top 3 gaps are ranked highest',
              ],
            },
            metadata: { query_intent: 'MITRE Analysis' },
          },
        ],
      },
    });
  });

  evaluate('should recommend new detection rules for top gaps', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'mitre-analyst-agent: rule-recommendations',
        description:
          'Validates the MITRE analyst agent recommends new detection rules to address the highest-priority coverage gaps.',
        examples: [
          {
            input: {
              question:
                'Our highest priority MITRE ATT&CK coverage gaps are: 1) T1055 - Process Injection (no detection), 2) T1078 - Valid Accounts (no detection), 3) T1071 - Application Layer Protocol (no detection). Recommend specific detection rules we should create to close these gaps. For each recommendation, specify the rule type (EQL, KQL, threshold, ML), the data sources required, and the expected detection logic.',
            },
            output: {
              criteria: [
                'The response MUST recommend at least one detection rule for each of the 3 specified gap techniques',
                'Each rule recommendation MUST specify the rule type (EQL, KQL, ES|QL, threshold, or ML)',
                'Each rule recommendation MUST specify the required data sources (e.g., process events, authentication logs, network events)',
                'Each rule recommendation MUST include a description of the detection logic (what the rule looks for)',
                'The recommendations MUST be actionable and specific enough to implement as Elastic Security detection rules',
              ],
              toolCalls: [
                {
                  id: 'security.mitre_mapping',
                  criteria: [
                    'The MITRE mapping tool should be called to understand current coverage context before recommending new rules',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'MITRE Analysis' },
          },
        ],
      },
    });
  });

  evaluate('coverage percentage should be between 0 and 100', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'mitre-analyst-agent: coverage-percentage',
        description:
          'Validates the MITRE analyst agent computes a coverage percentage between 0 and 100 representing the proportion of MITRE ATT&CK techniques covered by active detection rules.',
        examples: [
          {
            input: {
              question:
                'Calculate our overall MITRE ATT&CK detection coverage percentage. Query our active detection rules, map them to MITRE techniques, and compute the percentage of Enterprise ATT&CK techniques that have at least one detection rule. Express the result as a percentage between 0 and 100.',
            },
            output: {
              criteria: [
                'The response MUST include a clearly labeled coverage percentage as a numeric value between 0 and 100',
                'The percentage MUST be calculated as (covered techniques / total techniques) * 100 or a clearly defined equivalent formula',
                'The response MUST specify both the numerator (number of covered techniques) and denominator (total techniques evaluated)',
                'The coverage percentage MUST be a reasonable value (not 0% unless no rules exist, not 100% unless all techniques are covered)',
                'The response MUST include a breakdown showing coverage per tactic to contextualize the overall percentage',
              ],
              toolCalls: [
                {
                  id: 'security.mitre_mapping',
                  criteria: [
                    'The MITRE mapping tool should be called to compute the coverage mapping and percentage',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'MITRE Analysis' },
          },
        ],
      },
    });
  });
});
