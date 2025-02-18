/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';

import { inventoryViewSavedObjectType } from './inventory_view_saved_object';

describe('invetoryViewSavedObject model version transformation', () => {
  let migrator: ModelVersionTestMigrator;
  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: inventoryViewSavedObjectType });
  });

  describe('model veresion 2', () => {
    const inventoryViewV2 = {
      id: 'someId',
      type: 'inventory-view',
      attributes: {
        metric: { type: 'cpu' },
        sort: { by: 'name', direction: 'desc' },
        groupBy: [],
        nodeType: 'host',
        view: 'map',
        customOptions: [],
        customMetrics: [],
        boundsOverride: { min: 0, max: 1 },
        autoBounds: true,
        accountId: '',
        region: '',
        autoReload: false,
        filterQuery: { expression: '', kind: 'kuery' },
        legend: { palette: 'cool', reverseColors: false, steps: 18 },
        timelineOpen: false,
        name: 'test',
      },
      references: [],
    };

    it('should clamp legend.steps to 18 when converting from v1 to v2', () => {
      const inventoryViewV1 = JSON.parse(JSON.stringify(inventoryViewV2));
      inventoryViewV1.attributes.legend.steps = 20;
      const migrated = migrator.migrate({
        document: {
          ...inventoryViewV1,
          attributes: {
            ...inventoryViewV1.attributes,
          },
        },
        fromVersion: 1,
        toVersion: 2,
      });
      expect(migrated.attributes).toEqual(inventoryViewV2.attributes);
    });
  });
});
