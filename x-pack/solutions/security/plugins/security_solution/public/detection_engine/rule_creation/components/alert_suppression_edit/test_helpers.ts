/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { act, fireEvent, waitFor, within, screen } from '@testing-library/react';
import type { AlertSuppressionDurationUnit } from '../../../../../common/api/detection_engine';
import { selectEuiComboBoxOption } from '../../../../common/test/eui/combobox';

const COMBO_BOX_TOGGLE_BUTTON_TEST_ID = 'comboBoxToggleListButton';

export async function setSuppressionFields(fieldNames: string[]): Promise<void> {
  const getAlertSuppressionFieldsComboBoxToggleButton = () =>
    within(screen.getByTestId('alertSuppressionInput')).getByTestId(
      COMBO_BOX_TOGGLE_BUTTON_TEST_ID
    );

  await waitFor(() => {
    expect(getAlertSuppressionFieldsComboBoxToggleButton()).toBeInTheDocument();
  });

  for (const fieldName of fieldNames) {
    await selectEuiComboBoxOption({
      comboBoxToggleButton: getAlertSuppressionFieldsComboBoxToggleButton(),
      optionText: fieldName,
    });
  }
}

export function expectSuppressionFields(fieldNames: string[]): void {
  for (const fieldName of fieldNames) {
    expect(
      within(screen.getByTestId('alertSuppressionInput')).getByTitle(fieldName)
    ).toBeInTheDocument();
  }
}

export function setDurationType(value: 'Per rule execution' | 'Per time period'): void {
  act(() => {
    fireEvent.click(within(screen.getByTestId('alertSuppressionDuration')).getByLabelText(value));
  });
}

export function setDuration(value: number, unit: AlertSuppressionDurationUnit): void {
  act(() => {
    fireEvent.input(
      within(screen.getByTestId('alertSuppressionDuration')).getByTestId('interval'),
      {
        target: { value: value.toString() },
      }
    );

    fireEvent.change(
      within(screen.getByTestId('alertSuppressionDuration')).getByTestId('timeType'),
      {
        target: { value: unit },
      }
    );
  });
}

export function expectDuration(value: number, unit: AlertSuppressionDurationUnit): void {
  expect(
    within(screen.getByTestId('alertSuppressionDuration')).getByTestId('interval')
  ).toHaveValue(value);
  expect(
    within(screen.getByTestId('alertSuppressionDuration')).getByTestId('timeType')
  ).toHaveValue(unit);
}
