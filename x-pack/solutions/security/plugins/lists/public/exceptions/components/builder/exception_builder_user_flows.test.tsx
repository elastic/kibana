/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { fields, getField } from '@kbn/data-plugin/common/mocks';

import { MockedShowValueListModal } from '../__mock__/show_value_list_modal.mock';

import type { ExceptionBuilderProps, OnChangeProps } from './exception_items_renderer';
import { ExceptionBuilderComponent } from './exception_items_renderer';

const mockKibanaHttpService = coreMock.createStart().http;
const { autocomplete: autocompleteStartMock } = kqlPluginMock.createStartContract();

// Operations in these flows go through the real combo boxes, which makes them slow.
const LONG_FLOW_TIMEOUT_MS = 30_000;

const NESTED_PATH = 'process.elf.sections';
const nestedFields = ['name', 'address'].map((child) => ({
  ...getField('nestedField.child'),
  name: `${NESTED_PATH}.${child}`,
  subType: { nested: { path: NESTED_PATH } },
}));
const indexPattern = { fields: [...fields, ...nestedFields], id: '1234', title: 'logstash-*' };

const getItems = (): HTMLElement[] => screen.getAllByTestId('exceptionEntriesContainer');
const getRows = (itemIndex: number): HTMLElement[] =>
  within(getItems()[itemIndex]).getAllByTestId('exceptionItemEntryContainer');
const getSearchInput = (row: HTMLElement, comboBoxTestSubj: string): HTMLInputElement =>
  within(within(row).getByTestId(comboBoxTestSubj)).getByTestId('comboBoxSearchInput');

const getFieldInput = (row: HTMLElement): HTMLInputElement =>
  getSearchInput(row, 'fieldAutocompleteComboBox');

/** Selected field of every row of an item. A row without a field yet reads as an empty string. */
const getFieldLabels = (itemIndex: number): string[] =>
  getRows(itemIndex).map((row) => getFieldInput(row).value);

const lastOnChange = (onChange: jest.Mock): OnChangeProps => onChange.mock.lastCall?.[0];

interface ReportedEntry {
  field: string;
  operator?: string;
  type?: string;
  value: string | string[];
}

/**
 * Waits until the last report of the builder has the given error flag. With an `entry` the report
 * holds one item with that single entry. Without one it holds no item, because an entry without a
 * value is not part of the reported items.
 */
const expectLastReport = async (
  onChange: jest.Mock,
  { errorExists, entry }: { errorExists: boolean; entry?: ReportedEntry }
): Promise<void> => {
  await waitFor(() => {
    expect(lastOnChange(onChange)).toEqual(
      expect.objectContaining({
        errorExists,
        exceptionItems:
          entry == null
            ? []
            : [expect.objectContaining({ entries: [expect.objectContaining(entry)] })],
      })
    );
  });
};

jest.setTimeout(LONG_FLOW_TIMEOUT_MS);

