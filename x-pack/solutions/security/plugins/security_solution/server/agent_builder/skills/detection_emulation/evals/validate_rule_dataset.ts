/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Minimal local type shapes — mirrors @kbn/evals `EvaluationDataset` and `Example`
// without pulling in the devOnly package into a production plugin boundary.

export interface DetectionEmulationExample {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    /**
     * Golden path of canonical tool ids the agent is expected to invoke,
     * in order. Consumed by the trajectory evaluator
     * (`createTrajectoryEvaluator` in `validate_rule.spec.ts`).
     *
     * - Empty array `[]` for distractor examples — trajectory returns 1
     *   when no tools were called and 0 if any tool fired.
     * - Order matters: e.g. `['…get-history', '…validate-rule']` scores
     *   higher when history was checked BEFORE validation.
     *
     * Use canonical tool ids only (`security.detection-emulation.*`); the
     * trace data emits these, not the friendly names.
     */
    tool_sequence?: string[];
  };
}

interface DetectionEmulationDataset {
  name: string;
  description: string;
  examples: DetectionEmulationExample[];
}

/**
 * Eval dataset for the detection-emulation skill's `validateRule` tool.
 *
 * Covers:
 *  - Success paths: PowerShell (T1059.001) and mshta/regsvr32 (T1218.005)
 *  - Default-mode assertion: no explicit mode → log_injection used
 *  - History-first flow: agent checks history before re-running
 *  - Failure: rule with no MITRE tags → no_mitre_tags
 *  - Failure: rule with unmapped technique → no_supported_techniques
 *  - Failure: caller lacks real_execution privilege → authorization_error
 *  - Distractor: alert investigation (skill must NOT be invoked)
 *  - Distractor: rule creation request (skill must NOT be invoked)
 */
