/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { orderBy } from 'lodash';
import { RuleExecutionStatusEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import {
  EqlRuleCreateProps,
  QueryRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';

import { getOpenAlerts, getEqlRuleForAlertTesting } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  createRule,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  getRuleForAlertTesting,
  getAlertsByIds,
  waitForRulePartialFailure,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');
  /**
   * Tests around timestamps within alerts such as the copying of timestamps correctly into
   * the "signal.original_time" field, ensuring that timestamp overrides operate, and ensuring that
   * partial errors happen correctly
   */
  describe('@ess @serverless timestamp usage during execution', () => {
    describe('alerts generated from events with a timestamp in seconds is converted correctly into the forced ISO8601 format when copying', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_in_seconds'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_5'
        );
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_in_seconds'
        );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_5'
        );
      });

      describe('KQL query', () => {
        it('should convert the @timestamp which is epoch_seconds into the correct ISO format', async () => {
          const rule = getRuleForAlertTesting(['timestamp_in_seconds']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).to.eql(['2021-06-02T23:33:15.000Z']);
        });

        it('should still use the @timestamp field even with an override field. It should never use the override field', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfakeindex-5']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).to.eql(['2020-12-16T15:16:18.000Z']);
        });
      });

      describe('EQL query', () => {
        it('should convert the @timestamp which is epoch_seconds into the correct ISO format for EQL', async () => {
          const rule = getEqlRuleForAlertTesting(['timestamp_in_seconds']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
          expect(hits).to.eql(['2021-06-02T23:33:15.000Z']);
        });

        it('should still use the @timestamp field even with an override field. It should never use the override field', async () => {
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['myfakeindex-5']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsOpen = await getAlertsByIds(supertest, log, [id]);
          const hits = alertsOpen.hits.hits.map((hit) => hit._source?.[ALERT_ORIGINAL_TIME]).sort();
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
    describe('alerts generated from events with timestamp override field', async () => {
      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await createAlertsIndex(supertest, log);
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
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
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
        it('should generate alerts with event.ingested, @timestamp and (event.ingested + timestamp)', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfa*']),
            timestamp_override: 'event.ingested',
          };

          const { id } = await createRule(supertest, log, rule);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 3, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id], 3);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
          const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

          expect(alertsOrderedByEventId.length).equal(3);
        });

        it('should generate 2 alerts with event.ingested when timestamp fallback is disabled', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfa*']),
            rule_id: 'rule-without-timestamp-fallback',
            timestamp_override: 'event.ingested',
            timestamp_override_fallback_disabled: true,
          };

          const { id } = await createRule(supertest, log, rule);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id], 2);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
          const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

          expect(alertsOrderedByEventId.length).equal(2);
        });

        it('should generate 2 alerts with @timestamp', async () => {
          const rule: QueryRuleCreateProps = getRuleForAlertTesting(['myfa*']);

          const { id } = await createRule(supertest, log, rule);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id]);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
          const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

          expect(alertsOrderedByEventId.length).equal(2);
        });

        it('should generate 2 alerts when timestamp override does not exist', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfa*']),
            timestamp_override: 'event.fakeingestfield',
          };
          const { id } = await createRule(supertest, log, rule);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id, id]);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
          const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

          expect(alertsOrderedByEventId.length).equal(2);
        });

        it('should not generate any alerts when timestamp override does not exist and timestamp fallback is disabled', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfa*']),
            rule_id: 'rule-without-timestamp-fallback',
            timestamp_override: 'event.fakeingestfield',
            timestamp_override_fallback_disabled: true,
          };

          const createdRule = await createRule(supertest, log, rule);
          const alertsOpen = await getOpenAlerts(
            supertest,
            log,
            es,
            createdRule,
            RuleExecutionStatusEnum['partial failure']
          );
          expect(alertsOpen.hits.hits.length).eql(0);
        });

        /**
         * We should not use the timestamp override as the "original_time" as that can cause
         * confusion if you have both a timestamp and an override in the source event. Instead the "original_time"
         * field should only be overridden by the "timestamp" since when we generate a alert
         * and we add a new timestamp to the alert.
         */
        it('should NOT use the timestamp override as the "original_time"', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['myfakeindex-2']),
            timestamp_override: 'event.ingested',
          };
          const { id } = await createRule(supertest, log, rule);

          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id, id]);
          const hits = alertsResponse.hits.hits
            .map((hit) => hit._source?.[ALERT_ORIGINAL_TIME])
            .sort();
          expect(hits).to.eql([undefined]);
        });
      });

      describe('EQL', () => {
        it('should generate 2 alerts with @timestamp', async () => {
          const rule: EqlRuleCreateProps = getEqlRuleForAlertTesting(['myfa*']);

          const { id } = await createRule(supertest, log, rule);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id]);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
          const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

          expect(alertsOrderedByEventId.length).equal(2);
        });

        it('should generate 2 alerts when timestamp override does not exist', async () => {
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['myfa*']),
            timestamp_override: 'event.fakeingestfield',
          };
          const { id } = await createRule(supertest, log, rule);

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 2, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id, id]);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);
          const alertsOrderedByEventId = orderBy(alerts, 'alert.parent.id', 'asc');

          expect(alertsOrderedByEventId.length).equal(2);
        });

        it('should not generate any alerts when timestamp override does not exist and timestamp fallback is disabled', async () => {
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['myfa*']),
            timestamp_override: 'event.fakeingestfield',
            timestamp_override_fallback_disabled: true,
          };
          const createdRule = await createRule(supertest, log, rule);
          const alertsOpen = await getOpenAlerts(
            supertest,
            log,
            es,
            createdRule,
            RuleExecutionStatusEnum['partial failure']
          );
          expect(alertsOpen.hits.hits.length).eql(0);
        });
      });
    });

    describe('alerts generated from events with timestamp override field and ensures search_after continues to work when documents are missing timestamp override field', () => {
      before(async () => {
        await esArchiver.load(path);
      });

      after(async () => {
        await esArchiver.unload(path);
      });

      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
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
        it('should generate 200 alerts when timestamp override does not exist', async () => {
          const rule: QueryRuleCreateProps = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            timestamp_override: 'event.fakeingested',
            max_signals: 200,
          };

          const { id } = await createRule(supertest, log, rule);
          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          await waitForAlertsToBePresent(supertest, log, 200, [id]);
          const alertsResponse = await getAlertsByIds(supertest, log, [id], 200);
          const alerts = alertsResponse.hits.hits.map((hit) => hit._source);

          expect(alerts.length).equal(200);
        });
      });
    });
  });
};
