/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobStatsBarProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertJobStatsBarItem(testSubjectLabel: string, value: number) {
      const testSub = `mlStatsBarStat ${testSubjectLabel} value`;
      const visibleText = await testSubjects.getVisibleText(testSub);
      expect(visibleText).to.eql(
        value,
        `Expected job stats bar item [${testSubjectLabel}] to have visible text of [${value}], got [${visibleText}]`
      );
    },
  };
}
