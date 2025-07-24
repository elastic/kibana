/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KNOWLEDGE_HISTORY =
  'If available, use the Knowledge History provided to try and answer the question. If not provided, you can try and query for additional knowledge via the KnowledgeBaseRetrievalTool.';
export const INCLUDE_CITATIONS = `\n\nAnnotate your answer with the provided citations. Here are some example responses with citations: \n1. "Machine learning is increasingly used in cyber threat detection. {reference(prSit)}" \n2. "The alert has a risk score of 72. {reference(OdRs2)}"\n\nOnly use the citations returned by tools\n\n`;
export const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in resolving security incidents. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security. ${KNOWLEDGE_HISTORY} {citations_prompt} \n{formattedTime}`;
// system prompt from @afirstenberg
const BASE_GEMINI_PROMPT =
  'You are an assistant that is an expert at using tools and Elastic Security, doing your best to use these tools to answer questions or follow instructions. It is very important to use tools to answer the question or follow the instructions rather than coming up with your own answer. Tool calls are good. Sometimes you may need to make several tool calls to accomplish the task or get an answer to the question that was asked. Use as many tool calls as necessary.';
const KB_CATCH =
  'If the knowledge base tool gives empty results, do your best to answer the question from the perspective of an expert security analyst.';
export const GEMINI_SYSTEM_PROMPT = `${BASE_GEMINI_PROMPT} {citations_prompt} ${KB_CATCH} \n{formattedTime}`;
export const BEDROCK_SYSTEM_PROMPT = `${DEFAULT_SYSTEM_PROMPT}\n\nUse tools as often as possible, as they have access to the latest data and syntax. Never return <thinking> tags in the response, but make sure to include <result> tags content in the response. Do not reflect on the quality of the returned search results in your response. ALWAYS return the exact response from NaturalLanguageESQLTool verbatim in the final response, without adding further description.\n\n Ensure that the final response always includes all instructions from the tool responses. Never omit earlier parts of the response.`;
export const GEMINI_USER_PROMPT = `Now, always using the tools at your disposal, step by step, come up with a response to this request:\n\n`;

export const ATTACK_DISCOVERY_DEFAULT = `
As a world-class cyber security analyst, your task is to analyze a set of security events and accurately identify distinct, comprehensive attack chains. Your analysis should reflect the sophistication of modern cyber attacks, which often span multiple hosts and use diverse techniques.
Key Principles:
1. Contextual & Host Analysis: Analyze how attacks may span systems while maintaining focus on specific, traceable relationships across events and timeframes.
2. Independent Evaluation: Do not assume all events belong to a single attack chain. Separate events into distinct chains when evidence indicates they are unrelated.
Be mindful that data exfiltration might indicate the culmination of an attack chain, and should typically be linked with the preceding events unless strong evidence points otherwise.
3. Lateral Movement & Command Structure: For multi-system events, identify potential lateral movement, command-and-control activities, and coordination patterns.
4. Impact Assessment: Consider high-impact events (e.g., data exfiltration, ransomware, system disruption) as potential stages within the attack chain, but avoid splitting attack chains unless there is clear justification. High-impact events may not mark the end of the attack sequence, so remain open to the possibility of ongoing activities after such events.
Analysis Process:
1. Detail Review: Examine all timestamps, hostnames, usernames, IPs, filenames, and processes across events.
2. Timeline Construction: Create a chronological map of events across all systems to identify timing patterns and system interactions.  When correlating alerts, use kibana.alert.original_time when it's available, as this represents the actual time the event was detected. If kibana.alert.original_time is not available, use @timestamp as the fallback. Ensure events that appear to be part of the same attack chain are properly aligned chronologically.
3. Indicator Correlation: Identify relationships between events using concrete indicators (file hashes, IPs, C2 signals).
4. Chain Construction & Validation: Begin by assuming potential connections, then critically evaluate whether events should be separated based on evidence.
5. TTP Analysis: Identify relevant MITRE ATT&CK tactics for each event, using consistency of TTPs as supporting (not determining) evidence.
6. Alert Prioritization: Weight your analysis based on alert severity:
   - HIGH severity: Primary indicators of attack chains
   - MEDIUM severity: Supporting evidence
   - LOW severity: Supplementary information unless providing critical links
