/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { EndpointInfo } from './endpoint_info';

// Mock document.execCommand for EUI's copy functionality
const mockExecCommand = jest.fn().mockReturnValue(true);
Object.defineProperty(document, 'execCommand', {
  value: mockExecCommand,
  writable: true,
});

describe('RenderEndpoint component tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockExecCommand.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the component with inference id', () => {
    const mockProvider = {
      inference_id: 'cohere-2',
      service: 'cohere',
      service_settings: {
        similarity: 'cosine',
        dimensions: 384,
        model_id: 'embed-english-light-v3.0',
        rate_limit: {
          requests_per_minute: 10000,
        },
        embedding_type: 'byte',
      },
      task_settings: {},
    } as any;

    render(<EndpointInfo inferenceId={'cohere-2'} endpointInfo={mockProvider} />);

    expect(screen.getByText('cohere-2')).toBeInTheDocument();
  });

  it('renders correctly without model_id in service_settings', () => {
    const mockProvider = {
      inference_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;

    render(<EndpointInfo inferenceId={'azure-openai-1'} endpointInfo={mockProvider} />);

    expect(screen.getByText('azure-openai-1')).toBeInTheDocument();
  });

  it('renders with tech preview badge when endpoint is reranker type', () => {
    const mockProvider = {
      inference_id: 'elastic-rerank',
      task_type: 'rerank',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: '.rerank-v1',
      },
      task_settings: {
        return_documents: true,
      },
    } as any;

    render(<EndpointInfo inferenceId={'elastic-rerank'} endpointInfo={mockProvider} />);

    expect(screen.getByText('elastic-rerank')).toBeInTheDocument();
    expect(screen.getByText('TECH PREVIEW')).toBeInTheDocument();
  });

  describe('copy to clipboard functionality', () => {
    const mockProvider = {
      inference_id: 'test-endpoint',
      service: 'elasticsearch',
      service_settings: {},
      task_settings: {},
    } as any;

    it('renders copy button with correct aria-label', () => {
      render(<EndpointInfo inferenceId={'test-endpoint'} endpointInfo={mockProvider} />);

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveAttribute('aria-label', 'Copy endpoint ID to clipboard');
    });

    it('copies endpoint ID to clipboard when copy button is clicked', async () => {
      render(<EndpointInfo inferenceId={'test-endpoint'} endpointInfo={mockProvider} />);

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockExecCommand).toHaveBeenCalledWith('copy');
      });
    });

    it('shows checkmark icon after successful copy', async () => {
      render(<EndpointInfo inferenceId={'test-endpoint'} endpointInfo={mockProvider} />);

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByTestId('inference-endpoint-copy-id-button-copied')).toBeInTheDocument();
      });
    });

    it('reverts to copy icon after 1 second', async () => {
      render(<EndpointInfo inferenceId={'test-endpoint'} endpointInfo={mockProvider} />);

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByTestId('inference-endpoint-copy-id-button-copied')).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('inference-endpoint-copy-id-button')).toBeInTheDocument();
      });
    });

    it('is keyboard accessible', () => {
      render(<EndpointInfo inferenceId={'test-endpoint'} endpointInfo={mockProvider} />);

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      expect(copyButton.tagName.toLowerCase()).toBe('button');
    });
  });
});
