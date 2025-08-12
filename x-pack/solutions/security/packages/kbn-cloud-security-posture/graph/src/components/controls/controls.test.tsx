/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useStore, useReactFlow } from '@xyflow/react';
import { EuiThemeProvider } from '@elastic/eui';
import { Controls, ControlsProps } from './controls';

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

  describe('zoom', () => {
    it('renders zoom in and zoom out buttons', () => {
      const { getByLabelText } = renderWithProviders();
      expect(getByLabelText('Zoom in')).toBeInTheDocument();
      expect(getByLabelText('Zoom out')).toBeInTheDocument();
    });

    it('hides zoom in and zoom out buttons if showZoom is false', () => {
      const { queryByLabelText } = renderWithProviders({ showZoom: false });
      expect(queryByLabelText('Zoom in')).not.toBeInTheDocument();
      expect(queryByLabelText('Zoom out')).not.toBeInTheDocument();
    });

    it('calls onZoomIn when zoom in button is clicked', () => {
      const onZoomIn = jest.fn();
      const { getByLabelText } = renderWithProviders({ ...defaultProps, onZoomIn });

      fireEvent.click(getByLabelText('Zoom in'));

      expect(useReactFlowMock().zoomIn).toHaveBeenCalled();
      expect(onZoomIn).toHaveBeenCalled();
    });

    it('calls onZoomOut when zoom out button is clicked', () => {
      const onZoomOut = jest.fn();
      const { getByLabelText } = renderWithProviders({ ...defaultProps, onZoomOut });

      fireEvent.click(getByLabelText('Zoom out'));

      expect(useReactFlowMock().zoomOut).toHaveBeenCalled();
      expect(onZoomOut).toHaveBeenCalled();
    });

    it('disables zoom in button when max zoom is reached', () => {
      useStoreMock.mockReturnValue({ minZoomReached: false, maxZoomReached: true });

      const { getByLabelText } = renderWithProviders();

      const zoomInButton = getByLabelText('Zoom in');
      expect(zoomInButton).toBeDisabled();
    });

    it('disables zoom out button when min zoom is reached', () => {
      useStoreMock.mockReturnValue({ minZoomReached: true, maxZoomReached: false });

      const { getByLabelText } = renderWithProviders();

      const zoomOutButton = getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });
  });

  describe('fit view', () => {
    it('renders fit view button', () => {
      const { getByLabelText } = renderWithProviders();
      expect(getByLabelText('Fit view')).toBeInTheDocument();
    });

    it('hides fit view button', () => {
      const { queryByLabelText } = renderWithProviders({ showFitView: false });
      expect(queryByLabelText('Fit view')).not.toBeInTheDocument();
    });

    it('calls onFitView when fit view button is clicked', () => {
      const onFitView = jest.fn();
      const fitViewOptions = { duration: 200 };
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        onFitView,
        fitViewOptions,
      });

      fireEvent.click(getByLabelText('Fit view'));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith(fitViewOptions);
      expect(onFitView).toHaveBeenCalled();
    });
  });

  describe('center', () => {
    it('hides center button by default', () => {
      const { queryByLabelText } = renderWithProviders();
      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenter is empty array', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenter: [],
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenter contains only empty strings', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenter: [''],
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('hides center button when nodeIdsToCenter contains only whitespace strings', () => {
      const { queryByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenter: ['   ', '\t', '\n', '  '],
      });

      expect(queryByLabelText('Center')).not.toBeInTheDocument();
    });

    it('renders center button when nodeIdsToCenter is populated', () => {
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenter: ['node1'], // Need at least one non-empty node ID for center button to render
      });
      expect(getByLabelText('Center')).toBeInTheDocument();
    });

    it('renders center button when nodeIdsToCenter contains mix of empty and non-empty IDs', () => {
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        nodeIdsToCenter: ['', 'node1', '  ', 'node2', ''],
      });

      expect(getByLabelText('Center')).toBeInTheDocument();
    });

    it('calls onCenter and centers graph on selected node IDs when center button is clicked', () => {
      const onCenter = jest.fn();
      const fitViewOptions = { duration: 200 };
      const { getByLabelText } = renderWithProviders({
        ...defaultProps,
        onCenter,
        fitViewOptions,
        nodeIdsToCenter: ['node1', 'node2'],
      });

      fireEvent.click(getByLabelText('Center'));

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
        nodeIdsToCenter: ['', 'node1', '  ', 'node2', ''],
      });

      fireEvent.click(getByLabelText('Center'));

      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
        ...fitViewOptions,
        nodes: [{ id: 'node1' }, { id: 'node2' }],
      });
      expect(onCenter).toHaveBeenCalled();
    });
  });
});
