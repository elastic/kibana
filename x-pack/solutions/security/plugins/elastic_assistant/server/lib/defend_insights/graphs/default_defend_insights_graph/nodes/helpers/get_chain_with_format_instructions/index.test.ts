/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import type { ActionsClientLlm } from '@kbn/langchain/server';

import { getChainWithFormatInstructions } from '.';

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
{"type":"object","properties":{"insights":{"type":"array","items":{"type":"object","properties":{"group":{"type":"string","description":"The program which is triggering the events"},"events":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","description":"The event ID"},"endpointId":{"type":"string","description":"The endpoint ID"},"value":{"type":"string","description":"The process.executable value of the event"}},"required":["id","endpointId","value"],"additionalProperties":false},"description":"The events that the insight is based on"}},"required":["group","events"],"additionalProperties":false}}},"required":["insights"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}
\`\`\`
`;

    const chainWithFormatInstructions = getChainWithFormatInstructions(
      'incompatible_antivirus',
      mockLlm
    );
    expect(chainWithFormatInstructions).toEqual({
      chain: expect.any(Object),
      formatInstructions: expectedFormatInstructions,
      llmType: 'fake',
    });
  });
});
