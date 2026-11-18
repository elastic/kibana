/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BuilderEntry } from '@kbn/securitysolution-list-utils';

import { BuilderEsqlOutputColumnEntryItem } from './entry_esql_output_column';

const initialEntry = {
  field: '',
  id: 'entry-1',
  operator: 'included',
  type: 'match',
  value: '',
} as BuilderEntry;

const Harness = ({
  entry = initialEntry,
  onChange,
  setErrorsExist = jest.fn(),
  showLabel = true,
}: {
  entry?: BuilderEntry;
  onChange?: (entry: BuilderEntry, index: number) => void;
  setErrorsExist?: (error: Record<string, boolean>) => void;
  showLabel?: boolean;
}): JSX.Element => {
  const [current, setCurrent] = useState<BuilderEntry>(entry);
  return (
    <EuiProvider>
      <BuilderEsqlOutputColumnEntryItem
        entry={current}
        entryIndex={0}
        exceptionItemIndex={0}
        showLabel={showLabel}
        setErrorsExist={setErrorsExist}
        onChange={(updated, index) => {
          setCurrent(updated);
          onChange?.(updated, index);
        }}
      />
      <pre data-test-subj="entryState">{JSON.stringify(current)}</pre>
    </EuiProvider>
  );
};

const getState = (): Record<string, unknown> =>
  JSON.parse(screen.getByTestId('entryState').textContent ?? '{}');

const openOptions = async (testSubj: string): Promise<string[]> => {
  const combo = screen.getByTestId(testSubj);
  await userEvent.click(within(combo).getByTestId('comboBoxToggleListButton'));
  return screen.getAllByRole('option').map((option) => option.textContent ?? '');
};

// The list of options shows a few rows at a time, so a type is looked for by typing its name
const searchOptions = async (testSubj: string, search: string): Promise<string[]> => {
  const combo = screen.getByTestId(testSubj);
  await userEvent.type(within(combo).getByRole('combobox'), search);
  return screen.queryAllByRole('option').map((option) => option.textContent ?? '');
};

