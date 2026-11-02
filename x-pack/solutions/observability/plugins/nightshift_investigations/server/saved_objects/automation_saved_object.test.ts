/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nightshiftAutomationSavedObjectType } from './automation_saved_object';

const attributes = {
  name: 'Triage',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [] },
  execution: {},
  completion: {},
  runtime: {},
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const { completion, ...baseV3 } = attributes;

const getModelVersion = (version: number) => {
  const modelVersions = nightshiftAutomationSavedObjectType.modelVersions;
  if (!modelVersions || typeof modelVersions === 'function') {
    throw new Error('Expected static model versions');
  }
  return Object.entries(modelVersions).find(([key]) => key === String(version))?.[1];
};

const getSchemas = (version: string) => {
  const modelVersions = nightshiftAutomationSavedObjectType.modelVersions;
  if (!modelVersions || typeof modelVersions === 'function') {
    throw new Error('Expected static model versions');
  }
  return Object.entries(modelVersions).find(([key]) => key === version)?.[1].schemas;
};

describe('nightshift automation saved object', () => {
  it('accepts automation tags from model version 2', () => {
    expect(getSchemas('2')?.create?.validate({ ...attributes, tags: ['oncall'] })).toEqual({
      ...attributes,
      tags: ['oncall'],
    });
  });

  it('rejects tags longer than 32 characters', () => {
    expect(() =>
      getSchemas('2')?.create?.validate({ ...attributes, tags: ['x'.repeat(33)] })
    ).toThrow();
  });

  it('accepts the author from model version 2', () => {
    expect(getSchemas('2')?.create?.validate({ ...attributes, author: 'alice' })).toEqual({
      ...attributes,
      author: 'alice',
    });
  });

  describe('model version 3', () => {
    const backfill = (completionValue: object) => {
      const change = getModelVersion(3)?.changes.find(({ type }) => type === 'data_backfill');
      if (change?.type !== 'data_backfill') throw new Error('Expected data_backfill');
      return change.backfillFn(
        { id: '1', type: 'nightshift-automation', attributes: { completion: completionValue } },
        {} as Parameters<typeof change.backfillFn>[1]
      );
    };

    it('moves the completion into a one-item array', () => {
      expect(backfill({ action: 'post_to_slack' })).toEqual({
        attributes: { completions: [{ action: 'post_to_slack' }] },
      });
    });

    it('maps an empty completion to an empty array', () => {
      expect(backfill({})).toEqual({ attributes: { completions: [] } });
    });

    it('validates completions as a bounded array', () => {
      const validate = (completions: object[]) =>
        getSchemas('3')?.create?.validate({ ...baseV3, completions });

      expect(validate([{ action: 'silent' }])).toEqual({
        ...baseV3,
        completions: [{ action: 'silent' }],
      });
      expect(() => validate(Array.from({ length: 11 }, () => ({})))).toThrow();
    });
  });
});
