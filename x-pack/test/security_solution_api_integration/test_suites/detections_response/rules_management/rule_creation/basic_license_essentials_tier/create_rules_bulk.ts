/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_BULK_CREATE } from '@kbn/security-solution-plugin/common/constants';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
} from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless create_rules_bulk', () => {
    describe('creating rules in bulk', () => {
      before(async () => {
        await esArchiver.load(auditbeatPath);
      });

      after(async () => {
        await esArchiver.unload(auditbeatPath);
      });

      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should create a single rule with a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRuleWithoutRuleId()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id twice', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule(), getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "rule-1" already exists',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id that already exists', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'foo')
          .set('elastic-api-version', '2023-10-31')
          .send([getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "rule-1" already exists',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });
    });
  });
};
