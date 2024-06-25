/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getCustomQueryRuleParams,
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
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');
  const utils = getService('securitySolutionUtils');

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
        const { body } = await securitySolutionApi
          .bulkCreateRules({ body: [getSimpleRule()] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should create a rule with defaultable fields', async () => {
        const ruleCreateProperties = getCustomQueryRuleParams({
          rule_id: 'rule-1',
          max_signals: 200,
          setup: '# some setup markdown',
          related_integrations: [
            { package: 'package-a', version: '^1.2.3' },
            { package: 'package-b', integration: 'integration-b', version: '~1.1.1' },
          ],
          required_fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'my-non-ecs-field', type: 'keyword' },
          ],
        });

        const expectedRule = {
          ...ruleCreateProperties,
          required_fields: [
            { name: '@timestamp', type: 'date', ecs: true },
            { name: 'my-non-ecs-field', type: 'keyword', ecs: false },
          ],
        };

        const { body: createdRulesBulkResponse } = await securitySolutionApi
          .bulkCreateRules({ body: [ruleCreateProperties] })
          .expect(200);

        expect(createdRulesBulkResponse[0]).toMatchObject(expectedRule);

        const { body: createdRule } = await securitySolutionApi
          .readRule({
            query: { rule_id: 'rule-1' },
          })
          .expect(200);

        expect(createdRule).toMatchObject(expectedRule);
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await securitySolutionApi
          .bulkCreateRules({ body: [getSimpleRuleWithoutRuleId()] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id twice', async () => {
        const { body } = await securitySolutionApi
          .bulkCreateRules({ body: [getSimpleRule(), getSimpleRule()] })
          .expect(200);

        expect(body).toEqual([
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
        await securitySolutionApi.bulkCreateRules({ body: [getSimpleRule()] }).expect(200);

        const { body } = await securitySolutionApi
          .bulkCreateRules({ body: [getSimpleRule()] })
          .expect(200);

        expect(body).toEqual([
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