describe('ExceptionBuilderComponent user flows', () => {
  const user = userEvent.setup();

  const renderBuilder = (props: Partial<ExceptionBuilderProps> = {}): { onChange: jest.Mock } => {
    const onChange = jest.fn();
    render(
      <EuiProvider>
        <ExceptionBuilderComponent
          allowCustomFieldOptions
          allowLargeValueLists={false}
          autocompleteService={autocompleteStartMock}
          exceptionListItems={[]}
          httpService={mockKibanaHttpService}
          indexPatterns={indexPattern}
          isAndDisabled={false}
          isNestedDisabled={false}
          isOrDisabled={false}
          listId={undefined}
          listNamespaceType={undefined}
          listType="rule_default"
          ruleName="Test rule"
          onChange={onChange}
          showValueListModal={MockedShowValueListModal}
          {...props}
        />
      </EuiProvider>
    );
    return { onChange };
  };

  const clickLogicButton = async (testSubj: string): Promise<void> => {
    await user.click(screen.getByTestId(testSubj));
  };

  // The option list renders only its first rows. Typing narrows it to the wanted field.
  // Picking a nested leaf fills the row with the nested path. Pass that path as `expectedLabel`.
  const selectField = async (
    itemIndex: number,
    entryIndex: number,
    field: string,
    expectedLabel = field
  ): Promise<void> => {
    const input = getFieldInput(getRows(itemIndex)[entryIndex]);
    await user.click(input);
    await user.type(input, field);
    await user.click(await screen.findByRole('option', { name: field }));
    await waitFor(() => expect(input.value).toBe(expectedLabel));
  };

  const selectOperator = async (
    itemIndex: number,
    entryIndex: number,
    operator: string
  ): Promise<void> => {
    const row = getRows(itemIndex)[entryIndex];
    await user.click(
      within(within(row).getByTestId('operatorAutocompleteComboBox')).getByTestId(
        'comboBoxToggleListButton'
      )
    );
    await user.click(await screen.findByRole('option', { name: operator }));
  };

  const typeValue = async (comboBoxTestSubj: string, value: string): Promise<void> => {
    const input = getSearchInput(getRows(0)[0], comboBoxTestSubj);
    await user.click(input);
    await user.type(input, `${value}{Enter}`);
  };

  const createCustomField = async (
    itemIndex: number,
    entryIndex: number,
    field: string
  ): Promise<void> => {
    const input = getFieldInput(getRows(itemIndex)[entryIndex]);
    await user.click(input);
    await user.type(input, `${field}{Enter}`);
    await waitFor(() => expect(getFieldLabels(itemIndex)[entryIndex]).toBe(field));
  };

  const deleteEntry = async (itemIndex: number, entryIndex: number): Promise<void> => {
    await user.click(
      within(getItems()[itemIndex]).getAllByTestId('builderItemEntryDeleteButton')[entryIndex]
    );
  };

  it('reports a valid item only while every condition has a value', async () => {
    const { onChange } = renderBuilder();

    // A field and a value make a valid item
    await selectField(0, 0, 'extension');
    await typeValue('valuesAutocompleteMatch', 'test');
    await expectLastReport(onChange, {
      entry: { field: 'extension', value: 'test' },
      errorExists: false,
    });

    // Removing the value reports an error for the touched, empty input
    const valueInput = getSearchInput(getRows(0)[0], 'valuesAutocompleteMatch');
    await user.type(valueInput, '{Backspace}');
    await user.clear(valueInput);
    await user.tab();
    await expectLastReport(onChange, { errorExists: true });

    // Switching the operator clears the error, but there is still no valid item
    await selectOperator(0, 0, 'is one of');
    await expectLastReport(onChange, { errorExists: false });

    // A value for the new operator makes the item valid again
    await typeValue('valuesAutocompleteMatchAny', 'test');
    await expectLastReport(onChange, {
      entry: { field: 'extension', type: 'match_any', value: ['test'] },
      errorExists: false,
    });
  });

  it('accepts a custom field that is not in the index and a value for it', async () => {
    const { onChange } = renderBuilder();

    await createCustomField(0, 0, 'blooberty');
    await typeValue('valuesAutocompleteMatch', 'blah');

    await expectLastReport(onChange, {
      entry: { field: 'blooberty', operator: 'included', type: 'match', value: 'blah' },
      errorExists: false,
    });
  });

  it('does not report a custom field when custom fields are not allowed', async () => {
    const { onChange } = renderBuilder({ allowCustomFieldOptions: false });

    const input = getFieldInput(getRows(0)[0]);
    await user.click(input);
    await user.type(input, 'blooberty{Enter}');
    await typeValue('valuesAutocompleteMatch', 'blah');

    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({
        exceptionItems: [
          expect.objectContaining({
            entries: [expect.objectContaining({ field: 'blooberty' })],
          }),
        ],
      })
    );
  });

  describe('rows keep their field when other rows are added or removed', () => {
    it('keeps the fields of and-ed conditions when one is removed', async () => {
      renderBuilder();

      await selectField(0, 0, 'bytes');
      await clickLogicButton('exceptionsAndButton');
      await selectField(0, 1, '@timestamp');
      await clickLogicButton('exceptionsAndButton');
      await createCustomField(0, 2, 'c');
      expect(getFieldLabels(0)).toEqual(['bytes', '@timestamp', 'c']);

      await deleteEntry(0, 1);

      await waitFor(() => expect(getFieldLabels(0)).toEqual(['bytes', 'c']));
    });

    it('keeps the fields of or-ed conditions when rows are removed', async () => {
      renderBuilder();

      // Item 1 has two conditions
      await selectField(0, 0, 'bytes');
      await clickLogicButton('exceptionsAndButton');
      await selectField(0, 1, 'extension');
      // Item 2 has three conditions
      await clickLogicButton('exceptionsOrButton');
      await selectField(1, 0, 'machine.os');
      await clickLogicButton('exceptionsAndButton');
      await selectField(1, 1, 'geo.src');
      await clickLogicButton('exceptionsAndButton');
      await createCustomField(1, 2, 'e');
      expect(getFieldLabels(0)).toEqual(['bytes', 'extension']);
      expect(getFieldLabels(1)).toEqual(['machine.os', 'geo.src', 'e']);

      await deleteEntry(1, 1);

      await waitFor(() => expect(getFieldLabels(1)).toEqual(['machine.os', 'e']));
      expect(getFieldLabels(0)).toEqual(['bytes', 'extension']);

      // Removing every condition of the second item removes the item
      await deleteEntry(1, 0);
      await waitFor(() => expect(getFieldLabels(1)).toEqual(['e']));
      await deleteEntry(1, 0);

      await waitFor(() => expect(getItems()).toHaveLength(1));
      expect(getFieldLabels(0)).toEqual(['bytes', 'extension']);
    });

    it('keeps the fields around a nested condition when rows are removed', async () => {
      renderBuilder();

      // Item 1
      await selectField(0, 0, 'bytes');
      await clickLogicButton('exceptionsAndButton');
      await createCustomField(0, 1, 'b');
      // Item 2: a plain row, a nested parent with two children, then a plain row again
      await clickLogicButton('exceptionsOrButton');
      await selectField(1, 0, 'bytes');
      await clickLogicButton('exceptionsNestedButton');
      // Choosing a nested leaf fills the parent row and the first child row
      await selectField(1, 1, `${NESTED_PATH}.name`, NESTED_PATH);
      await waitFor(() => expect(getFieldLabels(1)).toEqual(['bytes', NESTED_PATH, 'name']));
      // While nested, "and" adds one more child row
      await clickLogicButton('exceptionsAndButton');
      await selectField(1, 3, 'address');
      // While nested, the nested button adds a plain row
      await clickLogicButton('exceptionsNestedButton');
      await selectField(1, 4, '@timestamp');
      expect(getFieldLabels(1)).toEqual(['bytes', NESTED_PATH, 'name', 'address', '@timestamp']);

      // Removing the first nested child keeps its siblings
      await deleteEntry(1, 2);

      await waitFor(() =>
        expect(getFieldLabels(1)).toEqual(['bytes', NESTED_PATH, 'address', '@timestamp'])
      );
      expect(getFieldLabels(0)).toEqual(['bytes', 'b']);

      // Removing the last nested child removes the nested parent
      await deleteEntry(1, 2);

      await waitFor(() => expect(getFieldLabels(1)).toEqual(['bytes', '@timestamp']));
      expect(getFieldLabels(0)).toEqual(['bytes', 'b']);
    });
  });
});
