/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { Model } from './model';

describe('Model component', () => {
  it('renders model_id when available in service_settings', () => {
    const endpointInfo = {
      inference_id: 'test-endpoint',
      task_type: 'text_embedding',
      service: 'cohere',
      service_settings: {
        model_id: 'embed-english-light-v3.0',
      },
    } as InferenceInferenceEndpointInfo;

    render(<Model endpointInfo={endpointInfo} />);

    expect(screen.getByText('embed-english-light-v3.0')).toBeInTheDocument();
  });

  it('renders model when model_id is not available but model is', () => {
    const endpointInfo = {
      inference_id: 'test-endpoint',
      task_type: 'completion',
      service: 'amazonbedrock',
      service_settings: {
        model: 'anthropic.claude-v2',
      },
    } as InferenceInferenceEndpointInfo;

    render(<Model endpointInfo={endpointInfo} />);

    expect(screen.getByText('anthropic.claude-v2')).toBeInTheDocument();
  });

  it('renders nothing when neither model_id nor model is available', () => {
    const endpointInfo = {
      inference_id: 'test-endpoint',
      task_type: 'text_embedding',
      service: 'hugging_face',
      service_settings: {
        url: 'https://example.com',
      },
    } as InferenceInferenceEndpointInfo;

    const { container } = render(<Model endpointInfo={endpointInfo} />);

    expect(container.firstChild).toBeNull();
  });

  it('prefers model_id over model when both are present', () => {
    const endpointInfo = {
      inference_id: 'test-endpoint',
      task_type: 'text_embedding',
      service: 'openai',
      service_settings: {
        model_id: 'text-embedding-3-small',
        model: 'text-embedding-ada-002',
      },
    } as InferenceInferenceEndpointInfo;

    render(<Model endpointInfo={endpointInfo} />);

    expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
    expect(screen.queryByText('text-embedding-ada-002')).not.toBeInTheDocument();
  });
});
