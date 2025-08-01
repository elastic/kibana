/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Position, type HandleProps } from '@xyflow/react';
import type { NodeProps } from '../../types';
import {
  LabelNode,
  TEST_SUBJ_CONTAINER,
  TEST_SUBJ_EXPAND_BTN,
  TEST_SUBJ_HANDLE,
  TEST_SUBJ_HOVER_OUTLINE,
  TEST_SUBJ_TOOLTIP,
} from './label_node';
import { analyzeDocuments } from './analyze_documents';
import { getLabelColors } from '../styles';
import { EuiThemeComputed } from '@elastic/eui';

// Mock react-flow components
jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    Handle: ({ id, ...props }: HandleProps) => (
      <div data-testid="handle" {...props} id={id !== null ? id : undefined} />
    ),
  };
});

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

  test('renders basic label node', () => {
    render(<LabelNode {...baseProps} />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getAllByTestId(TEST_SUBJ_HANDLE)).toHaveLength(2);
  });

  test('renders expand button and outline on hover if interactive', async () => {
    render(<LabelNode {...baseProps} />);

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_CONTAINER));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_EXPAND_BTN)).toBeInTheDocument();
      expect(screen.queryByTestId(TEST_SUBJ_HOVER_OUTLINE)).toBeInTheDocument();
    });
  });

  test('does not render expand button and outline on hover if no interactive', async () => {
    const props = {
      ...baseProps,
      data: {
        ...baseProps.data,
        interactive: false,
      },
    };

    render(<LabelNode {...props} />);

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_CONTAINER));

    await waitFor(() => {
      expect(screen.queryByTestId(TEST_SUBJ_EXPAND_BTN)).not.toBeInTheDocument();
      expect(screen.queryByTestId(TEST_SUBJ_HOVER_OUTLINE)).not.toBeInTheDocument();
    });
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
    render(<LabelNode {...props} />);

    expect(screen.getByTestId('ips-text')).toBeInTheDocument();
    expect(screen.getByTestId('country-flags-badge')).toBeInTheDocument();
  });

  describe('Shape colors', () => {
    const mockEuiTheme = {
      colors: {
        danger: '#FF0000',
        backgroundBasePrimary: '#0000FF',
        borderStrongPrimary: '#0000DD',
        textInverse: '#FFFFFF',
        textPrimary: '#000000',
      },
    };

    it('should return danger colors for a single alert', () => {
      const analysis = analyzeDocuments([{ id: 'alert1', type: 'alert' as const }]);

      const colors = getLabelColors(analysis, mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.danger,
        borderColor: mockEuiTheme.colors.danger,
        textColor: mockEuiTheme.colors.textInverse,
      });
    });

    it('should return danger colors for multiple alerts', () => {
      const analysis = analyzeDocuments([
        { id: 'alert1', type: 'alert' as const },
        { id: 'alert2', type: 'alert' as const },
      ]);

      const colors = getLabelColors(analysis, mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.danger,
        borderColor: mockEuiTheme.colors.danger,
        textColor: mockEuiTheme.colors.textInverse,
      });
    });

    it('should return primary colors for a single event', () => {
      const analysis = analyzeDocuments([{ id: 'event1', type: 'event' as const }]);

      const colors = getLabelColors(analysis, mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundBasePrimary,
        borderColor: mockEuiTheme.colors.borderStrongPrimary,
        textColor: mockEuiTheme.colors.textPrimary,
      });
    });

    it('should return primary colors for multiple events', () => {
      const analysis = analyzeDocuments([
        { id: 'event1', type: 'event' as const },
        { id: 'event2', type: 'event' as const },
      ]);

      const colors = getLabelColors(analysis, mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundBasePrimary,
        borderColor: mockEuiTheme.colors.borderStrongPrimary,
        textColor: mockEuiTheme.colors.textPrimary,
      });
    });

    it('should return primary colors for both events and alerts', () => {
      const analysis = analyzeDocuments([
        { id: 'event1', type: 'event' as const },
        { id: 'alert1', type: 'alert' as const },
      ]);

      const colors = getLabelColors(analysis, mockEuiTheme as EuiThemeComputed);
      expect(colors).toEqual({
        backgroundColor: mockEuiTheme.colors.backgroundBasePrimary,
        borderColor: mockEuiTheme.colors.borderStrongPrimary,
        textColor: mockEuiTheme.colors.textPrimary,
      });
    });
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

      render(<LabelNode {...props} />);

      fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_CONTAINER));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
      });
    });

    test('shows tooltip when number of events is over limit', async () => {
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          documentsData: [
            { id: 'event1', type: 'event' as const },
            { id: 'event2', type: 'event' as const },
            { id: 'event3', type: 'event' as const },
          ],
        },
      };

      render(<LabelNode {...props} />);

      fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_CONTAINER));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
      });
    });

    test('shows tooltip when number of alerts is over limit', async () => {
      const props = {
        ...baseProps,
        data: {
          ...baseProps.data,
          documentsData: [
            { id: 'alert1', type: 'alert' as const },
            { id: 'alert2', type: 'alert' as const },
            { id: 'alert3', type: 'alert' as const },
          ],
        },
      };

      render(<LabelNode {...props} />);

      fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_CONTAINER));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).toBeInTheDocument();
      });
    });

    test('does not show tooltip otherwise', async () => {
      render(<LabelNode {...baseProps} />);

      fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_CONTAINER));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP)).not.toBeInTheDocument();
      });
    });
  });
});
