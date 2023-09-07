/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header', 'home']);

  describe('Sample data in serverless', function () {
    it('Sample data loads', async () => {
      await PageObjects.home.addSampleDataSet('ecommerce');
      const ecommerce = await PageObjects.home.isSampleDataSetInstalled('ecommerce');
      expect(ecommerce).toBe(true);
    });
  });
}
