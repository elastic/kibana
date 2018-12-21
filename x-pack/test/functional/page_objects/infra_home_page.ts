/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import testSubjSelector from '@kbn/test-subj-selector';
import Keys from 'leadfoot/keys';
import moment from 'moment';

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function InfraHomePageProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async goToTime(time: number) {
      const datePickerInput = await find.byCssSelector(
        `${testSubjSelector('waffleDatePicker')} .euiDatePicker.euiFieldText`
      );

      await datePickerInput.type(Array(30).fill(Keys.BACKSPACE));
      await datePickerInput.type([moment(time).format('L LTS'), Keys.RETURN]);
    },

    async getWaffleMap() {
      return await testSubjects.find('waffleMap');
    },

    async getNoMetricsIndicesPrompt() {
      return await testSubjects.find('noMetricsIndicesPrompt');
    },

    async getNoMetricsDataPrompt() {
      return await testSubjects.find('noMetricsDataPrompt');
    },
  };
}
