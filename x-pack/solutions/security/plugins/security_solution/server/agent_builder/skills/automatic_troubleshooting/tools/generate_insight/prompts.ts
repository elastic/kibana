/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

export function getPrompts(insightType: DefendInsightType) {
  switch (insightType) {
    case DefendInsightType.Enum.policy_response_failure:
      return PROMPTS.POLICY_RESPONSE_FAILURE;
    case DefendInsightType.Enum.incompatible_antivirus:
      return PROMPTS.INCOMPATIBLE_ANTIVIRUS;
    case DefendInsightType.Enum.custom:
      return PROMPTS.CUSTOM;
  }
}

const COMMON_PROMPT =
  'You are a leading expert on resolving Elastic Defend configuration issues. You have just completed an analysis and are organizing the results. Organize the below data precisely according to the following rules:';

const DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT = `
${COMMON_PROMPT}
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
${COMMON_PROMPT}
- group the policy responses by the policy response action name, message, and os (actions.name:::actions.message:::host.os.name)
- keep track of the agent.id and _id associated to each of the individual events as endpointId and eventId respectively
- suggest a remediation action to take for each policy response warning or failure, using the remediationMessage field
- include a remediation link in the remediationLink field only if one is provided in the context
- if there are no events, ignore the group field
- new lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON
- only return JSON output, as described above
- do not add any additional text to describe your output
`;

const DEFEND_INSIGHTS_CUSTOM_PROMPT = `
${COMMON_PROMPT}
- group relevant events under a descriptive and unique group identifier
- provide a clear and concise insight that addresses the problem description
- suggest actionable recommendations to resolve the issue
- new lines must always be escaped with double backslashes, i.e. \\\\n to ensure valid JSON
- only return JSON output, as described above
- do not add any additional text to describe your output
`;

export const PROMPTS = {
  INCOMPATIBLE_ANTIVIRUS: {
    DEFAULT: DEFEND_INSIGHTS_INCOMPATIBLE_ANTIVIRUS_PROMPT,
    GROUP: 'The program which is triggering the file process events',
    EVENTS: 'The file process events that the insight is based on',
    EVENTS_ID: 'The file process event ID',
    EVENTS_ENDPOINT_ID: 'The endpoint ID',
    EVENTS_VALUE: 'The process.executable value of the file process event',
  },
  POLICY_RESPONSE_FAILURE: {
    DEFAULT: DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE_PROMPT,
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
  CUSTOM: {
    DEFAULT: DEFEND_INSIGHTS_CUSTOM_PROMPT,
    GROUP: 'A descriptive and unique group identifier for the events',
    EVENTS: 'The events that the insight is based on',
    EVENTS_ID: 'The event ID',
    EVENTS_ENDPOINT_ID: 'The endpoint ID',
    EVENTS_VALUE: 'The value or details of the event',
    REMEDIATION: 'The suggested remediation action to take',
    REMEDIATION_MESSAGE: 'The suggested remediation message to take',
  },
};
