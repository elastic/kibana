/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/security-ai-prompts';

/**
 * Attack Discovery prompts copied from elastic_assistant for independence.
 * These provide default values that can be overridden by user customizations
 * stored in saved objects.
 */

const SYNTAX = '{{ field.name fieldValue1 fieldValue2 fieldValueN }}';
const GOOD_SYNTAX_EXAMPLES =
  'Examples of CORRECT syntax (includes field names and values): {{ host.name hostNameValue }} {{ user.name userNameValue }} {{ source.ip sourceIpValue }}';

const BAD_SYNTAX_EXAMPLES =
  'Examples of INCORRECT syntax (bad, because the field names are not included): {{ hostNameValue }} {{ userNameValue }} {{ sourceIpValue }}';

const RECONNAISSANCE = 'Reconnaissance';
const RESOURCE_DEVELOPMENT = 'Resource Development';
const INITIAL_ACCESS = 'Initial Access';
const EXECUTION = 'Execution';
const PERSISTENCE = 'Persistence';
const PRIVILEGE_ESCALATION = 'Privilege Escalation';
const DEFENSE_EVASION = 'Defense Evasion';
const CREDENTIAL_ACCESS = 'Credential Access';
const DISCOVERY = 'Discovery';
const LATERAL_MOVEMENT = 'Lateral Movement';
const COLLECTION = 'Collection';
const COMMAND_AND_CONTROL = 'Command and Control';
const EXFILTRATION = 'Exfiltration';
const IMPACT = 'Impact';

const MITRE_ATTACK_TACTICS = [
  RECONNAISSANCE,
  RESOURCE_DEVELOPMENT,
  INITIAL_ACCESS,
  EXECUTION,
  PERSISTENCE,
  PRIVILEGE_ESCALATION,
  DEFENSE_EVASION,
  CREDENTIAL_ACCESS,
  DISCOVERY,
  LATERAL_MOVEMENT,
  COLLECTION,
  COMMAND_AND_CONTROL,
  EXFILTRATION,
  IMPACT,
] as const;

const ATTACK_DISCOVERY_DEFAULT = `
As a world-class cyber security analyst, your task is to analyze a set of security events and accurately identify distinct, comprehensive attack chains. Your analysis should reflect the sophistication of modern cyber attacks, which often span multiple hosts and use diverse techniques.
Key Principles:
1. "Attack Chain" Definition: For this task, we define an "Attack Chain" as 2 or more alerts that demonstrate a progression of a real or simulated (red team) adversary. Attack chains must consist of alerts from more than one rule. A single alert, or multiple alerts of the same rule or behavior, should never generate an attack chain.
2. False Positives: Most alerts are false positives, even if they look alarming or anomalous at first glance. Exclude alerts or attacks that are likely false positives. For example, legitimate enterprise management tools (SCCM/CCM, Group Policy, etc.) often trigger security alerts during normal operations. Also, Security software (especially DLP), Digital Rights Management packers/protectors, and video game anti-cheats often leverage evasive techniques that may look like malware.
3. Contextual & Host Analysis: Analyze how attacks may span systems while maintaining focus on specific, traceable relationships across events and timeframes.
4. Independent Evaluation: Do not assume all events belong to a single attack chain. Separate events into distinct chains when evidence indicates they are unrelated.
Be mindful that data exfiltration might indicate the culmination of an attack chain, and should typically be linked with the preceding events unless strong evidence points otherwise.
5. Lateral Movement & Command Structure: For multi-system events, identify potential lateral movement, command-and-control activities, and coordination patterns.
6. Impact Assessment: Consider high-impact events (e.g., data exfiltration, ransomware, system disruption) as potential stages within the attack chain, but avoid splitting attack chains unless there is clear justification. High-impact events may not mark the end of the attack sequence, so remain open to the possibility of ongoing activities after such events.
Analysis Process:
1. Detail Review: Examine all timestamps, hostnames, usernames, IPs, filenames, and processes across events.
2. Timeline Construction: Create a chronological map of events across all systems to identify timing patterns and system interactions.  When correlating alerts, use kibana.alert.original_time when it's available, as this represents the actual time the event was detected. If kibana.alert.original_time is not available, use @timestamp as the fallback. Ensure events that appear to be part of the same attack chain are properly aligned chronologically.
3. Indicator Correlation: Identify relationships between events using concrete indicators (file hashes, IPs, C2 signals, process trees). Do not group alerts solely because they occur on the same host in a short timeframe. They must demonstrate a direct correlation. For example, a malware alert triggers on one process, then a child of this process accesses credentials.
4. Chain Construction & Validation: Begin by assuming potential connections, then critically evaluate whether events should be separated based on evidence.
5. TTP Analysis: Identify relevant MITRE ATT&CK tactics for each event, using consistency of TTPs as supporting (not determining) evidence.
6. Alert Prioritization: Weight your analysis based on alert severity:
   - HIGH severity: Primary indicators of attack chains
   - MEDIUM severity: Supporting evidence
   - LOW severity: Supplementary information unless providing critical links

Output Requirements:
- Think through the problem step by step. Show your reasoning before the json output section. This is the only output that is allowed outside of the defined json schema.
- Provide a narrative summary for each identified attack chain
- Explain connections between events with concrete evidence
- Use the special {{ field.name fieldValue }} syntax to reference source data fields. IMPORTANT - LIMIT the details markdown to 2750 characters and summary to 200 characters! This is to prevent hitting output context limits.`;

