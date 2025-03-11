/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import type { HostsUncommonProcessesEdges } from '../../../../../common/search_strategy';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import type { ItemsPerRow } from '../../../components/paginated_table';
import { PaginatedTable } from '../../../components/paginated_table';
import * as i18n from './translations';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { getUncommonColumnsCurated } from './columns';

const tableType = hostsModel.HostsTableType.uncommonProcesses;
interface UncommonProcessTableProps {
  data: HostsUncommonProcessesEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  setQuerySkip: (skip: boolean) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];

const UncommonProcessTableComponent = React.memo<UncommonProcessTableProps>(
  ({
    data,
    fakeTotalCount,
    id,
    isInspect,
    loading,
    loadPage,
    totalCount,
    setQuerySkip,
    showMorePagesIndicator,
    type,
  }) => {
    const dispatch = useDispatch();
    const getUncommonProcessesSelector = useMemo(
      () => hostsSelectors.uncommonProcessesSelector(),
      []
    );
    const { activePage, limit } = useDeepEqualSelector((state) =>
      getUncommonProcessesSelector(state, type)
    );

    const updateLimitPagination = useCallback(
      (newLimit: number) =>
        dispatch(
          hostsActions.updateTableLimit({
            hostsType: type,
            limit: newLimit,
            tableType,
          })
        ),
      [type, dispatch]
    );

    const updateActivePage = useCallback(
      (newPage: number) =>
        dispatch(
          hostsActions.updateTableActivePage({
            activePage: newPage,
            hostsType: type,
            tableType,
          })
        ),
      [type, dispatch]
    );

    const columns = useMemo(() => getUncommonColumnsCurated(type), [type]);

    return (
      <PaginatedTable
        activePage={activePage}
        columns={columns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={i18n.UNCOMMON_PROCESSES}
        headerUnit={i18n.UNIT(totalCount)}
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        pageOfItems={data}
        setQuerySkip={setQuerySkip}
        showMorePagesIndicator={showMorePagesIndicator}
        totalCount={fakeTotalCount}
        updateLimitPagination={updateLimitPagination}
        updateActivePage={updateActivePage}
      />
    );
  }
);

UncommonProcessTableComponent.displayName = 'UncommonProcessTableComponent';

export const UncommonProcessTable = React.memo(UncommonProcessTableComponent);

UncommonProcessTable.displayName = 'UncommonProcessTable';
