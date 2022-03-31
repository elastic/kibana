/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { convertToKibanaClient } from '@kbn/test';
import {
  Comparator,
  InventoryMetricConditions,
} from '../../../../plugins/infra/common/alerting/metrics';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../plugins/infra/common/inventory_models/types';
import { evaluateCondition } from '../../../../plugins/infra/server/lib/alerting/inventory_metric_threshold/evaluate_condition';
import { InfraSource } from '../../../../plugins/infra/server/lib/sources';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

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
      fields: {
        message: ['message'],
      },
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
    startTime: DATES['8.0.0'].hosts_only.max,
  };

  describe('Inventory Threshold Rule Executor', () => {
    describe('CPU per Host', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/hosts_only'));
      it('should work FOR LAST 1 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          esClient: convertToKibanaClient(esClient),
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'cpu',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [100],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 1.109,
          },
          'host-1': {
            metric: 'cpu',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [100],
            comparator: '>',
            shouldFire: [false],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 0.7703333333333333,
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const options = {
          ...baseOptions,
          condition: { ...baseCondition, timeSize: 5 },
          esClient: convertToKibanaClient(esClient),
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
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 1.0376666666666665,
          },
          'host-1': {
            metric: 'cpu',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [100],
            comparator: '>',
            shouldFire: [false],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 0.9192,
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
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [1],
          },
          esClient: convertToKibanaClient(esClient),
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 1666.6666666666667,
          },
          'host-1': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 2000,
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const options = {
          ...baseOptions,
          condition: {
            ...baseCondition,
            metric: 'rx' as SnapshotMetricType,
            threshold: [1],
            timeSize: 5,
          },
          esClient: convertToKibanaClient(esClient),
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
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 2266.6666666666665,
          },
          'host-1': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 2266.6666666666665,
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
            threshold: [1],
          },
          esClient: convertToKibanaClient(esClient),
        });
        expect(results).to.eql({
          'host-0': {
            metric: 'logRate',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [false],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 0.3,
          },
          'host-1': {
            metric: 'logRate',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [false],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 0.3,
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
            threshold: [1],
            timeSize: 5,
          },
          esClient: convertToKibanaClient(esClient),
        };
        const results = await evaluateCondition(options);
        expect(results).to.eql({
          'host-0': {
            metric: 'logRate',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [false],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 0.3,
          },
          'host-1': {
            metric: 'logRate',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [false],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 0.3,
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
          startTime: DATES['8.0.0'].pods_only.max,
          nodeType: 'pod' as InventoryItemType,
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [1],
          },
          esClient: convertToKibanaClient(esClient),
        });
        expect(results).to.eql({
          '7d6d7955-f853-42b1-8613-11f52d0d2725': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 43332.833333333336,
          },
          'ed01e3a3-4787-42f6-b73e-ac9e97294e9d': {
            metric: 'rx',
            timeSize: 1,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 42783.833333333336,
          },
        });
      });
      it('should work FOR LAST 5 minute', async () => {
        const results = await evaluateCondition({
          ...baseOptions,
          startTime: DATES['8.0.0'].pods_only.max,
          logQueryFields: { indexPattern: 'metricbeat-*' },
          nodeType: 'pod',
          condition: {
            ...baseCondition,
            metric: 'rx',
            threshold: [1],
            timeSize: 5,
          },
          esClient: convertToKibanaClient(esClient),
        });
        expect(results).to.eql({
          '7d6d7955-f853-42b1-8613-11f52d0d2725': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 50197.666666666664,
          },
          'ed01e3a3-4787-42f6-b73e-ac9e97294e9d': {
            metric: 'rx',
            timeSize: 5,
            timeUnit: 'm',
            sourceId: 'default',
            threshold: [1],
            comparator: '>',
            shouldFire: [true],
            shouldWarn: [false],
            isNoData: [false],
            isError: false,
            currentValue: 50622.066666666666,
          },
        });
      });
    });
  });
}
