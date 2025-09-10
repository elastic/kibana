/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT = `
You are an Elastic Security user tasked with analyzing file events from Elastic Security to identify antivirus processes. Review the file events below and organize them according to the following rules:
- keep only ongoing antivirus (e.g. Windows Defender, AVG, Avast, Malwarebytes, clamav, chkrootkit) related processes
- keep processes that reside within the antivirus' main and nested filepaths (e.g., C:\\ProgramData\\Microsoft\\Windows Defender\\..., C:\\Program Files\\AVG\\..., C:\\Program Files\\Avast Software\\..., /Applications/AVGAntivirus.app/...)
- ignore events that are from non-antivirus operating system processes (e.g. C:\\Windows\\System32\\...)
- ignore events that are single run processes (e.g. installers)
- ignore events that are from temp directories
- ignore events that are from Elastic Agent or Elastic Defend
- group the processes by the antivirus program, keeping track of the agent.id and _id associated to each of the individual events as endpointId and eventId respectively
- if there are no events, ignore the group field
- never make any changes to the original file paths
- new lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON
- only return JSON output, as described above
- do not add any additional text to describe your output
`;

const DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE_PROMPT = `
You are a leading expert on resolving Elastic Defend configuration issues. Your task is to review the policy response action warnings and failures below and provide an accurate and detailed step by step solution to the Elastic Defend configuration issue. Organize your response precisely to the following rules:
- group the policy responses by the policy response action name, message, and os (actions.name:::actions.message:::host.os.name)
- keep track of the agent.id and _id associated to each of the individual events as endpointId and eventId respectively
- suggest a remediation action to take for each policy response warning or failure, using the remediationMessage field
- include a remediation link in the remediationLink field only if one is provided in the context
- if there are no events, ignore the group field
- new lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON
- only return JSON output, as described above
- do not add any additional text to describe your output
`;

export const DEFEND_INSIGHTS = {
  INCOMPATIBLE_ANTIVIRUS: {
    DEFAULT: DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT,
    REFINE: `
You previously generated the below insights using this prompt: ${DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT}.
Double check the generated insights below and make sure it adheres to the rules set in the original prompt, removing events only as necessary to adhere to the original rules. In addition:
- combine duplicate insights into the same 'group' (e.g. AVG + AVG Free + AVG Hub + AVG Antivirus)
- remove insights with no events
    `,
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
    REFINE: `
You previously generated the below insights using this prompt: ${DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE_PROMPT}.
Double check the generated insights below and make sure it adheres to the rules set in the original prompt, removing events only as necessary to adhere to the original rules. In addition:
- combine duplicate insights into the same 'group'
- remove insights with no events
    `,
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
