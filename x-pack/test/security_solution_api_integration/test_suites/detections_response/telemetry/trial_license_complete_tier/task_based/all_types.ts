/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { getSecurityTelemetryStats, removeExtraFieldsFromTelemetryStats } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  describe('@ess @serverless All task telemetry types generically', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
    });

    it('@skipInServerlessMKI should only have task metric values when no rules are running', async () => {
      await retry.try(async () => {
        const stats = await getSecurityTelemetryStats(supertest, log);
        removeExtraFieldsFromTelemetryStats(stats);

        expect(stats.detection_rules).to.eql([
          [
            {
              name: 'security:telemetry-detection-rules',
              passed: true,
            },
          ],
        ]);

        expect(stats.security_lists).to.eql([
          [
            {
              name: 'security:telemetry-lists',
              passed: true,
            },
          ],
        ]);

        expect(stats.endpoints).to.eql([
          [
            {
              name: 'security:endpoint-meta-telemetry',
              passed: true,
            },
          ],
        ]);

        expect(stats.diagnostics).to.eql([
          [
            {
              name: 'security:endpoint-diagnostics',
              passed: true,
            },
          ],
        ]);

        expect(stats.indices_metadata).to.be.an('array');
        const events = stats.indices_metadata as any[];

        expect(events).to.not.be.empty();

        const eventTypes = events.map((e) => e.eventType);
        expect(eventTypes).to.contain('telemetry_index_stats_event');
        expect(eventTypes).to.contain('telemetry_data_stream_event');

        const indicesStats = events.find((e) => e.eventType === 'telemetry_index_stats_event');
        expect(indicesStats).to.be.ok();
        expect(indicesStats.eventData).to.be.ok();
        expect(indicesStats.eventData.items).to.not.be.empty();
        expect(indicesStats.eventData.items[0]).to.have.keys(
          'index_name',
          'query_total',
          'query_time_in_millis',
          'docs_count',
          'docs_deleted',
          'docs_total_size_in_bytes'
        );

        const dataStreamStats = events.find((e) => e.eventType === 'telemetry_data_stream_event');
        expect(dataStreamStats).to.be.ok();
        expect(dataStreamStats.eventData).to.be.ok();
        expect(dataStreamStats.eventData.items).to.not.be.empty();
        expect(dataStreamStats.eventData.items[0]).to.have.keys('datastream_name', 'indices');
      });
    });
  });
};
