/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { screen, act, fireEvent } from '@testing-library/react';
import type { DataViewFieldBase } from '@kbn/es-query';

export function addRequiredFieldRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Add required field'));
  });
}

export function createIndexPatternField(overrides: Partial<DataViewFieldBase>): DataViewFieldBase {
  return {
    name: 'one',
    type: 'string',
    esTypes: [],
    ...overrides,
  };
}

export function getSelectToggleButtonForName(value: string): HTMLElement {
  return screen
    .getByTestId(`requiredFieldNameSelect-${value}`)
    .querySelector('[data-test-subj="comboBoxToggleListButton"]') as HTMLElement;
}