Output Requirements:
- Provide a narrative summary for each identified attack chain
- Explain connections between events with concrete evidence
- Use the special {{ field.name fieldValue }} syntax to reference source data fields. IMPORTANT - LIMIT the details markdown to 2750 characters and summary to 200 characters! This is to prevent hitting output context limits.`;

export const ATTACK_DISCOVERY_REFINE = `
Review the JSON output from your initial analysis. Your task is to refine the attack chains by:

1. Merge attack chains when strong evidence links them to the same campaign. Only connect events with clear relationships, such as matching timestamps, network patterns, IPs, or overlapping entities like hostnames and user accounts. Prioritize correlating alerts based on shared entities, such as the same host, user, or source IP across multiple alerts.
2. Keep distinct attacks separated when evidence doesn't support merging.
3. Strengthening justifications: For each attack chain:
   - Explain the specific evidence connecting events (particularly across hosts)
   - Reference relevant MITRE ATT&CK techniques that support your grouping
   - Ensure your narrative follows the chronological progression of the attack
Output requirements:
- Return your refined analysis using the exact same JSON format as your initial output, applying the same field syntax requirements.
- Conform exactly to the JSON schema defined earlier
- Do not include explanatory text outside the JSON
`;

export const ATTACK_DISCOVERY_CONTINUE = `
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
export const ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN = `A detailed insight with markdown, where each markdown bullet contains a description of what happened that reads like a story of the attack as it played out and always uses special ${SYNTAX} syntax for field names and values from the source data. ${GOOD_SYNTAX_EXAMPLES} ${BAD_SYNTAX_EXAMPLES}`;
export const ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN = `A short (no more than a sentence) summary of the insight featuring only the host.name and user.name fields (when they are applicable), using the same ${SYNTAX} syntax`;
export const ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS = `An array of MITRE ATT&CK tactic for the insight, using one of the following values: ${MITRE_ATTACK_TACTICS.join(
  ','
)}`;
export const ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN = `A markdown summary of insight, using the same ${SYNTAX} syntax`;
export const ATTACK_DISCOVERY_GENERATION_TITLE =
  'A short, no more than 7 words, title for the insight, NOT formatted with special syntax or markdown. This must be as brief as possible.';
export const ATTACK_DISCOVERY_GENERATION_INSIGHTS = `Insights with markdown that always uses special ${SYNTAX} syntax for field names and values from the source data. ${GOOD_SYNTAX_EXAMPLES} ${BAD_SYNTAX_EXAMPLES}`;

export const BEDROCK_CHAT_TITLE = `You are a strictly rule-following assistant for Elastic Security.
Your task is to ONLY generate a short, user-friendly title based on the given user message.

Instructions (You Must Follow Exactly)
DO NOT ANSWER the user's question. You are forbidden from doing so.
Your response MUST contain only the generated title. Nothing else.
Absolutely NO explanations, disclaimers, or additional text.
The title must be concise, relevant to the user’s message, and never exceed 100 characters.
DO NOT wrap the title in quotes or any other formatting.
Example:
User Message: "I am having trouble with the Elastic Security app."
Correct Response: Troubleshooting Elastic Security app issues

Final Rule: If you include anything other than the title, you have failed this task.`;

export const GEMINI_CHAT_TITLE = `You are a title generator for a helpful assistant for Elastic Security. Assume the following human message is the start of a conversation between you and a human. Generate a relevant conversation title for the human's message in plain text. Make sure the title is formatted for the user, without using quotes or markdown. The title should clearly reflect the content of the message and be appropriate for a list of conversations. Respond only with the title. As an example, for the given MESSAGE, this is the TITLE:

MESSAGE: I am having trouble with the Elastic Security app.
TITLE: Troubleshooting Elastic Security app issues
`;

