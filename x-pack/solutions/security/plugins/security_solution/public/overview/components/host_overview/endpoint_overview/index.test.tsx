/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import '../../../../common/mock/react_beautiful_dnd';
import { TestProviders } from '../../../../common/mock';

import { EndpointOverview } from '.';
import type { EndpointFields } from '../../../../../common/search_strategy/security_solution/hosts';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { useGetAgentStatus as _useGetAgentStatus } from '../../../../management/hooks/agents/use_get_agent_status';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../management/hooks/agents/use_get_agent_status');

const useGetAgentStatusMock = _useGetAgentStatus as jest.Mock;

describe('EndpointOverview Component', () => {
  let endpointData: EndpointFields;
  let findData: HTMLElement[];
  const renderComponent = (data: EndpointFields | null = endpointData) => {
    const { container } = render(
      <TestProviders>
        <EndpointOverview data={data} />
      </TestProviders>
    );
    findData = Array.from(
      container.querySelectorAll(
        'dl[data-test-subj="endpoint-overview"] dd.euiDescriptionList__description'
      )
    );
  };

  beforeEach(() => {
    endpointData = {
      pendingActions: {},
      hostInfo: new EndpointMetadataGenerator('seed').generateHostInfo({
        metadata: {
          Endpoint: {
            state: {
              isolation: true,
            },
          },
        },
      }),
    };
  });

  test('it renders with endpoint data', () => {
    renderComponent();
    expect(findData.at(0)?.textContent).toEqual(
      endpointData?.hostInfo?.metadata.Endpoint.policy.applied.name
    );
    expect(findData.at(1)?.textContent).toEqual(
      endpointData?.hostInfo?.metadata.Endpoint.policy.applied.status
    );
    expect(findData.at(2)?.textContent).toContain(endpointData?.hostInfo?.metadata.agent.version); // contain because drag adds a space
    expect(findData.at(3)?.textContent).toEqual('Healthy');
  });

  test('it renders with null data', () => {
    renderComponent(null);
    expect(findData.at(0)?.textContent).toEqual('—');
    expect(findData.at(1)?.textContent).toEqual('—');
    expect(findData.at(2)?.textContent).toContain('—'); // contain because drag adds a space
    expect(findData.at(3)?.textContent).toEqual('—');
  });

  test('it shows isolation status', () => {
    const status = useGetAgentStatusMock(endpointData.hostInfo?.metadata.agent.id, 'endpoint');
    status.data[endpointData.hostInfo!.metadata.agent.id].isolated = true;
    useGetAgentStatusMock.mockReturnValue(status);
    renderComponent();
    expect(findData.at(3)?.textContent).toEqual('HealthyIsolated');
  });
});
