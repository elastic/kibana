/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitialConnectorCandidate } from '.';
import { getInitialConnectorId } from '.';

const connector = ({
  id,
  isRecommended,
}: {
  id: string;
  isRecommended?: boolean;
}): InitialConnectorCandidate => ({ id, isRecommended });

const GPT_6_SOL = '.openai-gpt-6-sol-chat_completion';
const OPUS_5 = '.anthropic-claude-5-opus-chat_completion';
const GLOBAL_DEFAULT = 'my-global-default';
const OTHER = 'my-other-connector';

describe('getInitialConnectorId', () => {
  it.each<[string, InitialConnectorCandidate[], string | undefined, string | undefined]>([
    [
      'selects the first recommended model, even when the global default is listed',
      [
        connector({ id: GPT_6_SOL, isRecommended: true }),
        connector({ id: OPUS_5, isRecommended: true }),
        connector({ id: GLOBAL_DEFAULT }),
      ],
      GLOBAL_DEFAULT,
      GPT_6_SOL,
    ],
    [
      'selects the global default when no recommended model is listed (no EIS)',
      [connector({ id: OTHER }), connector({ id: GLOBAL_DEFAULT })],
      GLOBAL_DEFAULT,
      GLOBAL_DEFAULT,
    ],
    [
      'selects the first connector when no recommended model is listed and there is no global default',
      [connector({ id: OTHER }), connector({ id: GLOBAL_DEFAULT })],
      undefined,
      OTHER,
    ],
    [
      'selects the first connector when the global default is not listed (deleted, or the NO_DEFAULT_CONNECTOR sentinel)',
      [connector({ id: OTHER }), connector({ id: GLOBAL_DEFAULT })],
      'NO_DEFAULT_CONNECTOR',
      OTHER,
    ],
    ['selects nothing when there are no connectors', [], GLOBAL_DEFAULT, undefined],
    [
      'known limitation: selects the global default from an admin-saved list (no isRecommended flags), not the first saved model',
      [connector({ id: OPUS_5 }), connector({ id: GLOBAL_DEFAULT })],
      GLOBAL_DEFAULT,
      GLOBAL_DEFAULT,
    ],
  ])('%s', (_, aiConnectors, globalDefaultConnectorId, expected) => {
    expect(getInitialConnectorId({ aiConnectors, globalDefaultConnectorId })).toBe(expected);
  });
});
