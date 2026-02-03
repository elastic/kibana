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
import { getRelationshipColors, getLabelColors } from '../styles';
import {
  GRAPH_RELATIONSHIP_NODE_ID,
  GRAPH_RELATIONSHIP_NODE_SHAPE_ID,
  GRAPH_RELATIONSHIP_NODE_HANDLE_ID,
  GRAPH_RELATIONSHIP_NODE_HOVER_OUTLINE_ID,
  GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID,
  GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID,
} from '../../test_ids';
import { RelationshipNode } from './relationship_node';

describe('RelationshipNode', () => {
  const baseProps: NodeProps = {
    id: 'test-relationship-node',
    data: {
      id: 'test-relationship-node',
      label: 'Owns',
      shape: 'relationship',
      interactive: true,
    },
    type: 'relationship',
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

  test('renders basic relationship node', () => {
    render(
      <ReactFlow>
        <RelationshipNode {...baseProps} />
      </ReactFlow>
    );

    expect(screen.getByText('Owns')).toBeInTheDocument();
    expect(screen.getAllByTestId(GRAPH_RELATIONSHIP_NODE_HANDLE_ID)).toHaveLength(2);
    expect(screen.getByTestId(GRAPH_RELATIONSHIP_NODE_SHAPE_ID)).toBeInTheDocument();
  });

  test('renders with node id when label is not provided', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        label: undefined,
      },
    };

    render(
      <ReactFlow>
        <RelationshipNode {...props} />
      </ReactFlow>
    );

    expect(screen.getByText('test-relationship-node')).toBeInTheDocument();
  });

  test('renders hover outline if interactive', async () => {
    render(
      <ReactFlow>
        <RelationshipNode {...baseProps} />
      </ReactFlow>
    );

    await userEvent.hover(screen.getByTestId(GRAPH_RELATIONSHIP_NODE_ID));

    await waitFor(() => {
      expect(screen.queryByTestId(GRAPH_RELATIONSHIP_NODE_HOVER_OUTLINE_ID)).toBeInTheDocument();
    });
  });

  test('does not render hover outline if not interactive', async () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        interactive: false,
      },
    };

    render(
      <ReactFlow>
        <RelationshipNode {...props} />
      </ReactFlow>
    );

    await userEvent.hover(screen.getByTestId(GRAPH_RELATIONSHIP_NODE_ID));

    await waitFor(() => {
      expect(
        screen.queryByTestId(GRAPH_RELATIONSHIP_NODE_HOVER_OUTLINE_ID)
      ).not.toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    test('shows tooltip when text is truncated', async () => {
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          label: 'This relationship label is too long so it will be truncated for sure',
        },
      };

      render(
        <ReactFlow>
          <RelationshipNode {...props} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID)).toBeInTheDocument();
      });
    });

    test('tooltip shows full text content', async () => {
      const longText =
        'This is a very long relationship label that exceeds twenty-seven characters';
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          label: longText,
        },
      };

      render(
        <ReactFlow>
          <RelationshipNode {...props} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID)).toHaveTextContent(
          longText
        );
      });
    });

    test('does not show tooltip for short text', async () => {
      render(
        <ReactFlow>
          <RelationshipNode {...baseProps} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(GRAPH_RELATIONSHIP_NODE_LABEL_TEXT_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_RELATIONSHIP_NODE_TOOLTIP_ID)).not.toBeInTheDocument();
      });
    });
  });

  describe('Shape colors', () => {
    const mockEuiTheme = {
      colors: {
        danger: '#FF0000',
        backgroundBasePrimary: '#0000FF',
        borderStrongPrimary: '#0000DD',
        textInverse: '#FFFFFF',
        textPrimary: '#000000',
        backgroundFilledText: '#333333',
        borderBaseProminent: '#CCCCCC',
      },
    };

    it('should return relationship colors with dark background and light text', () => {
      const colors = getRelationshipColors(mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundFilledText,
        borderColor: mockEuiTheme.colors.borderBaseProminent,
        textColor: mockEuiTheme.colors.textInverse,
      });
    });

    it('should return label colors for primary color', () => {
      const colors = getLabelColors('primary', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundBasePrimary,
        borderColor: mockEuiTheme.colors.borderStrongPrimary,
        textColor: mockEuiTheme.colors.textPrimary,
      });
    });

    it('should return danger colors for label nodes with danger color', () => {
      const colors = getLabelColors('danger', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.danger,
        borderColor: mockEuiTheme.colors.danger,
        textColor: mockEuiTheme.colors.textInverse,
      });
    });
  });
});