const ATTACK_DISCOVERY_REFINE = `
Review the JSON output from your initial analysis. Your task is to refine the attack chains by:

1. Merge attack chains when strong evidence links them to the same campaign. Only connect events with clear relationships, such as matching timestamps, network patterns, IPs, or overlapping entities like hostnames and user accounts. Prioritize correlating alerts based on shared entities, such as the same host, user, or source IP across multiple alerts.
2. Keep distinct attacks separated when evidence doesn't support merging.
3. Strengthening justifications: For each attack chain:
   - Explain the specific evidence connecting events (particularly across hosts)
   - Reference relevant MITRE ATT&CK techniques that support your grouping
   - Ensure your narrative follows the chronological progression of the attack
4. Remove Attack Chains that are likely false positives. Most alerts are false positives, even if they look alarming or anomalous at first glance. Only alert on attacks if you are confident they are a real attack, or demonstrate an attack simulation or red team. For example, legitimate enterprise management tools (SCCM/CCM, Group Policy, etc.) often trigger security alerts during normal operations. Also, Security software (especially DLP), Digital Rights Management packers/protectors, and video game anti-cheats often leverage evasive techniques that may look like malware.
5. Remove low quality Attack Chains. Attack Chains must demonstrate an attacker progression. Attacks must consist of alerts from more than one rule. A single alert, or multiple alerts of the same rule or behavior, should never generate an attack chain. Include rule names in your reasoning to ensure you follow this requirement.

Output requirements:
- Think through the problem step by step. Show your reasoning before the JSON output section.
- Return your refined analysis using the exact same JSON format as your initial output, applying the same field syntax requirements.
- Conform exactly to the JSON schema defined earlier
`;

const ATTACK_DISCOVERY_CONTINUE = `
Continue your JSON analysis from exactly where you left off. Generate only the additional content needed to complete the response.

FORMAT REQUIREMENTS:
1. Maintain strict JSON validity:
   - Use double quotes for all strings
   - Properly escape special characters (\" for quotes, \\ for backslashes, \n for newlines)
   - Avoid all control characters (ASCII 0-31)
   - Keep text fields under 500 characters

2. Output rules:
   - Do not repeat any previously generated content
   - Do not include explanatory text outside the JSON
   - Do not restart from the beginning
   - Conform exactly to the JSON schema defined earlier

Your continuation should seamlessly connect with the previous output to form a complete, valid JSON document.
`;

const ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN = `A detailed insight with markdown, where each markdown bullet contains a description of what happened that reads like a story of the attack as it played out and always uses special ${SYNTAX} syntax for field names and values from the source data. ${GOOD_SYNTAX_EXAMPLES} ${BAD_SYNTAX_EXAMPLES}`;

const ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN = `A short (no more than a sentence) summary of the insight featuring only the host.name and user.name fields (when they are applicable), using the same ${SYNTAX} syntax`;

const ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS = `An array of MITRE ATT&CK tactic for the insight, using one of the following values: ${MITRE_ATTACK_TACTICS.join(
  ','
)}`;

const ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN = `A markdown summary of insight, using the same ${SYNTAX} syntax`;

const ATTACK_DISCOVERY_GENERATION_TITLE =
  'A short, no more than 7 words, title for the insight, NOT formatted with special syntax or markdown. This must be as brief as possible.';

const ATTACK_DISCOVERY_GENERATION_INSIGHTS = `Insights with markdown that always uses special ${SYNTAX} syntax for field names and values from the source data. ${GOOD_SYNTAX_EXAMPLES} ${BAD_SYNTAX_EXAMPLES}`;

export const promptGroupId = {
  attackDiscovery: 'attackDiscovery',
} as const;

export const promptDictionary = {
  attackDiscoveryContinue: `continue`,
  attackDiscoveryDefault: `default`,
  attackDiscoveryDetailsMarkdown: `detailsMarkdown`,
  attackDiscoveryEntitySummaryMarkdown: `entitySummaryMarkdown`,
  attackDiscoveryGenerationInsights: `generationInsights`,
  attackDiscoveryGenerationTitle: `generationTitle`,
  attackDiscoveryMitreAttackTactics: `mitreAttackTactics`,
  attackDiscoveryRefine: `refine`,
  attackDiscoverySummaryMarkdown: `summaryMarkdown`,
} as const;

export const attackDiscoveryPrompts: Prompt[] = [
  {
    prompt: {
      default: ATTACK_DISCOVERY_DEFAULT,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryDefault,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_REFINE,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryRefine,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_CONTINUE,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryContinue,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryDetailsMarkdown,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryEntitySummaryMarkdown,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryMitreAttackTactics,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoverySummaryMarkdown,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_TITLE,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryGenerationTitle,
  },
  {
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_INSIGHTS,
    },
    promptGroupId: promptGroupId.attackDiscovery,
    promptId: promptDictionary.attackDiscoveryGenerationInsights,
  },
];
