/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EventExecutor } from '@xstate/test';
import type { LogIndexReference } from '@kbn/infra-plugin/common/log_views';
import type { AnyEventObject } from 'xstate';
import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import type {
  ExpectedIndexStatus,
  LogStreamPageTestMachineContextWithLogView,
  LogViewDescriptor,
} from './infra_logs_page';

export function InfraLogsSettingsPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['header']);

  /**
   * Page
   */
  async function getPage(): Promise<WebElementWrapper> {
    return await testSubjects.find('sourceConfigurationContent');
  }

  /**
   * Name
   */
  async function getNameInput(): Promise<WebElementWrapper> {
    return await testSubjects.findDescendant('~nameInput', await getForm());
  }

  /**
   * Indices
   */
  async function switchToIndexNamesMode() {
    await testSubjects.click('logSettingsIndexNamesCard');
  }
  async function setIndexNames(indexNames: string) {
    await testSubjects.setValue('logIndicesInput', indexNames);
  }

  /**
   * Columns
   */
  async function getAddLogColumnButton(): Promise<WebElementWrapper> {
    return await testSubjects.findDescendant('~addLogColumnButton', await getForm());
  }
  async function getAddLogColumnPopover(): Promise<WebElementWrapper> {
    return await testSubjects.find('~addLogColumnPopover');
  }
  async function addTimestampLogColumn() {
    // try to open the popover
    const popover = await retry.try(async () => {
      await (await getAddLogColumnButton()).click();
      return await getAddLogColumnPopover();
    });

    // try to select the timestamp field
    await retry.try(async () => {
      await (await testSubjects.findDescendant('~addTimestampLogColumn', popover)).click();
    });

    // wait for timestamp panel to show up
    await testSubjects.findDescendant('~systemLogColumnPanel:Timestamp', await getForm());
  }
  async function addFieldLogColumn(fieldName: string) {
    // try to open the popover
    const popover = await retry.try(async () => {
      await (await getAddLogColumnButton()).click();
      return await getAddLogColumnPopover();
    });

    // try to select the given field
    await retry.try(async () => {
      await (await testSubjects.findDescendant('~fieldSearchInput', popover)).type(fieldName);
      await (await testSubjects.findDescendant(`~addFieldLogColumn:${fieldName}`, popover)).click();
    });

    // wait for field panel to show up
    await testSubjects.findDescendant(`~fieldLogColumnPanel:${fieldName}`, await getForm());
  }
  async function getLogColumnPanels(): Promise<WebElementWrapper[]> {
    return await testSubjects.findAllDescendant('~logColumnPanel', await getForm());
  }
  async function removeLogColumn(columnIndex: number) {
    const logColumnPanel = (await getLogColumnPanels())[columnIndex];
    await (await testSubjects.findDescendant('~removeLogColumnButton', logColumnPanel)).click();
    await testSubjects.waitForDeleted(logColumnPanel);
  }
  async function removeAllLogColumns() {
    for (const _ of await getLogColumnPanels()) {
      await removeLogColumn(0);
    }
  }
  async function moveLogColumn(sourceIndex: number, destinationIndex: number) {
    const KEY_PRESS_DELAY_MS = 500; // This may need to be high for Jenkins; 100 works on desktop

    const logColumnPanel = (await getLogColumnPanels())[sourceIndex];
    const moveLogColumnHandle = await testSubjects.findDescendant(
      '~moveLogColumnHandle',
      logColumnPanel
    );
    await moveLogColumnHandle.focus();
    const movementDifference = destinationIndex - sourceIndex;
    await moveLogColumnHandle.pressKeys(browser.keys.SPACE);
    for (let i = 0; i < Math.abs(movementDifference); i++) {
      await new Promise((res) => setTimeout(res, KEY_PRESS_DELAY_MS));
      if (movementDifference > 0) {
        await moveLogColumnHandle.pressKeys(browser.keys.ARROW_DOWN);
      } else {
        await moveLogColumnHandle.pressKeys(browser.keys.ARROW_UP);
      }
    }
    await moveLogColumnHandle.pressKeys(browser.keys.SPACE);
    await new Promise((res) => setTimeout(res, KEY_PRESS_DELAY_MS));
  }

  /**
   * Form
   */
  async function getForm(): Promise<WebElementWrapper> {
    return await testSubjects.find('~sourceConfigurationContent');
  }
  async function saveConfiguration() {
    await (await testSubjects.findDescendant('~applySettingsButton', await getForm())).click();

    await retry.try(async () => {
      const element = await testSubjects.findDescendant('~applySettingsButton', await getForm());
      return !(await element.isEnabled());
    });
  }

  const modelStateAssertions = {
    onLogSettingsPage: async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();
      expect(await getPage()).to.be.ok();
    },
    'onLogSettingsPage.withUnchangedSettings': async () => {
      expect(await testSubjects.isEnabled('~applySettingsButton')).to.be(false);
    },
    'onLogSettingsPage.withChangedSettings': async () => {
      expect(await testSubjects.isEnabled('~applySettingsButton')).to.be(true);
    },
  };

  const modelTransitionEffects: Record<
    LogsSettingsPageTestMachineEvent['type'],
    EventExecutor<unknown, LogsSettingsPageTestMachineEvent | AnyEventObject>
  > = {
    changeIndexReference: async ({ state, event }) => {
      if (event.type !== 'changeIndexReference') {
        throw new Error(`Unexpected event type: ${event.type}`);
      }

      if (event.newIndexReference.type === 'index_name') {
        await switchToIndexNamesMode();
        await setIndexNames(event.newIndexReference.indexName);
      } else {
        throw new Error('Not implemented');
      }
    },
    saveSettings: async ({ state, event }) => {
      await saveConfiguration();
    },
  };

  return {
    addFieldLogColumn,
    addTimestampLogColumn,
    getAddLogColumnButton,
    getAddLogColumnPopover,
    getForm,
    getLogColumnPanels,
    getNameInput,
    getPage,
    modelStateAssertions,
    modelTransitionEffects,
    moveLogColumn,
    removeAllLogColumns,
    removeLogColumn,
    saveConfiguration,
    setIndexNames,
    switchToIndexNamesMode,
  };
}

export interface LogsSettingsPageTestMachineContextWithChangedLogView {
  changedLogView: LogViewDescriptor;
}

export type LogsSettingsPageTestMachineTypestate =
  | {
      value: 'onLogsSettingsPage' | { onLogsSettingsPage: 'withUnchangedSettings' };
      context: LogStreamPageTestMachineContextWithLogView;
    }
  | {
      value: { onLogsSettingsPage: 'withChangedSettings' };
      context: LogStreamPageTestMachineContextWithLogView &
        LogsSettingsPageTestMachineContextWithChangedLogView;
    };

export type LogsSettingsPageTestMachineEvent =
  | {
      type: 'changeIndexReference';
      newIndexReference: LogIndexReference;
      expextedIndexStatus: ExpectedIndexStatus;
    }
  | { type: 'saveSettings' };
