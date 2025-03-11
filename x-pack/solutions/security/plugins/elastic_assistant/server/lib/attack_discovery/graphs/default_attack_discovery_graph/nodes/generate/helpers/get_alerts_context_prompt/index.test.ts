/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsContextPrompt } from '.';
import { ATTACK_DISCOVERY_DEFAULT } from '../../../../../../../prompt/prompts';

describe('getAlertsContextPrompt', () => {
  it('generates the correct prompt', () => {
    const anonymizedAlerts = ['Alert 1', 'Alert 2', 'Alert 3'];

    const expected = `${ATTACK_DISCOVERY_DEFAULT}

Use context from the following alerts to provide insights:

"""
Alert 1

Alert 2

Alert 3
"""
`;

    const prompt = getAlertsContextPrompt({
      anonymizedAlerts,
      attackDiscoveryPrompt: ATTACK_DISCOVERY_DEFAULT,
    });

    expect(prompt).toEqual(expected);
  });
});
