/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageUtils({ getService }: FtrProviderContext) {
  const find = getService('find');

  return {
    /**
     * Finds a given EuiCheckbox by test subject and clicks on it
     *
     * @param euiCheckBoxTestId
     */
    async clickOnEuiCheckbox(euiCheckBoxTestId: string) {
      // This utility is needed because EuiCheckbox forwards the test subject on to
      // the actual `<input>` which is not actually visible/accessible on the page.
      // In order to actually cause the state of the checkbox to change, the `<label>`
      // must be clicked.
      const euiCheckboxLabelElement = await find.byXPath(
        `//input[@data-test-subj='${euiCheckBoxTestId}']/../label`
      );

      await euiCheckboxLabelElement.click();
    },
  };
}
