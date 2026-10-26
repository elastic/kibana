/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMissingIdFieldWarning, getMetadataIdInjectionFailedWarning } from '../../utils/utils';
import { checkMissingIdFieldWarning } from './check_missing_id_field_warning';

describe('checkMissingIdFieldWarning', () => {
  const responseWithId = {
    columns: [{ name: '_id' }, { name: 'agent.name' }],
    values: [['doc-1', 'test']],
  };

  const responseWithoutId = {
    columns: [{ name: 'agent.name' }],
    values: [['test']],
  };

  const emptyResponse = {
    columns: [],
    values: [],
  };

  it('returns undefined when response has no results', () => {
    expect(checkMissingIdFieldWarning({ response: emptyResponse })).toBeUndefined();
  });

  it('returns undefined when response contains _id column', () => {
    expect(checkMissingIdFieldWarning({ response: responseWithId })).toBeUndefined();
  });

  it('returns undefined when _id is present even if injection had failed', () => {
    expect(
      checkMissingIdFieldWarning({
        response: responseWithId,
        injectionFailureReason: 'Parse error',
      })
    ).toBeUndefined();
  });

  it('returns generic missing _id warning when _id is absent and injection did not fail', () => {
    expect(checkMissingIdFieldWarning({ response: responseWithoutId })).toBe(
      getMissingIdFieldWarning()
    );
  });

  it('returns injection-failed warning when _id is absent and injection failed', () => {
    const reason = 'Parse error';
    expect(
      checkMissingIdFieldWarning({
        response: responseWithoutId,
        injectionFailureReason: reason,
      })
    ).toBe(getMetadataIdInjectionFailedWarning(reason));
  });
});
