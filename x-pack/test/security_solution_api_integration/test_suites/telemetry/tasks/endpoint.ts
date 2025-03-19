/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSecurityTelemetryStats } from '../../detections_response/utils';

export default ({ getService }: FtrProviderContext) => {
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Endpoint metrics and info task.', function () {
    describe('@ess @serverless Execution', () => {
      this.tags('skipServerless');
      beforeEach(async () => {
        await esArchiver
          .load('x-pack/test/security_solution_api_integration/es_archive/endpoint/metrics', {
            useCreate: true,
          })
          .catch((e) => {
            logger.error('>> Endpoint metrics and info task: load');
            logger.error(e);
          });

        await es
          .updateByQuery({
            index: '.ds-metrics-endpoint.metrics-*',
            script: {
              source:
                'ctx._source["@timestamp"] = Instant.ofEpochMilli(System.currentTimeMillis()).toString();',
            },
          })
          .catch((e) => {
            logger.error('>> Endpoint metrics and info task: update timestamps');
            logger.error(e);
          });
      });

      afterEach(async () => {
        await esArchiver
          .unload('x-pack/test/security_solution_api_integration/es_archive/endpoint/metrics')
          .catch((e) => {
            logger.error('>> Endpoint metrics and info task: unload');
            logger.error(e);
          });
      });

      it('should execute when scheduled', async () => {
        const endpoints = await getSecurityTelemetryStats(supertest, logger).then((stats) => {
          return stats.endpoints as any[];
        });
        expect(endpoints).to.not.be(undefined);
        expect(endpoints).to.length(4);
      });

      it('should execute send mandatory fields', async () => {
        const endpoints = await getSecurityTelemetryStats(supertest, logger).then((stats) => {
          return stats.endpoints as any[];
        });
        expect(endpoints).to.not.be(undefined);
        expect(endpoints).to.length(4);
        const metrics = endpoints.flat().filter((endpoint) => {
          return endpoint.endpoint_metrics !== undefined;
        });
        expect(metrics).to.length(3);
        for (const metric of metrics) {
          expect(metric.endpoint_metrics.cpu).to.not.be(undefined);
          expect(metric.endpoint_metrics.memory).to.not.be(undefined);
          expect(metric.endpoint_metrics.uptime).to.not.be(undefined);
          expect(metric.endpoint_metrics.documentsVolume).to.not.be(undefined);
          expect(metric.endpoint_metrics.maliciousBehaviorRules).to.not.be(undefined);
          expect(metric.endpoint_metrics.systemImpact).to.not.be(undefined);
          expect(metric.endpoint_metrics.threads).to.not.be(undefined);
          expect(metric.endpoint_metrics.eventFilter).to.not.be(undefined);
        }

        const topProcessTrees = metrics
          .filter((metric) => {
            return metric.endpoint_metrics.topProcessTrees !== undefined;
          })
          .map((metric) => {
            return metric.endpoint_metrics.topProcessTrees;
          });

        expect(topProcessTrees).to.length(1);

        const topProcessTree = topProcessTrees[0];
        expect(topProcessTree.values).to.length(3);

        const event = topProcessTree.values[0];
        expect(event.event_count).to.be(1726);
        expect(event.last_seen).to.be('2025-01-28T16:43:49.0Z');
        expect(event.sample.command_line).to.match(/.*python.*/);
        expect(event.sample.entity_id).to.be('CaOqGgCnYo6Wxqe5CYLRBQ');
        expect(event.sample.executable).to.be('python3.10');
        expect(event.sample.parent_command_line).to.be('-bash');
      });
    });
  });
};
