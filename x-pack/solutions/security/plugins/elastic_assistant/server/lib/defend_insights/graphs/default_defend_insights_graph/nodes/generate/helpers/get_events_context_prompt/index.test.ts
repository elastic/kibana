/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefendInsightsPrompt } from '../../../helpers/prompts';
import { getEventsContextPrompt } from '.';

const insightType = 'incompatible_antivirus';

describe('getEventsContextPrompt', () => {
  it('generates the correct prompt', () => {
    const anonymizedEvents = ['event 1', 'event 2', 'event 3'];

    const expected = `${getDefendInsightsPrompt({ type: insightType })}

Use context from the following events to provide insights:

"""
event 1

event 2

event 3
"""
`;

    const prompt = getEventsContextPrompt({
      anonymizedEvents,
      prompt: getDefendInsightsPrompt({ type: insightType }),
    });

    expect(prompt).toEqual(expected);
  });
});
