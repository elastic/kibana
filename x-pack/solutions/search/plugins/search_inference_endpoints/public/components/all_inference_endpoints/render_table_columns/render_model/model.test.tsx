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

jest.mock('@kbn/ml-trained-models-utils', () => ({
  ...jest.requireActual('@kbn/ml-trained-models-utils'),
  ELASTIC_MODEL_DEFINITIONS: {
    '.multilingual-e5-small': {
      license: 'MIT',
      licenseUrl: 'https://huggingface.co/intfloat/multilingual-e5-small',
    },
  },
}));

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

  it('renders the MIT license badge when model is eligible', () => {
    const endpointInfo = {
      inference_id: '.multilingual-e5-small-elasticsearch',
      task_type: 'text_embedding',
      service: 'elasticsearch',
      service_settings: {
        model_id: '.multilingual-e5-small',
      },
    } as InferenceInferenceEndpointInfo;

    render(<Model endpointInfo={endpointInfo} />);

    expect(screen.getByText('.multilingual-e5-small')).toBeInTheDocument();
    const mitBadge = screen.getByTestId('mit-license-badge');
    expect(mitBadge).toBeInTheDocument();
    expect(mitBadge).toHaveAttribute(
      'href',
      'https://huggingface.co/intfloat/multilingual-e5-small'
    );
  });

  it('does not render the MIT license badge when model is not eligible', () => {
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
    expect(screen.queryByTestId('mit-license-badge')).not.toBeInTheDocument();
  });
});
