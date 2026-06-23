/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore, useReactFlow } from '@xyflow/react';
import { EuiThemeProvider } from '@elastic/eui';
import { Controls, type ControlsProps } from './controls';
import {
  GRAPH_CONTROLS_FIT_VIEW_ID,
  GRAPH_CONTROLS_CENTER_ID,
  GRAPH_CONTROLS_FULL_SCREEN_ID,
  GRAPH_CONTROLS_ZOOM_IN_ID,
  GRAPH_CONTROLS_ZOOM_OUT_ID,
} from '../test_ids';

const defaultProps: ControlsProps = {
  showZoom: true,
  showFitView: true,
};

jest.mock('@xyflow/react', () => ({
  useStore: jest.fn(),
  useReactFlow: jest.fn(),
}));

const useReactFlowMock = useReactFlow as jest.Mock;
const useStoreMock = useStore as jest.Mock;

const renderWithProviders = (props: ControlsProps = defaultProps) => {
  return render(
    <EuiThemeProvider>
      <Controls {...props} />
    </EuiThemeProvider>
  );
};

describe('Controls', () => {
  beforeEach(() => {
    useReactFlowMock.mockReturnValue({
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      fitView: jest.fn(),
    });

    useStoreMock.mockReturnValue({ minZoomReached: false, maxZoomReached: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('container', () => {
    it('should render null when no control buttons are visible', () => {
      const { container } = renderWithProviders({
        showZoom: false,
        showFitView: false,
        nodeIdsToCenterOn: [],
      });

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('zoom', () => {
    it('renders zoom in and zoom out buttons', () => {
      const { getByTestId } = renderWithProviders();
      expect(getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).toHaveAttribute('aria-label', 'Zoom in   +');
      expect(getByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).toHaveAttribute('aria-label', 'Zoom out   -');
    });

    it('hides zoom in and zoom out buttons if showZoom is false', () => {
      const { queryByTestId } = renderWithProviders({ showZoom: false });
      expect(queryByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).not.toBeInTheDocument();
    });

    it('calls onZoomIn when zoom in button is clicked', () => {
      const onZoomIn = jest.fn();
      const { getByTestId } = renderWithProviders({ ...defaultProps, onZoomIn });

      fireEvent.click(getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID));

      expect(useReactFlowMock().zoomIn).toHaveBeenCalled();
      expect(onZoomIn).toHaveBeenCalled();
    });

    it('calls onZoomOut when zoom out button is clicked', () => {
      const onZoomOut = jest.fn();
      const { getByTestId } = renderWithProviders({ ...defaultProps, onZoomOut });

      fireEvent.click(getByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID));

      expect(useReactFlowMock().zoomOut).toHaveBeenCalled();
      expect(onZoomOut).toHaveBeenCalled();
    });

    it('disables zoom in button when max zoom is reached', () => {
      useStoreMock.mockReturnValue({ minZoomReached: false, maxZoomReached: true });

      const { getByTestId } = renderWithProviders();

      expect(getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).toBeDisabled();
    });

    it('disables zoom out button when min zoom is reached', () => {
      useStoreMock.mockReturnValue({ minZoomReached: true, maxZoomReached: false });

      const { getByTestId } = renderWithProviders();

      expect(getByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).toBeDisabled();
    });
  });

  describe('fit view', () => {
    it('renders fit to screen button', () => {
      const { getByTestId } = renderWithProviders();
      expect(getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID)).toHaveAttribute(
        'aria-label',
        'Fit to screen   0'
      );
    });

    it('hides fit view button', () => {
      const { queryByTestId } = renderWithProviders({ showFitView: false });
      expect(queryByTestId(GRAPH_CONTROLS_FIT_VIEW_ID)).not.toBeInTheDocument();
    });

    it('calls onFitView when fit view button is clicked', () => {
      const onFitView = jest.fn();
      const fitViewOptions = { duration: 200 };
      const { getByTestId } = renderWithProviders({
        ...defaultProps,
        onFitView,
        fitViewOptions,
      });

      fireEvent.click(getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith(fitViewOptions);
      expect(onFitView).toHaveBeenCalled();
    });
  });

  describe('center', () => {
    it('hides center button by default', () => {
      const { queryByLabelText } = renderWithProviders();
      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenterOn is null', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenterOn is undefined', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: undefined,
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenterOn is empty array', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: [],
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenterOn contains only empty or whitespace strings', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: ['', '   ', '\t', '\n', '  ', '\u00A0', '\u2000', '\u2028'],
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('renders center button when nodeIdsToCenterOn is populated', () => {
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: ['node1'], // Need at least one non-empty node ID for center button to render
      });
      expect(getByLabelText('Center   C')).toBeInTheDocument();
    });

    it('renders center button when nodeIdsToCenterOn contains mix of empty and non-empty IDs', () => {
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: ['', 'node1', '  ', 'node2', ''],
      });

      expect(getByLabelText('Center   C')).toBeInTheDocument();
    });

    it('calls onCenter and centers graph on selected node IDs when center button is clicked', () => {
      const onCenter = jest.fn();
      const fitViewOptions = { duration: 200 };
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        onCenter,
        fitViewOptions,
        nodeIdsToCenterOn: ['node1', 'node2'],
      });

      fireEvent.click(getByLabelText('Center   C'));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
        ...fitViewOptions,
        nodes: [{ id: 'node1' }, { id: 'node2' }],
      });
      expect(onCenter).toHaveBeenCalled();
    });

    it('calls onCenter and centers graph on selected, non-empty node IDs when center button is clicked', () => {
      const onCenter = jest.fn();
      const fitViewOptions = { duration: 200 };
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        onCenter,
        fitViewOptions,
        nodeIdsToCenterOn: ['', 'node1', '  ', 'node2', ''],
      });

      fireEvent.click(getByLabelText('Center   C'));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
        ...fitViewOptions,
        nodes: [{ id: 'node1' }, { id: 'node2' }],
      });
      expect(onCenter).toHaveBeenCalled();
    });

    it('should memoize node filtering correctly', () => {
      const nodeIds = ['node1', 'node2', '', 'node3', '   '];

      const { rerender, getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: nodeIds,
      });

      const centerButton = getByLabelText('Center   C');
      fireEvent.click(centerButton);

      const firstCall = useReactFlowMock().fitView.mock.calls[0][0];

      // Re-render with same nodeIds reference
      rerender(
        <EuiThemeProvider>
          <Controls {...defaultProps} nodeIdsToCenterOn={nodeIds} />
        </EuiThemeProvider>
      );

      const newCenterButton = getByLabelText('Center   C');
      fireEvent.click(newCenterButton);

      const secondCall = useReactFlowMock().fitView.mock.calls[1][0];

      // Should produce same array object (memoization working)
      // That's why we use `toBe` vs `toEqual` here
      expect(firstCall.nodes).toBe(secondCall.nodes);
    });
  });

  describe('full screen', () => {
    it('hides full screen button when onToggleFullScreen is not provided', () => {
      const { queryByTestId } = renderWithProviders();
      expect(queryByTestId(GRAPH_CONTROLS_FULL_SCREEN_ID)).not.toBeInTheDocument();
    });

    it('renders full screen button when onToggleFullScreen is provided', () => {
      const onToggleFullScreen = jest.fn();
      const { getByTestId } = renderWithProviders({ onToggleFullScreen });

      fireEvent.click(getByTestId(GRAPH_CONTROLS_FULL_SCREEN_ID));
      expect(onToggleFullScreen).toHaveBeenCalled();
    });

    it('shows exit full screen label when isFullScreen is true', () => {
      const { getByTestId } = renderWithProviders({
        onToggleFullScreen: jest.fn(),
        isFullScreen: true,
      });

      expect(getByTestId(GRAPH_CONTROLS_FULL_SCREEN_ID)).toHaveAttribute(
        'aria-label',
        'Exit full screen   F'
      );
    });
  });

  describe('fitViewOptions', () => {
    it('handles undefined fitViewOptions', () => {
      const { getByTestId } = renderWithProviders({
        ...defaultProps,
        fitViewOptions: undefined,
      });

      fireEvent.click(getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith(undefined);
    });

    it('handles empty fitViewOptions object', () => {
      const { getByTestId } = renderWithProviders({
        ...defaultProps,
        fitViewOptions: {},
      });

      fireEvent.click(getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({});
    });
  });

  describe('accessibility and user interaction edge cases', () => {
    it('should handle keyboard navigation correctly', async () => {
      const user = userEvent.setup();

      const { getByTestId, getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: ['node1'],
      });

      const zoomInButton = getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID);
      const zoomOutButton = getByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID);
      const centerButton = getByLabelText('Center   C');
      const fitViewButton = getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID);

      // Test tab navigation and keyboard activation - zoom in
      await user.tab();
      expect(document.activeElement).toBe(zoomInButton);
      // Test keyboard activation
      await user.keyboard('{Enter}');
      expect(useReactFlowMock().zoomIn).toHaveBeenCalled();

      // Test tab navigation and keyboard activation - zoom out
      await user.tab();
      expect(document.activeElement).toBe(zoomOutButton);
      await user.keyboard('{Enter}');
      expect(useReactFlowMock().zoomOut).toHaveBeenCalled();

      // Test tab navigation and keyboard activation - center
      await user.tab();
      expect(document.activeElement).toBe(centerButton);
      await user.keyboard('{Enter}');
      expect(useReactFlowMock().fitView).toHaveBeenCalled();

      // Test tab navigation and keyboard activation - fit view
      await user.tab();
      expect(document.activeElement).toBe(fitViewButton);
      await user.keyboard('{Enter}');
      expect(useReactFlowMock().fitView).toHaveBeenCalled();
    });

    it('should have proper accessible names', () => {
      const { getByTestId, getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenterOn: ['node1'],
      });

      const zoomInButton = getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID);
      const centerButton = getByLabelText('Center   C');
      const fitViewButton = getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID);

      expect(zoomInButton).toHaveAttribute('aria-label', 'Zoom in   +');
      expect(centerButton).toHaveAccessibleName('Center   C');
      expect(fitViewButton).toHaveAttribute('aria-label', 'Fit to screen   0');
    });
  });
});
