/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import { useGetWatchlists } from '../../../../entity_analytics/api/hooks/use_get_watchlists';
import { useWatchlistsPrivileges } from '../../../../entity_analytics/api/hooks/use_watchlists_privileges';
import { getApiErrorMessage } from '../../watchlists_right/utils';

interface ManageEntityWatchlistsModalProps {
  entityId: string;
  assignedWatchlistIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onWatchlistsChanged: () => Promise<unknown> | void;
}

interface WatchlistOption extends EuiComboBoxOptionOption<string> {
  id: string;
}

export const ManageEntityWatchlistsModal = ({
  entityId,
  assignedWatchlistIds,
  isOpen,
  onClose,
  onOpen,
  onWatchlistsChanged,
}: ManageEntityWatchlistsModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const isWatchlistsEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsWatchlistEnabled');
  const { data: watchlists = [] } = useGetWatchlists();
  const { data: privileges } = useWatchlistsPrivileges();
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { assignWatchlistEntities, unassignWatchlistEntities } = useEntityAnalyticsRoutes();

  const watchlistOptions = useMemo<WatchlistOption[]>(
    () =>
      watchlists.flatMap((watchlist) =>
        watchlist.id ? [{ id: watchlist.id, label: watchlist.name }] : []
      ),
    [watchlists]
  );
  const initialSelection = useMemo(
    () => watchlistOptions.filter(({ id }) => assignedWatchlistIds.includes(id)),
    [assignedWatchlistIds, watchlistOptions]
  );
  const [selectedWatchlists, setSelectedWatchlists] = useState<WatchlistOption[]>(initialSelection);

  useEffect(() => {
    setSelectedWatchlists(initialSelection);
  }, [initialSelection]);

  const mutation = useMutation({
    mutationFn: async () => {
      const selectedIds = new Set(selectedWatchlists.map(({ id }) => id));
      const assignedIds = new Set(assignedWatchlistIds);
      const availableIds = new Set(watchlistOptions.map(({ id }) => id));
      const removedIds = assignedWatchlistIds.filter(
        (watchlistId) => availableIds.has(watchlistId) && !selectedIds.has(watchlistId)
      );
      const addedIds = [...selectedIds].filter((watchlistId) => !assignedIds.has(watchlistId));

      for (const watchlistId of removedIds) {
        const response = await unassignWatchlistEntities({
          watchlistId,
          body: { euids: [entityId] },
        });
        if (response.failed > 0) {
          throw new Error(
            response.items.find((item) => item.error)?.error ??
              i18n.translate(
                'xpack.securitySolution.flyout.entityDetails.manageWatchlists.updateErrorMessage',
                { defaultMessage: 'Unable to update watchlists' }
              )
          );
        }
      }

      for (const watchlistId of addedIds) {
        const response = await assignWatchlistEntities({
          watchlistId,
          body: { euids: [entityId] },
        });
        if (response.failed > 0 || response.not_found > 0) {
          throw new Error(
            response.items.find((item) => item.error)?.error ??
              i18n.translate(
                'xpack.securitySolution.flyout.entityDetails.manageWatchlists.updateErrorMessage',
                { defaultMessage: 'Unable to update watchlists' }
              )
          );
        }
      }
    },
    onSuccess: async () => {
      await onWatchlistsChanged();
      toasts.addSuccess({
        title: i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.manageWatchlists.successToastTitle',
          { defaultMessage: 'Watchlists updated' }
        ),
      });
      onClose();
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.manageWatchlists.errorToastTitle',
          { defaultMessage: 'Failed to update watchlists' }
        ),
        toastMessage: getApiErrorMessage(error),
      });
    },
  });

  if (!isWatchlistsEnabled || !privileges?.has_all_required) {
    return null;
  }

  if (!isOpen) {
    return (
      <EuiButtonEmpty
        size="xs"
        flush="left"
        onClick={onOpen}
        data-test-subj="manageEntityWatchlistsButton"
      >
        {i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.grid.manageWatchlistsButtonLabel',
          { defaultMessage: 'Manage' }
        )}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="manageEntityWatchlistsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.manageWatchlists.modalTitle',
            {
              defaultMessage: 'Manage watchlists',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.manageWatchlists.selectorLabel',
            { defaultMessage: 'Watchlists' }
          )}
        >
          <EuiComboBox
            options={watchlistOptions}
            selectedOptions={selectedWatchlists}
            onChange={setSelectedWatchlists}
            isDisabled={mutation.isLoading}
            data-test-subj="manageEntityWatchlistsComboBox"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} disabled={mutation.isLoading}>
          {i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.manageWatchlists.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
        </EuiButton>
        <EuiButton
          fill
          onClick={() => mutation.mutate()}
          isLoading={mutation.isLoading}
          data-test-subj="saveEntityWatchlistsButton"
        >
          {i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.manageWatchlists.saveButtonLabel',
            { defaultMessage: 'Save' }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
