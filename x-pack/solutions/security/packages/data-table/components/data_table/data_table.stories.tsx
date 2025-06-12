/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CellActionsProvider } from '@kbn/cell-actions';
import { I18nProvider } from '@kbn/i18n-react';
import { DeprecatedCellValueElementProps } from '@kbn/timelines-plugin/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { DragDropContext, DropResult, ResponderProvided } from '@hello-pangea/dnd';

import { ThemeProvider } from 'styled-components';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { euiDarkVars } from '@kbn/ui-theme';
import { createStore as createReduxStore } from 'redux';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { EuiButtonEmpty } from '@elastic/eui';
import { mockGlobalState } from '../../mock/global_state';
import { getMappedNonEcsValue } from './utils';
import { TableId } from '../..';
import { mockTimelineData } from '../../mock/mock_timeline_data';
import { DataTableComponent } from '.';

export default {
  title: 'DataTable',
  description: 'Table component for displaying events data in a grid view',
};

const createStore = (state: unknown) => createReduxStore(() => state, state);

interface Props {
  children?: React.ReactNode;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
  cellActions?: Action[];
}

const StoryCellRenderer: React.FC<DeprecatedCellValueElementProps> = ({ columnId, data }) => (
  <>
    {getMappedNonEcsValue({
      data,
      fieldName: columnId,
    })?.reduce((x) => x[0]) ?? ''}
  </>
);

const StoryProviders: React.FC<Props> = ({ children, onDragEnd = () => {}, cellActions = [] }) => {
  const store = createStore(mockGlobalState);
  const queryClient = new QueryClient();

  return (
    <I18nProvider>
      <ReduxStoreProvider store={store}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve(cellActions)}>
              <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
            </CellActionsProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ReduxStoreProvider>
    </I18nProvider>
  );
};

const MockFieldBrowser = () => {
  return (
    <EuiButtonEmpty
      color="text"
      data-test-subj="show-field-browser"
      iconType="tableOfContents"
      size="xs"
      onClick={() => window.alert('Not implemented')}
    >
      {'Field Browser'}
    </EuiButtonEmpty>
  );
};

export const DataTable = () => {
  return (
    <StoryProviders>
      <DataTableComponent
        browserFields={{}}
        getFieldSpec={() => undefined}
        data={mockTimelineData}
        id={TableId.test}
        renderCellValue={StoryCellRenderer}
        leadingControlColumns={[]}
        unitCountText="10 events"
        pagination={{
          pageSize: 25,
          pageIndex: 0,
          onChangeItemsPerPage: () => {},
          onChangePage: () => {},
        }}
        loadPage={() => {}}
        rowRenderers={[]}
        totalItems={mockTimelineData.length}
        fieldsBrowserComponent={() => <MockFieldBrowser />}
      />
    </StoryProviders>
  );
};