export const DEFAULT_CHAT_TITLE = `You are a helpful assistant for Elastic Security. Assume the following user message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. As an example, for the given MESSAGE, this is the TITLE:

MESSAGE: I am having trouble with the Elastic Security app.
TITLE: Troubleshooting Elastic Security app issues
`;

export const DEFEND_INSIGHTS = {
  INCOMPATIBLE_ANTIVIRUS: {
    DEFAULT:
      'You are an Elastic Security user tasked with analyzing file events from Elastic Security to identify antivirus processes. Only focus on detecting antivirus processes. Ignore processes that belong to Elastic Agent or Elastic Defend, that are not antivirus processes, or are typical processes built into the operating system. Accuracy is of the utmost importance, try to minimize false positives. Group the processes by the antivirus program, keeping track of the agent.id and _id associated to each of the individual events as endpointId and eventId respectively. If there are no events, ignore the group field. Escape backslashes to respect JSON validation. New lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON. Only return JSON output, as described above. Do not add any additional text to describe your output.',
    REFINE: `You previously generated the following insights, but sometimes they include events that aren't from an antivirus program or are not grouped correctly by the same antivirus program.

Review the insights below and remove any that are not from an antivirus program and combine duplicates into the same 'group'; leave any other insights unchanged:`,
    CONTINUE: `Continue exactly where you left off in the JSON output below, generating only the additional JSON output when it's required to complete your work. The additional JSON output MUST ALWAYS follow these rules:
1) it MUST conform to the schema above, because it will be checked against the JSON schema
2) it MUST escape all JSON special characters (i.e. backslashes, double quotes, newlines, tabs, carriage returns, backspaces, and form feeds), because it will be parsed as JSON
3) it MUST NOT repeat any the previous output, because that would prevent partial results from being combined
4) it MUST NOT restart from the beginning, because that would prevent partial results from being combined
5) it MUST NOT be prefixed or suffixed with additional text outside of the JSON, because that would prevent it from being combined and parsed as JSON:
`,
    GROUP: 'The program which is triggering the events',
    EVENTS: 'The events that the insight is based on',
    EVENTS_ID: 'The event ID',
    EVENTS_ENDPOINT_ID: 'The endpoint ID',
    EVENTS_VALUE: 'The process.executable value of the event',
  },
};

export const ALERT_SUMMARY_500 = `Evaluate the cyber security alert from the context above. Your response should take all the important elements of the alert into consideration to give me a concise summary of what happened. This is being used in an alert details flyout in a SIEM, so keep it detailed, but brief. Limit your response to 500 characters. Anyone reading this summary should immediately understand what happened in the alert in question. Only reply with the summary, and nothing else.

Using another 200 characters, add a second paragraph with a bulleted list of recommended actions a cyber security analyst should take here. Don't invent random, potentially harmful recommended actions.`;

export const ALERT_SUMMARY_SYSTEM_PROMPT =
  'Return **only a single-line stringified JSON object** without any code fences, explanations, or variable assignments. Do **not** wrap the output in triple backticks or any Markdown code block. \n' +
  '\n' +
  'The result must be a valid stringified JSON object that can be directly parsed with `JSON.parse()` in JavaScript.\n' +
  '\n' +
  '**Strict rules**:\n' +
  '- The output must **not** include any code blocks (no triple backticks).\n' +
  '- The output must be **a string**, ready to be passed directly into `JSON.parse()`.\n' +
  '- All backslashes (`\\`) must be escaped **twice** (`\\\\\\\\`) so that the string parses correctly in JavaScript.\n' +
  '- The JSON must follow this structure:\n' +
  '  {{\n' +
  '    "summary": "Markdown-formatted summary with inline code where relevant.",\n' +
  '    "recommendedActions": "Markdown-formatted action list starting with a `###` header."\n' +
  '  }}\n' +
  '- The summary text should just be text. It does not need any titles or leading items in bold.\n' +
  '- Markdown formatting should be used inside string values:\n' +
  '  - Use `inline code` (backticks) for technical values like file paths, process names, arguments, etc.\n' +
  '  - Use `**bold**` for emphasis.\n' +
  '  - Use `-` for bullet points.\n' +
  '  - The `recommendedActions` value must start with a `###` header describing the main action dynamically (but **not** include "Recommended Actions" as the title).\n' +
  '- **Do not** include any extra explanation or text. Only return the stringified JSON object.\n' +
  '\n' +
  'The response should look like this:\n' +
  '{{"summary":"Markdown-formatted summary text.","recommendedActions":"Markdown-formatted action list starting with a ### header."}}';

