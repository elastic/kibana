/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProviderObservability({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  // const appsMenu = getService('appsMenu');
  // const browser = getService('browser');
  // const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  // const PageObjects = getPageObjects(['common', 'header', 'discover']);

  async function navigateToAnomalyDetectionArea() {
    await testSubjects.click('~nav-item-id-aiops');
    await testSubjects.existOrFail('~nav-item-id-ml:anomalyDetection', { timeout: 60 * 1000 });
    await testSubjects.click('~nav-item-id-ml:anomalyDetection');
  }

  return {
    async navigateToAnomalyDetection() {
      // await this.navigateToArea('~mlMainTab & ~anomalyDetection', 'mlPageJobManagement');
      await navigateToAnomalyDetectionArea();
    },
  };
}
