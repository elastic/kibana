/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { TransformLatestConfig } from '../../../../plugins/transform/common/types/transform';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('transform', function () {
    this.tags(['ciGroup9', 'transform']);

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();

      await transform.testResources.deleteSavedSearches();

      await transform.testResources.deleteIndexPatternByTitle('ft_farequote');
      await transform.testResources.deleteIndexPatternByTitle('ft_ecommerce');

      await esArchiver.unload('ml/farequote');
      await esArchiver.unload('ml/ecommerce');

      await transform.testResources.resetKibanaTimeZone();
      await transform.securityUI.logout();
    });

    loadTestFile(require.resolve('./creation_index_pattern'));
    loadTestFile(require.resolve('./creation_saved_search'));
    loadTestFile(require.resolve('./cloning'));
    loadTestFile(require.resolve('./editing'));
    loadTestFile(require.resolve('./feature_controls'));
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

export function getLatestTransformConfig(): TransformLatestConfig {
  const timestamp = Date.now();
  return {
    id: `ec_cloning_2_${timestamp}`,
    source: { index: ['ft_ecommerce'] },
    latest: {
      unique_key: ['category.keyword'],
      sort: 'order_date',
    },
    description: 'ecommerce batch transform with category unique key and sorted by order date',
    frequency: '3s',
    settings: {
      max_page_search_size: 250,
    },
    dest: { index: `user-ec_3_${timestamp}` },
  };
}
