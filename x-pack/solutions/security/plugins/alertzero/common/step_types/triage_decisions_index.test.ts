/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_COVERAGE_AI_INDEX_DEST } from './package_report';
import { TRIAGE_DECISIONS_AI_INDEX_DEST } from './triage_decisions_index';

describe('TRIAGE_DECISIONS_AI_INDEX_DEST', () => {
  it('is its own index, so Hunt readers never see decisions and the space mapping is ours', () => {
    expect(TRIAGE_DECISIONS_AI_INDEX_DEST).toEqual({
      type: 'index',
      value: 'ai-index-idx-security-triage-decisions',
    });
    expect(TRIAGE_DECISIONS_AI_INDEX_DEST.value).not.toBe(HUNT_COVERAGE_AI_INDEX_DEST.value);
  });
});
