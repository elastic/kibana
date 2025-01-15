/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { Role, User } from '../../../../cases_api_integration/common/lib/authentication/types';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../../cases_api_integration/common/lib/authentication';
import { getUrlPrefix } from '../../../../alerting_api_integration/common/lib';
import { getTestAlertData } from '../../../lib/get_test_data';

const SPACE2 = {
  id: 'space-2',
  name: 'Space 2',
  disabledFeatures: [],
};
const ONLY_S2_ROLE: Role = {
  name: 'only_s2',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: [SPACE2.id],
      },
    ],
  },
};

const ONLY_S2_USER: User = {
  username: 'only_s2_user',
  password: 'changeme',
  roles: [ONLY_S2_ROLE.name],
};

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
  const spaces = getService('spaces');
  const pageObjects = getPageObjects(['security']);
  const supertest = getService('supertest');
  const retry = getService('retry');
  const find = getService('find');

  const ensureRuleHasRan = async (id: string, space: string) => {
    const { body } = await supertest
      .get(`${getUrlPrefix(space)}/api/alerting/rule/${id}`)
      .expect(200);
    expect(body.last_run.outcome).eql('succeeded');
  };

  async function deleteAlerts(rules: Array<{ id: string; space: string }>) {
    await asyncForEach(rules, async ({ id, space }) => {
      await supertest
        .delete(`${getUrlPrefix(space)}/api/alerting/rule/${id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  }

  describe('Shared global rule event log list', function () {
    const rulesToDelete: Array<{
      space: string;
      id: string;
    }> = [];

    before(async () => {
      await spaces.delete(SPACE2.id);
      await createUsersAndRoles(getService, [ONLY_S2_USER], [ONLY_S2_ROLE]);
      await spaces.create(SPACE2);
      await PageObjects.common.navigateToApp('triggersActionsUiExample/global_rule_event_log_list');
    });

    after(async () => {
      await deleteAlerts(rulesToDelete);
      await deleteUsersAndRoles(getService, [ONLY_S2_USER], [ONLY_S2_ROLE]);
      await spaces.delete(SPACE2.id);
      await pageObjects.security.forceLogout();
    });

    it('should load from the shareable lazy loader', async () => {
      await PageObjects.common.navigateToApp('triggersActionsUiExample/global_rule_event_log_list');
      const exists = await testSubjects.exists('ruleEventLogListTable');
      const spacesSwitchExists = await testSubjects.exists('showAllSpacesSwitch');

      expect(exists).to.be(true);
      expect(spacesSwitchExists).to.be(true);
    });

    it('should filter out rule types based on filteredRuleTypes prop and respect spaces', async () => {
      const { body: createdRule1 } = await supertest
        .post(`${getUrlPrefix('default')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            threshold: 25,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },
          consumer: 'alerts',
          schedule: {
            interval: '1m',
          },
          tags: [],
          name: 'Error count threshold',
          rule_type_id: 'apm.error_rate',
          actions: [],
        })
        .expect(200);

      rulesToDelete.push({ id: createdRule1.id, space: 'default' });

      const { body: createdRule2 } = await supertest
        .post(`${getUrlPrefix('space-2')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            threshold: 30,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },
          consumer: 'alerts',
          schedule: {
            interval: '1m',
          },
          tags: [],
          name: 'Failed transaction',
          rule_type_id: 'apm.transaction_error_rate',
          actions: [],
        })
        .expect(200);

      rulesToDelete.push({ id: createdRule2.id, space: 'space-2' });

      const { body: createdRule3 } = await supertest
        .post(`${getUrlPrefix('default')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            name: 'test-rule',
          })
        )
        .expect(200);

      rulesToDelete.push({ id: createdRule3.id, space: 'default' });

      await retry.try(async () => {
        await ensureRuleHasRan(createdRule1.id, 'default');
      });

      await retry.try(async () => {
        await ensureRuleHasRan(createdRule2.id, 'space-2');
      });

      await retry.try(async () => {
        await ensureRuleHasRan(createdRule3.id, 'default');
      });

      await PageObjects.common.navigateToApp('triggersActionsUiExample/global_rule_event_log_list');

      let ruleNameCells = await find.allByCssSelector(
        '[data-gridcell-column-id="rule_name"][data-test-subj="dataGridRowCell"]'
      );

      // Should not see the 'test-rule' since that is filtered out by filteredRuleTypes
      // Should only see default space rule: Error count threshold
      let textCellsMap: Record<string, boolean> = {};

      await asyncForEach(ruleNameCells, async (cell) => {
        const text = await cell.getVisibleText();
        textCellsMap[text] = true;
      });

      expect(textCellsMap['Error count threshold']).eql(true);
      expect(textCellsMap['Failed transaction']).eql(undefined);
      expect(textCellsMap['test-rule']).eql(undefined);

      const spacesSwitch = await testSubjects.find('showAllSpacesSwitch');
      const switchControl = await spacesSwitch.findByCssSelector('button');
      await switchControl.click();

      await PageObjects.header.waitUntilLoadingHasFinished();

      ruleNameCells = await find.allByCssSelector(
        '[data-gridcell-column-id="rule_name"][data-test-subj="dataGridRowCell"]'
      );

      // Should not see the 'test-rule' since that is filtered out by filteredRuleTypes
      // Should see both space rules: Error count threshold + Failed transaction
      textCellsMap = {};

      await asyncForEach(ruleNameCells, async (cell) => {
        const text = await cell.getVisibleText();
        textCellsMap[text] = true;
      });

      expect(textCellsMap['Error count threshold']).eql(true);
      expect(textCellsMap['Failed transaction']).eql(true);
      expect(textCellsMap['test-rule']).eql(undefined);
    });
  });
};
