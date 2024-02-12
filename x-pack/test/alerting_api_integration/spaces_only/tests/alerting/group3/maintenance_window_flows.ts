/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createRule,
  createAction,
  createMaintenanceWindow,
  getActiveMaintenanceWindows,
  finishMaintenanceWindow,
  getRuleEvents,
  expectNoActionsFired,
  runSoon,
} from './test_helpers';

// eslint-disable-next-line import/no-default-export
export default function maintenanceWindowFlowsTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('maintenanceWindowFlows', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('alerts triggered before a MW should fire actions when active or recovered during a MW', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create action and rule
      const action = await createAction({
        supertest,
        objectRemover,
      });
      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
      });

      // Run the first time - active
      await getRuleEvents({
        id: rule.id,
        action: 1,
        activeInstance: 1,
        retry,
        getService,
      });

      // Run again - active, 2 action
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

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow({
        supertest,
        objectRemover,
      });
      const activeMaintenanceWindows = await getActiveMaintenanceWindows({
        supertest,
      });
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);

      // Run again - recovered, 3 actions, fired in MW
      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        action: 3,
        activeInstance: 2,
        recoveredInstance: 1,
        retry,
        getService,
      });

      // Run again - active, 3 actions, new active action NOT fired in MW
      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        action: 3,
        activeInstance: 3,
        recoveredInstance: 1,
        retry,
        getService,
      });
    });

    it('alerts triggered within a MW should not fire actions if active or recovered during a MW', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow({
        supertest,
        objectRemover,
      });
      const activeMaintenanceWindows = await getActiveMaintenanceWindows({
        supertest,
      });
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);

      // Create action and rule
      const action = await createAction({
        supertest,
        objectRemover,
      });
      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
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

      // Run again - active
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

      // Run again - recovered
      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        activeInstance: 2,
        recoveredInstance: 1,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });

      // Run again - active again
      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        activeInstance: 3,
        recoveredInstance: 1,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });
    });

    it('alerts triggered within a MW should not fire actions if active or recovered outside a MW', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow({
        supertest,
        objectRemover,
      });
      const activeMaintenanceWindows = await getActiveMaintenanceWindows({
        supertest,
      });
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);

      // Create action and rule
      const action = await createAction({
        supertest,
        objectRemover,
      });
      const rule = await createRule({
        actionId: action.id,
        pattern,
        supertest,
        objectRemover,
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

      // End the maintenance window
      await finishMaintenanceWindow({
        id: maintenanceWindow.id,
        supertest,
      });
      const empty = await getActiveMaintenanceWindows({
        supertest,
      });
      expect(empty).eql([]);

      // Run again - active
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

      // Run again - recovered
      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        activeInstance: 2,
        recoveredInstance: 1,
        retry,
        getService,
      });

      await expectNoActionsFired({
        id: rule.id,
        supertest,
        retry,
      });

      // Run again - active again, this time fire the action since its a new alert instance
      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        action: 1,
        activeInstance: 3,
        recoveredInstance: 1,
        retry,
        getService,
      });
    });

    it('should stop alert firing actions if category ID does not match the rule type', async () => {
      const pattern = {
        instance: [true, true, false, true],
      };

      // Create active maintenance window
      const maintenanceWindow = await createMaintenanceWindow({
        overwrites: {
          category_ids: ['observability'],
        },
        supertest,
        objectRemover,
      });
      const activeMaintenanceWindows = await getActiveMaintenanceWindows({
        supertest,
      });
      expect(activeMaintenanceWindows[0].id).eql(maintenanceWindow.id);
      expect(activeMaintenanceWindows[0].category_ids).eql(['observability']);

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
      });

      // Run 4 times - firing each time
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

      await runSoon({
        id: rule.id,
        supertest,
        retry,
      });
      await getRuleEvents({
        id: rule.id,
        action: 3,
        activeInstance: 2,
        recoveredInstance: 1,
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
        action: 4,
        activeInstance: 3,
        recoveredInstance: 1,
        retry,
        getService,
      });
    });
  });
}
