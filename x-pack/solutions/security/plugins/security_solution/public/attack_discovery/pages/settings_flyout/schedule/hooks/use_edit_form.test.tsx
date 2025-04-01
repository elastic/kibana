/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { useLoadConnectors } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';

import type { UseEditFormProps } from './use_edit_form';
import { useEditForm } from './use_edit_form';

import { useKibana } from '../../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { TestProviders } from '../../../../../common/mock';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
  },
];

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../sourcerer/containers');
jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));

const defaultProps: UseEditFormProps = {
  initialValue: undefined,
  onSave: jest.fn(),
  saveButtonTitle: undefined,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

const renderEditForm = (props = defaultProps) => {
  const { result } = renderHook(() => useEditForm(props));
  act(() => {
    render(
      <TestProviders>
        <>
          {result.current.editForm}
          {result.current.actionButtons}
        </>
      </TestProviders>
    );
  });
};

describe('useEditForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: {
          ...triggersActionsUiMock.createStart(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);

    (useLoadConnectors as jest.Mock).mockReturnValue({
      isFetched: true,
      data: mockConnectors,
    });
  });

  describe('form rendering', () => {
    it('should return the schedule editing form', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
      });
    });

    it('should return the name input field in the schedule editing form', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryFormNameField')).toBeInTheDocument();
      });
    });

    it('should return the connector selector field in the schedule editing form', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toBeInTheDocument();
      });
    });

    it('should return the alert selection field in the schedule editing form', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
      });
    });

    it('should return the alert selection component with `AlertSelectionQuery` as settings view', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
      });
    });

    it('should return the `run every` field in the schedule editing form', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
      });
    });

    it('should return the actions field in the schedule editing form', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByText('Select a connector type')).toBeInTheDocument();
      });
    });

    it('should return save button', async () => {
      renderEditForm();

      await waitFor(() => {
        expect(screen.getByTestId('save')).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('should show `name is required` error if name field is empty', async () => {
      renderEditForm();

      act(() => {
        const save = screen.getByTestId('save');
        fireEvent.click(save);
      });

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryFormNameField')).toHaveTextContent(
          'A name is required.'
        );
        expect(defaultProps.onSave).not.toBeCalled();
      });
    });

    it('should show `connector is required` error if connector is not selected', async () => {
      renderEditForm();

      act(() => {
        const save = screen.getByTestId('save');
        fireEvent.click(save);
      });

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toHaveTextContent(
          'A connector is required.'
        );
        expect(defaultProps.onSave).not.toBeCalled();
      });
    });

    it('should call onSave with form data if all required fields are set', async () => {
      const initialValue = {
        name: 'Test Schedule 1',
        connectorId: 'test-id',
        alertsSelectionSettings: {
          query: { query: 'user.name : "user1" ', language: 'kuery' },
          filters: [],
          size: 250,
          start: 'now-1d',
          end: 'now',
        },
        interval: '24h',
        actions: [],
      };
      renderEditForm({ ...defaultProps, initialValue });

      act(() => {
        const save = screen.getByTestId('save');
        fireEvent.click(save);
      });

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(initialValue);
      });
    });
  });
});
