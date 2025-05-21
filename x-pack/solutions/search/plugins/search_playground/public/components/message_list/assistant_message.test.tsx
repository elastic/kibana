/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssistantMessage } from './assistant_message';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

// for tooltip
jest.mock('../../hooks/use_llms_models', () => ({
  useLLMsModels: () => [
    { value: 'model1', promptTokenLimit: 100 },
    { value: 'model2', promptTokenLimit: 200 },
  ],
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const methods = useForm({
    values: {
      indices: ['index1', 'index2'],
    },
  });
  return (
    <IntlProvider locale="en">
      <FormProvider {...methods}>{children}</FormProvider>
    </IntlProvider>
  );
};

describe('AssistantMessage component', () => {
  const mockMessage = {
    content: 'Test content',
    createdAt: new Date(),
    citations: [],
    retrievalDocs: [{ content: '', metadata: { _id: '1', _index: 'index', _score: 1 } }],
    inputTokens: { context: 20, total: 10, searchQuery: 'Test question' },
  };

  it('renders message content correctly', () => {
    const { getByText } = render(
      <MockFormProvider>
        <AssistantMessage message={mockMessage} />
      </MockFormProvider>
    );
    expect(getByText('Test content')).toBeInTheDocument();
    expect(screen.getByTestId('retrieval-docs-comment')).toBeInTheDocument();
    expect(screen.getByTestId('retrieval-docs-button')).toHaveTextContent('1 document sources');
    expect(screen.getByTestId('token-tooltip-button')).toHaveTextContent('10 tokens sent');
  });

  it('renders message content correctly with no retrieval docs', () => {
    const { getByText } = render(
      <MockFormProvider>
        <AssistantMessage
          message={{
            ...mockMessage,
            retrievalDocs: [],
          }}
        />
      </MockFormProvider>
    );
    expect(getByText('Test content')).toBeInTheDocument();
    expect(screen.queryByTestId('retrieval-docs-comment')).not.toBeInTheDocument();
    expect(screen.getByTestId('retrieval-docs-comment-no-docs')).toBeInTheDocument();
  });

  it('renders message content correctly with citations', () => {
    render(
      <MockFormProvider>
        <AssistantMessage
          message={{
            ...mockMessage,
            citations: [
              { content: 'Citation content', metadata: { _id: '1', _index: 'index', _score: 1 } },
            ],
          }}
        />
      </MockFormProvider>
    );

    expect(screen.getByTestId('assistant-message-citations')).toBeInTheDocument();
  });
});
