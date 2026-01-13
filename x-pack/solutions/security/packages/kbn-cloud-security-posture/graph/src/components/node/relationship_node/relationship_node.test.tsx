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
import { getLabelColors } from '../styles';
import { GRAPH_RELATIONSHIP_NODE_ID } from '../../test_ids';
import {
  RelationshipNode,
  TEST_SUBJ_HANDLE,
  TEST_SUBJ_HOVER_OUTLINE,
  TEST_SUBJ_LABEL_TEXT,
  TEST_SUBJ_TOOLTIP,
} from './relationship_node';

describe('RelationshipNode', () => {
  const baseProps: NodeProps = {
    id: 'test-relationship-node',
    data: {
      id: 'test-relationship-node',
      label: 'Owns',
      color: 'primary',
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
    expect(screen.getAllByTestId(TEST_SUBJ_HANDLE)).toHaveLength(2);
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
      expect(screen.queryByTestId(TEST_SUBJ_HOVER_OUTLINE)).toBeInTheDocument();
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
      expect(screen.queryByTestId(TEST_SUBJ_HOVER_OUTLINE)).not.toBeInTheDocument();
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

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_LABEL_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
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

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_LABEL_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toHaveTextContent(longText);
      });
    });

    test('does not show tooltip for short text', async () => {
      render(
        <ReactFlow>
          <RelationshipNode {...baseProps} />
        </ReactFlow>
      );

      await userEvent.hover(screen.getByTestId(TEST_SUBJ_LABEL_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).not.toBeInTheDocument();
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
        darkShade: '#333333',
        lightShade: '#CCCCCC',
        lightestShade: '#F5F5F5',
      },
    };

    it('should return relationship colors when nodeType is "relationship"', () => {
      const colors = getLabelColors('primary', mockEuiTheme as EuiThemeComputed, 'relationship');
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.darkShade,
        borderColor: mockEuiTheme.colors.lightShade,
        textColor: mockEuiTheme.colors.lightestShade,
      });
    });

    it('should return relationship colors regardless of color prop', () => {
      const colorsDanger = getLabelColors(
        'danger',
        mockEuiTheme as EuiThemeComputed,
        'relationship'
      );
      const colorsPrimary = getLabelColors(
        'primary',
        mockEuiTheme as EuiThemeComputed,
        'relationship'
      );

      // Both should return the same relationship colors
      expect(colorsDanger).toEqual(colorsPrimary);
      expect(colorsDanger).toEqual({
        backgroundColor: mockEuiTheme.colors.darkShade,
        borderColor: mockEuiTheme.colors.lightShade,
        textColor: mockEuiTheme.colors.lightestShade,
      });
    });

    it('should return label colors when nodeType is "label" (default)', () => {
      const colors = getLabelColors('primary', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundBasePrimary,
        borderColor: mockEuiTheme.colors.borderStrongPrimary,
        textColor: mockEuiTheme.colors.textPrimary,
      });
    });
  });
});
