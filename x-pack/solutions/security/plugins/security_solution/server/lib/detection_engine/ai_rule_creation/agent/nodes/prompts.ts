/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Your role is to help in creating Elastic Detection rule's name and description based on user request and ES|QL query that fulfils the detection logic.
    You should create short name of the rule based on what ES|QL query and user request. 
    You should create a brief description of the rule based on what it does.
`,
  ],
  [
    'human',
    `<query>
User request: {user_request}
ES|QL query: {esql_query}
</query>

Analyze the user request and ES|QL query and generate the following fields:

- name: A short and descriptive name for the rule.
- description: A brief description of what the rule detects.

<guidelines>
- Always reply with a JSON object that includes all the fields mentioned above: name, description.
- Use available tools
</guidelines>

<example_response>
U: <query>
User request: Create a rule that detects a suspicious activity based on destination ip address accessed by a host from packetbeat index.
ES|QL query: FROM packetbeat*
| WHERE CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16") == false
| STATS connection_count = COUNT(*) BY host.hostname, destination.ip
| SORT connection_count DESC
| LIMIT 20
</query>
A: Please find matched rule JSON object below:
\`\`\`json
{{
"name":"Suspicious External IP Access Detected",
"description":"Detects hosts accessing destination IP addresses outside of private IP ranges, indicating potential suspicious activity."
}}
\`\`\`
</example_response>`,
  ],
]);

export const TAGS_SELECTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Your role is to analyze user query and ES|QL query for creating Elastic Detection (SIEM) rules and selects relevant tags from available options.

Your task is to:
1. Understand the intent and context of the user's security detection rule request
2. Select the most relevant tags from the provided list that would categorize this rule appropriately
3. Consider security domains, attack techniques, data sources, and threat types

Guidelines:
- Select 3-8 most relevant tags
- Prioritize tags that directly relate to the security use case
- Include data source tags if mentioned (e.g., "windows", "linux", "network")
- Include technique/tactic tags if applicable (e.g., "persistence", "lateral_movement")
- Include severity or priority indicators if relevant
- Avoid generic tags unless specifically relevant

Respond with a JSON object containing only the "relevant_tags" array.`,
  ],
  [
    'human',
    `
    <query>
      User request: {user_request}
      ES|QL query: {esql_query}
      Available tags: {available_tags}
    </query>`,
  ],
]);

export const SCHEDULE_RETRIEVAL_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Your role is to analyze user query and determine the schedule for a detection rule.
Analyze the user's request and determine the appropriate schedule for this detection rule, if user mentions frequency, use that.
Based on user query determine whether user ask  lookback period for data analysis to minimize missed detections.

For example, if you set a rule to run every 5 minutes with an additional look-back time of 1 minute, the rule runs every 5 minutes but analyzes the documents added to indices during the last 6 minutes.
Important: It is recommended to set the Additional look-back time to at least 1 minute. This ensures there are no missing alerts when a rule does not run exactly at its scheduled time.
When requested to do operations over time windows, use those to determine schedule.

INTERVAL Guidelines:
- Use time units of seconds (s), minutes (m), hours (h), or days (d) only
- Format of interval should be a number followed by a unit (e.g., 30s, 5m, 1h, 1d)
- If user does not specify any interval, or frequency, return empty string for interval

LOOKBACK Guidelines:
- Typically 1-2 minutes buffer for data ingestion delays, or at least 10% more for longer intervals(more than 30m)
- Use time units of seconds (s), minutes (m), hours (h), or days (d) only
- Format of interval should be a number followed by a unit (e.g., 30s, 5m, 1h, 1d)

Respond with ONLY a JSON object in this exact format:
{{
  "interval": "5m",
  "lookback": "1m"
}}
Examples:
User query: Run detection query every 10 minutes looking back at data from the last 12 minutes.

Based on the above, provide the schedule in the following JSON format:
{{
  "interval": "10m",
  "lookback": "2m"
}}`,
  ],
  [
    'human',
    `
    <query>
      User request: {user_query}
    </query>`,
  ],
]);

export const SEVERITY_INFERENCE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Your role is to analyze a security detection scenario and determine the appropriate severity level and risk score for an Elastic Detection rule.

Severity Levels and Risk Scores:
- critical (99): Active exploitation of a vulnerability, remote code execution, authentication bypass, or immediate system compromise.
- high (73): Credential access attempts, OAuth phishing, stolen session usage, threat intel indicator matches, or multi-datasource correlation of compromise.
- medium (47): Privilege escalation (UAC bypass), persistence mechanisms, defense evasion (log deletion, sink deletion), ransomware activity, email route hijacking, container escapes, suspicious network traffic, or policy violations requiring investigation.
- low (21): Script obfuscation, reconnaissance, ML anomaly detection, buffer overflow/segfault detection, benign account creation events, or audit events with limited immediate security impact.

