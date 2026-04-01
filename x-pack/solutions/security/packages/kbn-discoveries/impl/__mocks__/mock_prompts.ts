/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock prompts for testing - these are simplified versions of the actual prompts

export const ATTACK_DISCOVERY_DEFAULT = `You are a security analyst. Analyze the alerts below and identify attack discoveries.`;

export const ATTACK_DISCOVERY_REFINE = `Review the attack discoveries below and refine them.`;

export const ATTACK_DISCOVERY_CONTINUE = `Continue your JSON analysis from exactly where you left off. Generate only the additional content needed to complete the response.

FORMAT REQUIREMENTS:
1. Maintain strict JSON validity:
   - Use double quotes for all strings
   - Properly escape special characters (\\" for quotes, \\\\ for backslashes, \\n for newlines)
   - Avoid all control characters (ASCII 0-31)
   - Keep text fields under 500 characters

2. Output rules:
   - Do not repeat any previously generated content
   - Do not include explanatory text outside the JSON
   - Do not restart from the beginning
   - Conform exactly to the JSON schema defined earlier

Your continuation should seamlessly connect with the previous output to form a complete, valid JSON document.`;

// Generation prompt strings (used by JSON schema generation tests)
export const ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN =
  'A detailed insight with markdown, where each markdown bullet contains a description of what happened that reads like a story of the attack as it played out and always uses special {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax for field names and values from the source data. Examples of CORRECT syntax (includes field names and values): {{ host.name hostNameValue }} {{ user.name userNameValue }} {{ source.ip sourceIpValue }} Examples of INCORRECT syntax (bad, because the field names are not included): {{ hostNameValue }} {{ userNameValue }} {{ sourceIpValue }}';

export const ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN =
  'A short (no more than a sentence) summary of the insight featuring only the host.name and user.name fields (when they are applicable), using the same {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax';

export const ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS =
  'An array of MITRE ATT&CK tactic for the insight, using one of the following values: Reconnaissance,Resource Development,Initial Access,Execution,Persistence,Privilege Escalation,Defense Evasion,Credential Access,Discovery,Lateral Movement,Collection,Command and Control,Exfiltration,Impact';

export const ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN =
  'A markdown summary of insight, using the same {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax';

export const ATTACK_DISCOVERY_GENERATION_TITLE =
  'A short, no more than 7 words, title for the insight, NOT formatted with special syntax or markdown. This must be as brief as possible.';

export const ATTACK_DISCOVERY_GENERATION_INSIGHTS =
  'Insights with markdown that always uses special {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax for field names and values from the source data. Examples of CORRECT syntax (includes field names and values): {{ host.name hostNameValue }} {{ user.name userNameValue }} {{ source.ip sourceIpValue }} Examples of INCORRECT syntax (bad, because the field names are not included): {{ hostNameValue }} {{ userNameValue }} {{ sourceIpValue }}';

const DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT = `You are an Elastic Security user tasked with analyzing file events.`;

const DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE_PROMPT = `You are a leading expert on resolving Elastic Defend configuration issues.`;

export const DEFEND_INSIGHTS = {
  INCOMPATIBLE_ANTIVIRUS: {
    DEFAULT: DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT,
    REFINE: `Review and refine the insights.`,
    CONTINUE: `Continue exactly where you left off in the JSON output below, generating only the additional JSON output when it's required to complete your work. The additional JSON output MUST ALWAYS follow these rules:
- it MUST conform to the schema above, because it will be checked against the JSON schema
- it MUST escape all JSON special characters (i.e. backslashes, double quotes, newlines, tabs, carriage returns, backspaces, and form feeds), because it will be parsed as JSON
- it MUST NOT repeat any the previous output, because that would prevent partial results from being combined
- it MUST NOT restart from the beginning, because that would prevent partial results from being combined
- it MUST NOT be prefixed or suffixed with additional text outside of the JSON, because that would prevent it from being combined and parsed as JSON:
`,
    GROUP: 'The program which is triggering the events',
    EVENTS: 'The events that the insight is based on',
    EVENTS_ID: 'The event ID',
    EVENTS_ENDPOINT_ID: 'The endpoint ID',
    EVENTS_VALUE: 'The process.executable value of the event',
  },
  POLICY_RESPONSE_FAILURE: {
    DEFAULT: DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE_PROMPT,
    REFINE: `Review and refine the insights.`,
    CONTINUE: `Continue exactly where you left off in the JSON output below, generating only the additional JSON output when it's required to complete your work. The additional JSON output MUST ALWAYS follow these rules:
- it MUST conform to the schema above, because it will be checked against the JSON schema
- it MUST escape all JSON special characters (i.e. backslashes, double quotes, newlines, tabs, carriage returns, backspaces, and form feeds), because it will be parsed as JSON
- it MUST NOT repeat any the previous output, because that would prevent partial results from being combined
- it MUST NOT restart from the beginning, because that would prevent partial results from being combined
- it MUST NOT be prefixed or suffixed with additional text outside of the JSON, because that would prevent it from being combined and parsed as JSON:
`,
    GROUP: 'The policy response action name + message + os',
    EVENTS: 'The events that the insight is based on',
    EVENTS_ID: 'The policy response ID',
    EVENTS_ENDPOINT_ID: 'The endpoint ID',
    EVENTS_VALUE: 'The actions.message value of the policy response',
    REMEDIATION: 'The suggested remediation action to take for the policy response failure',
    REMEDIATION_MESSAGE:
      'The suggested remediation message to take for the policy response failure',
    REMEDIATION_LINK: 'A link to documented remediation steps for the policy response failure',
  },
};
