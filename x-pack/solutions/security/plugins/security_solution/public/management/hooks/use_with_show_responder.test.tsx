/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import type { AppContextTestRender } from '../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../common/mock/endpoint';
import { useWithShowResponder, type BasicConsoleProps } from './use_with_show_responder';
import { ConsoleManager } from '../components/console';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useLicense } from '../../common/hooks/use_license';

jest.mock('../../common/components/user_privileges');
jest.mock('../../common/hooks/use_license');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;

describe('useWithShowResponder()', () => {
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let showConsole: (props?: Partial<BasicConsoleProps>) => void;

  const TestComponent = React.memo(() => {
    const show = useWithShowResponder();

    showConsole = (overrides = {}) => {
      show({
        agentId: 'agent-a',
        agentType: 'endpoint',
        hostName: 'host-a',
        platform: 'linux',
        capabilities: ['isolation'],
        ...overrides,
      });
    };

    return <div />;
  });
  TestComponent.displayName = 'TestComponent';

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        loading: false,
        canAccessResponseConsole: true,
        canReadActionsLogManagement: true,
      },
    });
    useLicenseMock.mockReturnValue({ isEnterprise: () => true });

    renderResult = mockedContext.render(
      <ConsoleManager>
        <TestComponent />
      </ConsoleManager>
    );
  });

  it('should open the responder console without a pre-populated command by default', async () => {
    act(() => {
      showConsole();
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('endpointResponseActionsConsole')).toBeInTheDocument();
    });

    expect(
      renderResult.getByTestId('endpointResponseActionsConsole-cmdInput-leftOfCursor').textContent
    ).toEqual('');
  });

  it('should pre-populate the console input when `inputCommand` is defined', async () => {
    act(() => {
      showConsole({ inputCommand: 'isolate' });
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('endpointResponseActionsConsole')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        renderResult.getByTestId('endpointResponseActionsConsole-cmdInput-leftOfCursor').textContent
      ).toEqual('isolate');
    });
  });
});
