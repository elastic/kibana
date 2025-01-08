/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { statusRule, tlsRule } from './data';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const server = getService('kibanaServer');

  const testActions = [
    'custom.ssl.noCustom',
    'notification-email',
    'preconfigured-es-index-action',
    'my-deprecated-servicenow',
    'my-slack1',
  ];

  describe('SyntheticsDefaultRules', () => {
    before(async () => {
      await server.savedObjects.cleanStandardList();
    });

    after(async () => {
      await server.savedObjects.cleanStandardList();
    });

    it('creates rule when settings are configured', async () => {
      await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          certExpirationThreshold: 30,
          certAgeThreshold: 730,
          defaultConnectors: testActions.slice(0, 2),
          defaultEmail: { to: ['test@gmail.com'], cc: [], bcc: [] },
        })
        .expect(200);

      const response = await supertest
        .post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send();
      const statusResult = response.body.statusRule;
      const tlsResult = response.body.tlsRule;
      expect(statusResult.actions.length).eql(4);
      expect(tlsResult.actions.length).eql(4);

      compareRules(statusResult, statusRule);
      compareRules(tlsResult, tlsRule);

      testActions.slice(0, 2).forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(statusRule, action);
        const resultAction = getActionById(statusResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });

      testActions.slice(0, 2).forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(tlsRule, action);
        const resultAction = getActionById(tlsResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });
    });

    it('updates rules when settings are updated', async () => {
      await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          certExpirationThreshold: 30,
          certAgeThreshold: 730,
          defaultConnectors: testActions,
          defaultEmail: { to: ['test@gmail.com'], cc: [], bcc: [] },
        })
        .expect(200);

      const response = await supertest
        .put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send();

      const statusResult = response.body.statusRule;
      const tlsResult = response.body.tlsRule;
      expect(statusResult.actions.length).eql(9);
      expect(tlsResult.actions.length).eql(9);

      compareRules(statusResult, statusRule);
      compareRules(tlsResult, tlsRule);

      testActions.forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(statusRule, action);
        const resultAction = getActionById(statusResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });
      testActions.forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(tlsRule, action);
        const resultAction = getActionById(tlsResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });
    });
  });
}
const compareRules = (rule1: SanitizedRule, rule2: SanitizedRule) => {
  expect(rule1.alertTypeId).eql(rule2.alertTypeId);
  expect(rule1.schedule).eql(rule2.schedule);
};

const getActionById = (rule: SanitizedRule, id: string) => {
  const actions = rule.actions.filter((action) => action.id === id);
  const recoveredAction = actions.find(
    (action) => 'group' in action && action.group === 'recovered'
  );
  const firingAction = actions.find((action) => 'group' in action && action.group !== 'recovered');
  return {
    recoveredAction: omit(recoveredAction, ['uuid']),
    firingAction: omit(firingAction, ['uuid']),
  };
};
