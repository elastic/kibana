/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Criteria, EuiTableSortingType } from '@elastic/eui';
import { EuiBasicTable, EuiPanel, EuiHorizontalRule, useIsWithinMinBreakpoint } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { MonitorListHeader } from './monitor_list_header';
import type { MonitorListSortField } from '../../../../../../../common/runtime_types/monitor_management/sort_field';
import { DeleteMonitor } from './delete_monitor';
import { ResetMonitorModal } from './reset_monitor_modal';
import { useMonitorIntegrationHealth } from '../../../common/hooks/use_monitor_integration_health';
import type { IHttpSerializedFetchError } from '../../../../state/utils/http_error';
import type { MonitorListPageState } from '../../../../state';
import type {
  EncryptedSyntheticsSavedMonitor,
  OverviewStatusState,
} from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { useMonitorListColumns } from './columns';
import * as labels from './labels';
import type { ClientPluginsStart } from '../../../../../../plugin';

export type MonitorListItem = EncryptedSyntheticsSavedMonitor;

interface Props {
  pageState: MonitorListPageState;
  syntheticsMonitors: EncryptedSyntheticsSavedMonitor[];
  total: number;
  error: IHttpSerializedFetchError | null;
  loading: boolean;
  loadPage: (state: MonitorListPageState) => void;
  reloadPage: () => void;
  overviewStatus: OverviewStatusState | null;
}
const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const MonitorList = ({
  pageState: { pageIndex, pageSize, sortField, sortOrder },
  syntheticsMonitors,
  total,
  error,
  loading,
  overviewStatus,
  loadPage,
  reloadPage,
}: Props) => {
  const isXl = useIsWithinMinBreakpoint('xxl');

  const [monitorPendingDeletion, setMonitorPendingDeletion] = useState<string[]>([]);
  const [monitorPendingReset, setMonitorPendingReset] = useState<{
    resetIds: string[];
    skippedMonitors: Array<{ id: string; name: string }>;
  } | null>(null);
  const { resetMonitors, isFixableByReset } = useMonitorIntegrationHealth();

  const items: MonitorListItem[] = useMemo(
    () => syntheticsMonitors as MonitorListItem[],
    [syntheticsMonitors]
  );

  const totalItemCount = total;

  const handleOnChange = useCallback(
    ({
      page = { index: 0, size: 10 },
      sort = { field: ConfigKey.NAME, direction: 'asc' },
    }: Criteria<MonitorListItem>) => {
      const { index, size } = page;
      const { field, direction } = sort;

      loadPage({
        pageIndex: index,
        pageSize: size,
        sortField: (field === 'enabled' ? field : `${field}.keyword`) as MonitorListSortField,
        sortOrder: direction,
      });
    },
    [loadPage]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const sorting: EuiTableSortingType<MonitorListItem> = {
    sort: {
      field: sortField?.replace('.keyword', '') as keyof MonitorListItem,
      direction: sortOrder,
    },
  };

  const recordRangeLabel = labels.getRecordRangeLabel({
    rangeStart: totalItemCount === 0 ? 0 : pageSize * pageIndex + 1,
    rangeEnd: pageSize * pageIndex + pageSize,
    total: totalItemCount,
  });

  const columns = useMonitorListColumns({
    loading,
    overviewStatus,
    setMonitorPendingDeletion,
    setMonitorPendingReset,
    isFixableByReset,
  });

  const [selectedItems, setSelectedItems] = useState<MonitorListItem[]>([]);
  const onSelectionChange = (selItems: MonitorListItem[]) => {
    setSelectedItems(selItems);
  };

  const selection: EuiTableSelectionType<MonitorListItem> = {
    onSelectionChange,
    initialSelected: selectedItems,
  };
  const { spaces: spacesApi } = useKibana<ClientPluginsStart>().services;

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  return (
    <ContextWrapper>
      <EuiPanel
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        data-test-subj={loading ? 'syntheticsMonitorList-loading' : 'syntheticsMonitorList-loaded'}
      >
        <MonitorListHeader
          recordRangeLabel={recordRangeLabel}
          selectedItems={selectedItems as EncryptedSyntheticsSavedMonitor[]}
          setMonitorPendingDeletion={setMonitorPendingDeletion}
          setMonitorPendingReset={setMonitorPendingReset}
        />
        <EuiHorizontalRule margin="s" />
        <EuiBasicTable<MonitorListItem>
          aria-label={i18n.translate('xpack.synthetics.management.monitorList.title', {
            defaultMessage: 'Synthetics monitors list',
          })}
          tableCaption={i18n.translate('xpack.synthetics.management.monitorList.caption', {
            defaultMessage: 'Synthetics monitors',
          })}
          error={error?.body?.message}
          loading={loading}
          itemId="config_id"
          items={items}
          columns={columns}
          tableLayout={isXl ? 'auto' : 'fixed'}
          pagination={pagination}
          sorting={sorting}
          onChange={handleOnChange}
          noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
          selection={selection}
        />
      </EuiPanel>
      {monitorPendingReset !== null && monitorPendingReset.resetIds.length > 0 && (
        <ResetMonitorModal
          configIds={monitorPendingReset.resetIds}
          skippedMonitors={monitorPendingReset.skippedMonitors}
          onClose={() => setMonitorPendingReset(null)}
          resetMonitors={resetMonitors}
        />
      )}
      {monitorPendingDeletion.length > 0 && (
        <DeleteMonitor
          configIds={monitorPendingDeletion}
          name={
            syntheticsMonitors.find(
              (mon) => mon[ConfigKey.CONFIG_ID] === monitorPendingDeletion[0]
            )?.[ConfigKey.NAME] ?? ''
          }
          setMonitorPendingDeletion={setMonitorPendingDeletion}
          isProjectMonitor={
            syntheticsMonitors.find(
              (mon) => mon[ConfigKey.CONFIG_ID] === monitorPendingDeletion[0]
            )?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT
          }
          reloadPage={reloadPage}
        />
      )}
    </ContextWrapper>
  );
};