describe('BuilderEsqlOutputColumnEntryItem', () => {
  it('shows the labels of the columns for the first entry only', () => {
    const { rerender } = render(<Harness />);
    expect(screen.getByText('Column type')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();

    rerender(<Harness showLabel={false} />);
    expect(screen.queryByText('Column type')).toBeNull();
  });

  it('types the field, without suggestions', async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryField'), 'risk');

    expect(getState()).toMatchObject({ field: 'risk' });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ field: 'risk' }), 0);
  });

  it('offers the operators of the end of the query, and no list or nested operator', async () => {
    render(<Harness />);

    expect(await openOptions('exceptionBuilderEsqlEntryOperator')).toEqual([
      'is',
      'is not',
      'is one of',
      'is not one of',
      'matches',
      'does not match',
      'exists',
      'does not exist',
    ]);
  });

  it('offers the types that the operator supports: all but double for is', async () => {
    render(<Harness />);

    expect(await openOptions('exceptionBuilderEsqlEntryColumnType')).toContain('keyword');
    expect(await searchOptions('exceptionBuilderEsqlEntryColumnType', 'date')).toEqual([
      'date',
      'date_nanos',
    ]);
  });

  it('does not offer double for is', async () => {
    render(<Harness />);

    expect(await searchOptions('exceptionBuilderEsqlEntryColumnType', 'doub')).toEqual([]);
  });

  it('offers only keyword and text once the operator is matches', async () => {
    render(<Harness />);
    await openOptions('exceptionBuilderEsqlEntryOperator');
    await userEvent.click(screen.getByRole('option', { name: 'matches' }));

    expect(getState()).toMatchObject({ operator: 'included', type: 'wildcard' });
    expect(await openOptions('exceptionBuilderEsqlEntryColumnType')).toEqual(['keyword', 'text']);
  });

  it('offers every type for exists', async () => {
    render(<Harness />);
    await openOptions('exceptionBuilderEsqlEntryOperator');
    await userEvent.click(screen.getByRole('option', { name: 'exists' }));

    expect(await searchOptions('exceptionBuilderEsqlEntryColumnType', 'doub')).toEqual(['double']);
  });

  it('sets the column type that the user picks', async () => {
    render(<Harness />);
    await openOptions('exceptionBuilderEsqlEntryColumnType');
    await userEvent.click(screen.getByRole('option', { name: 'ip' }));

    expect(getState()).toMatchObject({ column_type: 'ip' });
  });

  it('clears the column type when the operator changes to one that does not support it', async () => {
    render(
      <Harness
        entry={
          { ...initialEntry, column_type: 'ip', field: 'src', value: '10.0.0.1' } as BuilderEntry
        }
      />
    );
    await openOptions('exceptionBuilderEsqlEntryOperator');
    await userEvent.click(screen.getByRole('option', { name: 'matches' }));

    expect(getState()).not.toHaveProperty('column_type');
  });

  it('types the value of an is entry', async () => {
    render(<Harness />);

    await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryValue'), 'dc-01');

    expect(getState()).toMatchObject({ type: 'match', value: 'dc-01' });
  });

  it('creates the values of an is one of entry, without duplicates', async () => {
    render(<Harness entry={{ ...initialEntry, type: 'match_any', value: [] } as BuilderEntry} />);
    const input = within(screen.getByTestId('exceptionBuilderEsqlEntryValueMatchAny')).getByRole(
      'combobox'
    );

    await userEvent.type(input, 'a{enter}');
    await userEvent.type(input, 'b{enter}');
    await userEvent.type(input, 'a{enter}');

    expect(getState()).toMatchObject({ type: 'match_any', value: ['a', 'b'] });
  });

  it('has no value to enter for an exists entry', () => {
    render(<Harness entry={{ ...initialEntry, type: 'exists' } as BuilderEntry} />);

    expect(screen.getByTestId('exceptionBuilderEsqlEntryValueExists')).toBeDisabled();
  });

  it('keeps the field when the operator changes', async () => {
    render(<Harness entry={{ ...initialEntry, field: 'risk' } as BuilderEntry} />);
    fireEvent.change(screen.getByTestId('exceptionBuilderEsqlEntryField'), {
      target: { value: 'risk.level' },
    });
    await openOptions('exceptionBuilderEsqlEntryOperator');
    await userEvent.click(screen.getByRole('option', { name: 'is not' }));

    expect(getState()).toMatchObject({ field: 'risk.level', operator: 'excluded' });
  });

  describe('the value is checked as the API checks it', () => {
    const typed = (columnType: string, value: string): BuilderEntry =>
      ({ ...initialEntry, column_type: columnType, field: 'src', value } as BuilderEntry);

    it('shows why a value does not fit the column type, and tells the form about the error', () => {
      const setErrorsExist = jest.fn();
      render(<Harness entry={typed('ip', 'bogus')} setErrorsExist={setErrorsExist} />);

      expect(
        screen.getByText('"bogus" is not a valid value for a column of type ip')
      ).toBeInTheDocument();
      expect(screen.getByTestId('exceptionBuilderEsqlEntryValue')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
      expect(setErrorsExist).toHaveBeenLastCalledWith({ 'entry-1': true });
    });

    it('clears the error when the user corrects the value', async () => {
      const setErrorsExist = jest.fn();
      render(<Harness entry={typed('ip', 'bogus')} setErrorsExist={setErrorsExist} />);

      await userEvent.clear(screen.getByTestId('exceptionBuilderEsqlEntryValue'));
      await userEvent.type(screen.getByTestId('exceptionBuilderEsqlEntryValue'), '10.0.0.1');

      expect(screen.queryByText(/is not a valid value/)).toBeNull();
      expect(setErrorsExist).toHaveBeenLastCalledWith({ 'entry-1': false });
    });

    it('shows each value of an is one of entry that does not fit', () => {
      render(
        <Harness
          entry={
            {
              ...initialEntry,
              column_type: 'integer',
              field: 'n',
              type: 'match_any',
              value: ['1', 'many', 'few'],
            } as BuilderEntry
          }
        />
      );

      expect(
        screen.getByText('"many" is not a valid value for a column of type integer')
      ).toBeInTheDocument();
      expect(
        screen.getByText('"few" is not a valid value for a column of type integer')
      ).toBeInTheDocument();
    });

    it('shows that a pattern cannot end with a single backslash', () => {
      render(
        <Harness entry={{ ...typed('keyword', 'abc\\'), type: 'wildcard' } as BuilderEntry} />
      );

      expect(
        screen.getByText('The pattern "abc\\" cannot end with a single backslash')
      ).toBeInTheDocument();
    });

    it('shows that a pattern is too long', () => {
      render(
        <Harness
          entry={{ ...typed('keyword', 'a'.repeat(1001)), type: 'wildcard' } as BuilderEntry}
        />
      );

      expect(
        screen.getByText('A pattern cannot be longer than 1000 characters')
      ).toBeInTheDocument();
    });

    it('does not show an error for an entry that is not complete, or for a valid value', () => {
      const setErrorsExist = jest.fn();
      const { rerender } = render(
        <Harness
          entry={{ ...initialEntry, value: 'bogus' } as BuilderEntry}
          setErrorsExist={setErrorsExist}
        />
      );
      expect(screen.queryByText(/is not a valid value/)).toBeNull();
      expect(setErrorsExist).toHaveBeenLastCalledWith({ 'entry-1': false });

      rerender(<Harness entry={typed('ip', '10.0.0.0/24')} setErrorsExist={setErrorsExist} />);
      expect(screen.queryByText(/is not a valid value/)).toBeNull();
    });

    it('clears its error when the entry is removed', () => {
      const setErrorsExist = jest.fn();
      const { unmount } = render(
        <Harness entry={typed('ip', 'bogus')} setErrorsExist={setErrorsExist} />
      );

      unmount();

      expect(setErrorsExist).toHaveBeenLastCalledWith({ 'entry-1': false });
    });
  });
});
