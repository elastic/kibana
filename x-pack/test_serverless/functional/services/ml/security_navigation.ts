/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProviderSecurity({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  async function navigateToArea(id: string) {
    await testSubjects.click('~panelOpener-deepLinkId-securitySolutionUI:machine_learning-landing');
    await testSubjects.existOrFail(`~solutionSideNavPanelLink-ml:${id}`, {
      timeout: 60 * 1000,
    });
    await testSubjects.click(`~solutionSideNavPanelLink-ml:${id}`);
  }

  return {
    async navigateToAnomalyDetection() {
      await navigateToArea('anomalyDetection');
    },
    async navigateToDataFrameAnalytics() {
      await navigateToArea('dataFrameAnalytics');
    },
    async navigateToTrainedModels() {
      await navigateToArea('nodesOverview');
    },
  };
}
