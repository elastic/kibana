/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const getMitreCoverageSkill = () =>
  defineSkillType({
    id: 'mitre-coverage',
    name: 'mitre-coverage',
    basePath: 'skills/security/alerts/rules',
    description:
      'Guide to analyzing MITRE ATT&CK detection coverage: map active detection rules to MITRE techniques, identify coverage gaps, prioritize uncovered techniques by severity, and recommend new detection rules.',
    content: `# MITRE ATT&CK Coverage Analysis Guide

## When to Use This Skill

Use this skill when:
- A user asks for a MITRE ATT&CK coverage assessment or gap analysis
- A user wants to understand which MITRE techniques are covered by their current detection rules
- A user asks which MITRE techniques they lack detection coverage for
- A user wants to prioritize new detection rule development based on coverage gaps
- A user needs a coverage matrix for compliance reporting or security posture review
- A user wants to map specific detection rules to MITRE ATT&CK tactics and techniques

## Related Skills

After using this skill, you may want to use:
- '~/skills/security/alerts/alert-triage' to triage alerts from newly created detection rules
- '~/skills/security/alerts/incident-reporting' to include MITRE coverage data in compliance reports

## MITRE ATT&CK Framework Reference

### Tactics (in kill chain order)
1. **Reconnaissance** (TA0043): Gathering information for planning future operations
2. **Resource Development** (TA0042): Establishing resources for operations
3. **Initial Access** (TA0001): Getting into the network
4. **Execution** (TA0002): Running malicious code
5. **Persistence** (TA0003): Maintaining foothold
6. **Privilege Escalation** (TA0004): Gaining higher-level permissions
7. **Defense Evasion** (TA0005): Avoiding detection
8. **Credential Access** (TA0006): Stealing credentials
9. **Discovery** (TA0007): Learning about the environment
10. **Lateral Movement** (TA0008): Moving through the environment
11. **Collection** (TA0009): Gathering data of interest
12. **Command and Control** (TA0011): Communicating with compromised systems
13. **Exfiltration** (TA0010): Stealing data
14. **Impact** (TA0040): Manipulating, interrupting, or destroying systems

## Coverage Analysis Process

### Step 1: Inventory Active Detection Rules
- Query the detection rules index to retrieve all active (enabled) detection rules
- Use ES|QL to query the detection rules:
  \`\`\`
  FROM .kibana_alerting_cases* METADATA _id
  | WHERE alert.alertTypeId == "siem.signals" OR alert.alertTypeId == "siem.queryRule"
  | WHERE alert.enabled == true
  | KEEP _id, alert.name, alert.params.threat
  \`\`\`
- Extract MITRE ATT&CK metadata from each rule:
  - Tactic IDs and names (e.g., TA0001 - Initial Access)
  - Technique IDs and names (e.g., T1566 - Phishing)
  - Sub-technique IDs and names (e.g., T1566.001 - Spearphishing Attachment)
- Count the total number of active rules and rules with MITRE mappings

### Step 2: Build Coverage Matrix
- Create a mapping of all MITRE techniques referenced by active rules:
  - Group rules by tactic to show coverage distribution across the kill chain
  - Group rules by technique to show depth of coverage per technique
  - Identify techniques with multiple detection rules (defense in depth)
  - Identify techniques with only a single detection rule (single point of failure)
- Calculate coverage metrics:
  - **Tactic coverage**: percentage of tactics with at least one detection rule
  - **Technique coverage**: percentage of known techniques with at least one detection rule
  - **Average rules per technique**: mean number of rules per covered technique
  - **Coverage depth score**: weighted score based on rules per technique (1 rule = shallow, 2-3 = moderate, 4+ = deep)

### Step 3: Identify Coverage Gaps
- Compare active rule MITRE mappings against the full MITRE ATT&CK framework:
  - List all tactics with zero coverage
  - List all techniques with zero coverage, grouped by tactic
  - Identify sub-techniques that are uncovered even when parent technique has coverage
- Classify gaps by criticality:
  - **Critical gaps**: no coverage for high-impact techniques commonly used in real-world attacks
  - **High gaps**: no coverage for techniques frequently observed in the organization's threat landscape
  - **Medium gaps**: limited coverage for techniques with moderate prevalence
  - **Low gaps**: no coverage for techniques that are rarely observed or have limited applicability

### Step 4: Gap Prioritization
- Prioritize uncovered techniques using a weighted scoring model:

#### Severity Weighting Factors
| Factor | Weight | Description |
| --- | --- | --- |
| Prevalence in real attacks | 30% | How commonly the technique is used in observed attacks |
| Industry relevance | 25% | Relevance to the organization's industry vertical |
| Data source availability | 20% | Whether the required data sources are already being collected |
| Detection feasibility | 15% | How practical it is to build a reliable detection rule |
| Existing compensating controls | 10% | Whether other security controls mitigate the technique |

#### Priority Scoring
- **Priority 1 (Critical)**: Score >= 0.80 - Immediate action required, high-risk gap
- **Priority 2 (High)**: Score 0.60 - 0.79 - Address in next rule development sprint
- **Priority 3 (Medium)**: Score 0.40 - 0.59 - Plan for upcoming quarters
- **Priority 4 (Low)**: Score < 0.40 - Monitor and address as resources allow

### Step 5: Detection Rule Recommendations
- For each prioritized gap, recommend detection rule approaches:
  - **Rule type**: query rule, threshold rule, EQL correlation, ML-based detection
  - **Data source requirements**: which indices and fields are needed
  - **Detection logic outline**: high-level description of what the rule should detect
  - **Expected false positive rate**: estimated noise level based on the technique
  - **Complexity estimate**: low, medium, high implementation effort
- Group recommendations by tactic for organized implementation planning
- Suggest rule templates or Elastic prebuilt rules that can be enabled to close gaps quickly

## Output Format

### Coverage Summary

**Overview**
- Total active detection rules: <count>
- Rules with MITRE mappings: <count> (<percentage>%)
- Tactics covered: <count>/14 (<percentage>%)
- Techniques covered: <count>/<total_known> (<percentage>%)

**Coverage by Tactic**
| Tactic | ID | Rules | Techniques Covered | Coverage |
| --- | --- | --- | --- | --- |
| Initial Access | TA0001 | <count> | <covered>/<total> | <percentage>% |
| Execution | TA0002 | <count> | <covered>/<total> | <percentage>% |
| ... | ... | ... | ... | ... |

**Top Coverage Gaps (Priority 1 & 2)**
| Technique | ID | Tactic | Priority | Score | Recommendation |
| --- | --- | --- | --- | --- | --- |
| <technique_name> | <technique_id> | <tactic_name> | <priority> | <score> | <brief_recommendation> |

**Recommendations Summary**
1. <recommendation_1>: Enable prebuilt rule "<rule_name>" to cover <technique>
2. <recommendation_2>: Create custom rule for <technique> using <data_source>
3. <recommendation_3>: Deploy ML job for anomaly-based detection of <technique>

## Examples

### Example 1: Full Coverage Audit

User query: What is our MITRE ATT&CK coverage?

Steps:
1. Use 'platform.core.execute_esql' to query all active detection rules with their MITRE ATT&CK tags.
2. Parse the MITRE tactic and technique IDs from each rule's threat metadata.
3. Build a coverage matrix mapping rules to the MITRE ATT&CK framework.
4. Calculate coverage percentages by tactic and overall.
5. Identify the top gaps by tactic and technique.
6. Prioritize gaps using the weighted scoring model.
7. Present the coverage summary table and top recommendations.

### Example 2: Tactic-Specific Gap Analysis

User query: Do we have coverage for lateral movement techniques?

Steps:
1. Use 'platform.core.execute_esql' to query active rules mapped to tactic TA0008 (Lateral Movement).
2. List all covered lateral movement techniques with their detection rules.
3. Compare against the full list of lateral movement techniques in the MITRE framework.
4. Identify uncovered techniques (e.g., T1021 Remote Services, T1570 Lateral Tool Transfer).
5. Assess data source availability for the uncovered techniques.
6. Recommend specific detection rules to close the gaps.

### Example 3: Rule-to-Technique Mapping

User query: Which MITRE techniques does our rule "Suspicious PowerShell Execution" cover?

Steps:
1. Use 'platform.core.search' to find the specific detection rule by name.
2. Extract the MITRE ATT&CK mappings from the rule's threat metadata.
3. List all tactics, techniques, and sub-techniques the rule is mapped to.
4. Assess whether the rule's detection logic adequately covers the mapped techniques.
5. Recommend additional rules if the mapping reveals techniques that need deeper coverage.

### Example 4: Data-Source-Aware Gap Prioritization

User query: Given our current data sources, which MITRE gaps should we prioritize?

Steps:
1. Use 'platform.core.execute_esql' to inventory active detection rules and their MITRE mappings.
2. Use 'platform.core.execute_esql' to query available data sources (index patterns with recent data).
3. Cross-reference uncovered MITRE techniques with available data sources.
4. Boost priority for techniques where required data is already being collected.
5. Lower priority for techniques where data source deployment would be required.
6. Present a data-source-aware prioritized gap list with actionable recommendations.

## Best Practices
- Always distinguish between "no detection rule" and "no data source" when reporting gaps
- Consider that a single rule may cover multiple techniques, and a technique may need multiple rules
- Prebuilt Elastic rules should be checked first before recommending custom rule development
- Include both the technique ID and name in all outputs for clarity
- When recommending new rules, estimate the expected false positive rate
- Track coverage metrics over time to show improvement trends
- Consider the organization's specific threat landscape when prioritizing gaps
- Do not equate coverage with effectiveness; a rule may exist but perform poorly
- Recommend periodic coverage audits (quarterly) to account for new MITRE techniques and rule changes
- Always note when coverage data may be incomplete due to rules without MITRE mappings
`,
    getRegistryTools: () => [
      'platform.core.search',
      'platform.core.execute_esql',
    ],
  });