EXACT MAPPING RULES — apply these in order:
1. If the request involves credential dumping, credential access, or theft of credentials → severity: high, risk_score: 73
2. If the request involves OAuth phishing, device registration abuse, or stolen sessions → severity: high, risk_score: 73
3. If the request involves threat intel indicator matching or multi-datasource alert correlation → severity: high, risk_score: 73
4. If the request involves active exploitation, RCE, or authentication bypass (CVE exploitation) → severity: critical, risk_score: 99
5. If the request involves UAC bypass, privilege escalation attempts, or container escapes → severity: medium, risk_score: 47
6. If the request involves persistence (plist modification, login hooks, scheduled tasks) → severity: medium, risk_score: 47
7. If the request involves defense evasion (log deletion, sink deletion, DNS config deletion) → severity: medium, risk_score: 47
8. If the request involves ransomware, email route hijacking, or data collection abuse → severity: medium, risk_score: 47
9. If the request involves suspicious network traffic (VNC, C2, unusual ports) → severity: medium, risk_score: 47
10. If the request involves multiple sessions, unusual user behavior, or policy violations → severity: medium, risk_score: 47
11. If the request involves script obfuscation, PowerShell encoding, or payload concealment → severity: low, risk_score: 21
12. If the request involves ML anomaly detection, reconnaissance, or benign audit events → severity: low, risk_score: 21
13. If the request involves account creation (service principals, users) without explicit compromise → severity: low, risk_score: 21
14. If the request involves crash/segfault detection or vulnerability scanning → severity: low, risk_score: 21

Respond with ONLY a JSON object in this exact format:
{{
  "severity": "medium",
  "risk_score": 47
}}`,
  ],
  [
    'human',
    `
    <query>
      User request: {user_request}
      ES|QL query: {esql_query}
    </query>`,
  ],
]);

export const getMitreMappingPrompt = (mitreCatalog: string) =>
  ChatPromptTemplate.fromMessages([
    [
      'system',
      `Your role is to analyze user queries, ES|QL queries, and rule tags for creating Elastic Detection (SIEM) rules and selects relevant MITRE ATT&CK tactics and techniques.

AVAILABLE MITRE ATT&CK TECHNIQUES — select ONLY from this list. Do NOT invent IDs.

${mitreCatalog}

RULES for selection:
1. Pick 1-3 relevant tactics from the TA codes above
2. For each tactic, pick 1-3 techniques that belong to that tactic from the list above
3. Include subtechniques ONLY when they are explicitly listed above
4. Match the detection logic to the most specific technique available
5. NEVER invent technique IDs. If unsure, select the closest parent technique from the list.

Examples:
User query: UAC bypass via Windows Firewall snap-in hijack
ES|QL query: FROM logs-endpoint.events.* | WHERE process.parent.name == "mmc.exe" AND process.parent.args == "WF.msc"
Expected output: {{
  "tactics": ["TA0004", "TA0005"],
  "techniques": [
    {{"id": "T1548", "subtechnique": ["T1548.002"]}},
    {{"id": "T1218"}}
  ]
}}

User query: Detect when PowerShell scripts are obfuscated or encoded using unusual character sets
ES|QL query: FROM logs-endpoint.events.* | WHERE process.name LIKE "powershell*" AND process.command_line RLIKE ".*(FromBase64String|enc|encodedcommand).*"
Expected output: {{
  "tactics": ["TA0005", "TA0002"],
  "techniques": [
    {{"id": "T1027"}},
    {{"id": "T1059", "subtechnique": ["T1059.001"]}},
    {{"id": "T1140"}}
  ]
}}

User query: AWS API call from an unusual user context indicating compromised credentials
ES|QL query: FROM logs-aws.cloudtrail* | WHERE event.action LIKE "*" AND user.name != user.name_history
Expected output: {{
  "tactics": ["TA0004"],
  "techniques": [
    {{"id": "T1078", "subtechnique": ["T1078.004"]}},
    {{"id": "T1550"}}
  ]
}}

User query: Detects suspicious network utilities or reconnaissance commands executed by descendant processes of GenAI coding assistants
ES|QL query: FROM logs-endpoint.events.* | WHERE process.name IN ("nmap", "nc", "ncat", "netcat") AND process.parent.name LIKE "%cursor%"
Expected output: {{
  "tactics": ["TA0002", "TA0011"],
  "techniques": [
    {{"id": "T1059"}},
    {{"id": "T1071"}}
  ]
}}

User query: AWS S3 bucket policy changes made by an unusual identity
ES|QL query: FROM logs-aws.cloudtrail-* | WHERE event.action == "PutBucketPolicy" AND user.name NOT IN (known_admin_users)
Expected output: {{
  "tactics": ["TA0001", "TA0005"],
  "techniques": [
    {{"id": "T1078"}},
    {{"id": "T1562"}}
  ]
}}

User query: Identifies suspicious access to LSASS handle via the MalSecLogon attack technique. This may indicate an attempt to dump credentials.
ES|QL query: FROM logs-endpoint.events.* | WHERE process.name == "lsass.exe" AND event.action == "open_handle"
Expected output: {{
  "tactics": ["TA0006"],
  "techniques": [
    {{"id": "T1003", "subtechnique": ["T1003.001"]}}
  ]
}}

Respond with ONLY a JSON object containing:
- "tactics": array of tactic IDs (strings like "TA0001", "TA0002")
- "techniques": array of objects with "id" field and optional "subtechnique" array

Format:
{{
  "tactics": ["TA0001", "TA0002"],
  "techniques": [
    {{
      "id": "T1078",
      "subtechnique": ["T1078.001"]
    }},
    {{
      "id": "T1059"
    }}
  ]
}}`,
    ],
    [
      'human',
      `
    <query>
      User request: {user_request}
      ES|QL query: {esql_query}
      Rule tags: {rule_tags}
    </query>`,
    ],
  ]);
