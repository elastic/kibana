/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PREFERRED_CONNECTOR_ID, pickDefaultConnector } from './pick_default_connector';

const openai = { id: 'openai-1', actionTypeId: '.gen-ai' };
const inference = { id: 'inf-1', actionTypeId: '.inference' };
const sonnet = { id: PREFERRED_CONNECTOR_ID, actionTypeId: '.inference' };

describe('pickDefaultConnector', () => {
  it('prefers the configured default connector', () => {
    expect(pickDefaultConnector([inference, sonnet, openai], 'openai-1')).toBe(openai);
  });

  it('falls back to the preferred Sonnet connector', () => {
    expect(pickDefaultConnector([openai, inference, sonnet], 'missing')).toBe(sonnet);
  });

  it('falls back to the first inference connector, then the first connector', () => {
    expect(pickDefaultConnector([openai, inference])).toBe(inference);
    expect(pickDefaultConnector([openai])).toBe(openai);
    expect(pickDefaultConnector([])).toBeUndefined();
  });
});
