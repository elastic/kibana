/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { EaseFlyout } from './ease_flyout';
import { FLYOUT_BODY_TEST_ID, FLYOUT_TEST_ID } from './test_ids';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { mockDataFormattedForFieldBrowser } from '../../../../flyout/document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { useEaseDetailsContext } from './context';
import { TAKE_ACTION_BUTTON_TEST_ID } from './components/take_action_button';
import { mockDataAsNestedObject } from '../../../../flyout/document_details/shared/mocks/mock_data_as_nested_object';
import { mockSearchHit } from '../../../../flyout/document_details/shared/mocks/mock_search_hit';

jest.mock('../../../../common/hooks/use_ai_connectors', () => ({
  useAIConnectors: jest.fn().mockReturnValue({
    aiConnectors: [
      {
        id: 'test-connector-id',
        name: 'Test Connector',
        actionTypeId: '.gen-ai',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('./context', () => ({
  EaseDetailsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEaseDetailsContext: jest.fn(),
}));
jest.mock('./components/attack_discovery_widget', () => ({
  AttackDiscoveryWidget: jest.fn(),
}));

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    application: {
      ...mockUseKibana().services.application,
      capabilities: {
        management: {
          kibana: {
            settings: true,
          },
        },
      },
    },
    uiSettings: {
      get: jest.fn().mockReturnValue('default-connector-id'),
    },
  },
};
jest.mock('../../../../common/lib/kibana', () => {
  return {
    ...jest.requireActual('../../../../common/lib/kibana'),
    useKibana: () => mockedUseKibana,
  };
});

describe('EaseFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEaseDetailsContext as jest.Mock).mockReturnValue({
      dataAsNestedObject: mockDataAsNestedObject,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: jest.fn(),
      investigationFields: [],
      searchHit: mockSearchHit,
    });
  });

  it('renders the EASE flyout content', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EaseFlyout documentId="alert-id" onClose={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId(FLYOUT_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('AI summary');
    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('Attack Discovery');
    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('AI Assistant');
    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('Suggested prompts');

    expect(getByTestId(TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('calls onClose when the flyout is closed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <EaseFlyout documentId="alert-id" onClose={onClose} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
