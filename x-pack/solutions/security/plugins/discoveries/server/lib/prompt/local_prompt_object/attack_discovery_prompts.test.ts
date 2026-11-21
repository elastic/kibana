/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_DEFAULT, ATTACK_DISCOVERY_REFINE } from './attack_discovery_prompts';

describe('attack discovery prompts', () => {
  // Claude Opus 5.5 returns finish_reason content_filter for "Show your reasoning" in these prompts
  it.each([
    ['ATTACK_DISCOVERY_DEFAULT', ATTACK_DISCOVERY_DEFAULT],
    ['ATTACK_DISCOVERY_REFINE', ATTACK_DISCOVERY_REFINE],
  ])('%s does not ask the model to show its reasoning', (_, prompt) => {
    expect(prompt).not.toMatch(/show your reasoning/i);
    expect(prompt).toMatch(/Explain your analysis before the json output section/i);
  });
});
