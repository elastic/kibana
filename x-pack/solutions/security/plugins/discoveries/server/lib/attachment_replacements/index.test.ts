/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attachmentReplacementsSchema,
  getAttachmentReplacements,
  MAX_REPLACEMENT_VALUE_LENGTH,
  MAX_REPLACEMENTS,
} from '.';

const HOST_UUID = '3d241119-f77a-454e-8ee3-d36e05a8714f';
const USER_UUID = 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d';

const uuidFor = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

describe('attachmentReplacementsSchema', () => {
  it('accepts UUID keys with bounded values', () => {
    expect(attachmentReplacementsSchema.safeParse({ [HOST_UUID]: 'SRVWIN04' }).success).toBe(true);
  });

  it('rejects a key that is not a UUID', () => {
    expect(attachmentReplacementsSchema.safeParse({ 'host-1': 'SRVWIN04' }).success).toBe(false);
  });

  it('rejects a value over the bound', () => {
    expect(
      attachmentReplacementsSchema.safeParse({
        [HOST_UUID]: 'a'.repeat(MAX_REPLACEMENT_VALUE_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it(`rejects more than ${MAX_REPLACEMENTS} replacements`, () => {
    const tooMany = Object.fromEntries(
      Array.from({ length: MAX_REPLACEMENTS + 1 }, (_, i) => [uuidFor(i), `host-${i}`])
    );

    expect(attachmentReplacementsSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('getAttachmentReplacements', () => {
  const texts = [`Activity on ${HOST_UUID}`, `by ${USER_UUID}`];

  it('returns undefined when there are no replacements', () => {
    expect(getAttachmentReplacements({ replacements: undefined, texts })).toBeUndefined();
  });

  it('keeps the valid replacements the texts use', () => {
    expect(
      getAttachmentReplacements({
        replacements: { [HOST_UUID]: 'SRVWIN04', [USER_UUID]: 'Administrator' },
        texts,
      })
    ).toEqual({ [HOST_UUID]: 'SRVWIN04', [USER_UUID]: 'Administrator' });
  });

  // A generation's replacements cover every discovery it produced, so the other entries are
  // original values from unrelated discoveries.
  it('drops the replacements the texts do not use', () => {
    expect(
      getAttachmentReplacements({
        replacements: { [HOST_UUID]: 'SRVWIN04', [uuidFor(1)]: 'unrelated-host' },
        texts,
      })
    ).toEqual({ [HOST_UUID]: 'SRVWIN04' });
  });

  it('returns undefined when the texts use none of the replacements', () => {
    expect(
      getAttachmentReplacements({ replacements: { [uuidFor(1)]: 'unrelated-host' }, texts })
    ).toBeUndefined();
  });

  // One rejected entry would otherwise make the whole attachment fail validation.
  it('drops the entries the attachment schema would reject', () => {
    expect(
      getAttachmentReplacements({
        replacements: {
          [HOST_UUID]: 'SRVWIN04',
          [USER_UUID]: 'a'.repeat(MAX_REPLACEMENT_VALUE_LENGTH + 1),
          'not-a-uuid': 'value',
        },
        texts: [...texts, 'not-a-uuid'],
      })
    ).toEqual({ [HOST_UUID]: 'SRVWIN04' });
  });

  it('bounds the result so the attachment schema accepts it', () => {
    const entries = Array.from({ length: MAX_REPLACEMENTS + 5 }, (_, i) => [
      uuidFor(i),
      `host-${i}`,
    ]);

    const result = getAttachmentReplacements({
      replacements: Object.fromEntries(entries),
      texts: [entries.map(([uuid]) => uuid).join(' ')],
    });

    expect(Object.keys(result ?? {})).toHaveLength(MAX_REPLACEMENTS);
    expect(attachmentReplacementsSchema.safeParse(result).success).toBe(true);
  });
});
