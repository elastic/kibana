/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { RuleRegistrySearchResponse } from '../../../../../plugins/rule_registry/common/search_strategy';
import {
  deleteSignalsIndex,
  createSignalsIndex,
  deleteAllAlerts,
  getRuleForSignalTesting,
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccessOrStatus,
} from '../../../../detection_engine_api_integration/utils';
import { ID } from '../../../../detection_engine_api_integration/security_and_spaces/tests/generating_signals';
import { QueryCreateSchema } from '../../../../../plugins/security_solution/common/detection_engine/schemas/request';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');
  const log = getService('log');

  const SPACE1 = 'space1';

  describe('ruleRegistrySearchStrategy', () => {
    describe('logs', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      });
      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });
      it('should return alerts from log rules', async () => {
        const result = await bsearch.send<RuleRegistrySearchResponse>({
          supertest,
          options: {
            featureIds: [AlertConsumers.LOGS],
          },
          strategy: 'ruleRegistrySearchStrategy',
        });
        expect(result.rawResponse.hits.total).to.eql(5);
        const consumers = result.rawResponse.hits.hits.map((hit) => {
          return hit.fields?.['kibana.alert.rule.consumer'];
        });
        expect(consumers.every((consumer) => consumer === AlertConsumers.LOGS));
      });
    });

    /**
     * Seeing this error:
     *    │ proc [kibana] [2022-02-22T08:53:59.624-05:00][INFO ][plugins.ruleRegistry] Installing namespace-level resources and creating concrete index for .alerts-security.alerts-default
   │ info [r.suppressed] [node-01] path: /_index_template/_simulate_index/.internal.alerts-security.alerts-default-000001, params: {name=.internal.alerts-security.alerts-default-000001}
   │      java.lang.IllegalStateException: Cannot remove non-existent alias [.siem-signals-default] for index [.internal.alerts-security.alerts-default-000001]
      │ proc [kibana] [2022-02-22T08:53:59.680-05:00][ERROR][plugins.ruleRegistry] RuleDataWriterInitializationError: There has been a catastrophic error trying to install namespace level resources for the following registration context: security.
   │ proc [kibana]     This may have been due to a non-additive change to the mappings, removal and type changes are not permitted. Full error: ResponseError: illegal_state_exception: [illegal_state_exception] Reason: Cannot remove non-existent alias [.siem-signals-default] for index [.internal.alerts-security.alerts-default-000001]
   │ proc [kibana]     at prepareForWriting (/Users/chris/dev/repos/kibana/x-pack/plugins/rule_registry/server/rule_data_client/rule_data_client.ts:175:17)
     */
    describe.skip('siem', () => {
      beforeEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      it('should return alerts from siem rules', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id: createdId } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, createdId);
        await waitForSignalsToBePresent(supertest, log, 1, [createdId]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`.alerts-security.alerts-default*`]),
          rule_id: 'signal-on-signal',
        };

        const { id } = await createRule(supertest, log, ruleForSignals);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);

        const result = await bsearch.send<RuleRegistrySearchResponse>({
          supertest,
          options: {
            featureIds: [AlertConsumers.SIEM],
          },
          strategy: 'ruleRegistrySearchStrategy',
        });
        expect(result.rawResponse.hits.total).to.eql(2);
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.SIEM));
      });
    });

    describe('apm', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      });
      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
      });

      it('should return alerts from apm rules', async () => {
        const result = await bsearch.send<RuleRegistrySearchResponse>({
          supertest,
          options: {
            featureIds: [AlertConsumers.APM],
          },
          strategy: 'ruleRegistrySearchStrategy',
          space: SPACE1,
        });
        expect(result.rawResponse.hits.total).to.eql(2);
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.APM));
      });
    });

    describe('empty response', () => {
      it('should return an empty response', async () => {
        const result = await bsearch.send<RuleRegistrySearchResponse>({
          supertest,
          options: {
            featureIds: [],
          },
          strategy: 'ruleRegistrySearchStrategy',
          space: SPACE1,
        });
        expect(result.rawResponse).to.eql({});
      });
    });
  });
};
