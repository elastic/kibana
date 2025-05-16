/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { CreateRuleExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  getRuleSOById,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
} from '../../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

const getRuleExceptionItemMock = (): CreateRuleExceptionListItemSchema => ({
  description: 'Exception item for rule default exception list',
  entries: [
    {
      field: 'some.not.nested.field',
      operator: 'included',
      type: 'match',
      value: 'some value',
    },
  ],
  name: 'Sample exception item',
  type: 'simple',
});

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess create rule exception routes, ESS specific logic', () => {
    before(async () => {
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('legacy investigation_fields', () => {
      let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        ruleWithLegacyInvestigationField = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFields()
        );
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('creates and associates a `rule_default` exception list to a rule with a legacy investigation_field', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/${ruleWithLegacyInvestigationField.id}/exceptions`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            items: [getRuleExceptionItemMock()],
          })
          .expect(200);

        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, ruleWithLegacyInvestigationField.id);

        expect(
          ruleSO?.alert.params.exceptionsList.some((list) => list.type === 'rule_default')
        ).to.eql(true);
      });
    });
  });
};
