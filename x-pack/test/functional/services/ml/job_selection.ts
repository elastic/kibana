/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  };
}
