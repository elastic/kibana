/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';
import { HighlightedFieldsCell } from './highlighted_fields_cell';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { useGetAgentStatus } from '../../../../management/hooks/agents/use_get_agent_status';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from './host_entity_overview';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from './user_entity_overview';
import { NetworkPreviewPanelKey, NETWORK_PREVIEW_BANNER } from '../../../network_details';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';

jest.mock('../../../../management/hooks');
jest.mock('../../../../management/hooks/agents/use_get_agent_status');

jest.mock('@kbn/expandable-flyout');

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const useGetAgentStatusMock = useGetAgentStatus as jest.Mock;

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
} as unknown as DocumentDetailsContext;

const renderHighlightedFieldsCell = (values: string[], field: string) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <HighlightedFieldsCell values={values} field={field} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<HighlightedFieldsCell />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should render a basic cell', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HighlightedFieldsCell values={['value']} field={'field'} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should open host preview when click on host', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['test host'], 'host.name');
    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        hostName: 'test host',
        scopeId: panelContextValue.scopeId,
        banner: HOST_PREVIEW_BANNER,
      },
    });
  });

  it('should open user preview when click on user', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['test user'], 'user.name');
    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: UserPreviewPanelKey,
      params: {
        userName: 'test user',
        scopeId: panelContextValue.scopeId,
        banner: USER_PREVIEW_BANNER,
      },
    });
  });

  it('should open ip preview when click on ip', () => {
    const { getByTestId } = renderHighlightedFieldsCell(['100:XXX:XXX'], 'source.ip');
    expect(getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID)).toBeInTheDocument();

    getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: NetworkPreviewPanelKey,
      params: {
        ip: '100:XXX:XXX',
        flowTarget: 'source',
        scopeId: panelContextValue.scopeId,
        banner: NETWORK_PREVIEW_BANNER,
      },
    });
  });

  it('should render agent status cell if field is `agent.status`', () => {
    useGetAgentStatusMock.mockReturnValue({
      isFetched: true,
      isLoading: false,
    });
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HighlightedFieldsCell values={['value']} field={'agent.status'} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render SentinelOne agent status cell if field is agent.status and `originalField` is `observer.serial_number`', () => {
    useGetAgentStatusMock.mockReturnValue({
      isFetched: true,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HighlightedFieldsCell
            values={['value']}
            field={'agent.status'}
            originalField="observer.serial_number"
          />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render Crowdstrike agent status cell if field is agent.status and `originalField` is `crowdstrike.event.DeviceId`', () => {
    useGetAgentStatusMock.mockReturnValue({
      isFetched: true,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HighlightedFieldsCell
            values={['value']}
            field={'agent.status'}
            originalField="crowdstrike.event.DeviceId"
          />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID)).toBeInTheDocument();
  });

  it('should not render if values is null', () => {
    const { container } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HighlightedFieldsCell values={null} field={'field'} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