export const validateRuleDataset = {
  name: 'security: detection-emulation-validate-rule',
  description:
    'Exercises the detection-emulation skill validateRule tool. ' +
    'Covers success (T1059.001, T1218.005), failure (no_mitre_tags, ' +
    'no_supported_techniques, authorization_error), default log_injection mode, ' +
    'history-first flow, and distractor prompts where the skill should not fire.',
  examples: [
    // ─── Success path: PowerShell (T1059.001) ─────────────────────────────────
    {
      input: {
        question:
          'Validate my PowerShell detection rule (ID: rule-abc-123) ' +
          'against host ws-001 and tell me if it fires on T1059.001.',
      },
      output: {
        criteria: [
          'Called the security.detection-emulation.validate-rule tool with ruleId "rule-abc-123".',
          'Called the security.detection-emulation.validate-rule tool with endpointIds containing "ws-001".',
          'Used mode "log_injection" (either explicitly or by default — never "real_execution" unless asked).',
          'Reported a confidence score between 0 and 1.',
          'Mentioned matched_signals or unmatched_signals in the response.',
          'Included the report_id in the response for audit trail reference.',
        ],
        tool_sequence: ['security.detection-emulation.validate-rule'],
      },
    },

    // ─── Success path: mshta / regsvr32 (T1218.005) ───────────────────────────
    {
      input: {
        question:
          'Run an emulation test for rule-xyz-456 (mshta/regsvr32 detection) ' +
          'on endpoint 10.0.0.5. I want to see whether it catches T1218.005.',
      },
      output: {
        criteria: [
          'Called the security.detection-emulation.validate-rule tool with ruleId "rule-xyz-456".',
          'Called the security.detection-emulation.validate-rule tool with endpointIds containing "10.0.0.5".',
          'Used mode "log_injection" (safe default).',
          'Reported a confidence score.',
          'Surface any caveats returned by the tool if present.',
        ],
        tool_sequence: ['security.detection-emulation.validate-rule'],
      },
    },

    // ─── Default mode: user does not specify mode ──────────────────────────────
    {
      input: {
        question:
          'Can you quickly test rule-def-789 on host dev-box-1? ' +
          'Just want to see if it would catch the attack.',
      },
      output: {
        criteria: [
          'Called the security.detection-emulation.validate-rule tool.',
          'Did NOT use mode "real_execution" — no explicit mode request was made, so log_injection must be the default.',
          'Reported a confidence score and matched/unmatched signals.',
        ],
        tool_sequence: ['security.detection-emulation.validate-rule'],
      },
    },

    // ─── History-first flow ────────────────────────────────────────────────────
    {
      input: {
        question:
          'Before re-running emulation on rule-ghi-321, check whether it has been validated recently. ' +
          'If the last score was already above 0.8, let me know instead of re-running.',
      },
      output: {
        criteria: [
          // N4: The "called get-history BEFORE validate-rule" assertion is now
          // covered by the trajectory evaluator scoring against tool_sequence
          // below. Keep only the conditional reasoning assertions — those are
          // about response content, not call ordering.
          'If the most recent run returned a confidence ≥ 0.8, informed the user of the cached score and did NOT call security.detection-emulation.validate-rule again without explicit user approval.',
          'If no history exists or the score was < 0.8, proceeded to call security.detection-emulation.validate-rule.',
        ],
        tool_sequence: [
          'security.detection-emulation.get-history',
          'security.detection-emulation.validate-rule',
        ],
      },
    },

    // ─── Failure: no MITRE ATT&CK tags ────────────────────────────────────────
    {
      input: {
        question: 'Validate rule-no-mitre-555. It is a custom threshold rule with no ATT&CK tags.',
      },
      output: {
        criteria: [
          'Called the security.detection-emulation.validate-rule tool with ruleId "rule-no-mitre-555".',
          'Communicated to the user that the rule has no MITRE ATT&CK technique tags and therefore cannot be validated via emulation.',
          'Did NOT claim the validation succeeded.',
          'Did NOT fabricate a confidence score.',
          'Suggested the user add ATT&CK technique tags to the rule to enable emulation.',
        ],
        tool_sequence: ['security.detection-emulation.validate-rule'],
      },
    },

    // ─── Failure: technique not in payload library ─────────────────────────────
    {
      input: {
        question:
          'Test rule-unsupported-888 — it targets T1600 (Weaken Encryption). ' +
          'Run an emulation against endpoint lab-host-7.',
      },
      output: {
        criteria: [
          'Called the security.detection-emulation.validate-rule tool.',
          "Communicated that none of the rule's MITRE techniques have matching emulation payloads in the library.",
          'Did NOT return a fabricated confidence score.',
          'Did NOT claim a successful emulation run.',
          'Explained that the "no_supported_techniques" result means the emulation library lacks payloads for this technique.',
        ],
        tool_sequence: ['security.detection-emulation.validate-rule'],
      },
    },

    // ─── Failure: real_execution blocked (no privilege) ───────────────────────
    {
      input: {
        question:
          'Run a live execution emulation for rule-real-999 on endpoint prod-host-3. ' +
          'I need real endpoint execution, not log injection.',
      },
      output: {
        criteria: [
          'Called the security.detection-emulation.validate-rule tool with mode "real_execution".',
          'If an authorization_error is returned, explained to the user that real_execution requires elevated endpoint execute privileges.',
          'Did NOT silently fall back to log_injection without telling the user.',
          'Did NOT claim the real execution succeeded when it did not.',
        ],
        tool_sequence: ['security.detection-emulation.validate-rule'],
      },
    },

    // ─── Distractor: alert investigation (skill must NOT fire) ────────────────
    {
      input: {
        question:
          'I have an alert for suspicious PowerShell activity on ws-002. ' +
          'Can you investigate the alert and tell me what happened?',
      },
      output: {
        criteria: [
          'Did NOT call the security.detection-emulation.validate-rule tool — this is an alert investigation, not an emulation validation.',
          'Did NOT call the security.detection-emulation.run-command tool.',
          'Used an appropriate alert investigation or threat hunting approach instead.',
        ],
        tool_sequence: [],
      },
    },

    // ─── Distractor: rule creation (skill must NOT fire) ──────────────────────
    {
      input: {
        question:
          'Create a new EQL detection rule that fires on PowerShell download cradle activity.',
      },
      output: {
        criteria: [
          'Did NOT call any detection-emulation tool (security.detection-emulation.validate-rule, security.detection-emulation.run-command, security.detection-emulation.get-history).',
          'Addressed the rule creation request using rule management tooling, not emulation tooling.',
        ],
        tool_sequence: [],
      },
    },
  ],
} satisfies DetectionEmulationDataset;
