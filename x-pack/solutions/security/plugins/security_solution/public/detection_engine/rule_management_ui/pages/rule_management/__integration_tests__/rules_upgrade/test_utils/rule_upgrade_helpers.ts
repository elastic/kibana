/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, waitFor, within } from '@testing-library/react';

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

export async function acceptSuggestedFieldValue(wrapper: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(within(wrapper).getByRole('button', { name: 'Accept' }));
  });
}

export async function saveFieldValue(wrapper: HTMLElement): Promise<void> {
  await clickFieldSaveButton(wrapper, 'Save');
}

export async function saveAndAcceptFieldValue(wrapper: HTMLElement): Promise<void> {
  await clickFieldSaveButton(wrapper, 'Save and accept');
}

async function clickFieldSaveButton(wrapper: HTMLElement, buttonName: string): Promise<void> {
  const saveButton = within(wrapper).getByRole('button', { name: buttonName });

  expect(saveButton).toBeVisible();

  // Wait for async validation to finish
  await waitFor(() => expect(saveButton).toBeEnabled(), {
    timeout: 500,
  });

  await act(async () => {
    fireEvent.click(saveButton);
  });

  // After saving the form "Save" button should be removed from the DOM
  await waitFor(() => expect(saveButton).not.toBeInTheDocument(), {
    timeout: 500,
  });
}
