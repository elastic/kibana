/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import * as i18n from '../../translations';
import { applyTuningErrorMessage } from '.';

describe('applyTuningErrorMessage', () => {
  it('reports a 400 as a rejected change, which is a finding rather than a retry', () => {
    expect(applyTuningErrorMessage(createHttpFetchError({ status: 400 }))).toBe(
      i18n.TUNING_APPLY_REJECTED
    );
  });

  it('reports a 403 as a rules-write denial, so it can never look like success', () => {
    expect(applyTuningErrorMessage(createHttpFetchError({ status: 403 }))).toBe(
      i18n.TUNING_APPLY_FORBIDDEN
    );
  });

  it('reports a 404 as a rule id to correct, because the id is model-authored', () => {
    expect(applyTuningErrorMessage(createHttpFetchError({ status: 404 }))).toBe(
      i18n.TUNING_APPLY_NOT_FOUND
    );
  });

  it('falls back to the server message on a 500', () => {
    expect(
      applyTuningErrorMessage(
        createHttpFetchError({ body: { message: 'Failed to apply PND tuning' }, status: 500 })
      )
    ).toBe('Failed to apply PND tuning');
  });

  it('falls back to its own copy when a failure carries no message', () => {
    expect(applyTuningErrorMessage(new Error(''))).toBe(i18n.TUNING_APPLY_FAILED_FALLBACK);
  });

  it('never claims the rule changed for an unrecognized failure', () => {
    expect(applyTuningErrorMessage(undefined)).toBe(i18n.TUNING_APPLY_FAILED_FALLBACK);
  });
});
