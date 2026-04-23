/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PrebuiltWorkflowDefinition {
  id: string;
  yaml: string;
}

export const PREBUILT_WORKFLOWS: PrebuiltWorkflowDefinition[] = [
  {
    id: 'workflow-00000000-0000-5ec0-0000-fa15e00a1e72',
    yaml: `version: "1"
name: "[Prebuilt] [From event] Fix false positive alerts"
description: When a new security detection rule is created, analyze alerts for false positives and provide recommendations to fix them.
enabled: true
tags:
  - prebuilt
inputs:
  - name: rule_id
    type: string
    required: true
triggers:
  - type: security_rules.created
steps:
  - name: fix_false_positives
    type: ai.agent
    with:
      message: |
        Load fix-false-postive-alerts skill and use {{inputs.rule_id}} as rule ID. Follow skill instructions
`,
  },
  {
    id: 'workflow-00000000-0000-5ec0-0000-fa15e00a1e73',
    yaml: `version: "1"
name: "[Prebuilt] Fix false positive alerts (with approval)"
description: Analyze alerts for false positives, present findings for human review, and apply the approved fix.
enabled: true
tags:
  - prebuilt
  - human-in-the-loop
inputs:
  - name: rule_id
    type: string
    required: true
triggers:
  - type: manual
steps:
  - name: analyze_false_positives
    type: ai.agent
    create-conversation: true
    with:
      message: |
        Load fix-false-positive-alerts skill and use {{inputs.rule_id}} as rule ID.
        Follow the skill instructions through Step 6 (Verify the Fix) ONLY.
        DO NOT apply any changes (do not call apply-rule-fix or add-rule-exception).
        At the end, respond with a plain text summary (no markdown, no formatting) in this exact structure:
        1. One sentence: how many alerts the rule produced and whether it is noisy.
        2. One sentence: what entity or pattern is causing the false positives.
        3. One sentence: what fix you propose (exception or query change, with the exact field and value).

  - name: approval
    type: waitForInput
    with:
      message: "Analysis for rule {{inputs.rule_id}}: {{ steps.analyze_false_positives.output.message }} -- Set decision to approve or reject below and click Resume."
      schema:
        properties:
          decision:
            type: string
            description: "Choose whether to apply or reject the recommended fix"
            enum:
              - approve
              - reject
            default: approve
          notes:
            type: string
            description: "Optional: add notes, adjustments, or a reason for rejection"
            default: ""
        required:
          - decision

  - name: apply_fix
    type: if
    condition: "steps.approval.output.decision : approve"
    steps:
      - name: execute_fix
        type: ai.agent
        with:
          conversation_id: "{{ steps.analyze_false_positives.output.conversation_id }}"
          message: |
            The human reviewer approved the fix.
            {% if steps.approval.output.notes %}Reviewer notes: {{ steps.approval.output.notes }}{% endif %}
            Now apply the fix you recommended. Follow the skill instructions for Step 5 (Apply the Fix) onwards.
    else:
      - name: log_rejection
        type: console
        with:
          message: "Fix was rejected by reviewer. {% if steps.approval.output.notes %}Reason: {{ steps.approval.output.notes }}{% endif %}"
`,
  },
  {
    id: 'workflow-00000000-0000-5ec0-0000-fa15e00a1e74',
    yaml: `version: "1"
name: "[Prebuilt] [From event] Fix false positive alerts (on alert)"
description: When new alerts are created, analyze the triggering rule for false positives and apply a fix automatically.
enabled: true
tags:
  - prebuilt
triggers:
  - type: security_alerts.created
steps:
  - name: fix_false_positives
    type: ai.agent
    with:
      message: |
        Load fix-false-positive-alerts skill and use {{event.rule_id}} as rule ID. Follow skill instructions
`,
  },
  {
    id: 'workflow-00000000-0000-5ec0-0000-fa15e00a1e75',
    yaml: `version: "1"
name: "[Prebuilt] [From event] Fix false positive alerts (on alert, with approval)"
description: When new alerts are created, analyze the triggering rule for false positives, present findings for human review, and apply the approved fix.
enabled: true
tags:
  - prebuilt
  - human-in-the-loop
triggers:
  - type: security_alerts.created
steps:
  - name: analyze_false_positives
    type: ai.agent
    create-conversation: true
    with:
      message: |
        Load fix-false-positive-alerts skill and use {{event.rule_id}} as rule ID.
        Follow the skill instructions through Step 6 (Verify the Fix) ONLY.
        DO NOT apply any changes (do not call apply-rule-fix or add-rule-exception).
        At the end, respond with a plain text summary (no markdown, no formatting) in this exact structure:
        1. One sentence: how many alerts the rule produced and whether it is noisy.
        2. One sentence: what entity or pattern is causing the false positives.
        3. One sentence: what fix you propose (exception or query change, with the exact field and value).

  - name: approval
    type: waitForInput
    with:
      message: "Analysis for rule {{event.rule_id}} ({{event.rule_name}}, {{event.alerts_count}} alerts): {{ steps.analyze_false_positives.output.message }} -- Set decision to approve or reject below and click Resume."
      schema:
        properties:
          decision:
            type: string
            description: "Choose whether to apply or reject the recommended fix"
            enum:
              - approve
              - reject
            default: approve
          notes:
            type: string
            description: "Optional: add notes, adjustments, or a reason for rejection"
            default: ""
        required:
          - decision

  - name: apply_fix
    type: if
    condition: "steps.approval.output.decision : approve"
    steps:
      - name: execute_fix
        type: ai.agent
        with:
          conversation_id: "{{ steps.analyze_false_positives.output.conversation_id }}"
          message: |
            The human reviewer approved the fix.
            {% if steps.approval.output.notes %}Reviewer notes: {{ steps.approval.output.notes }}{% endif %}
            Now apply the fix you recommended. Follow the skill instructions for Step 5 (Apply the Fix) onwards.
    else:
      - name: log_rejection
        type: console
        with:
          message: "Fix was rejected by reviewer. {% if steps.approval.output.notes %}Reason: {{ steps.approval.output.notes }}{% endif %}"
`,
  },
  {
    id: 'workflow-00000000-0000-5ec0-0000-fa15e00a1e76',
    yaml: `version: "1"
name: "[Prebuilt] [Scheduled] Fix noisiest rule (hourly)"
description: >-
  Runs every hour, finds the noisiest detection rule (100+ alerts in the
  last hour), and runs the false-positive analysis skill against it.
enabled: true
tags:
  - prebuilt
  - scheduled
triggers:
  - type: scheduled
    with:
      every: 1h
steps:
  - name: find_noisy_rule
    type: security.noisyRule
    with:
      timeRange: "now-1h"
      threshold: 100

  - name: check_threshold
    type: if
    condition: "steps.find_noisy_rule.output.found : true"
    steps:
      - name: fix_false_positives
        type: ai.agent
        with:
          message: |
            Rule "{{ steps.find_noisy_rule.output.rule_name }}" ({{ steps.find_noisy_rule.output.alert_count }} alerts in last hour) exceeded the threshold.
            Load fix-false-positive-alerts skill and use {{ steps.find_noisy_rule.output.rule_id }} as rule ID. Follow skill instructions.
    else:
      - name: log_skip
        type: console
        with:
          message: "No rule exceeded the 100-alert threshold (top rule had {{ steps.find_noisy_rule.output.alert_count }} alerts). Skipping."
`,
  },
  {
    id: 'workflow-00000000-0000-5ec0-0000-fa15e00a1e77',
    yaml: `version: "1"
name: "[Prebuilt] [Scheduled] Fix noisiest rule (hourly, with approval)"
description: >-
  Runs every hour, finds the noisiest detection rule (100+ alerts in the
  last hour), analyzes it for false positives, and waits for human approval
  before applying the fix.
enabled: true
tags:
  - prebuilt
  - scheduled
  - human-in-the-loop
triggers:
  - type: scheduled
    with:
      every: 1h
steps:
  - name: find_noisy_rule
    type: security.noisyRule
    with:
      timeRange: "now-1h"
      threshold: 100

  - name: check_threshold
    type: if
    condition: "steps.find_noisy_rule.output.found : true"
    steps:
      - name: analyze_false_positives
        type: ai.agent
        create-conversation: true
        with:
          message: |
            Rule "{{ steps.find_noisy_rule.output.rule_name }}" ({{ steps.find_noisy_rule.output.alert_count }} alerts in last hour) exceeded the threshold.
            Load fix-false-positive-alerts skill and use {{ steps.find_noisy_rule.output.rule_id }} as rule ID.
            Follow the skill instructions through Step 6 (Verify the Fix) ONLY.
            DO NOT apply any changes (do not call apply-rule-fix or add-rule-exception).
            At the end, respond with a plain text summary (no markdown, no formatting) in this exact structure:
            1. One sentence: how many alerts the rule produced and whether it is noisy.
            2. One sentence: what entity or pattern is causing the false positives.
            3. One sentence: what fix you propose (exception or query change, with the exact field and value).

      - name: approval
        type: waitForInput
        with:
          message: "Analysis for rule {{ steps.find_noisy_rule.output.rule_name }} ({{ steps.find_noisy_rule.output.alert_count }} alerts): {{ steps.analyze_false_positives.output.message }} -- Set decision to approve or reject below and click Resume."
          schema:
            properties:
              decision:
                type: string
                description: "Choose whether to apply or reject the recommended fix"
                enum:
                  - approve
                  - reject
                default: approve
              notes:
                type: string
                description: "Optional: add notes, adjustments, or a reason for rejection"
                default: ""
            required:
              - decision

      - name: apply_fix
        type: if
        condition: "steps.approval.output.decision : approve"
        steps:
          - name: execute_fix
            type: ai.agent
            with:
              conversation_id: "{{ steps.analyze_false_positives.output.conversation_id }}"
              message: |
                The human reviewer approved the fix.
                {% if steps.approval.output.notes %}Reviewer notes: {{ steps.approval.output.notes }}{% endif %}
                Now apply the fix you recommended. Follow the skill instructions for Step 5 (Apply the Fix) onwards.
        else:
          - name: log_rejection
            type: console
            with:
              message: "Fix was rejected by reviewer. {% if steps.approval.output.notes %}Reason: {{ steps.approval.output.notes }}{% endif %}"
    else:
      - name: log_skip
        type: console
        with:
          message: "No rule exceeded the 100-alert threshold (top rule had {{ steps.find_noisy_rule.output.alert_count }} alerts). Skipping."
`,
  },
];
