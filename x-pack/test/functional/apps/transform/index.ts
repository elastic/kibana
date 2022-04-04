/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  TransformLatestConfig,
  TransformPivotConfig,
} from '../../../../plugins/transform/common/types/transform';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('transform', function () {
    this.tags(['ciGroup21', 'transform']);

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await transform.securityUI.logout();

      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();

      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');

      await transform.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./permissions'));
    loadTestFile(require.resolve('./creation_index_pattern'));
    loadTestFile(require.resolve('./creation_saved_search'));
    loadTestFile(require.resolve('./creation_runtime_mappings'));
    loadTestFile(require.resolve('./cloning'));
    loadTestFile(require.resolve('./editing'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./deleting'));
    loadTestFile(require.resolve('./starting'));
  });
}
export interface ComboboxOption {
  identifier: string;
  label: string;
}

export interface GroupByEntry extends ComboboxOption {
  intervalLabel?: string;
}

export interface BaseTransformTestData {
  type: 'pivot' | 'latest';
  suiteTitle: string;
  source: string;
  transformId: string;
  transformDescription: string;
  expected: any;
  destinationIndex: string;
  destinationDataViewTimeField?: string;
  discoverAdjustSuperDatePicker: boolean;
}

export interface PivotTransformTestData extends BaseTransformTestData {
  groupByEntries: GroupByEntry[];
  aggregationEntries: any[];
}

export interface LatestTransformTestData extends BaseTransformTestData {
  uniqueKeys: ComboboxOption[];
  sortField: ComboboxOption;
}

export function isPivotTransformTestData(arg: any): arg is PivotTransformTestData {
  return arg.type === 'pivot';
}

export function isLatestTransformTestData(arg: any): arg is LatestTransformTestData {
  return arg.type === 'latest';
}

export function getPivotTransformConfig(
  prefix: string,
  continuous?: boolean
): TransformPivotConfig {
  const timestamp = Date.now();
  return {
    id: `ec_${prefix}_pivot_${timestamp}_${continuous ? 'cont' : 'batch'}`,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: { 'products.base_price.avg': { avg: { field: 'products.base_price' } } },
    },
    description: `ecommerce ${
      continuous ? 'continuous' : 'batch'
    } transform with avg(products.base_price) grouped by terms(category.keyword)`,
    dest: { index: `user-ec_2_${timestamp}` },
    ...(continuous ? { sync: { time: { field: 'order_date', delay: '60s' } } } : {}),
  };
}

export function getLatestTransformConfig(
  prefix: string,
  continuous?: boolean
): TransformLatestConfig {
  const timestamp = Date.now();
  return {
    id: `ec_${prefix}_latest_${timestamp}_${continuous ? 'cont' : 'batch'}`,
    source: { index: ['ft_ecommerce'] },
    latest: {
      unique_key: ['category.keyword'],
      sort: 'order_date',
    },
    description: `ecommerce ${
      continuous ? 'continuous' : 'batch'
    } transform with category unique key and sorted by order date`,
    frequency: '3s',
    settings: {
      max_page_search_size: 250,
    },
    dest: { index: `user-ec_3_${timestamp}` },
    ...(continuous ? { sync: { time: { field: 'order_date', delay: '60s' } } } : {}),
  };
}
