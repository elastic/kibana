/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_GENERATION_INSTRUCTIONS } from './extraction_contract';

/**
 * Locks the gate-critical phrases into `ESQL_GENERATION_INSTRUCTIONS` so a later edit cannot
 * silently drop the wording that tells the model the shapes `assertEsqlGroundedInReport` discards.
 * Not an LLM eval: this only proves the fragments are present, not that generation obeys them.
 */
describe('ESQL_GENERATION_INSTRUCTIONS', () => {
  it.each([
    'every OR branch',
    'every IN (...) member',
    'every FORK branch',
    'do not ground',
    'generic process-name, path, or message',
    'QSTR',
    'KQL',
  ])('contains the gate-critical fragment %j', (fragment) => {
    expect(ESQL_GENERATION_INSTRUCTIONS).toContain(fragment);
  });
});
