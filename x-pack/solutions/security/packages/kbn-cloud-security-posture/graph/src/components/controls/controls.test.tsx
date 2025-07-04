/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Controls, ControlsProps } from './controls';
import { EuiThemeProvider } from '@elastic/eui';
import { useStore, useReactFlow } from '@xyflow/react';

const defaultProps: ControlsProps = {
  showZoom: true,
  showFitView: true,
  showCenter: true,
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

  it('renders zoom in and zoom out buttons', () => {
    const { getByLabelText } = renderWithProviders();
    expect(getByLabelText('Zoom in')).toBeInTheDocument();
    expect(getByLabelText('Zoom out')).toBeInTheDocument();
  });

  it('renders fit view button', () => {
    const { getByLabelText } = renderWithProviders();
    expect(getByLabelText('Fit view')).toBeInTheDocument();
  });

  it('renders center button', () => {
    const { getByLabelText } = renderWithProviders();
    expect(getByLabelText('Center')).toBeInTheDocument();
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

  it('calls onFitView when fit view button is clicked', () => {
    const onFitView = jest.fn();
    const { getByLabelText } = renderWithProviders({ ...defaultProps, onFitView });

    fireEvent.click(getByLabelText('Fit view'));

    expect(useReactFlowMock().fitView).toHaveBeenCalled();
    expect(onFitView).toHaveBeenCalled();
  });

  it('calls onCenter when center button is clicked', () => {
    const onCenter = jest.fn();
    const { getByLabelText } = renderWithProviders({ ...defaultProps, onCenter });

    fireEvent.click(getByLabelText('Center'));

    expect(onCenter).toHaveBeenCalled();
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
