/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { getEbtProps } from '@kbn/ebt-click';
import type { FlagHistoryItem, FlagSnapshot } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { FEATURE_FLAGS_EBT_ACTIONS, FEATURE_FLAGS_EBT_ELEMENT } from '../ebt';
import { cancelButtonLabel } from '../labels';
import { paths } from '../paths';
import { useAppServices } from '../app_services';
import { useAsyncData } from '../use_async_data';
import {
  describeFlagHistoryChange,
  flagDefinitionFromSnapshot,
  type FlagHistoryChange,
} from './flag_history_change';
import { FlagHistoryDetails, FlagHistorySummary } from './flag_history_details';

const previousSnapshot = (
  items: FlagHistoryItem[],
  index: number,
  older: FlagSnapshot | undefined
): FlagSnapshot | undefined =>
  items[index + 1]?.snapshot ?? (index === items.length - 1 ? older : undefined);

export const FlagHistoryPage = () => {
  const history = useHistory();
  const { flagKey = '' } = useParams<{ flagKey: string }>();
  const { api, notifications, canSave } = useAppServices();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [pendingRestore, setPendingRestore] = useState<FlagHistoryItem>();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<FeatureFlagsApiError>();
  const restoreTitleId = useGeneratedHtmlId();

  const load = useCallback(
    () => api.getFlagHistory(flagKey, page, perPage),
    [api, flagKey, page, perPage]
  );
  const historyQuery = useAsyncData(load);
  const items = historyQuery.data?.items ?? [];

  const changes = useMemo(() => {
    const pageItems = historyQuery.data?.items ?? [];
    const older = historyQuery.data?.older_snapshot;
    return new Map<string, FlagHistoryChange>(
      pageItems.map((item, index) => [
        item.id,
        describeFlagHistoryChange(item, previousSnapshot(pageItems, index, older)),
      ])
    );
  }, [historyQuery.data]);

  const expandLabel = i18n.translate(
    'xpack.featureFlagsManagement.flags.history.expandChangeAriaLabel',
    { defaultMessage: 'Show the JSON diff' }
  );
  const collapseLabel = i18n.translate(
    'xpack.featureFlagsManagement.flags.history.collapseChangeAriaLabel',
    { defaultMessage: 'Hide the JSON diff' }
  );
  const restoreLabel = i18n.translate(
    'xpack.featureFlagsManagement.flags.history.restoreButtonLabel',
    { defaultMessage: 'Restore' }
  );

  const restore = async () => {
    if (!pendingRestore) {
      return;
    }
    const definition = flagDefinitionFromSnapshot(pendingRestore.snapshot);
    if (!definition) {
      return;
    }
    setRestoring(true);
    setRestoreError(undefined);
    try {
      await api.restoreFlag(flagKey, definition);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.flags.history.restoreSuccessToast', {
          defaultMessage: 'Restored {flagKey}',
          values: { flagKey },
        })
      );
      setPendingRestore(undefined);
      setExpandedIds({});
      setPage(1);
      historyQuery.reload();
    } catch (caught) {
      setRestoreError(toFeatureFlagsApiError(caught));
    } finally {
      setRestoring(false);
    }
  };

  const columns: Array<EuiBasicTableColumn<FlagHistoryItem>> = [
    {
      width: '40px',
      isExpander: true,
      name: (
        <EuiText size="xs" className="euiScreenReaderOnly">
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.history.expandColumnLabel"
            defaultMessage="Expand"
          />
        </EuiText>
      ),
      render: (item: FlagHistoryItem) => {
        const expanded = expandedIds[item.id] === true;
        return (
          <EuiButtonIcon
            data-test-subj="featureFlagsManagementFlagHistoryExpandButton"
            onClick={() =>
              setExpandedIds((current) => ({ ...current, [item.id]: !current[item.id] }))
            }
            aria-label={expanded ? collapseLabel : expandLabel}
            iconType={expanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            {...getEbtProps({
              action: FEATURE_FLAGS_EBT_ACTIONS.toggleHistoryChange,
              element: FEATURE_FLAGS_EBT_ELEMENT,
            })}
          />
        );
      },
    },
    {
      field: 'timestamp',
      width: '220px',
      name: i18n.translate('xpack.featureFlagsManagement.flags.history.timeColumnLabel', {
        defaultMessage: 'Time',
      }),
      render: (timestamp: string) => (
        <FormattedDate
          value={timestamp}
          year="numeric"
          month="short"
          day="2-digit"
          hour="2-digit"
          minute="2-digit"
        />
      ),
    },
    {
      field: 'id',
      name: i18n.translate('xpack.featureFlagsManagement.flags.history.changeColumnLabel', {
        defaultMessage: 'Change',
      }),
      render: (_id: string, item: FlagHistoryItem) => {
        const change = changes.get(item.id);
        return change ? <FlagHistorySummary change={change} /> : null;
      },
    },
    {
      field: 'user.name',
      width: '200px',
      name: i18n.translate('xpack.featureFlagsManagement.flags.history.userColumnLabel', {
        defaultMessage: 'User',
      }),
      render: (name: string, item: FlagHistoryItem) => item.user.full_name || name,
    },
    ...(canSave
      ? [
          {
            width: '120px',
            align: 'right' as const,
            name: (
              <EuiText size="xs" className="euiScreenReaderOnly">
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.history.restoreColumnLabel"
                  defaultMessage="Restore"
                />
              </EuiText>
            ),
            render: (item: FlagHistoryItem) => {
              // The newest saved flag is already this definition. A deletion can be restored.
              const isCurrent =
                page === 1 && items[0]?.id === item.id && item.event_type !== 'deletion';
              if (isCurrent || !flagDefinitionFromSnapshot(item.snapshot)) {
                return null;
              }
              return (
                <EuiButtonEmpty
                  size="s"
                  iconType="return"
                  data-test-subj="featureFlagsManagementFlagHistoryRestoreButton"
                  onClick={() => {
                    setRestoreError(undefined);
                    setPendingRestore(item);
                  }}
                  {...getEbtProps({
                    action: FEATURE_FLAGS_EBT_ACTIONS.restoreFlag,
                    element: FEATURE_FLAGS_EBT_ELEMENT,
                  })}
                >
                  {restoreLabel}
                </EuiButtonEmpty>
              );
            },
          },
        ]
      : []),
  ];

  const expandedRows = Object.fromEntries(
    items.flatMap((item) => {
      const change = changes.get(item.id);
      if (!expandedIds[item.id] || !change) {
        return [];
      }
      return [[item.id, <FlagHistoryDetails key={item.id} change={change} />]];
    })
  );

  return (
    <EuiPageTemplate.Section>
      <EuiButtonEmpty
        data-test-subj="featureFlagsManagementFlagHistoryBackButton"
        iconType="chevronSingleLeft"
        href={history.createHref({ pathname: paths.flag(flagKey) })}
        {...getEbtProps({
          action: FEATURE_FLAGS_EBT_ACTIONS.back,
          element: FEATURE_FLAGS_EBT_ELEMENT,
        })}
      >
        <FormattedMessage
          id="xpack.featureFlagsManagement.flags.history.backButtonLabel"
          defaultMessage="Back to {flagKey}"
          values={{ flagKey }}
        />
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
      <EuiText>
        <h2>
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.history.title"
            defaultMessage="History of {flagKey}"
            values={{ flagKey }}
          />
        </h2>
      </EuiText>
      <EuiSpacer size="m" />
      {historyQuery.error && (
        <ApiErrorCallout error={historyQuery.error} onReload={historyQuery.reload} />
      )}
      <EuiBasicTable
        data-test-subj="featureFlagsManagementFlagHistoryTable"
        items={items}
        columns={columns}
        loading={historyQuery.loading}
        itemId="id"
        itemIdToExpandedRowMap={expandedRows}
        tableCaption={i18n.translate('xpack.featureFlagsManagement.flags.history.tableCaption', {
          defaultMessage: 'Flag change history',
        })}
        noItemsMessage={i18n.translate('xpack.featureFlagsManagement.flags.history.emptyLabel', {
          defaultMessage: 'No changes have been recorded for this flag.',
        })}
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: historyQuery.data?.total ?? 0,
          pageSizeOptions: [10, 20, 50],
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<FlagHistoryItem>) => {
          setPage(nextPage.index + 1);
          setPerPage(nextPage.size);
          setExpandedIds({});
        }}
      />
      <EuiAccordion
        id="featureFlagsHistoryHelp"
        buttonContent={i18n.translate(
          'xpack.featureFlagsManagement.flags.history.expandHelpLabel',
          {
            defaultMessage: 'About this history',
          }
        )}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.history.helpDescription"
              defaultMessage="Each row summarizes what changed. Expand a row to see a JSON diff of those parts. A created or deleted flag shows the flag itself. Restore saves that version as a new revision."
            />
          </p>
        </EuiText>
      </EuiAccordion>
      {pendingRestore && (
        <EuiConfirmModal
          data-test-subj="featureFlagsManagementFlagHistoryRestoreModal"
          title={
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.history.restoreConfirmTitle"
              defaultMessage="Restore this version"
            />
          }
          aria-labelledby={restoreTitleId}
          titleProps={{ id: restoreTitleId }}
          onCancel={() => {
            if (!restoring) {
              setPendingRestore(undefined);
            }
          }}
          onConfirm={restore}
          cancelButtonText={cancelButtonLabel()}
          confirmButtonText={restoreLabel}
          isLoading={restoring}
        >
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.history.restoreConfirmDescription"
            defaultMessage="Restore {flagKey} to this version from {time}? This saves a new revision. Later versions stay in the history."
            values={{
              flagKey,
              time: (
                <FormattedDate
                  value={pendingRestore.timestamp}
                  year="numeric"
                  month="short"
                  day="2-digit"
                  hour="2-digit"
                  minute="2-digit"
                />
              ),
            }}
          />
          {restoreError && (
            <>
              <EuiSpacer size="m" />
              <ApiErrorCallout error={restoreError} />
            </>
          )}
        </EuiConfirmModal>
      )}
    </EuiPageTemplate.Section>
  );
};
