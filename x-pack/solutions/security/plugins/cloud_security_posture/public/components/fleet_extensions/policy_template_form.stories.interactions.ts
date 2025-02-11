/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { within, userEvent, waitFor } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const changePolicyName = async ({
  canvasElement,
  policyName,
}: {
  canvasElement: HTMLElement;
  policyName: string;
}) => {
  const canvas = within(canvasElement);
  await waitFor(() => {
    expect(canvas.getByLabelText('Name')).toBeInTheDocument();
  });

  const nameInput = canvas.getByLabelText('Name');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, policyName);
  expect(nameInput).toHaveValue(policyName);
};

export const toggleSetupTechnology = async ({
  canvasElement,
  toggle,
}: {
  canvasElement: HTMLElement;
  toggle: 'agentless' | 'agent-based';
}) => {
  const canvas = within(canvasElement);
  await waitFor(() => {
    expect(canvas.getByDisplayValue(toggle)).toBeInTheDocument();
  });

  const toggleButton = await waitFor(() => canvas.getByDisplayValue(toggle));
  await userEvent.click(toggleButton);

  await waitFor(() => {
    expect(canvas.getByDisplayValue(toggle)).toBeChecked();
  });
};
