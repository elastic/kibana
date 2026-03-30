/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type ReactElement, type ReactNode, useCallback, useMemo } from 'react';
import { type Criteria, EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { DataProvider } from '../../../../common/types';
import { usePaginatedAlerts } from '../../../flyout/document_details/left/hooks/use_paginated_alerts';
import { InvestigateInTimelineButton } from '../../../common/components/event_details/investigate_in_timeline_button';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../detections/components/alerts_table/translations';
import { getDataProvider } from '../../../common/components/event_details/use_action_cell_data_provider';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FlyoutMissingAlertsPrivilege } from '../../document/components/flyout_missing_alerts_privilege';

const dataProviderLimit = 5;
type CorrelationsTableRow = Record<string, unknown>;
export type CorrelationsCustomTableColumn = EuiBasicTableColumn<CorrelationsTableRow> & {
  /**
   * Preserve array values for field-based custom columns.
   * Applied only when `field` is provided.
   */
  preserveArray?: boolean;
};

type CorrelationsFieldColumn = Extract<
  EuiBasicTableColumn<CorrelationsTableRow>,
  { field: string }
>;

const isPreserveArrayFieldColumn = (
  column: CorrelationsCustomTableColumn
): column is CorrelationsFieldColumn & { preserveArray: true } =>
  'field' in column && typeof column.field === 'string' && column.preserveArray === true;

export interface CorrelationsDetailsAlertsTableProps {
  /**
   * Text to display in the ExpandablePanel title section
   */
  title: ReactElement;
  /**
   * Whether the table is loading
   */
  loading: boolean;
  /**
   * Ids of alerts to display in the table
   */
  alertIds: string[] | undefined;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * No data message to render if the table is empty
   */
  noItemsMessage?: ReactNode;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
  /**
   * Optional index to query alerts from
   */
  indexName?: string;
  /**
   * Table columns to render
   */
  columns: Array<CorrelationsCustomTableColumn>;
  /**
   * Optional data view id to use when opening timeline.
   */
  timelineDataViewId?: string;
}

/**
 * Renders paginated alert array based on the provided alertIds
 */
export const CorrelationsDetailsAlertsTable: FC<CorrelationsDetailsAlertsTableProps> = ({
  title,
  loading,
  alertIds,
  scopeId,
  eventId,
  noItemsMessage,
  'data-test-subj': dataTestSubj,
  indexName,
  columns,
  timelineDataViewId,
}) => {
  const { hasAlertsRead } = useAlertsPrivileges();
  const {
    setPagination,
    setSorting,
    data,
    loading: alertsLoading,
    paginationConfig,
    sorting,
    error,
  } = usePaginatedAlerts(alertIds || [], indexName);

  const onTableChange = useCallback(
    ({ page, sort }: Criteria<Record<string, unknown>>) => {
      if (page) {
        const { index: pageIndex, size: pageSize } = page;
        setPagination({ pageIndex, pageSize });
      }

      if (sort) {
        setSorting(sort);
      }
    },
    [setPagination, setSorting]
  );

  const mappedValueFields = useMemo(() => {
    return new Set(
      (columns ?? []).filter(isPreserveArrayFieldColumn).map((column) => column.field)
    );
  }, [columns]);

  const mappedData = useMemo(() => {
    return data
      .map((hit) => ({ fields: hit.fields ?? {}, id: hit._id, index: hit._index }))
      .map((dataWithMeta) => {
        const res = Object.keys(dataWithMeta.fields).reduce((result, fieldName) => {
          const fieldValue = dataWithMeta.fields?.[fieldName];
          const shouldKeepArray = mappedValueFields.has(fieldName);
          result[fieldName] =
            Array.isArray(fieldValue) && !shouldKeepArray
              ? fieldValue[0] ?? fieldValue
              : fieldValue;
          return result;
        }, {} as CorrelationsTableRow);
        res.id = dataWithMeta.id;
        res.index = dataWithMeta.index;
        return res;
      });
  }, [data, mappedValueFields]);

  const isInSecurityApp = useIsInSecurityApp();
  const showTimelineButton =
    isInSecurityApp && hasAlertsRead && alertIds != null && alertIds.length > 0;

  const shouldUseFilters = Boolean(
    alertIds && alertIds.length && alertIds.length >= dataProviderLimit
  );
  const dataProviders = useMemo(
    () => (shouldUseFilters ? null : getDataProviders(scopeId, eventId, alertIds)),
    [alertIds, shouldUseFilters, scopeId, eventId]
  );
  const filters: Filter[] | null = useMemo(
    () => (shouldUseFilters ? getFilters(alertIds) : null),
    [alertIds, shouldUseFilters]
  );

  const panelContent = !hasAlertsRead ? (
    <FlyoutMissingAlertsPrivilege data-test-subj={`${dataTestSubj}MissingAlertsPrivilege`} />
  ) : (
    <EuiBasicTable<CorrelationsTableRow>
      data-test-subj={`${dataTestSubj}Table`}
      loading={loading || alertsLoading}
      tableCaption={i18n.translate(
        'xpack.securitySolution.flyout.insights.correlations.correlatedAlertsCaption',
        {
          defaultMessage: 'Correlated alerts',
        }
      )}
      items={mappedData}
      columns={columns}
      pagination={paginationConfig}
      sorting={sorting}
      onChange={onTableChange}
      noItemsMessage={noItemsMessage}
    />
  );

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: 'warning',
        headerContent: showTimelineButton ? (
          <div data-test-subj={`${dataTestSubj}InvestigateInTimeline`}>
            <InvestigateInTimelineButton
              dataProviders={dataProviders}
              filters={filters}
              asEmptyButton
              iconType="timeline"
              dataViewId={timelineDataViewId}
            >
              {ACTION_INVESTIGATE_IN_TIMELINE}
            </InvestigateInTimelineButton>
          </div>
        ) : null,
      }}
      content={{ error: hasAlertsRead ? error : undefined }}
      expand={{
        expandable: true,
        expandedOnFirstRender: true,
      }}
      data-test-subj={dataTestSubj}
    >
      {panelContent}
    </ExpandablePanel>
  );
};

const getFilters = (alertIds?: string[]) => {
  if (alertIds && alertIds.length) {
    return [
      {
        meta: {
          alias: i18n.translate(
            'xpack.securitySolution.flyout.insights.correlations.tableFilterLabel',
            {
              defaultMessage: 'Correlations Details Table Alert IDs.',
            }
          ),
          type: 'phrases',
          key: '_id',
          params: [...alertIds],
          negate: false,
          disabled: false,
          value: alertIds.join(),
        },
        query: {
          bool: {
            should: alertIds.map((id) => {
              return {
                match_phrase: {
                  _id: id,
                },
              };
            }),
            minimum_should_match: 1,
          },
        },
      },
    ];
  }
  return null;
};

const getDataProviders = (scopeId: string, eventId: string, alertIds?: string[]) => {
  if (alertIds && alertIds.length) {
    return alertIds.reduce<DataProvider[]>((result, alertId, index) => {
      const id = `${scopeId}-${eventId}-event.id-${index}-${alertId}`;
      result.push(getDataProvider('_id', id, alertId));
      return result;
    }, []);
  }
  return null;
};
