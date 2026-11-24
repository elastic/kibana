/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { sloGlobalSettings } from './slo_global_settings';

const getModelVersion1 = (): SavedObjectsModelVersion => {
  const { modelVersions } = sloGlobalSettings;
  const modelVersion = typeof modelVersions === 'function' ? undefined : modelVersions?.['1'];
  if (!modelVersion) {
    throw new Error('Expected model version 1 to be defined');
  }
  return modelVersion;
};

const sliRetention = { enabled: true, periodDays: 365, updatedAt: '2026-11-24T00:00:00.000Z' };

describe('slo-global-settings saved object type', () => {
  it('is a hidden, namespace-agnostic type that cannot be imported or exported', () => {
    expect(sloGlobalSettings.name).toBe('slo-global-settings');
    expect(sloGlobalSettings.hidden).toBe(true);
    expect(sloGlobalSettings.namespaceType).toBe('agnostic');
    expect(sloGlobalSettings.management?.importableAndExportable).toBe(false);
  });

  describe('model version 1', () => {
    describe('create schema', () => {
      const validate = (attributes: object) =>
        getModelVersion1().schemas?.create?.validate(attributes);

      it('accepts an empty object', () => {
        expect(() => validate({})).not.toThrow();
      });

      it('accepts a full sliRetention block', () => {
        expect(() => validate({ sliRetention })).not.toThrow();
      });

      it('rejects a non-integer periodDays', () => {
        expect(() => validate({ sliRetention: { ...sliRetention, periodDays: 200.5 } })).toThrow();
      });

      it('rejects a block without updatedAt', () => {
        expect(() => validate({ sliRetention: { enabled: true, periodDays: 365 } })).toThrow();
      });

      it('rejects an unknown root key', () => {
        expect(() => validate({ unknown: true })).toThrow();
      });
    });

    describe('forwardCompatibility schema', () => {
      it('drops unknown root keys', () => {
        const forwardCompatibility = getModelVersion1().schemas?.forwardCompatibility;
        const attributes = { sliRetention, unknown: true };
        const converted =
          typeof forwardCompatibility === 'function'
            ? forwardCompatibility(attributes)
            : forwardCompatibility?.validate(attributes);

        expect(converted).toEqual({ sliRetention });
      });
    });
  });
});
