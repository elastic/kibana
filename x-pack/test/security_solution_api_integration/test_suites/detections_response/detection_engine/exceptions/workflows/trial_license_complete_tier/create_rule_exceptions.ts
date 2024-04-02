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
import {
  CreateExceptionListSchema,
  CreateRuleExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import {
  fetchRule,
  getSimpleRule,
  createExceptionList,
  getRuleSOById,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
  checkInvestigationFieldSoValue,
} from '../../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import {
  deleteAllExceptions,
  removeExceptionListItemServerGeneratedProperties,
} from '../../../../../lists_and_exception_lists/utils';
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
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@serverless @ess create_rule_exception_route', () => {
    before(async () => {
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('creates and associates a `rule_default` exception list to a rule if one not already found', async () => {
      const rule = await createRule(supertest, log, getSimpleRule('rule-2'));

      const { body: items } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(200);

      const udpatedRule = await fetchRule(supertest, { ruleId: rule.rule_id });
      const defaultList = udpatedRule.exceptions_list.find((list) => list.type === 'rule_default');

      const itemsWithoutServerGeneratedValues = items.map(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ({ item_id, ...restOfItem }: ExceptionListItemSchema) =>
          removeExceptionListItemServerGeneratedProperties(restOfItem)
      );
      expect(itemsWithoutServerGeneratedValues).to.eql([
        {
          comments: [],
          created_by: ELASTICSEARCH_USERNAME,
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
          list_id: defaultList?.list_id,
          namespace_type: 'single',
          os_types: [],
          tags: [],
          type: 'simple',
          updated_by: ELASTICSEARCH_USERNAME,
        },
      ]);
      expect(udpatedRule.exceptions_list.some((list) => list.type === 'rule_default')).to.eql(true);
    });

    it('creates and associates a `rule_default` exception list to a rule even when rule has non existent default list attached', async () => {
      // create a rule that has a non existent default exception list
      const rule = await createRule(supertest, log, {
        ...getSimpleRule('rule-5'),
        exceptions_list: [
          {
            id: '123',
            list_id: '456',
            namespace_type: 'single',
            type: ExceptionListTypeEnum.RULE_DEFAULT,
          },
        ],
      });

      const { body: items } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(200);

      const udpatedRule = await fetchRule(supertest, { ruleId: rule.rule_id });
      const defaultList = udpatedRule.exceptions_list.find((list) => list.type === 'rule_default');

      const itemsWithoutServerGeneratedValues = items.map(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ({ item_id, ...restOfItem }: ExceptionListItemSchema) =>
          removeExceptionListItemServerGeneratedProperties(restOfItem)
      );
      expect(udpatedRule.exceptions_list).to.eql([
        {
          id: defaultList?.id,
          list_id: defaultList?.list_id,
          type: 'rule_default',
          namespace_type: 'single',
        },
      ]);
      expect(itemsWithoutServerGeneratedValues).to.eql([
        {
          comments: [],
          created_by: ELASTICSEARCH_USERNAME,
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
          list_id: defaultList?.list_id,
          namespace_type: 'single',
          os_types: [],
          tags: [],
          type: 'simple',
          updated_by: ELASTICSEARCH_USERNAME,
        },
      ]);
    });

    it('adds exception items to rule default exception list', async () => {
      // create default exception list
      const exceptionList: CreateExceptionListSchema = {
        ...getCreateExceptionListMinimalSchemaMock(),
        list_id: 'i_exist',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.RULE_DEFAULT,
      };
      const defaultList = await createExceptionList(supertest, log, exceptionList);

      // add default exception list to rule
      const rule = await createRule(supertest, log, {
        ...getSimpleRule('rule-4'),
        exceptions_list: [
          {
            id: defaultList?.id,
            list_id: defaultList?.list_id,
            namespace_type: defaultList?.namespace_type,
            type: ExceptionListTypeEnum.RULE_DEFAULT,
          },
        ],
      });

      expect(rule.exceptions_list.some((list) => list.type === 'rule_default')).to.eql(true);

      const { body: items } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(200);

      const itemsWithoutServerGeneratedValues = items.map(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ({ item_id, ...restOfItem }: ExceptionListItemSchema) =>
          removeExceptionListItemServerGeneratedProperties(restOfItem)
      );
      expect(itemsWithoutServerGeneratedValues[0]).to.eql({
        comments: [],
        created_by: ELASTICSEARCH_USERNAME,
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
        list_id: defaultList.list_id,
        namespace_type: 'single',
        os_types: [],
        tags: [],
        type: 'simple',
        updated_by: ELASTICSEARCH_USERNAME,
      });
    });

    it('returns 500 if no rule is found to add exception list to', async () => {
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/4656dc92-5832-11ea-8e2d-0242ac130003/exceptions`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(500);

      expect(body).to.eql({
        message:
          'Unable to add exception to rule - rule with id:"4656dc92-5832-11ea-8e2d-0242ac130003" not found',
        status_code: 500,
      });
    });

    // TODO: When available this tag should be @skipInServerless
    // This use case is not relevant to serverless.
    describe('@brokenInServerless legacy investigation_fields', () => {
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

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change will
         * NOT include a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, ruleWithLegacyInvestigationField.id);
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(ruleSO, {
          field_names: ['client.address', 'agent.name'],
        });

        expect(
          ruleSO?.alert.params.exceptionsList.some((list) => list.type === 'rule_default')
        ).to.eql(true);
        expect(isInvestigationFieldMigratedInSo).to.eql(false);
      });
    });
  });
};
