/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';
import { InfraTimerangeInput } from '@kbn/infra-plugin/common/http_api/snapshot_api';
import { InventoryMetric } from '@kbn/metrics-data-access-plugin/common';
import { NodeDetailsMetricDataResponse } from '@kbn/infra-plugin/common/http_api/node_details_api';
import type { SupertestWithRoleScopeType } from '../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

import { DATES } from './utils/constants';

const { min, max } = DATES['8.0.0'].pods_only;

interface NodeDetailsRequest {
  metrics: InventoryMetric[];
  nodeId: string;
  nodeType: string;
  sourceId: string;
  timerange: InfraTimerangeInput;
  cloudId?: string;
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('API /api/metrics/node_details', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/pods_only'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/pods_only'
      );
      await supertestWithAdminScope.destroy();
    });

    const fetchNodeDetails = async (
      body: NodeDetailsRequest,
      expectedStatusCode = 200
    ): Promise<NodeDetailsMetricDataResponse | undefined> => {
      const response = await supertestWithAdminScope
        .post('/api/metrics/node_details')

        .send(body)
        .expect(expectedStatusCode);
      return response.body;
    };

    it('should basically work', async () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['podCpuUsage'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: '7d6d7955-f853-42b1-8613-11f52d0d2725',
        nodeType: 'pod',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }
        expect(resp.metrics.length).to.equal(1);
        const metric = first(resp.metrics) as any;
        expect(metric).to.have.property('id', 'podCpuUsage');
        expect(metric).to.have.property('series');
        const series = first(metric.series) as any;
        expect(series).to.have.property('id', 'cpu');
        expect(series).to.have.property('data');
        const datapoint = last(series.data) as any;
        expect(datapoint).to.have.property('timestamp', 1642698890000);
        expect(datapoint).to.have.property('value', 0.544);
      });
    });

    it('should support multiple metrics', async () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['podCpuUsage', 'podMemoryUsage'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: '7d6d7955-f853-42b1-8613-11f52d0d2725',
        nodeType: 'pod',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }

        expect(resp.metrics.length).to.equal(2);
      });
    });

    it('should return multiple values for podOverview metric', () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['podOverview'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: '7d6d7955-f853-42b1-8613-11f52d0d2725',
        nodeType: 'pod',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }

        const podOverviewMetric = resp.metrics.find((metric) => metric.id === 'podOverview');

        expect(podOverviewMetric?.series.length).to.be.greaterThan(1);
      });
    });

    it('should use fallback when cpu.usage.limit.pct is missing', async () => {
      // This pod has no kubernetes.pod.cpu.usage.limit.pct field
      // So the CPU aggregation should fall back to kubernetes.pod.cpu.usage.node.pct
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['podCpuUsage'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: 'fallback-test-pod-12345-67890-abcdef',
        nodeType: 'pod',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }

        expect(resp.metrics.length).to.equal(1);
        const metric = first(resp.metrics) as any;
        expect(metric).to.have.property('id', 'podCpuUsage');
        expect(metric).to.have.property('series');
        const series = first(metric.series) as any;
        expect(series).to.have.property('id', 'cpu');
        expect(series).to.have.property('data');

        // Verify we got data - the fallback to node.pct should have worked
        expect(series.data.length).to.be.greaterThan(0);

        // The CPU values should be around 0.75 (from node.pct, not limit.pct)
        const datapoint = last(series.data) as any;
        expect(datapoint).to.have.property('value');
        expect(datapoint.value).to.be.within(0.6, 0.9);
      });
    });
  });
}
