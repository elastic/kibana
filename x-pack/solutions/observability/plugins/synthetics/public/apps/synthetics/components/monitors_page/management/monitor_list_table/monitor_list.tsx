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
  RemoteMonitorListItem,
  RemoteMonitorInfo,
} from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { useMonitorListColumns } from './columns';
import * as labels from './labels';
import type { ClientPluginsStart } from '../../../../../../plugin';

/**
 * Unified item type for the monitor list table.
 * Local monitors are EncryptedSyntheticsSavedMonitor; remote monitors are
 * mapped to the same shape with placeholder values and a _isRemote flag.
 */
export type MonitorListItem = EncryptedSyntheticsSavedMonitor & {
  _isRemote?: boolean;
  _remote?: RemoteMonitorInfo;
  _remoteLocations?: string[];
};

/**
 * Maps a RemoteMonitorListItem into a MonitorListItem that the table can render.
 * Fields that don't apply get placeholder values.
 */
function mapRemoteToListItem(remote: RemoteMonitorListItem): MonitorListItem {
  return {
    [ConfigKey.CONFIG_ID]: remote.configId,
    [ConfigKey.NAME]: remote.name,
    [ConfigKey.MONITOR_TYPE]: remote.type,
    [ConfigKey.TAGS]: remote.tags ?? [],
    [ConfigKey.LOCATIONS]: [],
    [ConfigKey.ENABLED]: remote.enabled ?? true,
    [ConfigKey.SCHEDULE]: { number: '', unit: '' },
    [ConfigKey.ALERT_CONFIG]: undefined,
    [ConfigKey.PROJECT_ID]: '',
    [ConfigKey.MONITOR_SOURCE_TYPE]: undefined,
    id: remote.configId,
    updated_at: '',
    created_at: '',
    spaces: [],
    _isRemote: true,
    _remote: remote.remote,
    _remoteLocations: remote.locations,
  } as unknown as MonitorListItem;
}

interface Props {
  pageState: MonitorListPageState;
  syntheticsMonitors: EncryptedSyntheticsSavedMonitor[];
  remoteMonitors?: RemoteMonitorListItem[];
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
  remoteMonitors = [],
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

  // Merge local and remote monitors into a single list
  const allItems: MonitorListItem[] = useMemo(() => {
    const localItems: MonitorListItem[] = syntheticsMonitors as MonitorListItem[];
    const remoteItems: MonitorListItem[] = remoteMonitors.map(mapRemoteToListItem);
    return [...localItems, ...remoteItems];
  }, [syntheticsMonitors, remoteMonitors]);

  // total already includes remote monitors (server-side pagination)
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

  // Only allow selection of local monitors (remote monitors can't be bulk-actioned)
  const [selectedItems, setSelectedItems] = useState<MonitorListItem[]>([]);
  const onSelectionChange = (selItems: MonitorListItem[]) => {
    setSelectedItems(selItems.filter((item) => !item._isRemote));
  };

  const selection: EuiTableSelectionType<MonitorListItem> = {
    onSelectionChange,
    initialSelected: selectedItems,
    selectable: (item) => !item._isRemote,
    selectableMessage: (selectable) =>
      selectable
        ? ''
        : i18n.translate('xpack.synthetics.management.monitorList.remoteNotSelectable', {
            defaultMessage: 'Remote monitors cannot be selected',
          }),
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
          items={allItems}
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
