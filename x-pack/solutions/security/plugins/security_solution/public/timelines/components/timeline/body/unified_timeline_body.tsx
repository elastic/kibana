/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, ReactElement } from 'react';
import React, { useMemo } from 'react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useGetScopedSourcererDataView } from '../../../../sourcerer/components/use_get_sourcerer_data_view';
import { DataViewErrorComponent } from '../../../../common/components/data_view_error';
import { StyledTableFlexGroup, StyledUnifiedTableFlexItem } from '../unified_components/styles';
import { UnifiedTimeline } from '../unified_components';
import { defaultUdtHeaders } from './column_headers/default_headers';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

export interface UnifiedTimelineBodyProps
  extends Omit<ComponentProps<typeof UnifiedTimeline>, 'dataView'> {
  header: ReactElement;
}

export const UnifiedTimelineBody = (props: UnifiedTimelineBodyProps) => {
  const {
    header,
    isSortEnabled,
    columns,
    rowRenderers,
    timelineId,
    itemsPerPage,
    itemsPerPageOptions,
    sort,
    events,
    refetch,
    dataLoadingState,
    totalCount,
    onFetchMoreRecords,
    activeTab,
    updatedAt,
    trailingControlColumns,
    leadingControlColumns,
    onUpdatePageIndex,
  } = props;
  const oldDataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.timeline,
  });
  const columnsHeader = useMemo(() => columns ?? defaultUdtHeaders, [columns]);

  const { dataView: experimentalDataView } = useDataView(SourcererScopeName.timeline);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;

  return (
    <StyledTableFlexGroup direction="column" gutterSize="s">
      <StyledUnifiedTableFlexItem grow={false}>{header}</StyledUnifiedTableFlexItem>
      <StyledUnifiedTableFlexItem
        className="unifiedTimelineBody"
        data-test-subj="unifiedTimelineBody"
      >
        <RootDragDropProvider>
          {dataView ? (
            <UnifiedTimeline
              columns={columnsHeader}
              dataView={dataView}
              rowRenderers={rowRenderers}
              isSortEnabled={isSortEnabled}
              timelineId={timelineId}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={itemsPerPageOptions}
              sort={sort}
              events={events}
              refetch={refetch}
              dataLoadingState={dataLoadingState}
              totalCount={totalCount}
              onFetchMoreRecords={onFetchMoreRecords}
              activeTab={activeTab}
              updatedAt={updatedAt}
              isTextBasedQuery={false}
              trailingControlColumns={trailingControlColumns}
              leadingControlColumns={leadingControlColumns}
              onUpdatePageIndex={onUpdatePageIndex}
            />
          ) : (
            <DataViewErrorComponent />
          )}
        </RootDragDropProvider>
      </StyledUnifiedTableFlexItem>
    </StyledTableFlexGroup>
  );
};
