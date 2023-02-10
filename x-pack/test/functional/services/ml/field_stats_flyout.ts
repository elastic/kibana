/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export type MlFieldStatsFlyout = ProvidedType<typeof MachineLearningFieldStatsFlyoutProvider>;

export function MachineLearningFieldStatsFlyoutProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    // @todo: remove if not needed
    async clickFieldStatButtonTrigger(
      parentComboBoxSelector: string,
      fieldName: string,
      fieldType?: 'keyword' | 'date' | 'number'
    ) {
      const selector = `mlInspectFieldStatsButton-${fieldName}`;

      await retry.tryForTime(2000, async () => {
        const fieldTarget = await testSubjects.find(parentComboBoxSelector);
        await comboBox.openOptionsList(fieldTarget);

        await testSubjects.existOrFail(selector);
        await testSubjects.click(selector);
        await testSubjects.existOrFail('mlFieldStatsFlyout');

        await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-title`);

        if (fieldType === 'date') {
          await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-histogram`);
        } else {
          await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-topValues`);
        }

        if (fieldType === 'number') {
          await testSubjects.existOrFail(
            `mlFieldStatsFlyoutContent ${fieldName}-buttonGroup-distributionButton`
          );
          expect(
            await find.existsByCssSelector('[data-test-subj="mlFieldStatsFlyoutContent"] .echChart')
          ).to.eql(true);
        }
      });
    },
  };
}
