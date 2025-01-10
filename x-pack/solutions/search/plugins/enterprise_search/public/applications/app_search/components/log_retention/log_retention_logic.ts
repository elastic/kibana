/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';

import { LogRetentionOptions, LogRetention, LogRetentionServer } from './types';
import { convertLogRetentionFromServerToClient } from './utils/convert_log_retention';

interface LogRetentionActions {
  clearLogRetentionUpdating(): void;
  closeModals(): void;
  fetchLogRetention(): void;
  saveLogRetention(
    option: LogRetentionOptions,
    enabled: boolean
  ): { option: LogRetentionOptions; enabled: boolean };
  setOpenedModal(option: LogRetentionOptions): { option: LogRetentionOptions };
  toggleLogRetention(option: LogRetentionOptions): { option: LogRetentionOptions };
  updateLogRetention(logRetention: LogRetention): { logRetention: LogRetention };
}

interface LogRetentionValues {
  logRetention: LogRetention | null;
  isLogRetentionUpdating: boolean;
  openedModal: LogRetentionOptions | null;
}

export const LogRetentionLogic = kea<MakeLogicType<LogRetentionValues, LogRetentionActions>>({
  path: ['enterprise_search', 'app_search', 'log_retention_logic'],
  actions: () => ({
    clearLogRetentionUpdating: true,
    closeModals: true,
    fetchLogRetention: true,
    saveLogRetention: (option, enabled) => ({ enabled, option }),
    setOpenedModal: (option) => ({ option }),
    toggleLogRetention: (option) => ({ option }),
    updateLogRetention: (logRetention) => ({ logRetention }),
  }),
  reducers: () => ({
    logRetention: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        updateLogRetention: (_, { logRetention }) => logRetention,
      },
    ],
    isLogRetentionUpdating: [
      false,
      {
        clearLogRetentionUpdating: () => false,
        closeModals: () => false,
        fetchLogRetention: () => true,
        toggleLogRetention: () => true,
      },
    ],
    openedModal: [
      null,
      {
        closeModals: () => null,
        saveLogRetention: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        setOpenedModal: (_, { option }) => option,
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchLogRetention: async (_, breakpoint) => {
      await breakpoint(100); // Prevents duplicate calls to the API (e.g., when a tooltip & callout are on the same page)

      try {
        const { http } = HttpLogic.values;
        const response = await http.get('/internal/app_search/log_settings');

        actions.updateLogRetention(
          convertLogRetentionFromServerToClient(response as LogRetentionServer)
        );
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.clearLogRetentionUpdating();
      }
    },
    saveLogRetention: async ({ enabled, option }) => {
      const updateData = { [option]: { enabled } };

      try {
        const { http } = HttpLogic.values;
        const response = await http.put('/internal/app_search/log_settings', {
          body: JSON.stringify(updateData),
        });
        actions.updateLogRetention(
          convertLogRetentionFromServerToClient(response as LogRetentionServer)
        );
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.clearLogRetentionUpdating();
      }
    },
    toggleLogRetention: ({ option }) => {
      const logRetention = values.logRetention?.[option];

      // If the user has found a way to call this before we've retrieved
      // log retention settings from the server, short circuit this and return early
      if (!logRetention) {
        return;
      }

      const optionIsAlreadyEnabled = logRetention.enabled;
      if (optionIsAlreadyEnabled) {
        actions.setOpenedModal(option);
      } else {
        actions.saveLogRetention(option, true);
      }
    },
  }),
});
