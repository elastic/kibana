/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { HostIsolation } from '.';
import {
  HOST_ISOLATION_INTEGRATION_TEST_ID as mockHostIsolationIntegrationTestId,
  HOST_ISOLATION_PANEL_TEST_ID as mockHostIsolationPanelTestId,
  HOST_ISOLATION_TITLE_TEST_ID,
} from './test_ids';
import { endpointAlertDataMock } from '../../../../../common/mock/endpoint';

jest.mock('./components/host_isolation_view', () => ({
  HostIsolationView: () => <div data-test-subj={mockHostIsolationPanelTestId} />,
}));

jest.mock('../../../../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({
    title,
    belowTitle,
  }: {
    title: React.ReactNode;
    belowTitle?: React.ReactNode;
  }) => (
    <>
      {title}
      {belowTitle}
    </>
  ),
}));

jest.mock('../../../../../common/hooks/endpoint/use_alert_response_actions_support', () => ({
  useAlertResponseActionsSupport: () => ({
    details: { agentType: 'endpoint' },
  }),
}));

jest.mock('../../../../../common/components/endpoint/agents/agent_type_integration', () => ({
  AgentTypeIntegration: ({ agentType }: { agentType: string }) => (
    <div data-test-subj={mockHostIsolationIntegrationTestId}>{agentType}</div>
  ),
}));

const hit: DataTableRecord = {
  id: 'doc-1',
  raw: { _id: 'doc-1', _index: '.alerts-security.alerts-default' },
  flattened: {},
  isAnchor: false,
} as DataTableRecord;

const detailsData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();

describe('<HostIsolation />', () => {
  it('renders the isolate title and agent integration', () => {
    render(
      <HostIsolation
        hit={hit}
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId(HOST_ISOLATION_TITLE_TEST_ID)).toHaveTextContent('Isolate host');
    expect(screen.getByTestId(mockHostIsolationIntegrationTestId)).toHaveTextContent('endpoint');
    expect(screen.getByTestId(mockHostIsolationPanelTestId)).toBeInTheDocument();
  });

  it('renders the release title when action is unisolateHost', () => {
    render(
      <HostIsolation
        hit={hit}
        detailsData={detailsData}
        isolateAction="unisolateHost"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId(HOST_ISOLATION_TITLE_TEST_ID)).toHaveTextContent('Release host');
  });
});
