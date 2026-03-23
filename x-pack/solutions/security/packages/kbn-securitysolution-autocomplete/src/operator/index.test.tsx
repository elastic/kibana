/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ByRoleMatcher, Matcher } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OperatorComponent } from '.';
import { getField } from '../fields/index.mock';
import { isNotOperator, isOperator } from '@kbn/securitysolution-list-utils';

const clickComboBox = async (getByTestId: (id: Matcher) => HTMLElement) => {
  const comboBox = getByTestId('operatorAutocompleteComboBox');
  const button = within(comboBox).getByRole('button');
  await userEvent.click(button);
};
const displayAndGetOperators = async (
  getByTestId: (id: Matcher) => HTMLElement,
  findAllByRole: (role: ByRoleMatcher) => Promise<HTMLElement[]>
) => {
  await clickComboBox(getByTestId);

  const options = await findAllByRole('option');
  return options.map((opt) => opt.textContent);
};

describe('OperatorComponent', () => {
  test('it renders disabled if "isDisabled" is true', () => {
    const { getByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    const input = getByRole('combobox');
    expect(input).toBeDisabled();
  });

  test('it renders loading if "isLoading" is true', async () => {
    const { getByTestId } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={true}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    await clickComboBox(getByTestId);

    const optionsList = getByTestId('comboBoxOptionsList operatorAutocompleteComboBox-optionsList');

    expect(optionsList).toHaveTextContent('Loading options');
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    const { getByTestId } = render(
      <OperatorComponent
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(getByTestId('comboBoxClearButton')).toBeInTheDocument();
  });

  test('it displays "operatorOptions" if param is passed in with items', async () => {
    const { getByTestId, findAllByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        operatorOptions={[isNotOperator]}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    const options = await displayAndGetOperators(getByTestId, findAllByRole);
    expect(options).toEqual(['is not']);
  });

  test('it displays operators according to the field if the "operatorOptions" param is passed in with no items', async () => {
    const { getByTestId, findAllByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        operatorOptions={[]}
        placeholder="Placeholder text"
        // This is a boolean field
        selectedField={getField('ssl')}
      />
    );

    const options = await displayAndGetOperators(getByTestId, findAllByRole);

    // it should fall back to displaying boolean operator options
    expect(options).toEqual(['is', 'is not', 'exists', 'does not exist']);
  });

  test('it correctly displays selected operator', () => {
    const { getByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    const input = getByRole('combobox') as HTMLInputElement;
    expect(input.value).toEqual('is');
  });

  test('it tells the user that all available options are selected when field type is nested', async () => {
    const { getByTestId } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={{
          name: 'nestedField',
          scripted: false,
          subType: { nested: { path: 'nestedField' } },
          type: 'nested',
        }}
      />
    );

    await clickComboBox(getByTestId);

    const optionsList = getByTestId('comboBoxOptionsList operatorAutocompleteComboBox-optionsList');

    expect(optionsList).toHaveTextContent("You've selected all available options");
  });

  test('it only displays subset of operators if field type is boolean', async () => {
    const { getByTestId, findAllByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('ssl')}
      />
    );

    const options = await displayAndGetOperators(getByTestId, findAllByRole);

    // it should fall back to displaying boolean operator options
    expect(options).toEqual(['is', 'is not', 'exists', 'does not exist']);
  });

  test('it only displays subset of operators if field name is "file.path.text"', async () => {
    const { getByTestId, findAllByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        operator={isOperator}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
      />
    );

    const options = await displayAndGetOperators(getByTestId, findAllByRole);

    // it should fall back to displaying boolean operator options
    expect(options).toEqual([
      'is',
      'is not',
      'is one of',
      'is not one of',
      'matches',
      'does not match',
    ]);
  });

  test('it invokes "onChange" when option selected', async () => {
    const mockOnChange = jest.fn();

    const { getByTestId, findAllByRole } = render(
      <OperatorComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        operator={isNotOperator}
        placeholder="Placeholder text"
        selectedField={getField('ssl')}
      />
    );

    await clickComboBox(getByTestId);
    const options = await findAllByRole('option');

    await userEvent.click(options[0]);

    expect(mockOnChange).toHaveBeenCalledWith([
      { message: 'is', operator: 'included', type: 'match', value: 'is' },
    ]);
  });
});
