/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertJobSelection(jobOrGroupIds: string[]) {
      const selectedJobsOrGroups = await testSubjects.findAll(
        'mlJobSelectionBadges > ~mlJobSelectionBadge'
      );
      const actualJobOrGroupLabels = await Promise.all(
        selectedJobsOrGroups.map(async (badge) => await badge.getVisibleText())
      );
      expect(actualJobOrGroupLabels).to.eql(
        jobOrGroupIds,
        `Job selection should display jobs or groups '${jobOrGroupIds}' (got '${actualJobOrGroupLabels}')`
      );
    },

    async assertJobSelectionNotContains(jobOrGroupId: string) {
      const selectedJobsOrGroups = await testSubjects.findAll(
        'mlJobSelectionBadges > ~mlJobSelectionBadge'
      );
      const actualJobOrGroupLabels = await Promise.all(
        selectedJobsOrGroups.map(async (badge) => await badge.getVisibleText())
      );
      expect(actualJobOrGroupLabels).to.not.contain(
        jobOrGroupId,
        `Job selection should not contain job or group '${jobOrGroupId}' (got '${actualJobOrGroupLabels}')`
      );
    },

    async assertJobSelectionFlyoutOpen() {
      await testSubjects.existOrFail('mlJobSelectorFlyoutBody');
    },
  };
}
