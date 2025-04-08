/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';

import { CreateFlyout } from '.';
import * as i18n from './translations';

import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { useSourcererDataView } from '../../../../../sourcerer/containers';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../sourcerer/containers');
jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

const defaultProps = {
  onClose: jest.fn(),
};

describe('CreateFlyout', () => {
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

    render(
      <TestProviders>
        <CreateFlyout {...defaultProps} />
      </TestProviders>
    );
  });

  it('should render the flyout title', () => {
    expect(screen.getAllByTestId('title')[0]).toHaveTextContent(i18n.SCHEDULE_CREATE_TITLE);
  });

  it('should invoke onClose when the close button is clicked', async () => {
    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  describe('schedule form', () => {
    it('should render schedule form', () => {
      expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
    });

    it('should render schedule name field component', () => {
      expect(screen.getByTestId('attackDiscoveryFormNameField')).toBeInTheDocument();
    });

    it('should render connector selector component', () => {
      expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toBeInTheDocument();
    });

    it('should render `alertSelection` component', () => {
      expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
    });

    it('should render schedule (`run every`) component', () => {
      expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
    });

    it('should render actions component', () => {
      expect(screen.getByText('Select a connector type')).toBeInTheDocument();
    });

    it('should render "Create and enable" button', () => {
      expect(screen.getByTestId('save')).toHaveTextContent(i18n.SCHEDULE_CREATE_BUTTON_TITLE);
    });
  });
});
