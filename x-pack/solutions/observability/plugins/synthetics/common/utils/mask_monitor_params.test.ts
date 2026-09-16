/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MASKED_PARAM_VALUE,
  maskMonitorParams,
  restoreMaskedMonitorParams,
} from './mask_monitor_params';

describe('maskMonitorParams', () => {
  it('masks every parameter value while preserving parameter names', () => {
    expect(maskMonitorParams('{"username":"elastic","password":"changeme"}')).toBe(
      JSON.stringify({ username: MASKED_PARAM_VALUE, password: MASKED_PARAM_VALUE })
    );
  });

  it('returns invalid JSON unchanged', () => {
    expect(maskMonitorParams('{invalid JSON}')).toBe('{invalid JSON}');
  });
});

describe('restoreMaskedMonitorParams', () => {
  it('restores masked values and retains explicitly changed parameter values', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '{"username":"elastic","password":"changeme"}',
        submittedParams: '{"username":"updated-user","password":"********"}',
      })
    ).toBe('{"username":"updated-user","password":"changeme"}');
  });

  it('does not replace an unmatched placeholder', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '{"username":"elastic"}',
        submittedParams: '{"password":"********"}',
      })
    ).toBe('{"password":"********"}');
  });
});
