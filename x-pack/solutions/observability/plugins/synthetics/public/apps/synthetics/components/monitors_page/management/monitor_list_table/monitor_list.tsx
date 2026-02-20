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

  const handleOnChange = useCallback(
    ({
      page = { index: 0, size: 10 },
      sort = { field: ConfigKey.NAME, direction: 'asc' },
    }: Criteria<EncryptedSyntheticsSavedMonitor>) => {
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
    totalItemCount: total,
    pageSizeOptions: [5, 10, 25, 50, 100],
  };

  const sorting: EuiTableSortingType<EncryptedSyntheticsSavedMonitor> = {
    sort: {
      field: sortField?.replace('.keyword', '') as keyof EncryptedSyntheticsSavedMonitor,
      direction: sortOrder,
    },
  };

  const recordRangeLabel = labels.getRecordRangeLabel({
    rangeStart: total === 0 ? 0 : pageSize * pageIndex + 1,
    rangeEnd: pageSize * pageIndex + pageSize,
    total,
  });

  const columns = useMonitorListColumns({
    loading,
    overviewStatus,
    setMonitorPendingDeletion,
  });

  const [selectedItems, setSelectedItems] = useState<EncryptedSyntheticsSavedMonitor[]>([]);
  const onSelectionChange = (selItems: EncryptedSyntheticsSavedMonitor[]) => {
    setSelectedItems(selItems);
  };

  const selection: EuiTableSelectionType<EncryptedSyntheticsSavedMonitor> = {
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
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <MonitorListHeader
          recordRangeLabel={recordRangeLabel}
          selectedItems={selectedItems}
          setMonitorPendingDeletion={setMonitorPendingDeletion}
        />
        <EuiHorizontalRule margin="s" />
        <EuiBasicTable
          aria-label={i18n.translate('xpack.synthetics.management.monitorList.title', {
            defaultMessage: 'Synthetics monitors list',
          })}
          tableCaption={i18n.translate('xpack.synthetics.management.monitorList.caption', {
            defaultMessage: 'Synthetics monitors',
          })}
          error={error?.body?.message}
          loading={loading}
          itemId="config_id"
          items={syntheticsMonitors}
          columns={columns}
          tableLayout={isXl ? 'auto' : 'fixed'}
          pagination={pagination}
          sorting={sorting}
          onChange={handleOnChange}
          noItemsMessage={loading ? labels.LOADING : labels.NO_DATA_MESSAGE}
          selection={selection}
        />
      </EuiPanel>
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
