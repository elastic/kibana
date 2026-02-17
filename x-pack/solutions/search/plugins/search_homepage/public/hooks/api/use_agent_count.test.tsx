/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import { useGetLicenseInfo } from '../use_get_license_info';
import { renderHook, waitFor } from '@testing-library/react';
import { useAgentCount } from './use_agent_count';

jest.mock('../use_kibana');
jest.mock('../use_get_license_info');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseGetLicenseInfo = useGetLicenseInfo as jest.MockedFunction<typeof useGetLicenseInfo>;

const mockToolsService = {
  list: jest.fn().mockReturnValue(Promise.resolve([])),
};
const mockAgentsService = {
  list: jest.fn().mockReturnValue(Promise.resolve([])),
};
const mockAgentBuilderService = {
  tools: mockToolsService,
  agents: mockAgentsService,
};

const queryClient = new QueryClient();
const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useAgentCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: mockAgentBuilderService,
      } as any,
    } as any);

    mockUseGetLicenseInfo.mockReturnValue({
      hasEnterpriseLicense: true,
      isTrial: false,
      licenseType: 'enterprise',
    });
  });

  describe('with enterprise license', () => {
    it('should fetch the agent count', async () => {
      mockAgentsService.list.mockReturnValue(
        Promise.resolve([
          {
            agent: 'fake-agent',
          },
          {
            agent: 'fake-agent2',
          },
        ])
      );
      const { result } = renderHook(() => useAgentCount(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());
      await waitFor(() => expect(result.current.isError).toBeFalsy());
      await waitFor(() => expect(result.current.agents).toBe(2));
    });

    it('should fetch the tools count', async () => {
      mockToolsService.list.mockReturnValue(
        Promise.resolve([{ tool: 'fake-tool' }, { tool: 'fake-tool2' }])
      );
      const { result } = renderHook(() => useAgentCount(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());
      await waitFor(() => expect(result.current.isError).toBeFalsy());
      await waitFor(() => expect(result.current.tools).toBe(2));
    });
  });

  describe('without enterprise license', () => {
    beforeEach(() => {
      mockUseGetLicenseInfo.mockReturnValue({
        hasEnterpriseLicense: false,
        isTrial: false,
        licenseType: 'basic',
      });
    });

    it('should not fetch data and return zero values with isError true', async () => {
      const { result } = renderHook(() => useAgentCount(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());
      expect(result.current.agents).toBe(0);
      expect(result.current.tools).toBe(0);
      expect(result.current.isError).toBe(true);
      expect(mockAgentsService.list).not.toHaveBeenCalled();
      expect(mockToolsService.list).not.toHaveBeenCalled();
    });

    it('should return isError true for platinum license', async () => {
      mockUseGetLicenseInfo.mockReturnValue({
        hasEnterpriseLicense: false,
        isTrial: false,
        licenseType: 'platinum',
      });
      const { result } = renderHook(() => useAgentCount(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());
      expect(result.current.isError).toBe(true);
    });
  });

  describe('with trial license', () => {
    beforeEach(() => {
      mockUseGetLicenseInfo.mockReturnValue({
        hasEnterpriseLicense: true,
        isTrial: true,
        licenseType: 'trial',
      });
    });

    it('should fetch data with trial license (has at least enterprise)', async () => {
      mockAgentsService.list.mockReturnValue(Promise.resolve([{ agent: 'fake-agent' }]));
      mockToolsService.list.mockReturnValue(Promise.resolve([{ tool: 'fake-tool' }]));

      const { result } = renderHook(() => useAgentCount(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());
      expect(result.current.isError).toBeFalsy();
      expect(result.current.agents).toBe(1);
      expect(result.current.tools).toBe(1);
    });
  });
});
