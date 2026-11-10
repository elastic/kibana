/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUsedReplacements, MAX_REPLACEMENTS, MAX_REPLACEMENT_VALUE_LENGTH } from '.';

const HOST_UUID = '3d241119-f77a-454e-8ee3-d36e05a8714f';
const USER_UUID = 'b7cf60c1-090d-4676-aad6-666724501baf';

describe('getUsedReplacements', () => {
  it('returns the replacements that appear in the texts', () => {
    expect(
      getUsedReplacements({
        replacements: { [HOST_UUID]: 'SRVWIN04', [USER_UUID]: 'Administrator' },
        texts: [`Activity on ${HOST_UUID}`],
      })
    ).toEqual({ [HOST_UUID]: 'SRVWIN04' });
  });

  it('finds a replacement in any of the texts', () => {
    expect(
      getUsedReplacements({
        replacements: { [HOST_UUID]: 'SRVWIN04', [USER_UUID]: 'Administrator' },
        texts: ['no values', `by ${USER_UUID}`],
      })
    ).toEqual({ [USER_UUID]: 'Administrator' });
  });

  it('returns undefined when no replacement is used', () => {
    expect(
      getUsedReplacements({ replacements: { [HOST_UUID]: 'SRVWIN04' }, texts: ['no values'] })
    ).toBeUndefined();
  });

  it('returns undefined when there are no replacements', () => {
    expect(getUsedReplacements({ replacements: undefined, texts: [HOST_UUID] })).toBeUndefined();
  });

  it('leaves out a key that is not a UUID, which the server would reject', () => {
    expect(
      getUsedReplacements({
        replacements: { 'custom-key': 'SRVWIN04', [HOST_UUID]: 'SRVWIN02' },
        texts: [`custom-key and ${HOST_UUID}`],
      })
    ).toEqual({ [HOST_UUID]: 'SRVWIN02' });
  });

  it('leaves out a value over the bound, so it stays anonymized', () => {
    expect(
      getUsedReplacements({
        replacements: { [HOST_UUID]: 'a'.repeat(MAX_REPLACEMENT_VALUE_LENGTH + 1) },
        texts: [HOST_UUID],
      })
    ).toBeUndefined();
  });

  it(`returns at most ${MAX_REPLACEMENTS} replacements`, () => {
    const keys = Array.from(
      { length: MAX_REPLACEMENTS + 1 },
      (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
    );

    const used = getUsedReplacements({
      replacements: Object.fromEntries(keys.map((key) => [key, 'value'])),
      texts: [keys.join(' ')],
    });

    expect(Object.keys(used ?? {})).toHaveLength(MAX_REPLACEMENTS);
  });
});
