/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IsolateHostPanelContext } from './context';
import { useIsolateHostPanelContext } from './context';
import { PanelHeader } from './header';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../../common/mock/endpoint';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';
import { ISOLATE_HOST, UNISOLATE_HOST } from '../../../common/components/endpoint/host_isolation';

jest.mock('./context');

describe('Isolation Flyout PanelHeader', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;

  const setUseIsolateHostPanelContext = (data: Partial<IsolateHostPanelContext> = {}) => {
    const panelContextMock: IsolateHostPanelContext = {
      eventId: 'some-even-1',
      indexName: 'some-index-name',
      scopeId: 'some-scope-id',
      dataFormattedForFieldBrowser: endpointAlertDataMock.generateEndpointAlertDetailsItemData(),
      isolateAction: 'isolateHost',
      ...data,
    };

    (useIsolateHostPanelContext as jest.Mock).mockReturnValue(panelContextMock);
  };

  beforeEach(() => {
    const appContextMock = createAppRootMockRenderer();

    appContextMock.setExperimentalFlag({
      responseActionsSentinelOneV1Enabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
    });

    render = () => appContextMock.render(<PanelHeader />);

    setUseIsolateHostPanelContext({
      isolateAction: 'isolateHost',
      dataFormattedForFieldBrowser: endpointAlertDataMock.generateEndpointAlertDetailsItemData(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const testConditions: Array<{
    action: IsolateHostPanelContext['isolateAction'];
    agentType: ResponseActionAgentType;
    title: string;
  }> = [];

  for (const agentType of RESPONSE_ACTION_AGENT_TYPE) {
    (['isolateHost', 'unisolateHost'] as Array<IsolateHostPanelContext['isolateAction']>).forEach(
      (action) => {
        testConditions.push({
          action,
          agentType,
          title: action === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST,
        });
      }
    );
  }

  it.each(testConditions)(
    'should display correct flyout header title for $action on agentType $agentType',
    ({ action, agentType, title }) => {
      setUseIsolateHostPanelContext({
        isolateAction: action,
        dataFormattedForFieldBrowser:
          endpointAlertDataMock.generateAlertDetailsItemDataForAgentType(agentType),
      });
      const { getByTestId } = render();

      expect(getByTestId('flyoutHostIsolationHeaderTitle')).toHaveTextContent(title);
      expect(getByTestId('flyoutHostIsolationHeaderIntegration'));
    }
  );
});
