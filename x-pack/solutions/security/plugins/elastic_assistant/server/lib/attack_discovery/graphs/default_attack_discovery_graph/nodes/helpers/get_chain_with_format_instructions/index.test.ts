/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import type { ActionsClientLlm } from '@kbn/langchain/server';

import { getChainWithFormatInstructions } from '.';
import {
  ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_INSIGHTS,
  ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
  ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_TITLE,
} from '../../../../../../prompt/prompts';

const prompts = {
  detailsMarkdown: ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
  entitySummaryMarkdown: ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
  mitreAttackTactics: ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
  summaryMarkdown: ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
  title: ATTACK_DISCOVERY_GENERATION_TITLE,
  insights: ATTACK_DISCOVERY_GENERATION_INSIGHTS,
};

describe('getChainWithFormatInstructions', () => {
  const mockLlm = new FakeLLM({
    response: JSON.stringify({}, null, 2),
  }) as unknown as ActionsClientLlm;

  it('returns the chain with format instructions', () => {
    const expectedFormatInstructions = `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
{"type":"object","properties":{"insights":{"type":"array","items":{"type":"object","properties":{"alertIds":{"type":"array","items":{"type":"string"},"description":"The alert IDs that the insight is based on."},"detailsMarkdown":{"type":"string","description":"A detailed insight with markdown, where each markdown bullet contains a description of what happened that reads like a story of the attack as it played out and always uses special {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax for field names and values from the source data. Examples of CORRECT syntax (includes field names and values): {{ host.name hostNameValue }} {{ user.name userNameValue }} {{ source.ip sourceIpValue }} Examples of INCORRECT syntax (bad, because the field names are not included): {{ hostNameValue }} {{ userNameValue }} {{ sourceIpValue }}"},"entitySummaryMarkdown":{"type":"string","description":"A short (no more than a sentence) summary of the insight featuring only the host.name and user.name fields (when they are applicable), using the same {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax"},"mitreAttackTactics":{"type":"array","items":{"type":"string"},"description":"An array of MITRE ATT&CK tactic for the insight, using one of the following values: Reconnaissance,Resource Development,Initial Access,Execution,Persistence,Privilege Escalation,Defense Evasion,Credential Access,Discovery,Lateral Movement,Collection,Command and Control,Exfiltration,Impact"},"summaryMarkdown":{"type":"string","description":"A markdown summary of insight, using the same {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax"},"title":{"type":"string","description":"A short, no more than 7 words, title for the insight, NOT formatted with special syntax or markdown. This must be as brief as possible."}},"required":["alertIds","detailsMarkdown","summaryMarkdown","title"],"additionalProperties":false},"description":"Insights with markdown that always uses special {{ field.name fieldValue1 fieldValue2 fieldValueN }} syntax for field names and values from the source data. Examples of CORRECT syntax (includes field names and values): {{ host.name hostNameValue }} {{ user.name userNameValue }} {{ source.ip sourceIpValue }} Examples of INCORRECT syntax (bad, because the field names are not included): {{ hostNameValue }} {{ userNameValue }} {{ sourceIpValue }}"}},"required":["insights"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}
\`\`\`
`;

    const chainWithFormatInstructions = getChainWithFormatInstructions({ llm: mockLlm, prompts });
    expect(chainWithFormatInstructions).toEqual({
      chain: expect.any(Object),
      formatInstructions: expectedFormatInstructions,
      llmType: 'fake',
    });
  });
});
