/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_IDS,
  WATCH_TAG,
} from '@kbn/pnd-common';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { workerRegistry } from './worker_registry';

describe('workerRegistry', () => {
  it('registers every catalog Worker exactly once', () => {
    expect(workerRegistry.list().map(({ id }) => id)).toEqual([...SYSTEM_SECURITY_WORKER_IDS]);
  });

  it.each(SYSTEM_SECURITY_WORKER_CATALOG)(
    '$id exists, carries Watch tags, and renders supported values into YAML',
    (catalog) => {
      const registration = workerRegistry.get(catalog.id);
      if (!registration) {
        throw new Error(`Worker "${catalog.id}" is not registered`);
      }
      expect(registration.catalog).toEqual(catalog);

      const definition = getManagedWorkflowDefinition(catalog.id);
      if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
        throw new Error(`Worker "${catalog.id}" is missing a yamlTemplate`);
      }

      const values = registration.settings.createDefaultValues();
      const yaml = definition.yamlTemplate(values);
      const parsed = parse(yaml) as {
        tags?: string[];
        consts?: { worker_settings?: Record<string, unknown> };
      };

      expect(parsed.tags).toEqual(expect.arrayContaining([WATCH_TAG, catalog.watchTag]));
      expect(parsed.consts?.worker_settings).toEqual(
        expect.objectContaining({
          settingsVersion: 1,
          autonomy: 'manual',
        })
      );

      expect(yaml).not.toContain('candidateLimit');
    }
  );
});
