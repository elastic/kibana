/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import type { Query, TimeRange } from '@kbn/es-query';
import { FormProvider, useForm, useFormContext, useFormState } from 'react-hook-form';
import { render } from '../../../../utils/test_helper';
import { CUSTOM_KQL_DEFAULT_VALUES, SLO_EDIT_FORM_DEFAULT_VALUES } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { QuerySearchBar } from './query_search_bar';

interface StubSearchBarProps {
  dataTestSubj: string;
  query: Query;
  onQueryChange?: (payload: { query: Query; dateRange: TimeRange }) => void;
}

function StubSearchBar({ dataTestSubj, query, onQueryChange }: StubSearchBarProps) {
  return (
    <input
      data-test-subj={dataTestSubj}
      value={String(query.query)}
      onChange={(event) =>
        onQueryChange?.({
          query: { query: event.target.value, language: 'kuery' },
          dateRange: { from: 'now-15m', to: 'now' },
        })
      }
    />
  );
}

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      unifiedSearch: { ui: { SearchBar: StubSearchBar } },
      data: { query: { filterManager: { setFilters: jest.fn() } } },
    },
  }),
}));

const TEST_SUBJ = 'goodQueryInput';

const dataView = createStubDataView({
  spec: {
    id: 'logs',
    title: 'logs-*',
    fields: {
      'host.name': {
        name: 'host.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
      },
    },
  },
});

function GoodQueryErrorType() {
  const { getFieldState } = useFormContext<CreateSLOForm>();
  const formState = useFormState<CreateSLOForm>({ name: 'indicator.params.good' });
  const { error } = getFieldState('indicator.params.good', formState);
  return <span data-test-subj="goodQueryErrorType">{error?.type ?? ''}</span>;
}

function Wrapper({ withDataView = false, good = '' }: { withDataView?: boolean; good?: string }) {
  const methods = useForm<CreateSLOForm>({
    defaultValues: {
      ...SLO_EDIT_FORM_DEFAULT_VALUES,
      indicator: {
        ...CUSTOM_KQL_DEFAULT_VALUES,
        params: { ...CUSTOM_KQL_DEFAULT_VALUES.params, good },
      },
    },
    mode: 'all',
  });

  return (
    <FormProvider {...methods}>
      <QuerySearchBar
        name="indicator.params.good"
        label="Good query"
        placeholder="Good query"
        dataTestSubj={TEST_SUBJ}
        dataView={withDataView ? dataView : undefined}
        required
      />
      <GoodQueryErrorType />
      <button data-test-subj="validate" onClick={() => methods.trigger()}>
        validate
      </button>
    </FormProvider>
  );
}

const validate = () => fireEvent.click(screen.getByTestId('validate'));

const typeQuery = (value: string) =>
  fireEvent.change(screen.getByTestId(TEST_SUBJ), { target: { value } });

// Lets the triggered validation settle: it resolves through microtasks only.
const flushPendingValidation = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

const getErrorType = () => screen.getByTestId('goodQueryErrorType').textContent;

describe('<QuerySearchBar />', () => {
  it('reports a required query as invalid while the data view is not available', async () => {
    render(<Wrapper />);

    validate();

    await waitFor(() => expect(getErrorType()).toBe('required'));
  });

  it('reports a KQL syntax error while the data view is not available', async () => {
    render(<Wrapper good="host.name:(" />);

    validate();

    await waitFor(() => expect(getErrorType()).toBe('validate'));
    expect(screen.getByText(/Expected/)).toBeInTheDocument();
  });

  it('reports a KQL error that depends on the data view', async () => {
    render(<Wrapper withDataView />);

    typeQuery('host:{ name: a }');

    expect(await screen.findByText(/host.name is not a nested field/)).toBeInTheDocument();
  });

  it('accepts a valid query when the data view is available', async () => {
    render(<Wrapper withDataView />);

    typeQuery('host.name: a');
    validate();
    await flushPendingValidation();

    expect(screen.getByTestId(TEST_SUBJ)).toHaveValue('host.name: a');
    expect(getErrorType()).toBe('');
  });
});
