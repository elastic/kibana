/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  WATCH_TIER_TAGS,
} from '@kbn/pnd-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { watchRegistry } from './watch_registry';
import { watchFloorSettings } from './watches';

describe('watchRegistry', () => {
  it('registers the managed catalog while limiting durable settings to the converted watch', () => {
    expect(watchRegistry.list()).toHaveLength(5);
    expect(watchRegistry.get(SYSTEM_SECURITY_WATCH_FLOOR_ID)?.settings).toBe(watchFloorSettings);
    expect(watchRegistry.get(SYSTEM_SECURITY_WATCH_OFFICER_ID)?.settings).toBeUndefined();
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
