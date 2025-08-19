/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// create @testing-library/react tests for Header component
// check if EuiButtonGroup is differently labeled based on the selectedPageMode prop

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Header } from './header';
import { PlaygroundFormFields, PlaygroundPageMode, PlaygroundViewMode } from '../types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiForm } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';

jest.mock('../hooks/use_source_indices_field', () => ({
  useSourceIndicesFields: () => ({}),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const methods = useForm({
    values: {
      [PlaygroundFormFields.indices]: ['index1', 'index2'],
      [PlaygroundFormFields.queryFields]: { index1: ['field1'], index2: ['field1'] },
      [PlaygroundFormFields.sourceFields]: {
        index1: ['field1'],
        index2: ['field1'],
      },
      [PlaygroundFormFields.elasticsearchQuery]: {
        retriever: {
          rrf: {
            retrievers: [
              { standard: { query: { multi_match: { query: '{query}', fields: ['field1'] } } } },
              { standard: { query: { multi_match: { query: '{query}', fields: ['field1'] } } } },
            ],
          },
        },
      },
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};
const MockPlaygroundForm = ({
  children,
  handleSubmit,
}: {
  children: React.ReactElement;
  handleSubmit: React.FormEventHandler;
}) => (
  <MockFormProvider>
    <EuiForm
      onSubmit={handleSubmit}
      data-test-subj="chatPage"
      css={{ display: 'flex', flexGrow: 1 }}
    >
      {children}
    </EuiForm>
  </MockFormProvider>
);

describe('Header', () => {
  it('renders correctly', () => {
    render(
      <IntlProvider locale="en">
        <MockPlaygroundForm handleSubmit={() => {}}>
          <Header
            pageMode={PlaygroundPageMode.chat}
            viewMode={PlaygroundViewMode.preview}
            onModeChange={() => {}}
            onSelectPageModeChange={() => {}}
          />
        </MockPlaygroundForm>
      </IntlProvider>
    );

    expect(screen.getByTestId('chatMode')).toHaveTextContent('Chat');
    expect(screen.getByTestId('queryMode')).toHaveTextContent('Query');
  });

  it('renders correctly with preview mode', () => {
    render(
      <IntlProvider locale="en">
        <MockPlaygroundForm handleSubmit={() => {}}>
          <Header
            pageMode={PlaygroundPageMode.search}
            viewMode={PlaygroundViewMode.preview}
            onModeChange={() => {}}
            onSelectPageModeChange={() => {}}
          />
        </MockPlaygroundForm>
      </IntlProvider>
    );

    expect(screen.getByTestId('chatMode')).toHaveTextContent('Preview');
    expect(screen.getByTestId('queryMode')).toHaveTextContent('Query');
  });
});
