/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataViewPicker } from '.';
import { useDispatch } from 'react-redux-v7';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock/test_providers';
import { useSelectDataView } from '../../hooks/use_select_data_view';
import { useUpdateUrlParam } from '../../../common/utils/global_query_string';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { PageScope } from '../../constants';

vi.mock('../../../common/utils/global_query_string', () => {
      const mocked = {
      useUpdateUrlParam: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_data_view');

vi.mock('../../hooks/use_select_data_view', () => {
      const mocked = {
      useSelectDataView: vi.fn().mockReturnValue(vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-redux-v7', () => {
  return {
    ...require('react-redux-v7'),
    useDispatch: vi.fn(),
  };
});

vi.mock('../../../common/lib/kibana');

vi.mock('@kbn/unified-search-plugin/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/unified-search-plugin/public')),
      DataViewPicker: vi.fn((props) => (
        <div data-test-subj="dataViewManager">
          <button
            type="button"
            onClick={() => props.onChangeDataView('new-data-view-id')}
            data-test-subj="changeDataView"
          >
            {'Change Data View'}
          </button>
          <button
            type="button"
            onClick={() => props.onDataViewCreated()}
            data-test-subj="createDataView"
          >
            {'Create Data View'}
          </button>
          {props.onAddField && (
            <button type="button" onClick={() => props.onAddField()} data-test-subj="addField">
              {'Add Field'}
            </button>
          )}
          {props.onEditDataView && (
            <button type="button" onClick={() => props.onEditDataView()} data-test-subj="editDataView">
              {'Edit Data View'}
            </button>
          )}
          <div data-test-subj="currentDataViewId">{props.currentDataViewId}</div>
          <div data-test-subj="trigger">{props.trigger.label}</div>
        </div>
      )),
    };
      return { ...mocked, default: mocked };
    });

describe('DataViewPicker', () => {
  let mockDispatch = vi.fn();
  const mockAddDanger = vi.fn();

  beforeEach(() => {
    vi.mocked(useUpdateUrlParam).mockReturnValue(vi.fn());

    mockDispatch = vi.fn();

    vi.mocked(useDispatch).mockReturnValue(mockDispatch);

    vi.mocked(useKibana).mockReturnValue({
      services: {
        ...mockUseKibana().services,
        notifications: {
          toasts: {
            addDanger: mockAddDanger,
          },
        },
        dataViewFieldEditor: { openEditor: vi.fn() },
        dataViewEditor: {
          userPermissions: { editDataView: vi.fn().mockReturnValue(true) },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the current data view ID', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    expect(screen.getByTestId('currentDataViewId')).toHaveTextContent('security-solution-default');
    expect(screen.getByTestId('trigger')).toHaveTextContent('Default Security Data View');
  });

  it('calls selectDataView when changing data view', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('changeDataView'));

    expect(vi.mocked(useSelectDataView())).toHaveBeenCalledWith({
      id: 'new-data-view-id',
      scope: 'default',
    });
  });

  it('calls useUpdateUrlParam when changing the default scoped data view', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('changeDataView'));

    expect(vi.mocked(useUpdateUrlParam(URL_PARAM_KEY.sourcerer))).toHaveBeenCalledWith({
      default: {
        id: 'new-data-view-id',
        selectedPatterns: [],
      },
    });
  });

  it('calls useUpdateUrlParam when changing the explore scoped data view', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.explore} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('changeDataView'));

    expect(vi.mocked(useUpdateUrlParam(URL_PARAM_KEY.sourcerer))).toHaveBeenCalledWith({
      explore: {
        id: 'new-data-view-id',
        selectedPatterns: [],
      },
    });
  });

  it('opens field editor when adding a field', async () => {
    const mockFieldEditorClose = vi.fn();
    vi
      .mocked(useKibana().services.dataViewFieldEditor.openEditor)
      .mockResolvedValue(mockFieldEditorClose);

    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('addField'));

    await waitFor(() => {
      expect(vi.mocked(useKibana().services.data.dataViews.get)).toHaveBeenCalledWith(
        'security-solution-default'
      );
      expect(vi.mocked(useKibana().services.dataViewFieldEditor.openEditor)).toHaveBeenCalled();
    });
  });

  it('shows a danger toast when adding field fails to load data view', async () => {
    vi
      .mocked(useKibana().services.data.dataViews.get)
      .mockRejectedValue(new Error('conflict loading data view'));

    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('addField'));

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'Error retrieving data view',
        text: 'Error: conflict loading data view',
      });
    });
  });

  describe('when user does not have editDataView permission', () => {
    it('does not render edit data view button', () => {
      vi
        .mocked(useKibana().services.dataViewEditor.userPermissions.editDataView)
        .mockReturnValue(false);

      render(
        <TestProviders>
          <DataViewPicker scope={PageScope.default} />
        </TestProviders>
      );

      expect(screen.queryByTestId('editDataView')).not.toBeInTheDocument();
    });

    it('does not render add field button', () => {
      vi
        .mocked(useKibana().services.dataViewEditor.userPermissions.editDataView)
        .mockReturnValue(false);

      render(
        <TestProviders>
          <DataViewPicker scope={PageScope.default} />
        </TestProviders>
      );

      expect(screen.queryByTestId('addField')).not.toBeInTheDocument();
    });
  });
});
