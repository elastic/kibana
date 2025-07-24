/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LabelNode } from './label_node';
import type { NodeProps } from '../types';

// Mock react-flow components  
jest.mock('@xyflow/react', () => ({
  Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  Position: {
    Left: 'left',
    Right: 'right',
  },
}));

// Mock the NodeExpandButton component
jest.mock('./node_expand_button', () => ({
  NodeExpandButton: ({ children, ...props }: any) => <div data-testid="node-expand-button" {...props}>{children}</div>,
}));

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
    position: { x: 0, y: 0 },
    selected: false,
    dragging: false,
    dragHandle: '',
    targetPosition: 'left',
    sourcePosition: 'right',
    hidden: false,
    positionAbsolute: { x: 0, y: 0 },
    width: 100,
    height: 100,
    zIndex: 1,
    isConnectable: true,
  } as any;

  test('renders basic label node without documents', () => {
    render(<LabelNode {...baseProps} />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getAllByTestId('handle')).toHaveLength(2);
  });

  test('renders single alert styling and badge', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        documentsData: [{ id: 'alert1', type: 'alert' }],
      },
    };
    
    render(<LabelNode {...props} />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByTestId('euiIcon')).toBeInTheDocument(); // Warning icon for alert
  });

  test('renders group of events styling and badge', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        documentsData: [
          { id: 'event1', type: 'event' },
          { id: 'event2', type: 'event' },
          { id: 'event3', type: 'event' },
        ],
      },
    };
    
    render(<LabelNode {...props} />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument(); // Event counter
  });

  test('shows tooltip when documents are present', () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        documentsData: [{ id: 'event1', type: 'event' }],
      },
    };
    
    render(<LabelNode {...props} />);
    
    expect(screen.getByTestId('label-node-tooltip')).toBeInTheDocument();
  });

  test('does not show tooltip when no documents', () => {
    render(<LabelNode {...baseProps} />);
    
    expect(screen.queryByTestId('label-node-tooltip')).not.toBeInTheDocument();
  });
});