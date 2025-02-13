/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, within } from '@testing-library/react';

export function toggleFieldAccordion(fieldWrapper: HTMLElement): void {
  act(() => {
    const accordionButton = within(fieldWrapper).getAllByRole('button')[0];

    fireEvent.click(accordionButton);
  });
}

export function switchToFieldEdit(wrapper: HTMLElement): void {
  act(() => {
    fireEvent.click(within(wrapper).getByRole('button', { name: 'Edit' }));
  });
}

export function cancelFieldEdit(wrapper: HTMLElement): void {
  act(() => {
    fireEvent.click(within(wrapper).getByRole('button', { name: 'Cancel' }));
  });
}

interface SetResolvedNameOptions {
  saveButtonText: string;
}

export async function setResolvedName(
  wrapper: HTMLElement,
  value: string,
  options: SetResolvedNameOptions = {
    saveButtonText: 'Save',
  }
): Promise<void> {
  await act(async () => {
    fireEvent.change(within(wrapper).getByTestId('input'), {
      target: { value },
    });
  });

  await act(async () => {
    fireEvent.click(within(wrapper).getByRole('button', { name: options.saveButtonText }));
  });
}
