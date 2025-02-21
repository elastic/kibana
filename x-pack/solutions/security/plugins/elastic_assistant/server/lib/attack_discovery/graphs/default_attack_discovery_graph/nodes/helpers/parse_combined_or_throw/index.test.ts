/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { parseCombinedOrThrow } from '.';
import { getRawAttackDiscoveriesMock } from '../../../../../../../__mocks__/raw_attack_discoveries';

const prompts = {
  detailsMarkdown: '',
  entitySummaryMarkdown: '',
  mitreAttackTactics: '',
  summaryMarkdown: '',
  title: '',
  insights: '',
};

describe('parseCombinedOrThrow', () => {
  const mockLogger: Logger = {
    debug: jest.fn(),
  } as unknown as Logger;

  const nodeName = 'testNodeName';
  const llmType = 'testLlmType';

  const validCombinedResponse = getRawAttackDiscoveriesMock();

  const invalidCombinedResponse = 'invalid json';

  const defaultArgs = {
    combinedResponse: validCombinedResponse,
    generationAttempts: 0,
    nodeName,
    llmType,
    logger: mockLogger,
    prompts,
  };

  it('returns an Attack discovery for each insight in a valid combined response', () => {
    const discoveries = parseCombinedOrThrow({
      ...defaultArgs,
    });

    expect(discoveries).toHaveLength(5);
  });

  it('adds a timestamp to all discoveries in a valid response', () => {
    const discoveries = parseCombinedOrThrow({
      ...defaultArgs,
    });

    expect(discoveries.every((discovery) => discovery.timestamp != null)).toBe(true);
  });

  it('adds trailing backticks to the combined response if necessary', () => {
    const withLeadingJson = '```json\n'.concat(validCombinedResponse);

    const discoveries = parseCombinedOrThrow({
      ...defaultArgs,
      combinedResponse: withLeadingJson,
    });

    expect(discoveries).toHaveLength(5);
  });

  it('logs the parsing step', () => {
    const generationAttempts = 0;

    parseCombinedOrThrow({
      ...defaultArgs,
      generationAttempts,
    });

    expect((mockLogger.debug as jest.Mock).mock.calls[0][0]()).toBe(
      `${nodeName} node is parsing extractedJson (${llmType}) from attempt ${generationAttempts}`
    );
  });

  it('logs the validation step', () => {
    const generationAttempts = 0;

    parseCombinedOrThrow({
      ...defaultArgs,
      generationAttempts,
    });

    expect((mockLogger.debug as jest.Mock).mock.calls[1][0]()).toBe(
      `${nodeName} node is validating combined response (${llmType}) from attempt ${generationAttempts}`
    );
  });

  it('logs the successful validation step', () => {
    const generationAttempts = 0;

    parseCombinedOrThrow({
      ...defaultArgs,
      generationAttempts,
    });

    expect((mockLogger.debug as jest.Mock).mock.calls[2][0]()).toBe(
      `${nodeName} node successfully validated Attack discoveries response (${llmType}) from attempt ${generationAttempts}`
    );
  });

  it('throws the expected error when JSON parsing fails', () => {
    expect(() =>
      parseCombinedOrThrow({
        ...defaultArgs,
        combinedResponse: invalidCombinedResponse,
      })
    ).toThrowError('Unexpected token \'i\', "invalid json" is not valid JSON');
  });

  it('throws the expected error when JSON validation fails', () => {
    const invalidJson = '{ "insights": "not an array" }';

    expect(() =>
      parseCombinedOrThrow({
        ...defaultArgs,
        combinedResponse: invalidJson,
      })
    ).toThrowError('Expected array, received string');
  });
});
