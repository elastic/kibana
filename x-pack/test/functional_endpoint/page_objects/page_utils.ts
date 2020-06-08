/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageUtils({ getService }: FtrProviderContext) {
  const find = getService('find');
  const log = getService('log');

  return {
    /**
     * Finds a given EuiCheckbox by test subject and clicks on it
     *
     * @param euiCheckBoxTestId
     */
    async clickOnEuiCheckbox(euiCheckBoxTestId: string) {
      // FIXME: this method is extreemly slow - fix it
      const checkboxes = await find.allByCssSelector('.euiCheckbox');
      const silentCatch = () => {};

      log.debug(`Found ${checkboxes.length} EuiCheckbox's`);

      for (const checkbox of checkboxes) {
        log.debug('Checking EuiCheckBox');
        const checkBoxInput: WebElementWrapper | void = await checkbox
          .findByTestSubject(euiCheckBoxTestId)
          .catch(silentCatch);
        if (checkBoxInput !== undefined) {
          log.debug(`Found EuiCheckBox with data-test-subj=${euiCheckBoxTestId}`);

          const labelElement = await checkbox.findByCssSelector('.euiCheckbox__label');

          // Want to ensure that the Click actually did an update - case the internals of
          // EuiCheckbox change in the future
          const beforeClickIsChecked = await checkBoxInput.isSelected();
          await labelElement.click();
          const afterClickIsChecked = await checkBoxInput.isSelected();
          if (beforeClickIsChecked === afterClickIsChecked) {
            throw new Error('click did not update checkbox!');
          }
          return checkbox;
        }
      }
      throw new Error(`EuiCheckbox with data-test-subj of [${euiCheckBoxTestId}] not found!`);
    },
  };
}
