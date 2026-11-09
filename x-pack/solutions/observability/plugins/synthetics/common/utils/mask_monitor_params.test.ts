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

  it.each(['{invalid JSON}', '"secret"', '42', 'false', 'null', '["secret"]'])(
    'fails closed for parameter values that cannot retain parameter names: %s',
    (params) => {
      expect(maskMonitorParams(params)).toBe(MASKED_PARAM_VALUE);
    }
  );
});

describe('restoreMaskedMonitorParams', () => {
  it('restores a stored value that was masked whole, such as a legacy array', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '["secret"]',
        submittedParams: MASKED_PARAM_VALUE,
      })
    ).toBe('["secret"]');
  });

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

  it('keeps a masked key that only matches an inherited object property', () => {
    expect(
      restoreMaskedMonitorParams({
        previousParams: '{"token":"secret"}',
        submittedParams: '{"token":"********","toString":"********"}',
      })
    ).toBe('{"token":"secret","toString":"********"}');
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

  it('returns a masked key that only matches an inherited object property', () => {
    expect(
      getUnrestorableMaskedParamKeys({
        previousParams: '{"token":"secret"}',
        submittedParams: '{"token":"********","toString":"********"}',
      })
    ).toEqual(['toString']);
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
