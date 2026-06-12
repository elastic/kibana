/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { SourcererButton } from './sourcerer_selection';
import { useKibana } from '../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { createMockStore, mockGlobalState } from '../../../common/mock';
import { TestProviders } from '../../../common/mock/test_providers';
import { DATA_VIEW_PICKER_TEST_ID } from '../../../data_view_manager/components/data_view_picker/constants';
import { ALERTS_PATH } from '../../../../common/constants';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../../../data_view_manager/constants';
import type { DataView } from '@kbn/data-views-plugin/common';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('react-redux', () => {
  return {
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn(),
  };
});

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(),
}));
jest.mock('../../../data_view_manager/hooks/use_select_data_view', () => ({
  useSelectDataView: jest.fn().mockReturnValue(jest.fn()),
}));

const store = createMockStore(mockGlobalState);

describe('SourcererButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocation as jest.Mock).mockReturnValue({ pathname: ALERTS_PATH });
    jest.mocked(useDataView).mockReturnValue({
      dataView: {
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        name: 'Default Security Data View',
      } as DataView,
      status: 'ready',
    });
    jest.mocked(useKibana).mockReturnValue({
      services: {
        dataViewFieldEditor: { openEditor: jest.fn() },
        dataViewEditor: {
          openEditor: jest.fn(),
          userPermissions: { editDataView: jest.fn().mockReturnValue(true) },
        },
        data: { dataViews: { get: jest.fn() } },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });
  it('should render sourcerer button', () => {
    const { getByTestId } = render(
      <TestProviders store={store}>
        <SourcererButton
          id="test"
          closePopover={() => {}}
          setActivePopover={() => {}}
          isOpen={false}
        />
      </TestProviders>
    );
    expect(getByTestId('resolver:graph-controls:sourcerer-button')).toBeInTheDocument();
  });

  it('should render data view picker', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { getByTestId } = render(
      <TestProviders store={store}>
        <SourcererButton
          id="test"
          closePopover={() => {}}
          setActivePopover={() => {}}
          isOpen={true}
        />
      </TestProviders>
    );
    expect(getByTestId(DATA_VIEW_PICKER_TEST_ID)).toBeInTheDocument();
  });
});
