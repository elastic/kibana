/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WATCH_IDS,
  WATCH_TIER_TAGS,
  WatchSettings,
} from '@kbn/pnd-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { watchRegistry } from './watch_registry';

describe('watchRegistry', () => {
  it('registers durable settings for every managed watch', () => {
    expect(watchRegistry.list()).toHaveLength(5);
    for (const watchId of SYSTEM_SECURITY_WATCH_IDS) {
      expect(watchRegistry.get(watchId)?.settings).toBeDefined();
    }
  });

  it('builds not-installed rows from the catalog rather than mock fixtures', () => {
    for (const registration of watchRegistry.list()) {
      const catalog = SYSTEM_SECURITY_WATCH_CATALOG.find(({ id }) => id === registration.id);
      expect(catalog).toBeDefined();
      expect(registration.watch).toEqual(
        expect.objectContaining({
          id: catalog?.id,
          name: catalog?.name,
          color: catalog?.color,
          enabled: false,
          callables: [],
          coverage: [],
          recentRuns: [],
          metrics: { lastRun: null },
        })
      );
    }
  });

  it('does not silently strip undeclared settings projection keys', () => {
    for (const registration of watchRegistry.list()) {
      if (!registration.settings) continue;

      const projected = registration.settings.toSettings(
        registration.settings.createDefaultValues()
      );
      expect(WatchSettings.parse(projected)).toEqual(projected);
    }
  });

  it.each(SYSTEM_SECURITY_WATCH_IDS)('renders %s settings into the managed YAML', (watchId) => {
    const definition = getManagedWorkflowDefinition(watchId);
    if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
      throw new Error(`Watch "${watchId}" must be registered as a managed YAML template`);
    }

    const registration = watchRegistry.get(watchId);
    if (!registration?.settings) {
      throw new Error(`Watch "${watchId}" must register settings`);
    }

    const baseValues = registration.settings.createDefaultValues();
    const manualYaml = definition.yamlTemplate({
      ...baseValues,
      autonomyLevel: 'manual',
    });
    const supervisedYaml = definition.yamlTemplate({
      ...baseValues,
      autonomyLevel: 'supervised',
    });

    expect(supervisedYaml).not.toBe(manualYaml);
    expect(
      (parse(manualYaml) as { consts: { watch_policy: unknown } }).consts.watch_policy
    ).toMatchObject({
      settingsVersion: 1,
      autonomy: 'manual',
    });
    expect(supervisedYaml).not.toContain('__WATCH_AUTONOMY_LEVEL__');
  });

  it.each(SYSTEM_SECURITY_WATCH_IDS)('leaves no unrendered %s template token', (watchId) => {
    const definition = getManagedWorkflowDefinition(watchId);
    const registration = watchRegistry.get(watchId);
    if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
      throw new Error(`Watch "${watchId}" must be registered as a managed YAML template`);
    }
    if (!registration?.settings) {
      throw new Error(`Watch "${watchId}" must register settings`);
    }

    const rendered = definition.yamlTemplate(registration.settings.createDefaultValues());

    expect(rendered).not.toMatch(/__WATCH_[A-Z0-9_]+__/);
  });

  it('requires every managed watch to carry exactly one tier tag', () => {
    for (const registration of watchRegistry.list()) {
      const definition = getManagedWorkflowDefinition(registration.id);
      if (!definition) throw new Error(`Missing managed definition for "${registration.id}"`);

      let yaml: string;
      if ('yaml' in definition && typeof definition.yaml === 'string') {
        yaml = definition.yaml;
      } else if ('yamlTemplate' in definition && typeof definition.yamlTemplate === 'function') {
        if (!registration.settings) {
          throw new Error(`Missing template settings for "${registration.id}"`);
        }
        yaml = definition.yamlTemplate(registration.settings.createDefaultValues());
      } else {
        throw new Error(`Managed definition "${registration.id}" has no YAML source`);
      }

      const parsed = parse(yaml) as { tags?: unknown };
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const tierTags = tags.filter(
        (tag): tag is string =>
          typeof tag === 'string' && (WATCH_TIER_TAGS as readonly string[]).includes(tag)
      );
      expect(tierTags).toHaveLength(1);
    }
  });
});
