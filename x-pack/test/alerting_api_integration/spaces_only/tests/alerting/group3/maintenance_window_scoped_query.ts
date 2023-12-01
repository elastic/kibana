/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createRule,
  createAction,
  createMaintenanceWindow,
  getRuleEvents,
  expectNoActionsFired,
  runSoon,
} from './test_helpers';

// eslint-disable-next-line import/no-default-export
export default function maintenanceWindowScopedQueryTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('maintenanceWindowScopedQuery', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should associate alerts muted by maintenance window scoped query', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };
      // Create active maintenance window
      await createMaintenanceWindow({
        supertest,
        objectRemover,
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: "test-rule"',
            filters: [],
          },
          category_ids: ['management'],
        },
      });

      // Create action and rule
      const action = await await createAction({
        supertest,
        objectRemover,
      });

      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
        overwrites: {
          rule_type_id: 'test.patternFiringAad',
        },
      });

      // Run the first time - active
      await getRuleEvents({
        id: rule.id,
        activeInstance: 1,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });

      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });

      await getRuleEvents({
        id: rule.id,
        activeInstance: 2,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });
    });

    it('should not associate alerts if scoped query does not match the alert', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };
      // Create active maintenance window
      await createMaintenanceWindow({
        supertest,
        objectRemover,
        overwrites: {
          scoped_query: {
            kql: 'kibana.alert.rule.name: "wrong-rule"',
            filters: [],
          },
          category_ids: ['management'],
        },
      });

      // Create action and rule
      const action = await await createAction({
        supertest,
        objectRemover,
      });

      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
        overwrites: {
          rule_type_id: 'test.patternFiringAad',
        },
      });

      // Run the first time - active - has action
      await getRuleEvents({
        id: rule.id,
        action: 1,
        activeInstance: 1,
        retry,
        getService,
      });

      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });

      await getRuleEvents({
        id: rule.id,
        action: 2,
        activeInstance: 2,
        retry,
        getService,
      });
    });
  });
}
