/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, waitFor } from '@testing-library/react';

export function showEuiSuperSelectOptions(toggleButton: HTMLElement): Promise<void> {
  fireEvent.click(toggleButton);

  return waitFor(() => {
    const listWithOptionsElement = document.querySelector('[role="listbox"]');
    const emptyListElement = document.querySelector('.euiComboBoxOptionsList__empty');

    expect(listWithOptionsElement || emptyListElement).toBeInTheDocument();
  });
}

type SelectEuiSuperSelectOptionParameters =
  | {
      toggleButton: HTMLElement;
      optionIndex: number;
      optionText?: undefined;
    }
  | {
      toggleButton: HTMLElement;
      optionText: string;
      optionIndex?: undefined;
    };

export async function selectEuiSuperSelectOption({
  toggleButton,
  optionIndex,
  optionText,
}: SelectEuiSuperSelectOptionParameters): Promise<void> {
  await showEuiSuperSelectOptions(toggleButton);

  const options = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));

  if (typeof optionText === 'string') {
    const lowerCaseOptionText = optionText.toLocaleLowerCase();
    const optionToSelect = options.find(
      (option) => option.textContent?.toLowerCase() === lowerCaseOptionText
    );

    if (optionToSelect) {
      fireEvent.click(optionToSelect);
    } else {
      throw new Error(
        `Could not find option with text "${optionText}". Available options: ${options
          .map((option) => option.textContent)
          .join(', ')}`
      );
    }
  } else {
    fireEvent.click(options[optionIndex]);
  }
}
