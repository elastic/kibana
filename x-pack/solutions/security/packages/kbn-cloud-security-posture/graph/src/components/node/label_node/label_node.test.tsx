/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlow, Position } from '@xyflow/react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { NodeProps } from '../../types';
import { GRAPH_LABEL_NODE_ID } from '../../test_ids';
import { getEventPillColors, getEventPillTone } from './event_pill_styles';
import { analyzeDocuments } from './analyze_documents';
import {
  LabelNode,
  TEST_SUBJ_EXPAND_BTN,
  TEST_SUBJ_HANDLE,
  TEST_SUBJ_LABEL_TEXT,
  TEST_SUBJ_TOOLTIP,
} from './label_node';
import { TEST_SUBJ_GEO_ROW, TEST_SUBJ_IP_ROW } from './label_node_details';

jest.mock('../../../hooks/use_viewport_zoom', () => ({
  useViewportZoom: jest.fn(() => 1),
}));

import { useViewportZoom } from '../../../hooks/use_viewport_zoom';

const useViewportZoomMock = useViewportZoom as jest.Mock;

jest.mock('./label_node_badges', () => {
  // Use the actual exports, except override LIMIT
  const actual = jest.requireActual('./label_node_badges');
  return {
    ...actual,
    LIMIT: 2,
  };
});

describe('LabelNode', () => {
  const baseProps: NodeProps = {
    id: 'test-label-node',
    data: {
      id: 'test-label-node',
      label: 'Test Label',
      color: 'primary',
      shape: 'label',
      interactive: true,
    },
    type: 'label',
    selected: false,
    dragging: false,
    dragHandle: '',
    targetPosition: Position.Left,
    sourcePosition: Position.Right,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    width: 100,
    height: 100,
    zIndex: 1,
    isConnectable: false,
    selectable: true,
    deletable: true,
    draggable: true,
  };

  beforeEach(() => {
    useViewportZoomMock.mockReturnValue(1);
  });

  test('renders basic label node', () => {
    render(
      <ReactFlow>
        <LabelNode {...baseProps} />
      </ReactFlow>
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getAllByTestId(TEST_SUBJ_HANDLE)).toHaveLength(2);
  });

  test('renders expand button on hover if interactive', async () => {
    render(
      <ReactFlow>
        <LabelNode {...baseProps} />
      </ReactFlow>
    );

    await userEvent.hover(screen.getByTestId(GRAPH_LABEL_NODE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_EXPAND_BTN)).toBeInTheDocument();
    });
  });

  test('does not render expand button on hover if not interactive', async () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        interactive: false,
      },
    };

    render(
      <ReactFlow>
        <LabelNode {...props} />
      </ReactFlow>
    );

    await userEvent.hover(screen.getByTestId(GRAPH_LABEL_NODE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_EXPAND_BTN)).not.toBeInTheDocument();
    });
  });

  test('does not render expand button when multiple nodes are selected', async () => {
    render(
      <ReactFlow
        nodes={[
          {
            id: 'test-label-node',
            type: 'label',
            selected: true,
            data: baseProps.data,
            position: { x: 0, y: 0 },
          },
          {
            id: 'other-label-node',
            type: 'label',
            selected: true,
            data: {
              ...baseProps.data,
              id: 'other-label-node',
              label: 'Other Label',
            },
            position: { x: 100, y: 0 },
          },
        ]}
        nodeTypes={{ label: LabelNode }}
      />
    );

    await userEvent.hover(screen.getAllByTestId(GRAPH_LABEL_NODE_ID)[0]);

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_EXPAND_BTN)).not.toBeInTheDocument();
    });
  });

  test('renders ip metadata when ips are present', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        ips: ['127.0.0.1'],
      },
    };
    render(
      <ReactFlow>
        <LabelNode {...props} />
      </ReactFlow>
    );

    expect(screen.queryByTestId(TEST_SUBJ_IP_ROW)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_GEO_ROW)).not.toBeInTheDocument();
  });

  test('hides metadata when zoomed out below simplified threshold', () => {
    useViewportZoomMock.mockReturnValue(0.5);

    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        ips: ['127.0.0.1'],
        countryCodes: ['us'],
      },
    };

    render(
      <ReactFlow>
        <LabelNode {...props} />
      </ReactFlow>
    );

    expect(screen.queryByTestId(TEST_SUBJ_IP_ROW)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_GEO_ROW)).not.toBeInTheDocument();
  });

  test('renders geolocation metadata when country codes are present', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        countryCodes: ['us'],
      },
    };
    render(
      <ReactFlow>
        <LabelNode {...props} />
      </ReactFlow>
    );

    expect(screen.queryByTestId(TEST_SUBJ_IP_ROW)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_GEO_ROW)).toBeInTheDocument();
  });

  test('renders ip and geolocation metadata when both are present', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        countryCodes: ['us'],
        ips: ['127.0.0.1'],
      },
    };
    render(
      <ReactFlow>
        <LabelNode {...props} />
      </ReactFlow>
    );

    expect(screen.queryByTestId(TEST_SUBJ_IP_ROW)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_GEO_ROW)).toBeInTheDocument();
  });

  describe('Tooltip', () => {
    test('shows tooltip when text is truncated', async () => {
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          label: 'This label is too long so it will be truncated for sure oh yeah',
        },
      };

      render(
        <ReactFlow>
          <LabelNode {...props} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_LABEL_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
      });
    });

    test('tooltip shows full text content', async () => {
      const longText = 'This is a very long label that exceeds twenty-seven characters';
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          label: longText,
        },
      };
      render(
        <ReactFlow>
          <LabelNode {...props} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_LABEL_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toHaveTextContent(longText);
      });
    });

    test('does not show tooltip otherwise', async () => {
      render(
        <ReactFlow>
          <LabelNode {...baseProps} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_LABEL_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).not.toBeInTheDocument();
      });
    });
  });

  describe('Pill colors', () => {
    const mockEuiTheme = {
      colors: {
        backgroundBaseDanger: '#fff3f1',
        backgroundLightDanger: '#fdddd8',
        borderBaseDanger: '#ffc9c2',
        borderStrongDanger: '#c61e25',
        backgroundBasePlain: '#ffffff',
        backgroundBaseSubdued: '#f6f9fc',
        borderBasePlain: '#cad3e2',
        textParagraph: '#1d2a3e',
      },
    } as EuiThemeComputed;

    it('returns alert colors for alert-only nodes', () => {
      const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 2 });
      const colors = getEventPillColors(getEventPillTone(analysis), false, mockEuiTheme);
      expect(colors.backgroundColor).toBe(mockEuiTheme.colors.backgroundBaseDanger);
      expect(colors.borderColor).toBe(mockEuiTheme.colors.borderBaseDanger);
    });

    it('returns active alert colors when selected', () => {
      const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 2 });
      const colors = getEventPillColors(getEventPillTone(analysis), true, mockEuiTheme);
      expect(colors.backgroundColor).toBe(mockEuiTheme.colors.backgroundLightDanger);
      expect(colors.borderColor).toBe(mockEuiTheme.colors.borderStrongDanger);
    });

    it('returns event colors for event-only nodes', () => {
      const analysis = analyzeDocuments({ uniqueEventsCount: 2, uniqueAlertsCount: 0 });
      const colors = getEventPillColors(getEventPillTone(analysis), false, mockEuiTheme);
      expect(colors.backgroundColor).toBe(mockEuiTheme.colors.backgroundBasePlain);
      expect(colors.borderColor).toBe(mockEuiTheme.colors.borderBasePlain);
    });
  });
});
