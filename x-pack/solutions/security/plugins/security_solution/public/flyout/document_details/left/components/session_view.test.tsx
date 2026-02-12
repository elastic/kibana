/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { SESSION_VIEW_TEST_ID } from './test_ids';
import {
  SESSION_VIEW_NO_DATA_TEST_ID,
  SESSION_VIEW_UPSELL_TEST_ID,
} from '../../shared/components/test_ids';
import { SessionView } from './session_view';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
} from '../../shared/constants/field_names';
import { useSessionViewConfig } from '../../shared/hooks/use_session_view_config';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useLicense } from '../../../../common/hooks/use_license';

jest.mock('../../shared/hooks/use_session_view_config');
jest.mock('../../../../common/hooks/use_license');

const NO_DATA_MESSAGE =
  'You can only view Linux session details if you’ve enabled the Include session data setting in your Elastic Defend integration policy. Refer to Enable Session View data(external, opens in a new tab or window) for more information.';

const UPSELL_TEXT = 'This feature requires an Enterprise subscription';

const sessionViewConfig = {
  index: {},
  sessionEntityId: 'sessionEntityId',
  sessionStartTime: 'sessionStartTime',
};

interface MockData {
  [key: string]: string;
}

const mockData: MockData = {
  [ENTRY_LEADER_ENTITY_ID]: 'id',
  [ENTRY_LEADER_START]: '2023-04-25T04:33:23.676Z',
  [ANCESTOR_INDEX]: '.ds-logs-endpoint.events.process-default',
};

const mockFieldsData = (prop: string) => {
  return mockData[prop];
};

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        sessionView: {
          getSessionView: jest.fn(() => <div />),
        },
      },
    }),
  };
});

const renderSessionView = (contextValue: DocumentDetailsContext = mockContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <SessionView />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<SessionView />', () => {
  beforeEach(() => {
    (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });
  });
  it('renders session view correctly', () => {
    const contextValue = {
      getFieldsData: mockFieldsData,
      indexName: '.ds-logs-endpoint.events.process-default',
    } as unknown as DocumentDetailsContext;

    const wrapper = renderSessionView(contextValue);
    expect(wrapper.getByTestId(SESSION_VIEW_TEST_ID)).toBeInTheDocument();
  });

  it('renders session view from an alert correctly', () => {
    const contextValue = {
      getFieldsData: mockFieldsData,
      indexName: '.alerts-security', // it should prioritize KIBANA_ANCESTOR_INDEX above indexName
    } as unknown as DocumentDetailsContext;

    const wrapper = renderSessionView(contextValue);
    expect(wrapper.getByTestId(SESSION_VIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should render upsell message in header if no correct license', () => {
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => false });

    const { getByTestId } = renderSessionView();
    expect(getByTestId(SESSION_VIEW_UPSELL_TEST_ID)).toHaveTextContent(UPSELL_TEXT);
  });

  it('should render error message and text in header if no sessionConfig', () => {
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });
    (useSessionViewConfig as jest.Mock).mockReturnValue(null);

    const { getByTestId } = renderSessionView();
    expect(getByTestId(SESSION_VIEW_NO_DATA_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });
});
