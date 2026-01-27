/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { KibanaContextProvider, useKibana } from '../../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';
import { UpdateAttacksModal } from './update_attacks_modal';

export interface ShowUpdateAttacksModalProps {
  /** Number of related alerts */
  alertsCount: number;
  /** Number of attacks being updated */
  attackDiscoveriesCount: number;
}

type ShowUpdateAttacksModalReturn = (
  props: ShowUpdateAttacksModalProps
) => Promise<{ updateAlerts: boolean } | null>;

/**
 * Hook that provides a function to show the update attacks confirmation modal if needed.
 * The modal allows users to choose whether to update only attacks or both attacks and related alerts.
 * For EASE (when hasSearchAILakeConfigurations is true), the modal is skipped and the function resolves with updateAlerts: false.
 *
 * @returns Function that shows the modal (if needed) and returns a promise that resolves to:
 *   - `null` if the user cancels or closes the modal (no update should be performed)
 *   - `{ updateAlerts: boolean }` if the user confirms or if EASE is enabled:
 *     - `{ updateAlerts: false }` when user chooses to update only attacks, or when EASE is enabled
 *     - `{ updateAlerts: true }` when user chooses to update both attacks and related alerts
 */
export const useUpdateAttacksModal = (): ShowUpdateAttacksModalReturn => {
  const { overlays, services } = useKibana();
  const { hasSearchAILakeConfigurations } = useAssistantAvailability();

  const showModalIfNeeded = useCallback(
    ({
      alertsCount,
      attackDiscoveriesCount,
    }: ShowUpdateAttacksModalProps): Promise<{
      updateAlerts: boolean;
    } | null> => {
      // For EASE, skip modal and proceed directly with updateAlerts: false
      if (hasSearchAILakeConfigurations) {
        return Promise.resolve({ updateAlerts: false });
      }

      // Show modal and wait for user decision
      return new Promise((resolve) => {
        const modalRef = overlays.openModal(
          <KibanaContextProvider services={services}>
            <UpdateAttacksModal
              alertsCount={alertsCount}
              attackDiscoveriesCount={attackDiscoveriesCount}
              onCancel={() => {
                modalRef.close();
                resolve(null);
              }}
              onClose={() => {
                modalRef.close();
                resolve(null);
              }}
              onConfirm={async ({ updateAlerts }) => {
                modalRef.close();
                resolve({ updateAlerts });
              }}
            />
          </KibanaContextProvider>
        );
      });
    },
    [overlays, services, hasSearchAILakeConfigurations]
  );

  return showModalIfNeeded;
};
