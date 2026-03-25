/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../evaluate';

/**
 * Responder Agent eval suite.
 *
 * Validates that the responder agent:
 *  - Recommends endpoint isolation with confidence >= 0.7 for confirmed active compromises
 *  - Outputs confidence < 0.7 requiring human approval for ambiguous situations
 *  - Always includes rollback procedures in every recommendation
 *  - Assesses blast radius for each recommended action
 *  - Produces numeric confidence scores between 0.0 and 1.0
 */
evaluate.describe('Responder Agent', { tag: tags.serverless.security.complete }, () => {
  evaluate(
    'given confirmed active compromise should recommend endpoint isolation with confidence >= 0.7',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'responder-agent: active-compromise-isolation',
          description:
            'Validates the responder agent recommends endpoint isolation with high confidence for a confirmed active compromise scenario.',
          examples: [
            {
              input: {
                question:
                  'Respond to the following confirmed active compromise: Host "dc-prod-01" (domain controller, critical asset) has an active Cobalt Strike beacon communicating with C2 at 185.220.101.42 every 60 seconds. The triage agent classified this as true_positive with confidence 0.95. The correlator agent confirmed lateral movement to 3 additional hosts. Active data exfiltration of 500MB has been detected to an external IP. The attacker has domain admin credentials and is actively enumerating the network. Recommend immediate response actions.',
              },
              output: {
                criteria: [
                  'The response MUST recommend endpoint isolation for "dc-prod-01" as a primary action',
                  'The response MUST include a confidence score >= 0.7 for the isolation recommendation',
                  'The response MUST recommend blocking the C2 IP (185.220.101.42) at the network perimeter',
                  'The response MUST recommend credential reset for compromised domain admin accounts',
                  'The response MUST flag the critical nature of isolating a domain controller and include special considerations for maintaining domain services',
                ],
                toolCalls: [
                  {
                    id: 'security.response_actions',
                    criteria: [
                      'The response actions tool should be called to initiate or recommend endpoint isolation',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Respond' },
            },
          ],
        },
      });
    }
  );

  evaluate(
    'given ambiguous situation should output confidence < 0.7 requiring human approval',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'responder-agent: ambiguous-requires-approval',
          description:
            'Validates the responder agent outputs a lower confidence score requiring human approval for an ambiguous situation.',
          examples: [
            {
              input: {
                question:
                  'Respond to the following situation: Host "dev-server-07" triggered a "Suspicious Outbound Connection" alert. The destination IP 104.18.32.7 is a Cloudflare IP that hosts both legitimate services and has been associated with one low-confidence threat intelligence report. The process making the connection is "node.js" which is expected on this development server. The triage agent classified this as benign_true_positive with confidence 0.4. The user "developer-3" has no prior security incidents. However, the connection occurred at 3:00 AM outside normal working hours. Recommend response actions.',
              },
              output: {
                criteria: [
                  'The response MUST include a confidence score < 0.7 reflecting the ambiguity of the situation',
                  'The response MUST explicitly state that human approval is required before executing any disruptive actions',
                  'The response MUST present options rather than a single definitive action (e.g., monitor vs. investigate vs. block)',
                  'The response MUST acknowledge both the benign indicators (expected process, legitimate IP) and suspicious indicators (unusual timing)',
                  'The response MUST NOT recommend immediate endpoint isolation given the low confidence',
                ],
              },
              metadata: { query_intent: 'Respond' },
            },
          ],
        },
      });
    }
  );

  evaluate('every recommendation must include rollback procedure', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'responder-agent: rollback-procedures',
        description:
          'Validates that every response recommendation from the responder agent includes a corresponding rollback procedure.',
        examples: [
          {
            input: {
              question:
                'Respond to the following confirmed incident: Host "web-prod-05" is actively being used for cryptomining. The process "xmrig" is consuming 95% CPU. The triage agent confirmed true_positive with confidence 0.9. The host serves production web traffic for the customer portal. Recommend response actions and for each action include a rollback procedure in case the action causes unintended consequences.',
            },
            output: {
              criteria: [
                'The response MUST include at least 2 distinct response actions',
                'Each response action MUST have an explicitly labeled "Rollback" or "Rollback Procedure" section',
                'The rollback procedure for process termination MUST describe how to verify service health after killing the malicious process',
                'If endpoint isolation is recommended, the rollback MUST describe the un-isolation procedure and service restoration steps',
                'The rollback procedures MUST be specific and actionable (not generic statements like "undo the action")',
              ],
              toolCalls: [
                {
                  id: 'security.response_actions',
                  criteria: [
                    'The response actions tool should be called to recommend or execute response actions with rollback considerations',
                  ],
                },
              ],
            },
            metadata: { query_intent: 'Respond' },
          },
        ],
      },
    });
  });

  evaluate(
    'should assess blast radius for each recommended action',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'responder-agent: blast-radius-assessment',
          description:
            'Validates the responder agent assesses the blast radius (impact scope) for each recommended response action.',
          examples: [
            {
              input: {
                question:
                  'Respond to the following incident: The correlator agent identified a campaign affecting 15 hosts across 3 departments (Finance, Engineering, HR). The attacker has compromised the "svc-deploy" service account which is used by the CI/CD pipeline to deploy code to 50+ production servers. Recommending a password reset for "svc-deploy" would halt all deployments. Isolating the 15 compromised hosts would affect 45 users. Blocking the C2 domain at DNS level would affect all 2000 employees. Assess the blast radius for each recommended action.',
              },
              output: {
                criteria: [
                  'The response MUST include a blast radius assessment for each recommended action quantifying affected users, systems, or services',
                  'The response MUST assess the blast radius of resetting "svc-deploy" credentials (impact on CI/CD pipeline and 50+ production servers)',
                  'The response MUST assess the blast radius of isolating the 15 compromised hosts (impact on 45 users across 3 departments)',
                  'The response MUST prioritize actions by balancing containment urgency against operational impact',
                  'The response MUST recommend a phased approach or mitigation strategy to minimize blast radius while still containing the threat',
                ],
              },
              metadata: { query_intent: 'Respond' },
            },
          ],
        },
      });
    }
  );

  evaluate('confidence score must be numeric 0.0-1.0', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'responder-agent: confidence-score-format',
        description:
          'Validates that the responder agent always produces a numeric confidence score between 0.0 and 1.0 for its response recommendations.',
        examples: [
          {
            input: {
              question:
                'Respond to the following alert: Host "workstation-22" triggered "Ransomware Pre-encryption Behavior Detected" alert. Shadow copies are being deleted via vssadmin.exe. The triage agent classified this as true_positive with confidence 0.88. The host belongs to user "cfo-jones" in the Finance department. Recommend response actions with confidence scores.',
            },
            output: {
              criteria: [
                'The response MUST include a clearly labeled "Confidence" field with a numeric value between 0.0 and 1.0 (inclusive)',
                'The confidence score MUST be expressed as a decimal number (e.g., 0.85, 0.92), not as a percentage or qualitative label',
                'Each distinct response action MUST have its own confidence score or there MUST be an overall confidence score for the response plan',
                'The confidence score MUST reflect the certainty that the recommended actions are appropriate for the situation',
                'The response MUST include at least one concrete response action alongside the confidence score',
              ],
            },
            metadata: { query_intent: 'Respond' },
          },
        ],
      },
    });
  });
});
