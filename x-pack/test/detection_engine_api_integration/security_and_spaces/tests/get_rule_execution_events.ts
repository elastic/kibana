/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import expect from '@kbn/expect';
import { detectionEngineRuleExecutionEventsUrl } from '../../../../plugins/security_solution/common/constants';

import { RuleExecutionStatus } from '../../../../plugins/security_solution/common/detection_engine/schemas/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('Get Rule Execution Log Events', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alias');
      await createSignalsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alias');
      await deleteSignalsIndex(supertest, log);
    });

    beforeEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    it('should return an error if rule does not exist', async () => {
      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(detectionEngineRuleExecutionEventsUrl('1'))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(404);
      expect(response.text).to.eql(
        '{"message":"Saved object [alert/1] not found","status_code":404}'
      );
    });

    it('should return execution events for a rule that has executed successfully', async () => {
      const rule = getRuleForSignalTesting(['auditbeat-*']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id);
      await waitForSignalsToBePresent(supertest, log, 1, [id]);

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(detectionEngineRuleExecutionEventsUrl(id))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].gap_duration_ms).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('succeeded');
      expect(response.body.events[0].security_message).to.eql('succeeded');
    });

    it('should return execution events for a rule that has executed in a warning state', async () => {
      const rule = getRuleForSignalTesting(['auditbeat-*', 'no-name-index']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccessOrStatus(supertest, log, id, RuleExecutionStatus['partial failure']);
      await waitForSignalsToBePresent(supertest, log, 1, [id]);

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(detectionEngineRuleExecutionEventsUrl(id))
        .set('kbn-xsrf', 'true')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.eql(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.eql(0);
      expect(response.body.events[0].gap_duration_ms).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('partial failure');
      expect(
        response.body.events[0].security_message
          .startsWith(
            'Check privileges failed to execute ResponseError: index_not_found_exception: [index_not_found_exception] Reason: no such index [no-name-index]'
          )
          .to.be(true)
      );
    });

    // TODO: Determine how to fake a failure with gap
    // it('should return execution events for a rule that has executed in a failure state with a gap', async () => {
    //   const rule = getRuleForSignalTesting(['auditbeat-*', 'no-name-index']);
    //   const { id } = await createRule(supertest, log, rule);
    //   await waitForRuleSuccessOrStatus(supertest, log, id, RuleExecutionStatus.failed);
    //   await waitForSignalsToBePresent(supertest, log, 1, [id]);
    //
    //   const start = dateMath.parse('now-24h')?.utc().toISOString();
    //   const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
    //   const response = await supertest
    //     .get(detectionEngineRuleExecutionEventsUrl(id))
    //     .set('kbn-xsrf', 'true')
    //     .query({ start, end });
    //
    //   expect(response.status).to.eql(200);
    //   expect(response.body.total).to.eql(1);
    //   expect(response.body.events[0].duration_ms).to.greaterThan(0);
    //   expect(response.body.events[0].search_duration_ms).to.eql(0);
    //   expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
    //   expect(response.body.events[0].indexing_duration_ms).to.eql(0);
    //   expect(response.body.events[0].gap_duration_ms).to.eql(0);
    //   expect(response.body.events[0].security_status).to.eql('failed');
    //   expect(response.body.events[0].security_message).to.include(
    //     'were not queried between this rule execution and the last execution, so signals may have been missed. '
    //   );
    // });

    // it('should return execution events when providing a basic filter', async () => {
    //   const rule = getRuleForSignalTesting(['auditbeat-*', 'no-name-index']);
    //   const { id } = await createRule(supertest, log, rule);
    //   await waitForRuleSuccessOrStatus(supertest, log, id, RuleExecutionStatus.failed);
    //   await waitForSignalsToBePresent(supertest, log, 1, [id]);
    //
    //   const start = dateMath.parse('now-24h')?.utc().toISOString();
    //   const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
    //   const response = await supertest
    //     .get(detectionEngineRuleExecutionEventsUrl(id))
    //     .set('kbn-xsrf', 'true')
    //     .query({ start, end });
    //
    //   expect(response.status).to.eql(200);
    //   expect(response.body.total).to.eql(1);
    //   expect(response.body.events[0].duration_ms).to.greaterThan(0);
    //   expect(response.body.events[0].search_duration_ms).to.eql(0);
    //   expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
    //   expect(response.body.events[0].indexing_duration_ms).to.eql(0);
    //   expect(response.body.events[0].gap_duration_ms).to.eql(0);
    //   expect(response.body.events[0].security_status).to.eql('failed');
    //   expect(response.body.events[0].security_message).to.include(
    //     'were not queried between this rule execution and the last execution, so signals may have been missed. '
    //   );
    // });

    // it('should return execution events when providing a complex filter references fields from multiple sub-agg documents', async () => {
    //   const rule = getRuleForSignalTesting(['auditbeat-*', 'no-name-index']);
    //   const { id } = await createRule(supertest, log, rule);
    //   await waitForRuleSuccessOrStatus(supertest, log, id, RuleExecutionStatus.failed);
    //   await waitForSignalsToBePresent(supertest, log, 1, [id]);
    //
    //   const start = dateMath.parse('now-24h')?.utc().toISOString();
    //   const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
    //   const response = await supertest
    //     .get(detectionEngineRuleExecutionEventsUrl(id))
    //     .set('kbn-xsrf', 'true')
    //     .query({ start, end });
    //
    //   expect(response.status).to.eql(200);
    //   expect(response.body.total).to.eql(1);
    //   expect(response.body.events[0].duration_ms).to.greaterThan(0);
    //   expect(response.body.events[0].search_duration_ms).to.eql(0);
    //   expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
    //   expect(response.body.events[0].indexing_duration_ms).to.eql(0);
    //   expect(response.body.events[0].gap_duration_ms).to.eql(0);
    //   expect(response.body.events[0].security_status).to.eql('failed');
    //   expect(response.body.events[0].security_message).to.include(
    //     'were not queried between this rule execution and the last execution, so signals may have been missed. '
    //   );
    // });
  });
};
