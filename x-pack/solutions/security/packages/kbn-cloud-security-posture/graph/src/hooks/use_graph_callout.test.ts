/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGraphCallout } from './use_graph_callout';
import type { NodeViewModel, EntityNodeViewModel, LabelNodeViewModel } from '../components/types';
import { CLOUD_ASSET_DISCOVERY_INTEGRATION_ID } from './use_callout_links';

// Mock dependencies
const mockUseQuery = jest.fn();
const mockGetUrlForApp = jest.fn();
const mockDataViewsGet = jest.fn();
const mockKibana = {
  services: {
    http: {
      fetch: jest.fn(),
    },
    application: {
      getUrlForApp: mockGetUrlForApp,
    },
    dataViews: {
      get: mockDataViewsGet,
    },
  },
};

jest.mock('@kbn/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockKibana,
}));

describe('useGraphCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default useQuery mock to prevent undefined returns
    mockUseQuery.mockReturnValue({ data: undefined, error: null });
    // Setup default getUrlForApp mock
    mockGetUrlForApp.mockImplementation((appId: string, options?: { path?: string }) => {
      if (appId === 'integrations') {
        return '/app/integrations';
      }
      if (appId === 'security') {
        return `/app/security${options?.path || ''}`;
      }
      if (appId === 'discover') {
        return `/app/discover${options?.path || ''}`;
      }
      return `/app/${appId}`;
    });
    // Setup default dataViews.get mock to return a resolved Promise with single dataView object
    mockDataViewsGet.mockReturnValue(
      Promise.resolve({
        id: CLOUD_ASSET_DISCOVERY_INTEGRATION_ID,
        title: 'Cloud Asset Discovery',
      })
    );
  });

  const createMockEntityNode = ({
    id,
    hasType = true,
    hasSubType = true,
    hasName = true,
    availableInEntityStore = true,
  }: {
    id: string;
    hasType?: boolean;
    hasSubType?: boolean;
    hasName?: boolean;
    availableInEntityStore?: boolean;
  }): EntityNodeViewModel => ({
    id,
    label: `Node ${id}`,
    shape: 'hexagon',
    color: 'primary',
    icon: 'user',
    documentsData: [
      {
        id: `doc-${id}`,
        type: 'entity',
        entity: {
          type: hasType ? 'user' : '',
          sub_type: hasSubType ? 'local' : '',
          name: hasName ? 'entity-name' : '',
          availableInEntityStore,
        },
      },
    ],
  });

  const createMockLabelNode = (id: string): LabelNodeViewModel => ({
    id,
    label: `Label ${id}`,
    shape: 'label',
    color: 'primary',
  });

  describe('Priority 1: missingAllRequirements', () => {
    it('should show callout with missingAllRequirements config when both integration and Entity Store are not available', async () => {
      mockUseQuery
        // Query 1: Integration not installed
        .mockReturnValueOnce({
          data: { item: { status: 'not_installed' } },
          error: null,
        })
        // Query 2: Entity Store not running
        .mockReturnValueOnce({
          data: { status: 'stopped' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toBe('Enrich graph experience');
        expect(result.current.config.links).toHaveLength(2);
        expect(result.current.config.links[0].href).toBe(
          '/app/integrations/detail/cloud_asset_inventory/overview'
        );
        expect(result.current.config.links[1].href).toBe(
          '/app/security/entity_analytics_entity_store'
        );
      }
    });
  });

  describe('Priority 2: uninstalledIntegration', () => {
    it('should show callout with uninstalledIntegration config when integration is not installed but Entity Store is running', async () => {
      mockUseQuery
        // Query 1: Integration not installed
        .mockReturnValueOnce({
          data: { item: { status: 'not_installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toBe('Enrich graph experience');
        expect(result.current.config.links).toHaveLength(1);
        expect(result.current.config.links[0].href).toBe(
          '/app/integrations/detail/cloud_asset_inventory/overview'
        );
      }
    });
  });

  describe('Priority 3: disabledEntityStore', () => {
    it('should show callout with disabledEntityStore config when integration is installed but Entity Store is not running', async () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store not running
        .mockReturnValueOnce({
          data: { status: 'stopped' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toBe('Enrich graph experience');
        expect(result.current.config.links).toHaveLength(1);
        expect(result.current.config.links[0].href).toBe(
          '/app/security/entity_analytics_entity_store'
        );
      }
    });
  });

  describe('Priority 4: unavailableEntityInfo', () => {
    it('should show callout with unavailableEntityInfo config when entity is not available in Entity Store', async () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [
        createMockEntityNode({ id: 'node1', availableInEntityStore: false }),
      ];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toBe('Entity information unavailable');
        expect(result.current.config.links).toHaveLength(1);
        expect(result.current.config.links[0].href).toBe(
          `/app/discover#/?_a=(dataSource:(dataViewId:'${CLOUD_ASSET_DISCOVERY_INTEGRATION_ID}',type:dataView))`
        );
      }
    });
  });

  describe('Priority 5: unknownEntityType', () => {
    it('should show callout with unknownEntityType config when entity has no type', async () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [
        createMockEntityNode({ id: 'node1' }),
        createMockEntityNode({ id: 'node2', hasType: false }),
      ];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toContain('Unknown entity type');
        expect(result.current.config.links).toHaveLength(1);
        expect(result.current.config.links[0].href).toBe(
          `/app/discover#/?_a=(dataSource:(dataViewId:'${CLOUD_ASSET_DISCOVERY_INTEGRATION_ID}',type:dataView))`
        );
      }
    });

    it('should show callout with unknownEntityType config when entity has no sub_type', async () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [
        createMockEntityNode({ id: 'node1' }),
        createMockEntityNode({ id: 'node2', hasSubType: false }),
      ];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toContain('Unknown entity type');
        expect(result.current.config.links).toHaveLength(1);
        expect(result.current.config.links[0].href).toBe(
          `/app/discover#/?_a=(dataSource:(dataViewId:'${CLOUD_ASSET_DISCOVERY_INTEGRATION_ID}',type:dataView))`
        );
      }
    });

    it('should show callout with unknownEntityType config when entity has no name', async () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [
        createMockEntityNode({ id: 'node1' }),
        createMockEntityNode({ id: 'node2', hasName: false }),
      ];

      const { result } = renderHook(() => useGraphCallout(nodes));

      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toContain('Unknown entity type');
        expect(result.current.config.links).toHaveLength(1);
        expect(result.current.config.links[0].href).toBe(
          `/app/discover#/?_a=(dataSource:(dataViewId:'${CLOUD_ASSET_DISCOVERY_INTEGRATION_ID}',type:dataView))`
        );
      }
    });
  });

  describe('No callout needed', () => {
    it('should not show callout when all requirements are met and entities are enriched', () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [
        createMockEntityNode({ id: 'node1' }),
        createMockEntityNode({ id: 'node2' }),
      ];

      const { result } = renderHook(() => useGraphCallout(nodes));

      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
    });

    it('should not show callout when integration is installed and Entity Store is enabled but there are no entity nodes', () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store running
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockLabelNode('label1')];

      const { result } = renderHook(() => useGraphCallout(nodes));

      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should not show callout when integration check fails', () => {
      mockUseQuery
        // Query 1: Integration check error
        .mockReturnValueOnce({
          data: null,
          error: { message: 'Failed to fetch' },
        })
        // Query 2: Entity Store status
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
    });

    it('should not show callout when Entity Store status check fails', () => {
      mockUseQuery
        // Query 1: Integration installed
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        // Query 2: Entity Store status error
        .mockReturnValueOnce({
          data: null,
          error: { message: 'Failed to fetch' },
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
    });

    it('should not show callout when http service is not available', () => {
      // Mock http as undefined
      const originalHttp = mockKibana.services.http;
      (mockKibana.services as { http?: typeof originalHttp }).http = undefined;

      // Mock useQuery to return default values when http is undefined
      mockUseQuery.mockReturnValue({
        data: null,
        error: null,
      });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      // Restore http service for other tests
      mockKibana.services.http = originalHttp;

      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
    });

    it('should not show callout when getUrlForApp is not available', () => {
      // Make getUrlForApp unavailable
      const originalGetUrlForApp = mockKibana.services.application.getUrlForApp;
      (
        mockKibana.services.application as { getUrlForApp?: typeof originalGetUrlForApp }
      ).getUrlForApp = undefined;

      mockUseQuery
        // Query 1: Integration not installed
        .mockReturnValueOnce({
          data: { item: { status: 'not_installed' } },
          error: null,
        })
        // Query 2: Entity Store not running
        .mockReturnValueOnce({
          data: { status: 'stopped' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      // Should not show callout because links cannot be generated
      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();

      // Restore for other tests
      mockKibana.services.application.getUrlForApp = originalGetUrlForApp;
    });
  });

  describe('Loading state', () => {
    it('should not show callout when data is still loading', () => {
      mockUseQuery
        // Query 1: Integration data loading
        .mockReturnValueOnce({
          data: null,
          error: null,
        })
        // Query 2: Entity Store status loading
        .mockReturnValueOnce({
          data: null,
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result } = renderHook(() => useGraphCallout(nodes));

      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
    });
  });

  describe('Dismiss functionality', () => {
    it('should hide callout after onDismiss is called', async () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { item: { status: 'not_installed' } },
          error: null,
        })
        .mockReturnValueOnce({
          data: { status: 'stopped' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result, rerender } = renderHook(() => useGraphCallout(nodes));

      // Initially should show callout
      await waitFor(() => {
        expect(result.current.shouldShowCallout).toBe(true);
      });

      if (result.current.shouldShowCallout) {
        expect(result.current.config.title).toBe('Enrich graph experience');
        expect(result.current.onDismiss).toBeDefined();

        // Dismiss the callout
        const { onDismiss } = result.current;
        act(() => {
          onDismiss();
        });
      }

      // Re-render to trigger state update
      rerender();

      // After dismissal, callout should not show
      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.config).toBeUndefined();
      expect(result.current.onDismiss).toBeUndefined();
    });

    it('should keep callout dismissed across re-renders', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { item: { status: 'not_installed' } },
          error: null,
        })
        .mockReturnValueOnce({
          data: { status: 'stopped' },
          error: null,
        });

      const nodes: NodeViewModel[] = [createMockEntityNode({ id: 'node1' })];

      const { result, rerender } = renderHook(() => useGraphCallout(nodes));

      // Dismiss the callout
      if (result.current.shouldShowCallout) {
        const { onDismiss } = result.current;
        act(() => {
          onDismiss();
        });
      }

      // Re-render multiple times
      rerender();
      rerender();
      rerender();

      // Callout should stay dismissed
      expect(result.current.shouldShowCallout).toBe(false);
    });

    it('should have onDismiss undefined when callout should not be shown', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { item: { status: 'installed' } },
          error: null,
        })
        .mockReturnValueOnce({
          data: { status: 'running' },
          error: null,
        });

      const nodes: NodeViewModel[] = [
        createMockEntityNode({ id: 'node1' }),
        createMockEntityNode({ id: 'node2' }),
      ];

      const { result } = renderHook(() => useGraphCallout(nodes));

      // When callout should not show, onDismiss should be undefined
      expect(result.current.shouldShowCallout).toBe(false);
      expect(result.current.onDismiss).toBeUndefined();
    });
  });
});
