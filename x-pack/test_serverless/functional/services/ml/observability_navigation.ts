/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProviderObservability({
  getService,
  getPageObject,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');

  async function navigateToArea(id: string) {
    await svlCommonNavigation.sidenav.openSection('observability_project_nav.aiops');
    await testSubjects.existOrFail(`~nav-item-observability_project_nav.aiops.ml:${id}`, {
      timeout: 60 * 1000,
    });
    await testSubjects.click(`~nav-item-observability_project_nav.aiops.ml:${id}`);
  }

  return {
    async navigateToAnomalyDetection() {
      await navigateToArea('anomalyDetection');
    },
  };
}
