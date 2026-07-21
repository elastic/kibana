/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useHasWorkflowsPrivileges } from '.';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

interface MockServicesOptions {
  executeWorkflow?: boolean;
  isWorkflowsEnabled?: boolean;
  readWorkflow?: boolean;
}

const mockServices = ({
  executeWorkflow,
  isWorkflowsEnabled = true,
  readWorkflow,
}: MockServicesOptions) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          workflowsManagement: {
            executeWorkflow,
            readWorkflow,
          },
        },
      },
      featureFlags: {
        getBooleanValue: jest.fn().mockResolvedValue(isWorkflowsEnabled),
      },
    },
  } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
};

describe('useHasWorkflowsPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the attackDiscoveryWorkflowsEnabled feature flag is OFF', () => {
    beforeEach(() => {
      mockServices({ executeWorkflow: false, isWorkflowsEnabled: false, readWorkflow: false });
    });

    it('reports hasWorkflowsRead as true (inert)', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsRead).toBe(true));
    });

    it('reports hasWorkflowsExecute as true (inert)', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsExecute).toBe(true));
    });

    it('reports no missing feature privileges (inert)', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.missingPrivileges.featurePrivileges).toEqual([]));
    });
  });

  describe('when the feature flag is ON and all capabilities are present', () => {
    beforeEach(() => {
      mockServices({ executeWorkflow: true, readWorkflow: true });
    });

    it('reports hasWorkflowsRead as true', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsRead).toBe(true));
    });

    it('reports hasWorkflowsExecute as true', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsExecute).toBe(true));
    });

    it('reports no missing feature privileges', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.missingPrivileges.featurePrivileges).toEqual([]));
    });
  });

  describe('when the feature flag is ON and all capabilities are absent', () => {
    beforeEach(() => {
      mockServices({ executeWorkflow: false, readWorkflow: false });
    });

    it('reports hasWorkflowsRead as false', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsRead).toBe(false));
    });

    it('reports hasWorkflowsExecute as false', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsExecute).toBe(false));
    });

    it('reports both read and execute as missing feature privileges', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() =>
        expect(result.current.missingPrivileges.featurePrivileges).toEqual([
          ['workflowsManagement', ['read', 'execute']],
        ])
      );
    });
  });

  describe('when the feature flag is ON and only read is present (partial)', () => {
    beforeEach(() => {
      mockServices({ executeWorkflow: false, readWorkflow: true });
    });

    it('reports hasWorkflowsRead as true', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsRead).toBe(true));
    });

    it('reports hasWorkflowsExecute as false', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() => expect(result.current.hasWorkflowsExecute).toBe(false));
    });

    it('reports only execute as a missing feature privilege', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() =>
        expect(result.current.missingPrivileges.featurePrivileges).toEqual([
          ['workflowsManagement', ['execute']],
        ])
      );
    });
  });

  describe('when the feature flag is ON and only execute is present (partial)', () => {
    beforeEach(() => {
      mockServices({ executeWorkflow: true, readWorkflow: false });
    });

    it('reports only read as a missing feature privilege', async () => {
      const { result } = renderHook(() => useHasWorkflowsPrivileges());

      await waitFor(() =>
        expect(result.current.missingPrivileges.featurePrivileges).toEqual([
          ['workflowsManagement', ['read']],
        ])
      );
    });
  });

  it('reads the feature flag with the correct key and default', async () => {
    mockServices({ executeWorkflow: true, readWorkflow: true });

    renderHook(() => useHasWorkflowsPrivileges());

    const { getBooleanValue } = mockUseKibana().services.featureFlags;

    await waitFor(() =>
      expect(getBooleanValue).toHaveBeenCalledWith(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        false
      )
    );
  });
});
