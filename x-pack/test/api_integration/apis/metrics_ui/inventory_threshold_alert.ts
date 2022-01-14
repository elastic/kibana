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
} from '../../../../plugins/infra/server/lib/alerting/inventory_metric_threshold/types';
import { InfraSource } from '../../../../plugins/infra/server/lib/sources';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';
import { evaluateCondition } from '../../../../plugins/infra/server/lib/alerting/inventory_metric_threshold/evaluate_condition';
import { InventoryItemType } from '../../../../plugins/infra/common/inventory_models/types';

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
      metricAlias: 'metricbeat-*',
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

  // TODO: Need a test for: host rx, pods rx, logRate

  describe('Inventory Threshold Rule Executor', () => {
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
          shouldFire: [false],
          shouldWarn: [false],
          isNoData: [false],
          isError: false,
          currentValue: 0.8713333333333334,
        },
        'host-1': {
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
          currentValue: 1.1636666666666668,
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
          currentValue: 1.0622333333333334,
        },
        'host-1': {
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
          currentValue: 1.0942666666666665,
        },
      });
    });
  });
}
