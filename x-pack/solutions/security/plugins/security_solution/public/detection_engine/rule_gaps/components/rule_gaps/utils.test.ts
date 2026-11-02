/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gapReasonType } from '@kbn/alerting-plugin/common';
import { getExcludedReasons } from './utils';

const ALL_REASON_TYPES = [gapReasonType.RULE_DISABLED, gapReasonType.RULE_DID_NOT_RUN];

describe('getExcludedReasons', () => {
  it('returns empty array when no reason types are selected (all deselected = no filter)', () => {
    expect(getExcludedReasons([], ALL_REASON_TYPES)).toEqual([]);
  });

  it('returns all unselected reason types when some are selected', () => {
    expect(getExcludedReasons([gapReasonType.RULE_DID_NOT_RUN], ALL_REASON_TYPES)).toEqual([
      gapReasonType.RULE_DISABLED,
    ]);
  });

  it('returns empty array when all reason types are selected', () => {
    expect(getExcludedReasons(ALL_REASON_TYPES, ALL_REASON_TYPES)).toEqual([]);
  });

  it('returns single excluded reason when one of two is deselected', () => {
    expect(getExcludedReasons([gapReasonType.RULE_DISABLED], ALL_REASON_TYPES)).toEqual([
      gapReasonType.RULE_DID_NOT_RUN,
    ]);
  });
});
