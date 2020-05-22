/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { TransformPivotConfig } from '../../../../plugins/transform/public/app/common';

function getTransformConfig(): TransformPivotConfig {
  const date = Date.now();
  return {
    id: `ec_2_${date}`,
    source: { index: ['ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: { 'products.base_price.avg': { avg: { field: 'products.base_price' } } },
    },
    description:
      'ecommerce batch transform with avg(products.base_price) grouped by terms(category.keyword)',
    dest: { index: `user-ec_2_${date}` },
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('cloning', function () {
    this.tags(['smoke']);
    const transformConfig = getTransformConfig();

    before(async () => {
      await esArchiver.load('ml/ecommerce');
      await transform.api.createAndRunTransform(transformConfig);
      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await esArchiver.unload('ml/ecommerce');
      await transform.api.deleteIndices(transformConfig.dest.index);
      await transform.api.cleanTransformIndices();
    });

    const testDataList = [
      {
        suiteTitle: 'batch transform with terms group and avg agg',
        expected: {},
      },
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        after(async () => {
          // await transform.api.deleteIndices(<CLONE_DEST_INDEX>);
        });

        it('loads the home page', async () => {
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();
        });
      });
    }
  });
}
