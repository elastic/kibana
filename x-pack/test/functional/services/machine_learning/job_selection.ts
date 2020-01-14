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
    async assertSelectedJobBadges(expectedBadgesLabels: string[]) {
      const selectedBadges = await testSubjects.findAll(
        'mlJobSelectionBadges > ~mlJobSelectionBadge'
      );
      const actualBadgesLabels = await Promise.all(
        selectedBadges.map(async badge => await badge.getVisibleText())
      );
      expect(actualBadgesLabels).to.eql(
        expectedBadgesLabels,
        `Job selection should display badges '${expectedBadgesLabels}' (got '${actualBadgesLabels}')`
      );
    },
  };
}
