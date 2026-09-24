/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFpTpExampleWorld } from '..';
import { MIMICRAT_STAGE2_DOMAIN } from './chain';

const rawEventText = (id: string): string =>
  JSON.stringify(buildFpTpExampleWorld(id, 'run1').events.map(({ source }) => source));

describe('mimicrat-clickfix examples', () => {
  it.each([
    ['mimicrat-clickfix.fp-benign-mimic', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-benign-mimic', 'amsiInitFailed'],
    ['mimicrat-clickfix.fp-benign-mimic', 'ProgramData'],
    ['mimicrat-clickfix.fp-entities-missing', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-network-only', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-network-only', 'amsiInitFailed'],
    ['mimicrat-clickfix.fp-network-only', 'ProgramData'],
    ['mimicrat-clickfix.domain-swap', MIMICRAT_STAGE2_DOMAIN],
  ])('returns %s raw events without %s', (id, needle) => {
    expect(rawEventText(id).toLowerCase()).not.toContain(needle.toLowerCase());
  });
});
