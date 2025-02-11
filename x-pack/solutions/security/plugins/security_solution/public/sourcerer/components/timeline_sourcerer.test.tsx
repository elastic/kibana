/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { SourcererScopeName } from '../store/model';
import { Sourcerer } from '.';
import { sourcererModel } from '../store';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { useSourcererDataView } from '../containers';
import { useSignalHelpers } from '../containers/use_signal_helpers';

const mockDispatch = jest.fn();

jest.mock('../containers');
jest.mock('../containers/use_signal_helpers');
const mockUseUpdateDataView = jest.fn().mockReturnValue(() => true);
jest.mock('./use_update_data_view', () => ({
  useUpdateDataView: () => mockUseUpdateDataView,
}));
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});

const mockUpdateUrlParam = jest.fn();
jest.mock('../../common/utils/global_query_string', () => {
  const original = jest.requireActual('../../common/utils/global_query_string');

  return {
    ...original,
    useUpdateUrlParam: () => mockUpdateUrlParam,
  };
});

const { id } = mockGlobalState.sourcerer.defaultDataView;

const sourcererDataView = {
  indicesExist: true,
  loading: false,
  sourcererDataView: {},
};

describe('timeline sourcerer', () => {
  const testProps = {
    scope: sourcererModel.SourcererScopeName.timeline,
  };

  beforeEach(async () => {
    const pollForSignalIndexMock = jest.fn();

    (useSourcererDataView as jest.Mock).mockReturnValue(sourcererDataView);

    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    render(
      <TestProviders>
        <Sourcerer {...testProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('timeline-sourcerer-trigger'));

    await waitFor(() => {
      fireEvent.click(screen.getByTestId(`sourcerer-advanced-options-toggle`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders "alerts only" checkbox, unchecked', async () => {
    await waitFor(() => {
      expect(
        screen.getByTestId('sourcerer-alert-only-checkbox').parentElement?.parentElement
      ).toHaveTextContent('Show only detection alerts');
      expect(screen.getByTestId('sourcerer-alert-only-checkbox')).not.toBeChecked();
    });

    fireEvent.click(screen.getByTestId('sourcerer-alert-only-checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-alert-only-checkbox')).toBeChecked();
    });
  });

  it('data view selector is enabled', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-select')).toBeEnabled();
    });
  });

  it('data view selector is default to Security Default Data View', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('security-option-super')).toHaveTextContent(
        'Security Default Data View'
      );
    });
  });

  it('index pattern selector is enabled', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-combo-box')).toBeEnabled();
    });
  });

  it('render reset button', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-reset')).toBeVisible();
    });
  });

  it('render save button', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-save')).toBeVisible();
    });
  });

  it('Checks box when only alerts index is selected in timeline', async () => {
    cleanup();
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
            loading: false,
            selectedDataViewId: id,
            selectedPatterns: [`${mockGlobalState.sourcerer.signalIndexName}`],
          },
        },
      },
    };

    render(
      <TestProviders store={createMockStore(state2)}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    fireEvent.click(screen.queryAllByTestId('timeline-sourcerer-trigger')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-alert-only-checkbox')).toBeChecked();
    });
  });
});
