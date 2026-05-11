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
import { createRunEmulationCommandTool } from './run_emulation_command_tool';

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
    basePath: 'skills/security/detection-emulation',
    description: `Validate Elastic Security detection rules before deployment by simulating MITRE ATT&CK techniques and measuring alert fidelity. Returns confidence scores and true-positive/false-positive rates through Log Injection (safe synthetic ECS documents) or Real Execution (gated endpoint commands). Helps gate rule promotion with quantified risk metrics and historical regression comparison. Supports multi-EDR execution: Elastic Defend, Sentinel One, CrowdStrike, Microsoft Defender for Endpoint.`,
    content: `# Detection Emulation Skill — Tech Preview

## When to Use This Skill

Use this skill when:
- You need to validate a candidate detection rule before deploying to production
- You want to measure true-positive and false-positive rates for a rule
- You need confidence scores for rule promotion decisions
- You want to test rule effectiveness through MITRE ATT&CK technique emulation
- You need to compare current rule performance against historical baselines

## Modes of Operation

### 1. Log Injection Mode (Default, Tech Preview)
- **Safety**: Writes synthetic ECS documents to a dedicated emulation index
- **Isolation**: Rules must opt-in via their \`index\` array
- **Use Case**: Safe pre-deployment validation without touching production hosts
- **Privileges**: Available to all users with \`emulation:read\` privilege

### 2. Real Execution Mode (Gated, Future Phase)
- **Execution**: Runs commands on Elastic Defend endpoints
- **Guardrails**: Requires \`emulation:execute\` privilege + per-space host allowlist
- **Use Case**: High-fidelity validation on controlled test infrastructure
- **Audit**: All executions logged to \`kibana.security.emulation.action\`

## API Contract

### Primary Tool: validateRule

\`\`\`typescript
validateRule(rule, hosts, options) -> ValidationReport

Parameters:
  rule: Detection rule object with MITRE ATT&CK technique mappings
  hosts: Target host identifiers (agent IDs or host names)
  options: {
    mode?: 'log-injection' | 'real-execution',  // default: 'log-injection'
    timeWindow?: string,                         // default: '15m'
    suppressAlerts?: boolean,                    // default: true for low-severity
    maxPhases?: number,                          // default: 20, max: 50
    rateLimit?: number                           // commands per host per minute, default: 10
  }

Returns: {
  emulationId: string,
  confidence: number,                            // 0-100 score
  truePositiveRate: number,                      // 0-1
  falsePositiveRate: number,                     // 0-1
  phases: Array<{
    name: string,
    technique: string,                           // MITRE ATT&CK technique ID
    status: 'pending' | 'running' | 'completed' | 'failed',
    matchedAlerts: number,
    expectedAlerts: number,
    errors?: string[]
  }>,
  comparisonToBaseline?: {
    previousConfidence: number,
    delta: number,
    regressionDetected: boolean
  },
  alerts: Array<{
    id: string,
    phase: string,
    timestamp: string,
    tags: string[]                               // includes 'kibana.alert.emulation.id'
  }>
}
\`\`\`

### Low-Level Tool: runEmulationCommand

For direct command execution during Real Execution mode, use the \`runEmulationCommand\` tool.
This tool supports multi-EDR execution and is called internally by validateRule, but can also
be used directly for granular control.

\`\`\`typescript
runEmulationCommand(params) -> CommandResult

Parameters: {
  emulationId: string,                           // Unique identifier for the emulation
  agentType: 'endpoint' | 'sentinel_one' | 'crowdstrike' | 'microsoft_defender_endpoint',
  endpointIds: string[],                         // Array of endpoint agent IDs
  command: 'execute' | 'runscript' | 'kill-process' | 'suspend-process' | 'scan' | 'get-file' | 'memory-dump',
  parameters?: Record<string, unknown>           // Command-specific parameters
}

Returns: {
  action_id: string,                             // Response action ID for tracking
  agent_type: string,                            // EDR agent type used
  command: string,                               // Command executed
  status: string,                                // Execution status
  emulation_id: string,
  endpoint_count: number
}
\`\`\`

**Supported EDR Agent Types:**
- \`endpoint\`: Elastic Defend (native Elastic endpoint agent)
- \`sentinel_one\`: SentinelOne EDR
- \`crowdstrike\`: CrowdStrike Falcon
- \`microsoft_defender_endpoint\`: Microsoft Defender for Endpoint

All commands are dispatched through the unified ResponseActionsClient, which handles
EDR-specific translation and connector routing automatically.

## Emulation Process

### 1. Rule Ingestion
Accept a Detection Engine rule + target host set via Agent Builder tool call or programmatic API.

### 2. Scenario Generation
Map the rule's MITRE ATT&CK technique tags to a directed attack graph:
- **Nodes**: Attack phases (e.g., Initial Access, Execution, Persistence)
- **Edges**: Phase dependencies
- **Sources**: Cached templates, ELSER-2 semantic search, LLM-driven graph assembly

### 3. Mode Selection & Validation
- Honor operator's hard-preference (Log Injection vs. Real Execution)
- Enforce privilege checks: \`emulation:execute\` for Real Execution
- Verify host allowlist membership for Real Execution
- Return 403/409 if constraints not met

### 4. Execution
Walk the attack graph:
- **Log Injection**: Write synthetic ECS documents to dedicated index
- **Real Execution**: Dispatch Defend commands to enrolled hosts
- Stream phase progress to caller in real-time

### 5. Telemetry Collection
Poll Detection Engine for alerts matching:
- Rule ID
- Emulation time window
- Tag: \`kibana.alert.emulation.id\`

Capture:
- Alert counts per phase
- Matched phases
- False-positive signals

### 6. Scoring
Compute metrics using weighted formula:
\`\`\`
confidence = (TP_coverage × precision × determinism)
  where:
    TP_coverage = matched_phases / total_phases
    precision = TP_count / (TP_count + FP_count)
    determinism = 1 - variance(repeated_runs)
\`\`\`

### 7. Persistence
Write emulation report to space-scoped history index:
- Scenario details
- Per-phase outcomes
- Confidence scores
- TP/FP rates
- Execution mode
- Versioned mapping for schema evolution

## Security Guardrails

### RBAC Privileges
- **\`emulation:read\`**: View emulation history, run Log Injection
- **\`emulation:execute\`**: Run Real Execution (gated)

### Host Isolation
- Per-space allowlist for Real Execution
- Annual re-enrollment required
- Hosts tagged with \`emulation.enrolled: true\`

### Audit Logging
All emulations logged to:
\`\`\`
kibana.security.emulation.action
  - emulation_id
  - mode
  - rule_id
  - host_ids
  - operator
  - timestamp
  - status
\`\`\`

### Alert Tagging
All generated alerts tagged with:
\`\`\`
kibana.alert.emulation.id: <emulation_id>
kibana.alert.emulation.mode: <log-injection|real-execution>
\`\`\`

Default: Excluded from analyst alert queue (opt-in filter available)

### Data Lifecycle
- **Emulation history**: 90-day ILM policy
- **Synthetic logs**: 7-day ILM policy
- **Real Execution logs**: Follow standard retention

## Operational Guardrails

### Rate Limiting
- Default: 10 commands per host per minute
- Prevents host saturation during Real Execution

### Concurrency Control
- Host-level locking for Real Execution
- One emulation per rule per host at a time

### Resource Limits
- Max 20 phases per emulation (default)
- Max 50 phases (hard ceiling)
- Max 50 hosts per emulation
- Wall-clock budget: 30 min default, 2 h hard ceiling

### Alert Suppression
- Default behavior:
  - **Low/Medium severity**: Suppress (don't create alerts)
  - **High/Critical severity**: Create alerts (for monitoring)
- Operator can override via \`suppressAlerts\` option

## Best Practices

### Pre-Deployment Validation
1. Start with Log Injection mode for initial testing
2. Validate rule syntax and MITRE mappings are correct
3. Review confidence score (aim for ≥ 85% before promotion)
4. Check TP/FP rates against organizational thresholds
5. Compare against historical baseline to detect regressions

### Using Real Execution
1. Only use on dedicated test infrastructure (never production)
2. Verify host allowlist membership before starting
3. Monitor audit logs for unauthorized attempts
4. Review phase-by-phase results to identify rule gaps
5. Re-run after rule adjustments to measure improvement

### Interpreting Results

#### Confidence Score Ranges
- **90-100**: Excellent, ready for production
- **80-89**: Good, minor tuning recommended
- **70-79**: Fair, review false positives
- **Below 70**: Poor, requires significant rule refinement

#### True Positive Rate
- **≥ 90%**: Rule reliably detects attack technique
- **70-89%**: Partial coverage, may miss variants
- **< 70%**: Significant detection gaps

#### False Positive Rate
- **< 5%**: Minimal noise, safe for production
- **5-15%**: Acceptable with proper alert triage
- **> 15%**: High noise, rule needs refinement

### Troubleshooting

#### No Alerts Generated
1. Verify rule is enabled and active
2. Check rule's \`index\` array includes emulation index (Log Injection mode)
3. Confirm Detection Engine is running
4. Review phase execution logs for errors

#### High False Positive Rate
1. Tighten rule query to be more specific
2. Add exception lists for known-good behaviors
3. Review MITRE technique mapping accuracy
4. Consider adding field-level constraints

#### Low Confidence Score
1. Review phase execution failures
2. Verify MITRE ATT&CK technique mappings are complete
3. Check for missing alert generation
4. Compare with historical runs to identify regressions

## Integration with Detection Engineering Skill

The Detection Engineering Skill can call this skill programmatically to:
1. **Gate rule promotion**: Block rules with confidence < threshold
2. **Regression testing**: Compare new rule versions against baselines
3. **Migration validation**: Test imported rules from other SIEMs
4. **Continuous validation**: Periodic rule health checks

Example workflow:
\`\`\`
1. Detection Engineering Skill receives new rule
2. Call validateRule() in Log Injection mode
3. If confidence ≥ 85%: Approve for promotion
4. If confidence < 85%: Return feedback to rule author
5. Store validation results in rule metadata
\`\`\`

## Important Dependencies

- **Detection Engine**: Must be enabled and running
- **MITRE ATT&CK Mappings**: Rules must have valid technique tags
- **Elastic Defend** (Real Execution only): Enrolled hosts required
- **Index Templates**: Emulation indices must have correct mappings

## Roadmap & Feature Flags

### Phase 0 (Foundation)
- Plugin scaffold
- Skill registration
- RBAC privileges
- ✅ Currently in this phase

### Phase 1 (Log Injection — Tech Preview)
- Synthetic ECS document generation
- Scenario template library
- Basic scoring algorithm
- Feature flag: \`detectionEmulation.logInjection\`

### Phase 2 (Real Execution — Self-Managed)
- Defend command dispatch
- Host allowlist enforcement
- Audit logging
- Feature flag: \`detectionEmulation.realExecution\`

### Phase 3 (API Contract Hardening)
- Versioned public API wrappers
- Detection Engineering Skill integration
- Regression comparison
- Feature flag: \`detectionEmulation.apiContract\`

### Phase 4 (Migration Validators)
- Splunk/QRadar/SIGMA rule import
- Multi-SIEM emulation comparison
- Feature flag: \`detectionEmulation.migrationValidators\`

## Legal & Compliance

### Tech Preview Requirements
- EULA addendum (drafted by Legal before external release)
- Real Execution disabled on Elastic Cloud Serverless (pending Legal sign-off)
- Operator acknowledgment of test/non-production use

### Audit Requirements
- All Real Execution emulations logged
- Per-space host enrollment audit trail
- Annual re-enrollment notifications

## Example Usage

### Basic Log Injection
\`\`\`
User: "Validate this ransomware detection rule on my test hosts"

Agent Builder:
1. Calls validateRule() with rule + host list
2. Mode: log-injection (default)
3. Streams progress: "Executing phase 1/5: Initial Access (T1566)"
4. Returns confidence: 92%, TP: 95%, FP: 3%
5. Recommendation: "High confidence, ready for production"
\`\`\`

### Real Execution (Gated)
\`\`\`
User: "Run real execution emulation on emulation-host-1"

Agent Builder:
1. Checks user has 'emulation:execute' privilege
2. Verifies host is on allowlist
3. Calls validateRule() with mode: real-execution
4. Dispatches commands to Elastic Defend
5. Returns detailed phase-by-phase results
6. Logs audit event with host, user, timestamp
\`\`\`

### Regression Detection
\`\`\`
User: "Has this rule's performance degraded since last month?"

Agent Builder:
1. Calls validateRule() with current rule version
2. Fetches historical baseline from emulation history
3. Compares confidence scores (90% -> 75%)
4. Returns: "Regression detected: -15% confidence drop"
5. Suggests: "Review recent rule changes for false positive increase"
\`\`\`

## Response Format

When presenting results to users:

### Confidence Score Table
| Metric | Value | Status |
|--------|-------|--------|
| Confidence | 92% | ✅ Excellent |
| True Positive Rate | 95% | ✅ High Coverage |
| False Positive Rate | 3% | ✅ Low Noise |
| Phases Completed | 5/5 | ✅ All Passed |

### Phase Breakdown
\`\`\`
Phase 1: Initial Access (T1566 - Phishing)
  Status: ✅ Completed
  Alerts: 2/2 expected

Phase 2: Execution (T1059 - Command Interpreter)
  Status: ✅ Completed
  Alerts: 1/1 expected

[... remaining phases ...]
\`\`\`

### Recommendations
- ✅ Rule ready for production deployment
- 📊 Confidence score meets 85% threshold
- 🔄 Baseline comparison: +2% improvement vs. last run
- 📝 Next steps: Enable rule in Production space

---

## Notes for Agent Builder

- Always default to Log Injection mode unless user explicitly requests Real Execution
- Check user privileges before attempting Real Execution
- Stream progress updates during emulation (don't wait for completion)
- Present confidence score prominently in results
- Compare against baseline when available
- Tag results with emulation ID for traceability
`,
    getInlineTools: () => [createRunEmulationCommandTool(ctx)],
  });
