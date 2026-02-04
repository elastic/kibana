/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../ftr_provider_context';

export function AlertControlsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  return {
    async getControlElementById(controlId: string): Promise<WebElementWrapper> {
      const errorText = `Control frame ${controlId} could not be found`;
      let controlElement: WebElementWrapper | undefined;
      await retry.try(async () => {
        const controls = await find.allByCssSelector('[data-control-id]');
        const controlsWithIds = await Promise.all(
          controls.map(async (control) => {
            const id = await control.getAttribute('data-control-id');
            return { id, element: control };
          })
        );
        const foundControl = controlsWithIds.find(({ id }) => id === controlId);
        if (!foundControl) throw new Error(errorText);
        controlElement = foundControl.element;
      });
      if (!controlElement) throw new Error(errorText);
      return controlElement;
    },

    async hoverOverExistingControl(controlId: string) {
      const elementToHover = await this.getControlElementById(controlId);
      await retry.try(async () => {
        await elementToHover.moveMouseTo();
        await testSubjects.existOrFail(`hover-actions-${controlId}`);
      });
    },

    async clearControlSelections(controlId: string) {
      log.debug(`clearing all selections from control ${controlId}`);
      await this.hoverOverExistingControl(controlId);
      const hoverActions = await testSubjects.find(`hover-actions-${controlId}`);
      const clearButton = await testSubjects.findDescendant(
        `embeddablePanelAction-clearControl`,
        hoverActions
      );
      await clearButton.click();
    },

    async optionsListOpenPopover(controlId: string) {
      log.debug(`Opening popover for Options List: ${controlId}`);
      await retry.try(async () => {
        await testSubjects.click(`optionsList-control-${controlId}`);
        await retry.waitForWithTimeout('popover to open', 500, async () => {
          return await testSubjects.exists(`optionsList-control-popover`);
        });
      });
    },

    async optionsListPopoverAssertOpen() {
      await retry.try(async () => {
        if (!(await testSubjects.exists(`optionsList-control-available-options`))) {
          throw new Error('options list popover must be open before calling selectOption');
        }
      });
    },

    async optionsListPopoverSelectOption(availableOption: string) {
      log.debug(`selecting ${availableOption} from options list`);
      await this.optionsListPopoverAssertOpen();

      await retry.try(async () => {
        await testSubjects.existOrFail(`optionsList-control-selection-${availableOption}`);
        await testSubjects.click(`optionsList-control-selection-${availableOption}`);
      });
    },

    async isOptionsListPopoverOpen(controlId: string) {
      const isPopoverOpen = await find.existsByCssSelector(`#control-popover-${controlId}`);
      log.debug(`Is popover open: ${isPopoverOpen} for Options List: ${controlId}`);
      return isPopoverOpen;
    },

    async optionsListEnsurePopoverIsClosed(controlId: string) {
      log.debug(`Ensure popover is closed for Options List: ${controlId}`);
      await retry.try(async () => {
        const isPopoverOpen = await this.isOptionsListPopoverOpen(controlId);
        if (isPopoverOpen) {
          await testSubjects.click(`optionsList-control-${controlId}`);
          await testSubjects.waitForDeleted(`optionsList-control-available-options`);
        }
      });
    },
  };
}
