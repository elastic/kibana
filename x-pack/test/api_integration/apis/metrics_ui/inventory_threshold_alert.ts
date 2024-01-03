/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Comparator, InventoryMetricConditions } from '@kbn/infra-plugin/common/alerting/metrics';
import { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import { evaluateCondition } from '@kbn/infra-plugin/server/lib/alerting/inventory_metric_threshold/evaluate_condition';
import { InfraSource } from '@kbn/infra-plugin/server/lib/sources';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';
import { createFakeLogger } from './create_fake_logger';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  const log = getService('log');
  const logger = createFakeLogger(log);

  const baseCondition: InventoryMetricConditions = {
    metric: 'cpu',
    timeSize: 1,
    timeUnit: 'm',
    sourceId: 'default',
    threshold: [100],
    comparator: Comparator.GT,
  };

  const source: InfraSource = {
    id: 'default',
    origin: 'internal',
    configuration: {
      name: 'Default',
      description: '',
      logIndices: {
        type: 'index_pattern',
        indexPatternId: 'some-test-id',
      },
      metricAlias: 'metrics-*,metricbeat-*',
      inventoryDefaultView: 'default',
      metricsExplorerDefaultView: 'default',
      anomalyThreshold: 70,
      logColumns: [
        {
          timestampColumn: {
            id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
          },
        },
        {
          fieldColumn: {
            id: ' eb9777a8-fcd3-420e-ba7d-172fff6da7a2',
            field: 'event.dataset',
          },
        },
        {
          messageColumn: {
            id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
          },
        },
      ],
    },
  };

  const baseOptions = {
    condition: baseCondition,
    nodeType: 'host' as InventoryItemType,
    source,
    logQueryFields: void 0,
    compositeSize: 10000,
    executionTimestamp: new Date(DATES['8.0.0'].hosts_only.max),
    logger,
  };

  describe('Inventory Threshold Rule Executor', () => {
    describe('CPU per Host', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      it('should work FOR LAST 1 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          esClient,
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'cpu',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [100],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 1.109,
            context: {
              cloud: undefined,
              host: { name: 'host-0' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-0', groupId: 'group-0' },
              tags: undefined,
            },
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const options = {
          ...baseOptions,
          condition: { ...baseCondition, timeSize: 5 },
          esClient,
        };
        const results = await evaluateCondition(options);
        expect(results).to.eql({
          'host-0': {
            metric: 'cpu',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [100],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 1.0376666666666665,
            context: {
              cloud: undefined,
              host: { name: 'host-0' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-0', groupId: 'group-0' },
              tags: undefined,
            },
          },
        });
      });
    });

    describe('Inbound network traffic per host', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      it('should work FOR LAST 1 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          executionTimestamp: new Date(DATES['8.0.0'].rx.max),
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [1],
          },
          esClient,
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 79351.95,
            context: {
              cloud: undefined,
              host: { name: 'host-0', network: {} },
              container: undefined,
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 10,
            context: {
              cloud: undefined,
              host: { name: 'host-1', network: {} },
              container: undefined,
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
        });
      });
      it('should work with a long threshold', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          executionTimestamp: new Date(DATES['8.0.0'].rx.max),
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [107374182400],
            comparator: Comparator.LT,
          },
          esClient,
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [107374182400],
            comparator: '<',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 79351.95,
            context: {
              cloud: undefined,
              host: { name: 'host-0', network: {} },
              container: undefined,
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [107374182400],
            comparator: '<',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 10,
            context: {
              cloud: undefined,
              host: { name: 'host-1', network: {} },
              container: undefined,
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const options = {
          ...baseOptions,
          executionTimestamp: new Date(DATES['8.0.0'].rx.max),
          condition: {
            ...baseCondition,
            metric: 'rx' as SnapshotMetricType,
            threshold: [1],
            timeSize: 5,
          },
          esClient,
        };
        const results = await evaluateCondition(options);
        expect(results).to.eql({
          'host-0': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 125658.70833333333,
            context: {
              cloud: undefined,
              host: { name: 'host-0', network: {} },
              container: undefined,
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 11.666666666666668,
            context: {
              cloud: undefined,
              host: { name: 'host-1', network: {} },
              container: undefined,
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
        });
      });
    });

    describe('Custom rate metric per host', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      it('should work FOR LAST 1 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          condition: {
            ...baseCondition,
            metric: 'custom',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              aggregation: 'rate',
              field: 'system.network.in.bytes',
              label: 'RX',
            },
            threshold: [1],
          },
          esClient,
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'custom',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              aggregation: 'rate',
              field: 'system.network.in.bytes',
              label: 'RX',
            },
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 833.3333333333334,
            context: {
              cloud: undefined,
              host: { name: 'host-0' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-0', groupId: 'group-0' },
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'custom',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              aggregation: 'rate',
              field: 'system.network.in.bytes',
              label: 'RX',
            },
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 1000,
            context: {
              cloud: undefined,
              host: { name: 'host-1' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-1', groupId: 'group-0' },
              tags: undefined,
            },
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          condition: {
            ...baseCondition,
            metric: 'custom',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              aggregation: 'rate',
              field: 'system.network.in.bytes',
              label: 'RX',
            },
            threshold: [1],
            timeSize: 5,
          },
          esClient,
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'custom',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              aggregation: 'rate',
              field: 'system.network.in.bytes',
              label: 'RX',
            },
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 1133.3333333333333,
            context: {
              cloud: undefined,
              host: { name: 'host-0' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-0', groupId: 'group-0' },
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'custom',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              aggregation: 'rate',
              field: 'system.network.in.bytes',
              label: 'RX',
            },
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 1133.3333333333333,
            context: {
              cloud: undefined,
              host: { name: 'host-1' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-1', groupId: 'group-0' },
              tags: undefined,
            },
          },
        });
      });
    });

    describe('Log rate per host', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      it('should work FOR LAST 1 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          logQueryFields: { indexPattern: 'metricbeat-*' },
          condition: {
            ...baseCondition,
            metric: 'logRate',
            threshold: [0.1],
          },
          esClient,
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'logRate',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [0.1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 0.3,
            context: {
              cloud: undefined,
              host: { name: 'host-0' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-0', groupId: 'group-0' },
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'logRate',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [0.1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 0.3,
            context: {
              cloud: undefined,
              host: { name: 'host-1' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-1', groupId: 'group-0' },
              tags: undefined,
            },
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const options = {
          ...baseOptions,
          logQueryFields: { indexPattern: 'metricbeat-*' },
          condition: {
            ...baseCondition,
            metric: 'logRate' as SnapshotMetricType,
            threshold: [0.1],
            timeSize: 5,
          },
          esClient,
        };
        const results = await evaluateCondition(options);
        expect(results).to.eql({
          'host-0': {
            metric: 'logRate',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [0.1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 0.3,
            context: {
              cloud: undefined,
              host: { name: 'host-0' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-0', groupId: 'group-0' },
              tags: undefined,
            },
          },
          'host-1': {
            metric: 'logRate',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [0.1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 0.3,
            context: {
              cloud: undefined,
              host: { name: 'host-1' },
              container: undefined,
              orchestrator: undefined,
              labels: { eventId: 'event-1', groupId: 'group-0' },
              tags: undefined,
            },
          },
        });
      });
    });

    describe('Network rate per pod', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/pods_only'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/pods_only'));
      it('should work FOR LAST 1 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          executionTimestamp: new Date(DATES['8.0.0'].pods_only.max),
          nodeType: 'pod' as InventoryItemType,
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [1],
          },
          esClient,
        });
        expect(results).to.eql({
          '7d6d7955-f853-42b1-8613-11f52d0d2725': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 43332.833333333336,
            context: {
              cloud: undefined,
              host: undefined,
              container: [],
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
          'ed01e3a3-4787-42f6-b73e-ac9e97294e9d': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 42783.833333333336,
            context: {
              cloud: undefined,
              host: undefined,
              container: [],
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          executionTimestamp: new Date(DATES['8.0.0'].pods_only.max),
          logQueryFields: { indexPattern: 'metricbeat-*' },
          nodeType: 'pod',
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [1],
            timeSize: 5,
          },
          esClient,
        });
        expect(results).to.eql({
          '7d6d7955-f853-42b1-8613-11f52d0d2725': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 50197.666666666664,
            context: {
              cloud: undefined,
              host: undefined,
              container: [
                {
                  id: 'container-03',
                },
                {
                  id: 'container-04',
                },
              ],
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
          'ed01e3a3-4787-42f6-b73e-ac9e97294e9d': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            isError: false,
            currentValue: 50622.066666666666,
            context: {
              cloud: undefined,
              host: undefined,
              container: [
                {
                  id: 'container-01',
                },
                {
                  id: 'container-02',
                },
              ],
              orchestrator: undefined,
              labels: undefined,
              tags: undefined,
            },
          },
        });
      });
    });
  });
}
