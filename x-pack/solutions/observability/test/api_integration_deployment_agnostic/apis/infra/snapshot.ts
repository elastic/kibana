/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import type {
  SnapshotNodeResponse,
  SnapshotMetricInput,
  SnapshotNode,
  SnapshotNodeMetric,
  SnapshotRequest,
} from '@kbn/infra-plugin/common/http_api/snapshot_api';
import type { SupertestWithRoleScopeType } from '../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './utils/constants';
import {
  generateSemconvHostsData,
  SEMCONV_HOSTS,
  SEMCONV_HOSTS_DATA_FROM,
  SEMCONV_HOSTS_DATA_TO,
} from './utils/semconv_hosts_data';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe('POST /api/metrics/snapshot', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const fetchSnapshot = async (
      body: SnapshotRequest,
      expectedStatusCode = 200
    ): Promise<SnapshotNodeResponse | undefined> => {
      const response = await supertestWithAdminScope
        .post('/api/metrics/snapshot')
        .send(body)
        .expect(expectedStatusCode);
      return response.body;
    };

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
    });
    after(async () => {
      await supertestWithAdminScope.destroy();
    });

    describe('6.6.0', () => {
      const { min, max } = DATES['6.6.0'].docker;
      before(() =>
        esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/6.6.0/docker'
        )
      );
      after(() =>
        esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/6.6.0/docker'
        )
      );

      it('should basically work', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'container',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        });

        expect(snapshot).to.have.property('nodes');

        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(5);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property(
            'value',
            '242fddb9d376bbf0e38025d81764847ee5ec0308adfa095918fd3266f9d06c6a'
          );
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics).to.eql([
            {
              name: 'cpu',
              value: 0,
              max: 0,
              avg: 0,
              timeseries: {
                columns: [
                  {
                    name: 'timestamp',
                    type: 'date',
                  },
                  {
                    name: 'metric_0',
                    type: 'number',
                  },
                ],
                id: 'cpu',
                rows: [
                  {
                    metric_0: 0,
                    timestamp: 1547578849952,
                  },
                  {
                    metric_0: 0,
                    timestamp: 1547578909952,
                  },
                  {
                    metric_0: 0,
                    timestamp: 1547578969952,
                  },
                  {
                    metric_0: 0,
                    timestamp: 1547579029952,
                  },
                ],
              },
            },
          ]);
        }
      });
    });

    describe('8.0.0', () => {
      const { min, max } = DATES['8.0.0'].logs_and_metrics;
      before(() =>
        esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        )
      );
      after(() =>
        esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        )
      );

      it("should use the id for the label when the name doesn't exist", async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'pod',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: false,
        });

        if (!snapshot) {
          return;
        }

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(65);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property(
            'value',
            '00597dd7-a348-11e9-9a96-42010a84004d'
          );
          expect(first(firstNode.path)).to.have.property(
            'label',
            '00597dd7-a348-11e9-9a96-42010a84004d'
          );
        }
      });
      it('should have an id and label', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'container',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: false,
        });

        if (!snapshot) {
          return;
        }

        expect(snapshot).to.have.property('nodes');

        const { nodes } = snapshot;
        expect(nodes.length).to.equal(135);
        if (snapshot) {
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property(
            'value',
            '01078c21eef4194b0b96253c7c6c32796aba66e3f3f37e26ac97d1dff3e2e91a'
          );
          expect(first(firstNode.path)).to.have.property(
            'label',
            'k8s_prometheus-to-sd-exporter_fluentd-gcp-v3.2.0-wcmm4_kube-system_b214d17a-9ae0-11e9-9a96-42010a84004d_0'
          );
        }
      });

      it('should not return timeseries data - with groupBy', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [{ field: 'host.name' }],
          includeTimeseries: false,
        });

        const expected = {
          name: 'cpu',
          value: 0.44708333333333333,
          max: 0.44708333333333333,
          avg: 0.44708333333333333,
        };

        expect(snapshot).to.have.property('nodes');

        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(3);
          const firstNode = nodes[0] as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(2);
          expect(firstNode.path[0]).to.have.property(
            'value',
            'gke-observability-8--observability-8--bc1afd95-f0zc'
          );
          expect(firstNode.path[1]).to.have.property(
            'value',
            'gke-observability-8--observability-8--bc1afd95-f0zc'
          );
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics).to.eql([expected]);
        }
      });

      it('should not return timeseries data - without groupBy', async () => {
        // NOTE: `schema` is intentionally omitted here. The host `nodeFilter`
        // (see metrics_data_access `inventory_models/host/index.ts`) returns
        // `[]` when `schema` is undefined and applies an ECS module filter
        // when `schema: 'ecs'`. With `groupBy: null` the request aggregates
        // across ALL hosts in the archive, so adding the ECS module filter
        // excludes non-system docs and shifts the pinned `max`/`avg` values.
        // Other tests in this file pin `schema: 'ecs'` because their
        // assertions are per-host and unaffected by the filter.
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          groupBy: null,
          includeTimeseries: false,
        });

        const expected = {
          name: 'cpu',
          value: null,
          max: 0.47105555555555556,
          avg: 0.47105555555555556,
        };

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = nodes[0] as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(firstNode.path[0]).to.have.property('value', '*');
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics).to.eql([expected]);
        }
      });
    });

    describe('7.0.0', () => {
      const { min, max } = DATES['7.0.0'].hosts;
      before(() =>
        esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/7.0.0/hosts'
        )
      );
      after(() =>
        esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/7.0.0/hosts'
        )
      );

      it('should basically work', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        });

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
          expect(first(firstNode.path)).to.have.property('label', 'demo-stack-mysql-01');
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics).to.eql([
            {
              name: 'cpu',
              value: 0.0032,
              max: 0.0038333333333333336,
              avg: 0.003341666666666667,
              timeseries: {
                columns: [
                  {
                    name: 'timestamp',
                    type: 'date',
                  },
                  {
                    name: 'metric_0',
                    type: 'number',
                  },
                ],
                id: 'cpu',
                rows: [
                  {
                    metric_0: 0.003166666666666667,
                    timestamp: 1547571590967,
                  },
                  {
                    metric_0: 0.003166666666666667,
                    timestamp: 1547571650967,
                  },
                  {
                    metric_0: 0.0038333333333333336,
                    timestamp: 1547571710967,
                  },
                  {
                    metric_0: 0.0032,
                    timestamp: 1547571770967,
                  },
                ],
              },
            },
          ]);
        }
      });

      it('should allow for overrides for interval and ignoring lookback', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '10s',
            forceInterval: true,
            ignoreLookback: true,
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        });

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
          expect(first(firstNode.path)).to.have.property('label', 'demo-stack-mysql-01');
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics[0]).to.have.property('timeseries');
          expect(firstNode.metrics[0].timeseries?.rows.length).to.equal(56);
          const rows = firstNode.metrics[0].timeseries?.rows;
          const rowInterval = (rows?.[1]?.timestamp || 0) - (rows?.[0]?.timestamp || 0);
          expect(rowInterval).to.equal(10000);
        }
      });

      it('should allow for overrides for lookback', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
            lookbackSize: 6,
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        });

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
          expect(first(firstNode.path)).to.have.property('label', 'demo-stack-mysql-01');
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics[0]).to.have.property('timeseries');
          expect(firstNode.metrics[0].timeseries?.rows.length).to.equal(5);
        }
      });

      it('should work with custom metrics', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [
            {
              type: 'custom',
              field: 'system.cpu.user.pct',
              aggregation: 'avg',
              id: '1',
            },
          ] as SnapshotMetricInput[],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: true,
        });

        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
          expect(first(firstNode.path)).to.have.property('label', 'demo-stack-mysql-01');
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics).to.eql([
            {
              name: 'custom_0',
              value: 0.0016,
              max: 0.0018333333333333333,
              avg: 0.00165,
              timeseries: {
                columns: [
                  {
                    name: 'timestamp',
                    type: 'date',
                  },
                  {
                    name: 'metric_0',
                    type: 'number',
                  },
                ],
                id: 'custom_0',
                rows: [
                  {
                    metric_0: 0.0016666666666666668,
                    timestamp: 1547571590967,
                  },
                  {
                    metric_0: 0.0015000000000000002,
                    timestamp: 1547571650967,
                  },
                  {
                    metric_0: 0.0018333333333333333,
                    timestamp: 1547571710967,
                  },
                  {
                    metric_0: 0.0016,
                    timestamp: 1547571770967,
                  },
                ],
              },
            },
          ]);
        }
      });

      it('should basically work with 1 grouping', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [{ field: 'cloud.availability_zone' }],
          includeTimeseries: false,
        });

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(2);
          expect(first(firstNode.path)).to.have.property('value', 'virtualbox');
          expect(last(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
        }
      });

      it('should basically work with 2 groupings', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          schema: 'ecs',
          groupBy: [{ field: 'cloud.provider' }, { field: 'cloud.availability_zone' }],
          includeTimeseries: false,
        });

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(1);
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(3);
          expect(first(firstNode.path)).to.have.property('value', 'vagrant');
          expect(firstNode.path[1]).to.have.property('value', 'virtualbox');
          expect(last(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
        }
      });

      it('should show metrics for all nodes when grouping by service type', async () => {
        // NOTE: `schema` is intentionally omitted. The host `nodeFilter`
        // (see metrics_data_access `inventory_models/host/index.ts`) returns
        // `[]` when `schema` is undefined and adds an ECS module filter
        // (`event.module: system` OR `metricset.module: system`) when
        // `schema: 'ecs'`. This test asserts both `service.type: mysql` and
        // `service.type: system` groups exist; the mysql-module docs do not
        // satisfy the ECS module filter, so pinning `schema: 'ecs'` here
        // would drop the mysql group and break the assertion.
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          groupBy: [{ field: 'service.type' }],
          includeTimeseries: true,
        });

        const expected = {
          name: 'cpu',
          value: 0.0032,
          max: 0.0038333333333333336,
          avg: 0.003341666666666667,
          timeseries: {
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            id: 'cpu',
            rows: [
              {
                metric_0: 0.003166666666666667,
                timestamp: 1547571590967,
              },
              {
                metric_0: 0.003166666666666667,
                timestamp: 1547571650967,
              },
              {
                metric_0: 0.0038333333333333336,
                timestamp: 1547571710967,
              },
              {
                metric_0: 0.0032,
                timestamp: 1547571770967,
              },
            ],
          },
        };

        expect(snapshot).to.have.property('nodes');
        if (snapshot) {
          const { nodes } = snapshot;
          expect(nodes.length).to.equal(2);
          const firstNode = nodes[0] as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(2);
          expect(firstNode.path[0]).to.have.property('value', 'mysql');
          expect(firstNode.path[1]).to.have.property('value', 'demo-stack-mysql-01');
          expect(firstNode).to.have.property('metrics');
          expect(firstNode.metrics).to.eql([expected]);
          const secondNode = nodes[1] as any;
          expect(secondNode).to.have.property('path');
          expect(secondNode.path.length).to.equal(2);
          expect(secondNode.path[0]).to.have.property('value', 'system');
          expect(secondNode.path[1]).to.have.property('value', 'demo-stack-mysql-01');
          expect(secondNode).to.have.property('metrics');
          expect(secondNode.metrics).to.eql([expected]);
        }
      });
    });

    describe('semconv (OpenTelemetry hostmetricsreceiver)', () => {
      let synthtraceClient: InfraSynthtraceEsClient | undefined;
      const from = new Date(SEMCONV_HOSTS_DATA_FROM).getTime();
      const to = new Date(SEMCONV_HOSTS_DATA_TO).getTime();

      const findMetric = (node: SnapshotNode, name: string): SnapshotNodeMetric => {
        const metric = node.metrics.find((m) => m.name === name);
        if (!metric) {
          throw new Error(
            `Expected node "${
              first(node.path)?.value
            }" to expose metric "${name}", got: ${node.metrics.map((m) => m.name).join(', ')}`
          );
        }
        return metric;
      };

      before(async () => {
        synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
        await synthtraceClient.clean();
        await synthtraceClient.index(
          generateSemconvHostsData({
            from: SEMCONV_HOSTS_DATA_FROM,
            to: SEMCONV_HOSTS_DATA_TO,
            hosts: SEMCONV_HOSTS,
          })
        );
      });

      after(async () => {
        await synthtraceClient?.clean();
      });

      it('returns OTel hosts when schema=semconv (cpu)', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpuV2' }],
          nodeType: 'host',
          schema: 'semconv',
          groupBy: [],
          includeTimeseries: false,
        });

        expect(snapshot).to.be.ok();
        const { nodes } = snapshot!;

        const nodeNames = nodes.map((n) => first(n.path)?.value).sort();
        expect(nodeNames).to.eql(SEMCONV_HOSTS.map((h) => h.hostName).sort());

        const cpu = findMetric(nodes[0], 'cpuV2');
        // OTel cpu utilization is non-null because semconvHost emits state-based docs.
        expect(cpu.avg).to.be.a('number');
      });

      it('returns OTel hosts when schema=semconv (memory)', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'memory' }],
          nodeType: 'host',
          schema: 'semconv',
          groupBy: [],
          includeTimeseries: false,
        });

        expect(snapshot).to.be.ok();
        const { nodes } = snapshot!;

        const nodeNames = nodes.map((n) => first(n.path)?.value).sort();
        expect(nodeNames).to.eql(SEMCONV_HOSTS.map((h) => h.hostName).sort());

        const memory = findMetric(nodes[0], 'memory');
        expect(memory.avg).to.be.a('number');
      });
    });

    describe('request validation', () => {
      it('should return 400 when requesting more than 20 metrics', async () => {
        const { min, max } = DATES['8.0.0'].logs_and_metrics;
        await fetchSnapshot(
          {
            sourceId: 'default',
            timerange: {
              to: max,
              from: min,
              interval: '1m',
            },
            metrics: Array(21).fill({ type: 'cpu' }),
            nodeType: 'host',
            schema: 'ecs',
            groupBy: [{ field: 'service.type' }],
            includeTimeseries: true,
          },
          400
        );
      });
    });
  });
}
