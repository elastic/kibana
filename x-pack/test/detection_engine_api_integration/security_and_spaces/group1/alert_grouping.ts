/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { RuleExecutionStatus } from '@kbn/security-solution-plugin/common/detection_engine/rule_monitoring';
import { QueryCreateSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { getCreateRulesSchemaMock } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request/rule_schemas.mock';
import { get } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getOpenSignals,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  /**
   * Tests for alert grouping (alert-per-entity) functionality
   */
  describe('alert_grouping', () => {
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

    it('should group by "host.name" and distribute evenly', async () => {
      const createdRule = await createRule(supertest, log, {
        ...getCreateRulesSchemaMock('rule-1'),
        query: '*',
        from: 'now-100000h',
        max_signals: 5,
        alert_grouping: {
          groupBy: ['host.name'],
        },
      } as QueryCreateSchema);

      await waitForRuleSuccessOrStatus(
        supertest,
        log,
        createdRule.id,
        RuleExecutionStatus.succeeded
      );

      await waitForSignalsToBePresent(supertest, log, 2, [createdRule.id]);

      const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
      expect(signalsOpen.hits.hits.length).eql(5);

      const hits = signalsOpen.hits.hits;
      expect(get(hits[0]._source, 'host.name')).eql('suricata-zeek-sensor-toronto');
      expect(get(hits[1]._source, 'host.name')).eql('suricata-sensor-london');
      expect(get(hits[2]._source, 'host.name')).eql('suricata-sensor-amsterdam');
      expect(get(hits[3]._source, 'host.name')).eql('zeek-sensor-amsterdam');
      expect(get(hits[4]._source, 'host.name')).eql('zeek-sensor-san-francisco');
    });
  });
};
