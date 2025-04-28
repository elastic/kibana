/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEventsContextPrompt } from '.';
import { DEFEND_INSIGHTS } from '../../../../../../../prompt/prompts';

describe('getEventsContextPrompt', () => {
  it('generates the correct prompt', async () => {
    const anonymizedEvents = ['event 1', 'event 2', 'event 3'];

    const expected = `${DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.DEFAULT}

Use context from the following events to provide insights:

"""
event 1

event 2

event 3
"""
`;

    const prompt = getEventsContextPrompt({
      anonymizedEvents,
      defendInsightsPrompt: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.DEFAULT,
    });

    expect(prompt).toEqual(expected);
  });
});
