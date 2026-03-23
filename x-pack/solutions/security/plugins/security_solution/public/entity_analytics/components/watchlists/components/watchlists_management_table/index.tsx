/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiHorizontalRule,
  EuiLoadingElastic,
  EuiSpacer,
  EuiCallOut,
  EuiText,
  EuiConfirmModal,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { WatchlistsFlyoutKey } from '../../../../../flyout/entity_details/shared/constants';
import { InspectButton, InspectButtonContainer } from '../../../../../common/components/inspect';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { useDeleteWatchlist, useWatchlistsTableData } from './hooks';
import { buildWatchlistsManagementTableColumns } from './columns';
import type { WatchlistTableItemType } from './types';

export const WATCHLISTS_MANAGEMENT_TABLE_ID = 'watchlistsManagementTableId';
export const WATCHLISTS_MANAGEMENT_TABLE_QUERY_ID = 'watchlistsManagementTableQueryId';

export const WatchlistsManagementTable: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { setQuery, deleteQuery } = useGlobalTime();
  const { euiTheme } = useEuiTheme();
  const { openFlyout } = useExpandableFlyoutApi();
  const { addError } = useAppToasts();
  const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
    useBoolState();
  const [pendingDelete, setPendingDelete] = useState<WatchlistTableItemType | null>(null);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'watchlistsDeleteConfirmation' });
  const onEdit = useCallback(
    (record: WatchlistTableItemType) => {
      openFlyout({
        right: {
          id: WatchlistsFlyoutKey,
          params: {
            mode: 'edit',
            watchlistId: record.id,
            spaceId,
          },
        },
      });
    },
    [openFlyout, spaceId]
  );
  const deleteMutation = useDeleteWatchlist(spaceId);

  const onDelete = useCallback(
    (record: WatchlistTableItemType) => {
      if (!record.id) {
        addError(new Error('Missing watchlist id'), {
          title: i18n.translate(
            'xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteMissingId',
            {
              defaultMessage: 'Cannot delete watchlist',
            }
          ),
        });
        return;
      }
      setPendingDelete(record);
      showDeleteConfirmation();
    },
    [addError, showDeleteConfirmation]
  );

  const onDeleteCancel = useCallback(() => {
    setPendingDelete(null);
    hideDeleteConfirmation();
  }, [hideDeleteConfirmation]);

  const onDeleteConfirm = useCallback(() => {
    if (!pendingDelete?.id) {
      onDeleteCancel();
      return;
    }
    deleteMutation.mutate(pendingDelete.id);
    setPendingDelete(null);
    hideDeleteConfirmation();
  }, [deleteMutation, hideDeleteConfirmation, onDeleteCancel, pendingDelete]);
  const columns = buildWatchlistsManagementTableColumns(euiTheme, onEdit, onDelete);
  const { visibleRecords, isLoading, hasError, refetch, inspect } = useWatchlistsTableData(
    spaceId,
    0,
    true
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: WATCHLISTS_MANAGEMENT_TABLE_QUERY_ID,
    loading: isLoading,
  });

  return (
    <InspectButtonContainer>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          {hasError && (
            <EuiCallOut
              announceOnMount
              data-test-subj="watchlistsManagementTableError"
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.error',
                {
                  defaultMessage:
                    'There was an error retrieving watchlists. Results may be incomplete.',
                }
              )}
              color="danger"
              iconType="error"
            />
          )}
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <InspectButton queryId={WATCHLISTS_MANAGEMENT_TABLE_QUERY_ID} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              {isLoading && visibleRecords.length === 0 ? (
                <EuiFlexGroup
                  justifyContent="center"
                  data-test-subj="watchlistsManagementTableLoading"
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingElastic size="l" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : visibleRecords.length > 0 ? (
                <EuiBasicTable
                  id={WATCHLISTS_MANAGEMENT_TABLE_ID}
                  data-test-subj="watchlistsManagementTable"
                  tableCaption={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.tableCaption',
                    { defaultMessage: 'Watchlists management table' }
                  )}
                  loading={isLoading}
                  items={visibleRecords || []}
                  columns={columns}
                />
              ) : (
                !isLoading && (
                  <EuiText
                    size="s"
                    color="subdued"
                    textAlign="center"
                    data-test-subj="watchlistsManagementTableEmpty"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.noData"
                      defaultMessage="No watchlists found"
                    />
                  </EuiText>
                )
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isDeleteConfirmationVisible && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteConfirmTitle',
            {
              defaultMessage: 'Delete watchlist?',
            }
          )}
          onCancel={onDeleteCancel}
          onConfirm={onDeleteConfirm}
          confirmButtonText={i18n.translate(
            'xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteConfirmButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          cancelButtonText={i18n.translate(
            'xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="watchlistsDeleteConfirmationModal"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteConfirmBody"
            defaultMessage='This action will delete "{watchlistName}". This action cannot be undone.'
            values={{ watchlistName: pendingDelete?.name ?? '' }}
          />
        </EuiConfirmModal>
      )}
    </InspectButtonContainer>
  );
};
