/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  getSearchAlertsByRuleTool,
  getSearchAlertsByHostTool,
  getSearchAlertsByUserTool,
  getCompareRuleFixTool,
  getApplyRuleFixTool,
  getAddRuleExceptionTool,
} from './inline_tools';
import { FALSE_POSITIVE_THRESHOLD } from './inline_tools/common';

export const createFixFalsePositiveAlertsSkill = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
) =>
  defineSkillType({
    id: 'fix-false-positive-alerts',
    name: 'fix-false-positive-alerts',
    basePath: 'skills/security/alerts/rules',
    description:
      'Detect and fix false positive security alerts: search alerts by rule ID, analyze entity patterns, ' +
      'suggest and validate query changes, add rule exceptions, and apply fixes to reduce noise.',
    content: `# Fix False Positive Alerts

## When to Use This Skill

Use this skill when:
- You suspect a detection rule is generating false positive alerts
- You want to check whether a specific rule ID is producing too many alerts
- You need to identify noisy rules that require tuning
- You want to verify that a proposed rule query change actually reduces alert volume
- You need to suppress known-good entities from triggering a rule via exceptions

## CRITICAL: Autonomous Decision-Making

This skill MUST make tuning decisions autonomously. NEVER present a list of options and ask the user to choose.
Analyze the data, pick the best strategy based on the decision tree below, explain your reasoning, and proceed to apply the fix.
Only pause to ask the user if two strategies are genuinely equivalent and there is no data signal to break the tie.

## Workflow

### Step 1: Identify the Problem
Use 'security.fix-false-positive-alerts.search-alerts-by-rule' with the rule ID to check alert volume.
If the tool flags more than ${FALSE_POSITIVE_THRESHOLD} alerts, the rule is likely producing false positives.

### Step 2: Analyze Alert Entities
After identifying a noisy rule, pivot on the alerts to find the root cause:
- Use 'security.fix-false-positive-alerts.search-alerts-by-host' to see which hosts generate the most alerts AND which parent processes spawn them
- Use 'security.fix-false-positive-alerts.search-alerts-by-user' to see which users generate the most alerts AND which parent processes are involved
Both tools return breakdowns by host/user, parent process, and process name.
Focus on the **parentProcessBreakdown** — parent processes reveal WHY alerts are false positives (e.g. a configuration management tool, a CI runner), while hosts/users only reveal WHERE they occur.

### Step 3: Decide on a Tuning Strategy (Autonomous Decision Tree)
Walk through this decision tree top-to-bottom. Use the FIRST branch that matches the data from Steps 1-2. Do NOT present multiple options to the user — pick one and proceed.

**Branch A — Parent process available:**
If parentProcessBreakdown is non-empty and a single parent process accounts for >50% of alerts:
  → Create a rule exception excluding that process.parent.name value.
  Reasoning: parent process is the most specific causal signal and survives host/user changes.

**Branch B — Process name available (no parent process):**
If parentProcessBreakdown is empty but processBreakdown is non-empty and a single process accounts for >50% of alerts:
  → Create a rule exception excluding that process.name value.

**Branch C — User-driven pattern:**
If no process data is available but userBreakdown shows a single user (likely a service account) accounting for >50% of alerts:
  → Create a rule exception excluding that user.name value.

**Branch D — Host-driven pattern (single host dominates):**
If no process or user data is available but hostBreakdown shows a single host accounting for >80% of alerts:
  → Create a rule exception excluding that host.name value.

**Branch E — Source IP / network pattern:**
If alert data is network-centric (no process/user data, but source.ip or destination.ip is consistent across alerts):
  → Create a rule exception excluding that source.ip (or destination.ip) value.
  This is common for Packetbeat / network rules where process context is unavailable.

**Branch F — Broad rule query issue:**
If no single entity dominates (alerts spread across many hosts/users/IPs with no clear outlier):
  → The rule query itself is too broad. Modify the query using compare-rule-fix, then apply-rule-fix.
  Craft a narrower query that excludes the dominant pattern (e.g. add a NOT clause for the most common field values).

After choosing a branch, state which branch you selected and why in a single sentence, then proceed directly to apply the fix.

### Step 4: Identify the Exclusion Target
When building an exception or query modification, use the most specific causal field available. Priority order:
1. **Parent process** (process.parent.name)
2. **Process name** (process.name)
3. **Process arguments** (process.command_line patterns)
4. **User** (user.name) — acceptable for service accounts
5. **Source/destination IP** (source.ip, destination.ip) — for network-only rules
6. **Host** (host.name) — last resort, fragile

### Step 5: Apply the Fix

**For exceptions (Branches A-E):**
Use 'security.fix-false-positive-alerts.add-rule-exception' with the ruleId, a descriptive name, and the entries that match the FP entity.
The tool creates a rule_default exception list (if needed), attaches it to the rule, and creates the exception item.
The result includes \`exceptionListReference.list_id\` — save it for the verification step.

**For query modifications (Branch F):**
Use 'security.fix-false-positive-alerts.compare-rule-fix' with \`suggestedQuery\` to test your suggested query.
The tool runs the detection engine preview TWICE: once with the original rule, once with the modified query.

### Step 6: Verify the Fix with Rule Preview (ALL branches)
After applying ANY fix (exception or query change), ALWAYS run 'security.fix-false-positive-alerts.compare-rule-fix' to verify the fix reduces alerts.

**For exceptions (Branches A-E):**
Call compare-rule-fix with \`excludeExceptionsFromBaseline\` set to the list_id returned by add-rule-exception.
This strips the new exception from the baseline run so you see a true before/after comparison:
- Baseline run: rule WITHOUT the new exception (simulates the old state)
- Modified run: rule WITH the exception (current state)

**For query modifications (Branch F):**
Call compare-rule-fix with \`suggestedQuery\` set to the new query.

### Step 7: Evaluate Comparison Results
The comparison tool reports:
- **Success**: the fix reduced alerts — the exception is confirmed effective (for Branches A-E, done); for Branch F, proceed to apply the query
- **No improvement**: alert count unchanged — the fix is ineffective. Revisit the exclusion target and try a different field or value (up to 3 attempts)
- **Over-tuned**: alerts dropped to zero — the fix may be too aggressive and could miss true positives. Review carefully

### Step 8: Apply the Query Fix (Branch F only)
Only after compare-rule-fix reports **Success** (fewer alerts, not zero), use
'security.fix-false-positive-alerts.apply-rule-fix' with the ruleId and the
validated newQuery to patch the live rule in Kibana.
Do NOT call apply-rule-fix without a prior successful compare-rule-fix result.

## Best Practices
- ALWAYS verify fixes via compare-rule-fix before considering a fix complete
- Check if the alerts share common entities (hosts, users) that can be excluded
- Document any rule query changes or exception additions for audit purposes
- After applying changes, monitor the rule for a few days to confirm the fix holds
- Prefer \`match\` entries over \`wildcard\` in exceptions when exact values are known
- Always scope exceptions to the specific rule — avoid overly broad exception lists
- Tag exception items with a rationale so they can be reviewed later`,
    getInlineTools: () => [
      getSearchAlertsByRuleTool(),
      getSearchAlertsByHostTool(),
      getSearchAlertsByUserTool(),
      getCompareRuleFixTool(core, logger),
      getApplyRuleFixTool(core),
      getAddRuleExceptionTool(core, logger),
    ],
  });
