/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';

import {
  getOpenAlerts,
  getRuleSOById,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
} from '../../../../utils';
import {
  deleteAllAlerts,
  deleteAllRules,
} from '../../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess Query type rule ESS specific logic', () => {
    before(async () => {
      await esArchiver.load(auditbeatPath);
    });

    after(async () => {
      await esArchiver.unload(auditbeatPath);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllAlerts(supertest, log, es);
    });

    describe('legacy investigation_fields', () => {
      let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;

      beforeEach(async () => {
        ruleWithLegacyInvestigationField = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFields()
        );
      });

      it('should generate alerts when rule includes legacy investigation_fields', async () => {
        // enable rule
        await supertest
          .post(DETECTION_ENGINE_RULES_BULK_ACTION)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ query: '', action: BulkActionTypeEnum.enable })
          .expect(200);

        // Confirming that enabling did not migrate rule, so rule
        // run/alerts generated here were from rule with legacy investigation field
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, ruleWithLegacyInvestigationField.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql(['client.address', 'agent.name']);

        // fetch rule for format needed to pass into
        const { body: ruleBody } = await supertest
          .get(
            `${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleWithLegacyInvestigationField.params.ruleId}`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        const alertsAfterEnable = await getOpenAlerts(supertest, log, es, ruleBody, 'succeeded');
        expect(alertsAfterEnable.hits.hits.length > 0).eql(true);
      });
    });
  });
};