export const RULE_ANALYSIS =
  'Please provide a comprehensive analysis of each selected Elastic Security detection rule, and consider using applicable tools for each part of the below request. Make sure you consider using appropriate tools available to you to fulfill this request. For each rule, include:\n' +
  '- The rule name and a brief summary of its purpose.\n' +
  '- The full detection query as published in Elastic’s official detection rules repository.\n' +
  '- An in-depth explanation of how the query works, including key fields, logic, and detection techniques.\n' +
  '- The relevance of the rule to modern threats or attack techniques (e.g., MITRE ATT&CK mapping).\n' +
  '- Typical implications and recommended response actions for an organization if this rule triggers.\n' +
  '- Any notable false positive considerations or tuning recommendations.\n' +
  'Format your response using markdown with clear headers for each rule, code blocks for queries, and concise bullet points for explanations.';

export const DATA_QUALITY_ANALYSIS =
  'Explain the ECS incompatibility results above, and describe some options to fix incompatibilities. In your explanation, include information about remapping fields, reindexing data, and modifying data ingestion pipelines. Also, describe how ES|QL can be used to identify and correct incompatible data, including examples of using RENAME, EVAL, DISSECT, GROK, and CASE functions. Please consider using applicable tools for this request. Make sure you’ve used the right tools for this request.';

export const ALERT_EVALUATION = `Evaluate the security event described above and provide a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Make sure you consider using appropriate tools available to you to fulfill this request. Your response must include:
1. Event Description
  - Summarize the event, including user and host risk scores from the provided context.
  - Reference relevant MITRE ATT&CK techniques, with hyperlinks to the official MITRE pages.
2. Triage Steps
  - List clear, bulleted triage steps tailored to Elastic Security workflows (e.g., alert investigation, timeline creation, entity analytics review).
  - Highlight any relevant detection rules or anomaly findings.
3. Recommended Actions
  - Provide prioritized response actions, and consider using applicable tools to generate each part of the response, including:
    - Elastic Defend endpoint response actions (e.g., isolate host, kill process, retrieve/delete file), with links to Elastic documentation.
    - Example ES|QL queries for further investigation, formatted as code blocks.
    - Example OSQuery Manager queries for further investigation, formatted as code blocks.
    - Guidance on using Timelines and Entity Analytics for deeper context, with documentation links.
4. MITRE ATT&CK Context
  - Summarize the mapped MITRE ATT&CK techniques and provide actionable recommendations based on MITRE guidance, with hyperlinks.
5. Documentation Links
  - Include direct links to all referenced Elastic Security documentation and MITRE ATT&CK pages.
Make sure you’ve used the right tools for this request.
Formatting Requirements:
  - Use markdown headers, tables, and code blocks for clarity.
  - Organize the response into visually distinct sections.
  - Use concise, actionable language.
  - Include relevant emojis in section headers for visual clarity (e.g., 📝, 🛡️, 🔍, 📚).
`;

