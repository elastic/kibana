/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { fields } from '@kbn/data-plugin/common/mocks';

import { MockedShowValueListModal } from '../__mock__/show_value_list_modal.mock';

import type { ExceptionBuilderProps } from './exception_items_renderer';
import { ExceptionBuilderComponent } from './exception_items_renderer';

const httpService = coreMock.createStart().http;
const { autocomplete: autocompleteService } = kqlPluginMock.createStartContract();

const renderBuilder = (props: Partial<ExceptionBuilderProps> = {}): jest.Mock => {
  const onChange = jest.fn();
  render(
    <EuiProvider>
      <ExceptionBuilderComponent
        allowLargeValueLists={false}
        autocompleteService={autocompleteService}
        exceptionListItems={[]}
        httpService={httpService}
        indexPatterns={{ fields, id: '1234', title: 'logstash-*' }}
        isAndDisabled={false}
        isNestedDisabled={false}
        isOrDisabled={false}
        listId="list_id"
        listNamespaceType="single"
        listType="rule_default"
        onChange={onChange}
        showValueListModal={MockedShowValueListModal}
        {...props}
      />
    </EuiProvider>
  );
  return onChange;
};

const lastItems = (onChange: jest.Mock): Array<Record<string, unknown>> =>
  onChange.mock.calls[onChange.mock.calls.length - 1][0].exceptionItems;

describe('ExceptionBuilderComponent with an item that applies to the ES|QL output columns', () => {
  it('shows an entry with a typed field and a column type, and no field suggestions', () => {
    renderBuilder({ appliesTo: 'esql_output_columns' });

    expect(screen.getByTestId('exceptionBuilderEsqlEntryField')).toBeInTheDocument();
    expect(screen.getByTestId('exceptionBuilderEsqlEntryColumnType')).toBeInTheDocument();
    expect(screen.queryByTestId('fieldAutocompleteComboBox')).toBeNull();
  });

  it('does not offer a nested condition, but still offers AND and OR', () => {
    renderBuilder({ appliesTo: 'esql_output_columns' });

    expect(screen.getByTestId('exceptionsAndButton')).toBeInTheDocument();
    expect(screen.getByTestId('exceptionsOrButton')).toBeInTheDocument();
    expect(screen.queryByTestId('exceptionsNestedButton')).toBeNull();
  });

  it('offers a nested condition for an item on the source documents, as it always did', () => {
    renderBuilder();

    expect(screen.getByTestId('exceptionsNestedButton')).toBeInTheDocument();
    expect(screen.queryByTestId('exceptionBuilderEsqlEntryField')).toBeNull();
  });

  it('does not report an item until its entry has a column type', async () => {
    const onChange = renderBuilder({ appliesTo: 'esql_output_columns' });

    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryField'), 'risk');
    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryValue'), 'low');

    expect(lastItems(onChange)).toEqual([]);
  });

  it('reports the item with applies_to and the column type of its entries once the entry is complete', async () => {
    const onChange = renderBuilder({ appliesTo: 'esql_output_columns' });

    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryField'), 'risk');
    await userEvent.click(
      within(screen.getByTestId('exceptionBuilderEsqlEntryColumnType')).getByTestId(
        'comboBoxToggleListButton'
      )
    );
    await userEvent.click(screen.getByRole('option', { name: 'keyword' }));
    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryValue'), 'low');

    await waitFor(() => {
      const [item] = lastItems(onChange);
      expect(item).toMatchObject({
        applies_to: 'esql_output_columns',
        entries: [
          {
            column_type: 'keyword',
            field: 'risk',
            operator: 'included',
            type: 'match',
            value: 'low',
          },
        ],
      });
    });
  });

  it('tells the parent that the item has an error while a value does not fit the column type, so that it cannot be saved', async () => {
    const onChange = renderBuilder({ appliesTo: 'esql_output_columns' });
    const lastErrorExists = (): boolean =>
      onChange.mock.calls[onChange.mock.calls.length - 1][0].errorExists;

    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryField'), 'src_ip');
    await userEvent.click(
      within(screen.getByTestId('exceptionBuilderEsqlEntryColumnType')).getByTestId(
        'comboBoxToggleListButton'
      )
    );
    await userEvent.click(screen.getByRole('option', { name: 'ip' }));
    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryValue'), 'bogus');

    await waitFor(() => expect(lastErrorExists()).toBe(true));
    expect(
      screen.getByText('"bogus" is not a valid value for a column of type ip')
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByTestId('exceptionBuilderEsqlEntryValue'));
    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryValue'), '10.0.0.1');

    await waitFor(() => expect(lastErrorExists()).toBe(false));
  });

  it('adds an entry, and an item with OR, that apply to the same', async () => {
    const onChange = renderBuilder({ appliesTo: 'esql_output_columns' });

    await userEvent.click(screen.getByTestId('exceptionsAndButton'));
    expect(screen.getAllByTestId('exceptionBuilderEsqlEntryField')).toHaveLength(2);

    await userEvent.click(screen.getByTestId('exceptionsOrButton'));
    expect(screen.getAllByTestId('exceptionBuilderEsqlEntryField')).toHaveLength(3);
    expect(onChange).toHaveBeenCalled();
  });

  it('reports an item without applies_to for the source documents, as it always did', async () => {
    const onChange = renderBuilder();

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastItems(onChange).every((item) => !('applies_to' in item))).toBe(true);
  });
});
