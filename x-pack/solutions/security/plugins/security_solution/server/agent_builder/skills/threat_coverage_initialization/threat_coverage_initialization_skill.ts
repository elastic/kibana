/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SECURITY_FIND_PREBUILT_RULES_TOOL_ID,
  SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID,
} from '../../tools';

const FLEET_LIST_INSTALLED_INTEGRATIONS_TOOL_ID = 'fleet.list_installed_integrations';

export const threatCoverageInitializationSkill = defineSkillType({
  id: 'threat-coverage-initialization',
  name: 'threat-coverage-initialization',
  basePath: 'skills/security',
  description:
    'Closed-loop security posture automation that initializes threat detection coverage. ' +
    'Assesses available security log data and installed integrations, maps data sources to MITRE ATT&CK ' +
    'tactics and techniques, identifies coverage gaps, finds matching prebuilt detection rules, and installs them. ' +
    'Use when a user wants to bootstrap detection coverage, assess their security posture, or close detection gaps.',
  content: `# Threat Coverage Initialization Guide

## When to Use This Skill

Use this skill when:
- Setting up initial detection coverage for a new or existing deployment
- Assessing what security data sources are available and what detection rules should be enabled
- Closing detection gaps by mapping available data to MITRE ATT&CK coverage
- Bootstrapping security posture after installing new integrations
- Answering questions like "What detection rules should I enable?" or "What threats am I not covered for?"

## Threat Coverage Initialization Process

This is a closed-loop process: assess data → map to MITRE ATT&CK → identify gaps → find rules → install rules.

### Step 1: Assess Available Security Data

First, determine what security telemetry is available in the environment.

#### 1a. Discover Log Indices
- Use 'platform.core.list_indices' with pattern \`logs-*\` to discover available security log indices
- Look for key security data sources:
  - \`logs-endpoint.events.*\` — Elastic Endpoint (process, network, file, registry events)
  - \`logs-windows.*\` or \`winlogbeat-*\` — Windows event logs (Sysmon, Security, PowerShell)
  - \`logs-system.*\` — System logs (auth, syslog)
  - \`logs-azure.*\`, \`logs-aws.*\`, \`logs-gcp.*\` — Cloud provider logs
  - \`logs-o365.*\` — Microsoft 365 audit logs
  - \`logs-okta.*\` — Okta identity logs
  - \`logs-network_traffic.*\` or \`packetbeat-*\` — Network traffic
  - \`logs-firewall.*\`, \`logs-cisco.*\`, \`logs-paloalto.*\` — Firewall logs
  - \`filebeat-*\` — General log collection
- Note which index patterns exist and have data — these determine what detection rules can run

#### 1b. Check Installed Integrations
- Use 'fleet.list_installed_integrations' to list all installed Fleet integrations
- Filter by \`dataStreamType: "logs"\` to focus on log-producing integrations
- Each integration maps to specific data sources and MITRE ATT&CK coverage areas
- Key integration-to-coverage mappings:
  - **endpoint** → Process, network, file monitoring (broad MITRE coverage)
  - **windows** → Windows event logs (Persistence, Privilege Escalation, Credential Access)
  - **system** → Authentication events (Initial Access, Credential Access)
  - **aws/azure/gcp** → Cloud infrastructure (Initial Access, Persistence, Defense Evasion in cloud)
  - **o365** → Email/collaboration (Initial Access via phishing, Collection)
  - **okta** → Identity provider (Initial Access, Persistence, Credential Access)
  - **network_traffic** → Network monitoring (Command and Control, Lateral Movement, Exfiltration)

### Step 2: Map Data to MITRE ATT&CK Tactics

Based on the discovered data sources, determine which MITRE ATT&CK tactics can be covered:

| Data Source | Primary MITRE Tactics |
|---|---|
| Endpoint process events | Execution, Persistence, Privilege Escalation, Defense Evasion, Discovery |
| Endpoint network events | Command and Control, Lateral Movement, Exfiltration |
| Endpoint file events | Persistence, Defense Evasion, Collection |
| Windows Security logs | Initial Access, Credential Access, Lateral Movement |
| Windows Sysmon | Execution, Persistence, Defense Evasion, Discovery |
| Windows PowerShell | Execution, Defense Evasion |
| System auth logs | Initial Access, Credential Access, Persistence |
| Cloud provider logs | Initial Access, Persistence, Privilege Escalation, Defense Evasion (cloud) |
| Identity provider logs | Initial Access, Credential Access, Persistence |
| Network traffic | Command and Control, Lateral Movement, Exfiltration |
| Email/O365 logs | Initial Access (phishing), Collection |
| Firewall logs | Command and Control, Exfiltration, Initial Access |

### Step 3: Find Matching Prebuilt Rules

For each MITRE ATT&CK tactic that the available data can support, search for prebuilt rules:

- Use 'security.find_prebuilt_rules' with the \`mitre_tactic\` parameter to find rules for each covered tactic
- Cross-reference rule \`related_integrations\` with the installed integrations from Step 1b
- Prioritize rules that:
  1. Match installed integrations (the data source exists)
  2. Cover high-impact tactics (Initial Access, Execution, Persistence, Credential Access)
  3. Have higher severity (critical and high first)
- Use \`mitre_technique_id\` for more targeted searches when specific technique coverage is needed
- Use \`tags\` to filter by OS platform (e.g., "Windows", "Linux", "macOS") matching the environment
- Request up to 50 rules per query using the \`limit\` parameter to get comprehensive results

### Step 4: Present Coverage Plan

Before installing rules, present the user with a coverage plan:
- Group recommended rules by MITRE ATT&CK tactic
- Show rule name, severity, and the data source it requires
- Highlight any coverage gaps where data exists but no rules were found
- Highlight tactics where no data sources are available (true blind spots)
- Let the user review and approve the selection before proceeding

### Step 5: Install Selected Rules

- Use 'security.install_prebuilt_rules' to install the approved rules
- Install in batches grouped by tactic or severity (max 50 rules per call)
- Report results: successfully installed, already installed (skipped), and any failures
- After installation, summarize the new coverage:
  - Total rules installed by tactic
  - Remaining coverage gaps
  - Recommendations for additional data sources to close blind spots

## Coverage Assessment Template

When presenting results, use this structure:

### Data Sources Available
- List discovered indices and installed integrations

### MITRE ATT&CK Coverage Map
- For each tactic: data source → available rules → recommended rules

### Recommendations
- **Install now**: Rules that match existing data (high confidence)
- **Install after data onboarding**: Rules that need additional integrations
- **Blind spots**: Tactics with no data source coverage

## Best Practices
- Always assess data sources before searching for rules — rules without matching data generate false negatives or fail to run
- Prioritize breadth of tactic coverage over depth within a single tactic during initial setup
- Start with high and critical severity rules, then expand to medium and low
- Cross-reference rule \`related_integrations\` with installed integrations to ensure rules will have data
- Present the coverage plan to the user before installing — let them make informed decisions
- After installation, recommend a review cycle to tune rules and reduce false positives
- Suggest additional integrations to close identified blind spots`,
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    FLEET_LIST_INSTALLED_INTEGRATIONS_TOOL_ID,
    SECURITY_FIND_PREBUILT_RULES_TOOL_ID,
    SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID,
  ],
});
