/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlow, Position } from '@xyflow/react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { NodeProps } from '../../types';
import { getRelationshipColors, getLabelColors } from '../styles';
import {
  GRAPH_RELATIONSHIP_NODE_SHAPE_ID,
  GRAPH_RELATIONSHIP_NODE_HANDLE_ID,
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

  describe('Shape colors', () => {
    const mockEuiTheme = {
      colors: {
        backgroundLightPrimary: '#E6F1FA',
        borderBasePlain: '#D3DAE6',
        textHeading: '#1A1C21',
        textParagraph: '#DDDDDD',
        backgroundLightText: '#a1b2c3',
        backgroundFilledText: '#333333',
        borderBaseProminent: '#CCCCCC',
      },
    };

    it('should return relationship colors matching event/label node colors', () => {
      const colors = getRelationshipColors(mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundLightPrimary,
        borderColor: mockEuiTheme.colors.borderBasePlain,
        textColor: mockEuiTheme.colors.textHeading,
      });
    });

    const expectedLabelColors = {
      backgroundColor: mockEuiTheme.colors.backgroundLightPrimary,
      borderColor: mockEuiTheme.colors.borderBasePlain,
      textColor: mockEuiTheme.colors.textHeading,
    };

    it('should return gray colors for label nodes with primary color', () => {
      const colors = getLabelColors('primary', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual(expectedLabelColors);
    });

    it('should return gray colors for label nodes with danger color', () => {
      const colors = getLabelColors('danger', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual(expectedLabelColors);
    });
  });
});
