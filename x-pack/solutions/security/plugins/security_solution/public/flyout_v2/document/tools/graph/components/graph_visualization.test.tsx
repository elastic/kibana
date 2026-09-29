/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { GraphInvestigation } from '@kbn/cloud-security-posture-graph';
import { GraphVisualization, GRAPH_VISUALIZATION_TEST_ID } from './graph_visualization';

const mockToasts = {
  addDanger: vi.fn(),
  addError: vi.fn(),
  addSuccess: vi.fn(),
  addWarning: vi.fn(),
  addInfo: vi.fn(),
  remove: vi.fn(),
};

const mockInvestigateInTimeline = {
  investigateInTimeline: vi.fn(),
};

const GRAPH_INVESTIGATION_TEST_ID = 'cloudSecurityPostureGraphGraphInvestigation';

vi.mock('@kbn/cloud-security-posture-graph', async () => {
  const { getNodeDocumentMode, getSingleDocumentData } = (await vi.importActual('@kbn/cloud-security-posture-graph/src/components/utils'));

  return {
    GraphInvestigation: vi.fn(),
    getNodeDocumentMode: vi.fn().mockImplementation(getNodeDocumentMode),
    getSingleDocumentData: vi.fn().mockImplementation(getSingleDocumentData),
  };
});

const mockCapabilities = {
  securitySolutionTimeline: {
    read: true,
    crud: true,
  },
};

vi.mock('../../../../../common/lib/kibana', () => {
      const mocked = {
      useToasts: () => mockToasts,
      useKibana: () => ({
        services: {
          application: {
            capabilities: mockCapabilities,
          },
        },
      }),
      KibanaServices: {
        get: () => ({
          uiSettings: {
            get: vi.fn().mockReturnValue(true),
          },
        }),
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/hooks/timeline/use_investigate_in_timeline', () => {
      const mocked = {
      useInvestigateInTimeline: () => mockInvestigateInTimeline,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../data_view_manager/hooks/use_data_view', () => {
      const mocked = {
      useDataView: () => ({
        dataView: {
          id: 'experimental-data-view',
          getIndexPattern: vi.fn().mockReturnValue('experimental-data-view-pattern'),
        },
        status: 'ready',
      }),
    };
      return { ...mocked, default: mocked };
    });

const callbacks = {
  onShowDocument: vi.fn(),
  onShowEntity: vi.fn(),
  onShowGrouped: vi.fn(),
  onShowNetwork: vi.fn(),
};

const EVENT_PROPS = {
  mode: 'event' as const,
  scopeId: 'test-scope',
  eventIds: ['event-1', 'event-2'],
  timestamp: new Date().toISOString(),
  isAlert: false,
  ...callbacks,
};

const ENTITY_PROPS = {
  mode: 'entity' as const,
  scopeId: 'test-scope',
  entityId: 'entity-1',
  ...callbacks,
};

describe('GraphVisualization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (GraphInvestigation as unknown as Mock).mockReturnValue(
      <div data-test-subj={GRAPH_INVESTIGATION_TEST_ID} />
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('event mode', () => {
    it('renders the wrapper and lazy-loads GraphInvestigation', async () => {
      const { getByTestId } = render(<GraphVisualization {...EVENT_PROPS} />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('passes originEventIds derived from eventIds and isAlert', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.originEventIds).toEqual([
        { id: 'event-1', isAlert: false },
        { id: 'event-2', isAlert: false },
      ]);
      expect(initialState.entityIds).toBeUndefined();
    });

    it('passes a timestamp-anchored timeRange', async () => {
      const timestamp = '2024-01-15T10:00:00.000Z';
      render(<GraphVisualization {...EVENT_PROPS} timestamp={timestamp} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.timeRange).toEqual({
        from: `${timestamp}||-30m`,
        to: `${timestamp}||+30m`,
      });
    });
  });

  describe('entity mode', () => {
    it('renders the wrapper and lazy-loads GraphInvestigation', async () => {
      const { getByTestId } = render(<GraphVisualization {...ENTITY_PROPS} />);
      expect(getByTestId(GRAPH_VISUALIZATION_TEST_ID)).toBeInTheDocument();

      await waitFor(() => {
        expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
      });
    });

    it('passes entityIds with isOrigin: true', async () => {
      render(<GraphVisualization {...ENTITY_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.entityIds).toEqual([{ id: 'entity-1', isOrigin: true }]);
      expect(initialState.originEventIds).toBeUndefined();
    });

    it('passes a rolling 30-day timeRange', async () => {
      render(<GraphVisualization {...ENTITY_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { initialState } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      expect(initialState.timeRange).toEqual({ from: 'now-30d', to: 'now' });
    });
  });

  describe('showInvestigateInTimeline', () => {
    it('passes showInvestigateInTimeline as true when user has timeline read access', async () => {
      mockCapabilities.securitySolutionTimeline.read = true;
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      expect(vi.mocked(GraphInvestigation).mock.calls[0][0].showInvestigateInTimeline).toBe(true);
    });

    it('passes showInvestigateInTimeline as false when user has no timeline read access', async () => {
      mockCapabilities.securitySolutionTimeline.read = false;
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      expect(vi.mocked(GraphInvestigation).mock.calls[0][0].showInvestigateInTimeline).toBe(
        false
      );
    });
  });

  describe('node dispatch', () => {
    it('routes a single-event node to onShowDocument', async () => {
      const { getNodeDocumentMode, getSingleDocumentData } = (await vi.importMock('@kbn/cloud-security-posture-graph'));
      getNodeDocumentMode.mockReturnValueOnce('single-event');
      getSingleDocumentData.mockReturnValueOnce({ id: 'doc-id', index: 'logs-*' });

      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onOpenEventPreview } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      onOpenEventPreview?.({} as never);

      expect(callbacks.onShowDocument).toHaveBeenCalledWith('doc-id', 'logs-*', true);
    });

    it('forwards onOpenNetworkPreview straight to GraphInvestigation', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      expect(vi.mocked(GraphInvestigation).mock.calls[0][0].onOpenNetworkPreview).toBe(
        callbacks.onShowNetwork
      );
    });
  });

  describe('onInvestigateInTimeline', () => {
    it('shows a danger toast when time range cannot be parsed', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onInvestigateInTimeline } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      onInvestigateInTimeline?.(undefined, [], { from: '', to: '' });

      expect(mockInvestigateInTimeline.investigateInTimeline).not.toHaveBeenCalled();
      expect(mockToasts.addDanger).toHaveBeenCalled();
    });

    it('calls investigateInTimeline with a valid time range', async () => {
      render(<GraphVisualization {...EVENT_PROPS} />);

      await waitFor(() => {
        expect(GraphInvestigation).toHaveBeenCalledTimes(1);
      });

      const { onInvestigateInTimeline } = vi.mocked(GraphInvestigation).mock.calls[0][0];
      onInvestigateInTimeline?.(undefined, [], { from: 'now-15m', to: 'now' });

      expect(mockInvestigateInTimeline.investigateInTimeline).toHaveBeenCalled();
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });
  });
});
