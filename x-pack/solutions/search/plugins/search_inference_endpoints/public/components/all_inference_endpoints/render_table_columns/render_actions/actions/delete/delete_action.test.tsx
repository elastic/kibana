/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { DeleteAction } from './delete_action';
import { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';

describe('Delete Action', () => {
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

  const Wrapper = ({ item }: { item: InferenceInferenceEndpointInfo }) => {
    const queryClient = new QueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <DeleteAction selectedEndpoint={item} onCancel={jest.fn()} displayModal={true} />
      </QueryClientProvider>
    );
  };

  it('loads confirm delete modal', () => {
    render(<Wrapper item={mockProvider} />);
    expect(screen.getByTestId('deleteModalForInferenceUI')).toBeInTheDocument();
  });
});
