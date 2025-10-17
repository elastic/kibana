/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen, act } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';

import { ConfirmDeleteEndpointModal } from '.';
import { useScanUsage } from '../../../../../../../hooks/use_scan_usage';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';

jest.mock('../../../../../../../hooks/use_scan_usage');
const mockUseScanUsage = useScanUsage as jest.Mock;

describe('ConfirmDeleteEndpointModal', () => {
  const mockOnCancel = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockProvider: InferenceInferenceEndpointInfo = {
    inference_id: 'my-hugging-face',
    service: 'hugging_face',
    service_settings: {
      api_key: 'aaaa',
      url: 'https://dummy.huggingface.com',
    },
    task_settings: {},
    task_type: 'text_embedding',
  };

  const queryClient = new QueryClient();

  const Wrapper = () => {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmDeleteEndpointModal
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
          inferenceEndpoint={mockProvider}
        />
      </QueryClientProvider>
    );
  };

  const mockUsageData = { indexes: ['index-1', 'index2'], pipelines: ['pipeline-1'] };
  const mockEmptyData = { indexes: [], pipelines: [] };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with correct elements', () => {
    mockUseScanUsage.mockReturnValue({ data: mockUsageData });
    render(<Wrapper />);

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText('Delete inference endpoint')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Deleting an inference endpoint currently in use will cause failures in ingest and query attempts.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete endpoint')).toBeInTheDocument();
    expect(screen.getByText('my-hugging-face')).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    mockUseScanUsage.mockReturnValue({ data: mockUsageData });
    render(<Wrapper />);

    act(() => {
      jest.runAllTimers();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('useScanUsage gets called with correct params', () => {
    mockUseScanUsage.mockReturnValue({ data: mockUsageData });
    render(<Wrapper />);

    act(() => {
      jest.runAllTimers();
    });

    expect(mockUseScanUsage).toHaveBeenCalledWith({
      type: 'text_embedding',
      id: 'my-hugging-face',
    });
  });

  describe('endpoint with usage', () => {
    beforeEach(() => {
      mockUseScanUsage.mockReturnValue({ data: mockUsageData });
    });
    it('disables delete endpoint button', () => {
      render(<Wrapper />);
      act(() => {
        jest.runAllTimers();
      });
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
      expect(screen.getByText('Potential Failures')).toBeInTheDocument();
    });

    it('selecting checkbox enables Delete Endpoint button', () => {
      render(<Wrapper />);
      act(() => {
        jest.runAllTimers();
      });
      fireEvent.click(screen.getByTestId('warningCheckbox'));

      expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
    });
  });

  describe('endpoint without usage', () => {
    beforeEach(() => {
      mockUseScanUsage.mockReturnValue({ data: mockEmptyData });

      render(<Wrapper />);

      act(() => {
        jest.runAllTimers();
      });
    });
    it('renders no usage message and enables delete button', () => {
      expect(screen.getByText('No Usage Found')).toBeInTheDocument();
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
    });

    it('calls onConfirm when the delete button is clicked', () => {
      fireEvent.click(screen.getByText('Delete endpoint'));
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });
});
