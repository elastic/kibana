/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import { HostWorkingDir } from './host_working_dir';
import { CellActionsRenderer } from '../../../../../common/components/cell_actions/cell_actions_renderer';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/components/cell_actions/cell_actions_renderer', () => {
  return {
    CellActionsRenderer: jest.fn(),
  };
});

const MockedCellActionsRenderer = jest.fn(({ children }) => {
  return <div data-test-subj="mock-cell-action-renderer">{children}</div>;
});

describe('HostWorkingDir', () => {
  beforeEach(() => {
    (CellActionsRenderer as unknown as jest.Mock).mockImplementation(MockedCellActionsRenderer);
  });
  test('renders both the hostname and the working directory', () => {
    const { container } = render(
      <TestProviders>
        <HostWorkingDir
          eventId={mockTimelineData[0].ecs._id}
          scopeId="some_scope"
          contextId="test"
          hostName="[hostname-123]"
          workingDirectory="[working-directory-123]"
        />
      </TestProviders>
    );
    expect(container.textContent).toEqual('[hostname-123]in[working-directory-123]');
  });

  test('it renders a hostname without a workingDirectory', () => {
    const { container } = render(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            scopeId="some_scope"
            contextId="test"
            hostName="[hostname-123]"
            workingDirectory={undefined}
          />
        </div>
      </TestProviders>
    );

    expect(container.textContent).toEqual('[hostname-123]');
  });

  test('it renders a hostname with a workingDirectory set to null', () => {
    const { container } = render(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            scopeId="some_scope"
            contextId="test"
            hostName="[hostname-123]"
            workingDirectory={null}
          />
        </div>
      </TestProviders>
    );

    expect(container.textContent).toEqual('[hostname-123]');
  });

  test('it renders a a workingDirectory without a hostname with words "in" at the beginning', () => {
    const { container } = render(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            scopeId="some_scope"
            contextId="test"
            hostName={undefined}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(container.textContent).toEqual('in[working-directory-123]');
  });

  test('it renders a a workingDirectory with hostname set to null with words "in" at the beginning', () => {
    const { container } = render(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            scopeId="some_scope"
            contextId="test"
            hostName={null}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(container.textContent).toEqual('in[working-directory-123]');
  });

  test('should passing correct scopeId to cell actions', () => {
    render(
      <TestProviders>
        <div>
          <HostWorkingDir
            eventId={mockTimelineData[0].ecs._id}
            scopeId="some_scope"
            contextId="test"
            hostName={null}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(MockedCellActionsRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeId: 'some_scope',
      }),
      {}
    );
  });
});
