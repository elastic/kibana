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
});
