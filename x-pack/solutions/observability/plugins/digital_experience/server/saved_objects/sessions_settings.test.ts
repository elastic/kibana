/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType } from '@kbn/config-schema';
import { sessionsSettingsSavedObjectType } from './sessions_settings';

const objectSchema = (value: unknown): ObjectType => {
  if (!(value instanceof ObjectType)) {
    throw new Error('Expected a @kbn/config-schema object schema');
  }
  return value;
};

/** The schemas of model version 1. */
const modelVersion1 = () => {
  const { modelVersions } = sessionsSettingsSavedObjectType;
  const versions = typeof modelVersions === 'function' ? modelVersions() : modelVersions;
  const schemas = versions?.[1]?.schemas;
  return {
    create: objectSchema(schemas?.create),
    forwardCompatibility: objectSchema(schemas?.forwardCompatibility),
  };
};

describe('sessionsSettingsSavedObjectType', () => {
  it('is a hidden type of every space, with nothing indexed', () => {
    expect(sessionsSettingsSavedObjectType).toEqual(
      expect.objectContaining({
        name: 'digital-experience-sessions-settings',
        hidden: true,
        namespaceType: 'agnostic',
        mappings: { dynamic: false, properties: {} },
      })
    );
    expect(Object.keys(sessionsSettingsSavedObjectType.modelVersions ?? {})).toEqual(['1']);
  });

  it.each([{}, { frequency: '5m' }, { concurrency: 4 }, { frequency: '1h', concurrency: 8 }])(
    'creates %j',
    (attributes) => {
      const { create } = modelVersion1();
      expect(create.validate(attributes)).toEqual(attributes);
    }
  );

  it.each([
    { frequency: '2h' },
    { frequency: '5 minutes' },
    { concurrency: 0 },
    { concurrency: 9 },
    { concurrency: 1.5 },
    { other: true },
  ])('refuses to create %j', (attributes) => {
    const { create } = modelVersion1();
    expect(() => create.validate(attributes)).toThrow();
  });

  it('reads the settings of a later version without what it does not know', () => {
    const { forwardCompatibility } = modelVersion1();
    expect(forwardCompatibility.validate({ frequency: '5m', later: 'setting' })).toEqual({
      frequency: '5m',
    });
  });
});
