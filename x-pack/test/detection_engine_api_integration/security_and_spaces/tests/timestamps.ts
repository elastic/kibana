/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { orderBy } from 'lodash';
import { RuleExecutionStatus } from '../../../../plugins/security_solution/common/detection_engine/schemas/common';
import {
  EqlCreateSchema,
  QueryCreateSchema,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { ALERT_ORIGINAL_TIME } from '../../../../plugins/security_solution/common/field_maps/field_names';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  createRule,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getRuleForSignalTesting,
  getSignalsByIds,
  getEqlRuleForSignalTesting,
} from '../../utils';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  /**
   * Tests around timestamps within signals such as the copying of timestamps correctly into
   * the "signal.original_time" field, ensuring that timestamp overrides operate, and ensuring that
   * partial errors happen correctly
   */
  describe('timestamp tests', () => {
    describe('Signals generated from events with a timestamp in seconds is converted correctly into the forced ISO8601 format when copying', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_in_seconds'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_5'
        );
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_in_seconds'
        );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_5'
        );
      });

      describe('KQL query', () => {
        it('should convert the @timestamp which is epoch_seconds into the correct ISO format', async () => {
          const rule = getRuleForSignalTesting(['timestamp_in_seconds']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const hits = signalsOpen.hits.hits
            .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
            .sort();
          expect(hits).to.eql(['2021-06-02T23:33:15.000Z']);
        });

        it('should still use the @timestamp field even with an override field. It should never use the override field', async () => {
          const rule: QueryCreateSchema = {
            ...getRuleForSignalTesting(['myfakeindex-5']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const hits = signalsOpen.hits.hits
            .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
            .sort();
          expect(hits).to.eql(['2020-12-16T15:16:18.000Z']);
        });
      });

      describe('EQL query', () => {
        it('should convert the @timestamp which is epoch_seconds into the correct ISO format for EQL', async () => {
          const rule = getEqlRuleForSignalTesting(['timestamp_in_seconds']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const hits = signalsOpen.hits.hits
            .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
            .sort();
          expect(hits).to.eql(['2021-06-02T23:33:15.000Z']);
        });

        it('should still use the @timestamp field even with an override field. It should never use the override field', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['myfakeindex-5']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const hits = signalsOpen.hits.hits
            .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
            .sort();
          expect(hits).to.eql(['2020-12-16T15:16:18.000Z']);
        });
      });
    });

    /**
     * Here we test the functionality of timestamp overrides. If the rule specifies a timestamp override,
     * then the documents will be queried and sorted using the timestamp override field.
     * If no timestamp override field exists in the indices but one was provided to the rule,
     * the rule's query will additionally search for events using the `@timestamp` field
     */
    describe('Signals generated from events with timestamp override field', async () => {
      beforeEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await createSignalsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_1'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_2'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_3'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_4'
        );
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_1'
        );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_2'
        );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_3'
        );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_4'
        );
      });

      describe('KQL', () => {
        it('should generate signals with event.ingested, @timestamp and (event.ingested + timestamp)', async () => {
          const rule: QueryCreateSchema = {
            ...getRuleForSignalTesting(['myfa*']),
            timestamp_override: 'event.ingested',
          };

          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id], 3);
          const signals = signalsResponse.hits.hits.map((hit) => hit._source);
          const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

          expect(signalsOrderedByEventId.length).equal(3);
        });

        it('should generate 2 signals with @timestamp', async () => {
          const rule: QueryCreateSchema = getRuleForSignalTesting(['myfa*']);

          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id]);
          const signals = signalsResponse.hits.hits.map((hit) => hit._source);
          const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

          expect(signalsOrderedByEventId.length).equal(2);
        });

        it('should generate 2 signals when timestamp override does not exist', async () => {
          const rule: QueryCreateSchema = {
            ...getRuleForSignalTesting(['myfa*']),
            timestamp_override: 'event.fakeingestfield',
          };
          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id, id]);
          const signals = signalsResponse.hits.hits.map((hit) => hit._source);
          const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

          expect(signalsOrderedByEventId.length).equal(2);
        });

        /**
         * We should not use the timestamp override as the "original_time" as that can cause
         * confusion if you have both a timestamp and an override in the source event. Instead the "original_time"
         * field should only be overridden by the "timestamp" since when we generate a signal
         * and we add a new timestamp to the signal.
         */
        it('should NOT use the timestamp override as the "original_time"', async () => {
          const rule: QueryCreateSchema = {
            ...getRuleForSignalTesting(['myfakeindex-2']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccessOrStatus(supertest, log, id);
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id, id]);
          const hits = signalsResponse.hits.hits
            .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
            .sort();
          expect(hits).to.eql([undefined]);
        });
      });

      describe('EQL', () => {
        it('should generate 2 signals with @timestamp', async () => {
          const rule: EqlCreateSchema = getEqlRuleForSignalTesting(['myfa*']);

          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id]);
          const signals = signalsResponse.hits.hits.map((hit) => hit._source);
          const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

          expect(signalsOrderedByEventId.length).equal(2);
        });

        it('should generate 2 signals when timestamp override does not exist', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['myfa*']),
            timestamp_override: 'event.fakeingestfield',
          };
          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id, id]);
          const signals = signalsResponse.hits.hits.map((hit) => hit._source);
          const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

          expect(signalsOrderedByEventId.length).equal(2);
        });
      });
    });

    describe('Signals generated from events with timestamp override field and ensures search_after continues to work when documents are missing timestamp override field', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      describe('KQL', () => {
        /**
         * This represents our worst case scenario where this field is not mapped on any index
         * We want to check that our logic continues to function within the constraints of search after
         * Elasticsearch returns java's long.MAX_VALUE for unmapped date fields
         * Javascript does not support numbers this large, but without passing in a number of this size
         * The search_after will continue to return the same results and not iterate to the next set
         * So to circumvent this limitation of javascript we return the stringified version of Java's
         * Long.MAX_VALUE so that search_after does not enter into an infinite loop.
         *
         * ref: https://github.com/elastic/elasticsearch/issues/28806#issuecomment-369303620
         */
        it('should generate 200 signals when timestamp override does not exist', async () => {
          const rule: QueryCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            timestamp_override: 'event.fakeingested',
            max_signals: 200,
          };

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          await sleep(5000);
          await waitForSignalsToBePresent(supertest, log, 200, [id]);
          const signalsResponse = await getSignalsByIds(supertest, log, [id], 200);
          const signals = signalsResponse.hits.hits.map((hit) => hit._source);

          expect(signals.length).equal(200);
        });
      });
    });
  });
};
