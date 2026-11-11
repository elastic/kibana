/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';
import { config } from './config';

describe('Nightshift investigations configuration', () => {
  it('enables Wiki by default', () => {
    expect(config.schema.validate({ wiki: {} }).wiki.enabled).toBe(true);
  });

  it('preserves an explicit Wiki opt-out', () => {
    expect(config.schema.validate({ wiki: { enabled: false } }).wiki.enabled).toBe(false);
  });

  it('enables learning by default', () => {
    expect(config.schema.validate({}).learning.enabled).toBe(true);
  });

  it('enables decision trees by default without requiring Wiki', () => {
    const validated = config.schema.validate({ wiki: { enabled: false }, decision_trees: {} });
    expect(validated.decision_trees.enabled).toBe(true);
    expect(validated.wiki.enabled).toBe(false);
  });

  it('preserves an explicit decision-tree opt-out', () => {
    expect(
      config.schema.validate({ decision_trees: { enabled: false } }).decision_trees.enabled
    ).toBe(false);
  });
});

describe('Nightshift investigations configuration deprecations', () => {
  it('drops the removed sandbox telemetry settings with a warning', () => {
    const deprecations = config.deprecations?.(configDeprecationFactory) ?? [];
    const levels: string[] = [];
    const { config: migrated } = applyDeprecations(
      {
        xpack: {
          nightshift_investigations: {
            wiki: { enabled: false },
            sandbox: {
              telemetry_connector_id: 'elasticsearch',
              telemetry_readable_indices: 'logs-*',
              telemetry_targets: { remote: { connector_id: 'elasticsearch' } },
              default_telemetry_target: 'remote',
            },
          },
        },
      },
      deprecations.map((deprecation) => ({
        deprecation,
        path: 'xpack.nightshift_investigations',
        context: configDeprecationsMock.createContext(),
      })),
      () =>
        ({ level }) =>
          levels.push(level)
    );

    expect(levels).toEqual(['warning']);
    const { nightshift_investigations: migratedConfig } = migrated.xpack;
    expect(migratedConfig).toEqual({ wiki: { enabled: false } });
    expect(() => config.schema.validate(migratedConfig)).not.toThrow();
  });

  it('reads the pre-rename cortex flag as the wiki flag', () => {
    const deprecations = config.deprecations?.(configDeprecationFactory) ?? [];
    const levels: string[] = [];
    const { config: migrated } = applyDeprecations(
      {
        xpack: {
          nightshift_investigations: {
            cortex: { enabled: false },
          },
        },
      },
      deprecations.map((deprecation) => ({
        deprecation,
        path: 'xpack.nightshift_investigations',
        context: configDeprecationsMock.createContext(),
      })),
      () =>
        ({ level }) =>
          levels.push(level)
    );

    expect(levels).toEqual(['warning']);
    const { nightshift_investigations: migratedConfig } = migrated.xpack;
    expect(migratedConfig).toEqual({ wiki: { enabled: false } });
    expect(config.schema.validate(migratedConfig).wiki.enabled).toBe(false);
  });
});
