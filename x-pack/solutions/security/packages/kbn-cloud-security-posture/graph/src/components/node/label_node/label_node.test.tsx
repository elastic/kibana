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
import { GRAPH_FLAGS_BADGE_ID, GRAPH_IPS_TEXT_ID, GRAPH_LABEL_NODE_ID } from '../../test_ids';
import { LabelNode, TEST_SUBJ_EXPAND_BTN, TEST_SUBJ_HANDLE } from './label_node';

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

  test('renders ips when present', () => {
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

    expect(screen.queryByTestId(GRAPH_IPS_TEXT_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)).not.toBeInTheDocument();
  });

  test('renders country flags when present', () => {
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

    expect(screen.queryByTestId(GRAPH_IPS_TEXT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)).toBeInTheDocument();
  });

  test('renders ips and country flags when present', () => {
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

    expect(screen.queryByTestId(GRAPH_IPS_TEXT_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_FLAGS_BADGE_ID)).toBeInTheDocument();
  });

  describe('Shape colors', () => {
    const mockEuiTheme = {
      colors: {
        disabled: '#E3E8F2',
        borderBasePlain: '#D3DAE6',
        textHeading: '#1A1C21',
      },
    };

    const expectedColors = {
      backgroundColor: mockEuiTheme.colors.disabled,
      borderColor: mockEuiTheme.colors.borderBasePlain,
      textColor: mockEuiTheme.colors.textHeading,
    };

    it('should return gray colors when color prop is "danger"', () => {
      const colors = getLabelColors('danger', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual(expectedColors);
    });

    it('should return gray colors when color prop is "primary"', () => {
      const colors = getLabelColors('primary', mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual(expectedColors);
    });
  });
});
