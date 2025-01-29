/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';

import {
  getCustomQueryRuleParams,
  getSimpleRule,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
  getSimpleRuleOutput,
} from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless @serverlessQA create_rules', () => {
    describe('creating rules', () => {
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
          .createRule({ body: getSimpleRule() })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
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

        const { body: createdRuleResponse } = await securitySolutionApi
          .createRule({ body: ruleCreateProperties })
          .expect(200);

        expect(createdRuleResponse).toMatchObject(expectedRule);

        const { body: createdRule } = await securitySolutionApi
          .readRule({
            query: { rule_id: 'rule-1' },
          })
          .expect(200);

        expect(createdRule).toMatchObject(expectedRule);
      });

      it('should create a single rule without an input index', async () => {
        const rule: RuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          type: 'query',
          query: 'user.name: root or user.name: admin',
        };

        const { body } = await securitySolutionApi.createRule({ body: rule }).expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(
          {
            actions: [],
            author: [],
            created_by: 'elastic',
            description: 'Simple Rule Query',
            enabled: true,
            false_positives: [],
            from: 'now-6m',
            immutable: false,
            rule_source: {
              type: 'internal',
            },
            interval: '5m',
            rule_id: 'rule-1',
            language: 'kuery',
            output_index: '',
            max_signals: 100,
            risk_score: 1,
            risk_score_mapping: [],
            name: 'Simple Rule Query',
            query: 'user.name: root or user.name: admin',
            references: [],
            related_integrations: [],
            required_fields: [],
            setup: '',
            severity: 'high',
            severity_mapping: [],
            updated_by: 'elastic',
            tags: [],
            to: 'now',
            type: 'query',
            threat: [],
            exceptions_list: [],
            version: 1,
            revision: 0,
          },
          await utils.getUsername()
        );

        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await securitySolutionApi
          .createRule({ body: getSimpleRuleWithoutRuleId() })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should cause a 409 conflict if we attempt to create the same rule_id twice', async () => {
        await securitySolutionApi.createRule({ body: getSimpleRule() }).expect(200);

        const { body } = await securitySolutionApi
          .createRule({ body: getSimpleRule() })
          .expect(409);

        expect(body).toEqual({
          message: 'rule_id: "rule-1" already exists',
          status_code: 409,
        });
      });

      describe('max_signals', () => {
        beforeEach(async () => {
          await deleteAllRules(supertest, log);
        });

        it('creates a rule with max_signals defaulted to 100 when not present', async () => {
          const { body } = await securitySolutionApi
            .createRule({
              body: getCustomQueryRuleParams(),
            })
            .expect(200);

          expect(body.max_signals).toEqual(100);
        });

        it('does NOT create a rule when max_signals is less than 1', async () => {
          const { body } = await securitySolutionApi
            .createRule({
              body: {
                ...getCustomQueryRuleParams(),
                max_signals: 0,
              },
            })
            .expect(400);

          expect(body.message).toBe(
            '[request body]: max_signals: Number must be greater than or equal to 1'
          );
        });
      });

      describe('required_fields', () => {
        it('creates a rule with required_fields defaulted to an empty array when not present', async () => {
          const customQueryRuleParams = getCustomQueryRuleParams({
            rule_id: 'rule-without-required-fields',
          });

          expect(customQueryRuleParams.required_fields).toBeUndefined();

          const { body } = await securitySolutionApi
            .createRule({
              body: customQueryRuleParams,
            })
            .expect(200);

          expect(body.required_fields).toEqual([]);

          const { body: createdRule } = await securitySolutionApi
            .readRule({
              query: { rule_id: 'rule-without-required-fields' },
            })
            .expect(200);

          expect(createdRule.required_fields).toEqual([]);
        });
      });
    });
  });
};
