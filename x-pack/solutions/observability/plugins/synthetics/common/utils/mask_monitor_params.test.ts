/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MASKED_PARAM_VALUE,
  getUnrestorableMaskedParamKeys,
  maskMonitorParams,
  restoreMaskedMonitorParams,
} from './mask_monitor_params';

describe('maskMonitorParams', () => {
  it('masks every parameter value while preserving parameter names', () => {
    expect(maskMonitorParams('{"username":"elastic","password":"changeme"}')).toBe(
      JSON.stringify({ username: MASKED_PARAM_VALUE, password: MASKED_PARAM_VALUE })
    );
  });

  it.each(['{invalid JSON}', '"secret"', '42', 'false', 'null'])(
    'fails closed for parameter values that cannot retain parameter names: %s',
    (params) => {
      expect(maskMonitorParams(params)).toBe(MASKED_PARAM_VALUE);
    }
  );

  it('masks top-level arrays as valid JSON', () => {
    expect(maskMonitorParams('["secret"]')).toBe(JSON.stringify([MASKED_PARAM_VALUE]));
  });

  it('restores a masked top-level parameter array', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '["secret"]',
        submittedParams: JSON.stringify([MASKED_PARAM_VALUE]),
      })
    ).toBe('["secret"]');
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

  it('restores masked array entries by index and retains changed entries', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '["first","second"]',
        submittedParams: '["updated","********"]',
      })
    ).toBe('["updated","second"]');
  });

  it('retains an intentionally empty array', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '["first"]',
        submittedParams: '[]',
      })
    ).toBe('[]');
  });
});

describe('getUnrestorableMaskedParamKeys', () => {
  it('returns masked parameters that have no stored value', () => {
    expect(
      getUnrestorableMaskedParamKeys({
        previousParams: '{"token":"secret","url":"https://example.com"}',
        submittedParams: '{"token2":"********","url":"********","note":"plain"}',
      })
    ).toEqual(['token2']);
  });

  it('returns every masked parameter when nothing is stored', () => {
    expect(
      getUnrestorableMaskedParamKeys({
        submittedParams: '{"token":"********"}',
      })
    ).toEqual(['token']);
  });

  it('returns masked array indexes that have no stored value', () => {
    expect(
      getUnrestorableMaskedParamKeys({
        previousParams: '["first"]',
        submittedParams: '["********","********"]',
      })
    ).toEqual(['1']);
  });

  it('ignores submissions that are not parameter objects', () => {
    expect(
      getUnrestorableMaskedParamKeys({
        previousParams: '{"token":"secret"}',
        submittedParams: MASKED_PARAM_VALUE,
      })
    ).toEqual([]);
  });
});