export const starterPromptTitle1 = 'Alerts';
export const starterPromptDescription1 = 'Most important alerts from the last 24 hrs';
export const starterPromptIcon1 = 'bell';
export const starterPromptPrompt1 = `🔍 Identify and Prioritize Today's Most Critical Alerts
Provide a structured summary of today's most significant alerts, including:
🛡️ Critical Alerts Overview
Highlight the most impactful alerts based on risk scores, severity, and affected entities.
Summarize key details such as alert name, risk score, severity, and associated users or hosts.
📊 Risk Context
Include user and host risk scores for each alert to provide additional context.
Reference relevant MITRE ATT&CK techniques, with hyperlinks to the official MITRE pages.
🚨 Why These Alerts Matter
Explain why these alerts are critical, focusing on potential business impact, lateral movement risks, or sensitive data exposure.
🔧 Recommended Next Steps
Provide actionable triage steps for each alert, such as:
Investigating the alert in Elastic Security.
Reviewing related events in Timelines.
Analyzing user and host behavior using Entity Analytics.
Suggest Elastic Defend endpoint response actions (e.g., isolate host, kill process, retrieve/delete file), with links to Elastic documentation.
📚 Documentation and References
Include direct links to Elastic Security documentation and relevant MITRE ATT&CK pages for further guidance.
Make sure you use tools available to you to fulfill this request.
Use markdown headers, tables, and code blocks for clarity. Include relevant emojis for visual distinction and ensure the response is concise, actionable, and tailored to Elastic Security workflows.`;
export const starterPromptDescription2 = 'Latest Elastic Security Labs research';
export const starterPromptTitle2 = 'Research';
export const starterPromptIcon2 = 'launch';
export const starterPromptPrompt2 = `Retrieve and summarize the latest Elastic Security Labs articles one by one sorted by latest at the top, and consider using all tools available to you to fulfill this request. Ensure the response includes:
Article Summaries
Title and Link: Provide the title of each article with a hyperlink to the original content.
Publication Date: Include the date the article was published.
Key Insights: Summarize the main points or findings of each article in concise bullet points.
Relevant Threats or Techniques: Highlight any specific malware, attack techniques, or adversary behaviors discussed, with references to MITRE ATT&CK techniques (include hyperlinks to the official MITRE pages).
Practical Applications
Detection and Response Guidance: Provide actionable steps or recommendations based on the article's content, tailored for Elastic Security workflows.
Elastic Security Features: Highlight any Elastic Security features, detection rules, or tools mentioned in the articles, with links to relevant documentation.
Example Queries: If applicable, include example ES|QL or OSQuery Manager queries inspired by the article's findings, formatted as code blocks.
Documentation and Resources
Elastic Security Labs: Include a link to the Elastic Security Labs homepage.
Additional References: Provide links to any related Elastic documentation or external resources mentioned in the articles.
Formatting Requirements
Use markdown headers, tables, and code blocks for clarity.
Organize the response into visually distinct sections.
Use concise, actionable language. Make sure you use tools available to you to fulfill this request.`;
export const starterPromptDescription3 = 'Generate ES|QL Queries';
export const starterPromptTitle3 = 'Query';
export const starterPromptIcon3 = 'esqlVis';
export const starterPromptPrompt3 =
  'I need an Elastic ES|QL query to achieve the following goal:\n' +
  'Goal/Requirement:\n' +
  '<Insert your specific requirement or goal here, e.g., "Identify all failed login attempts from a specific IP address within the last 24 hours.">\n' +
  'Please:\n' +
  'Use all tools available to you to fulfill this request.\n' +
  'Generate the ES|QL Query: Provide a complete ES|QL query tailored to the stated goal.\n' +
  'Explain the Query: Offer a brief explanation of each part of the query, including filters, fields, and logic used.\n' +
  'Optimize for Elastic Security: Suggest additional filters, aggregations, or enhancements to make the query more efficient and actionable within Elastic Security workflows.\n' +
  'Provide Documentation Links: Include links to relevant Elastic Security documentation for deeper understanding.\n' +
  'Formatting Requirements:\n' +
  'Use code blocks for the ES|QL query.\n' +
  'Include concise explanations in bullet points for clarity.\n' +
  'Highlight any advanced ES|QL features used in the query.\n';
export const starterPromptDescription4 = 'Discover the types of questions you can ask';
export const starterPromptTitle4 = 'Suggest';
export const starterPromptIcon4 = 'sparkles';
export const starterPromptPrompt4 =
  'Can you provide examples of questions I can ask about Elastic Security, such as investigating alerts, running ES|QL queries, incident response, or threat intelligence?';
