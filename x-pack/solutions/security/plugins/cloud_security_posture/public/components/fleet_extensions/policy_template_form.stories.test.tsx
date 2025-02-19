/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './policy_template_form.stories'; // Adjust the import path as needed
import { userEvent, waitFor, within } from '@storybook/testing-library';

// Compose the stories
const { TestAWS } = composeStories(stories);

test('should test the story AWSForm', async () => {
  const onChange = jest.fn();

  const { container } = render(<TestAWS {...TestAWS.args} onChange={onChange} />);
  testAWSInteractions({ canvasElement: container });
});

export const testAWSInteractions = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  changePolicyName({ canvas, policyName: 'AWS Package Policy' });
  toggleSetupTechnology({ canvas, toggle: 'agent-based' });
};

export const testGCPInteractions = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement);
  changeCloudProvider({ canvas, cloudProvider: 'GCP' });
  changePolicyName({ canvas, policyName: 'GCP Package Policy' });
  toggleSetupTechnology({ canvas, toggle: 'agent-based' });

  const cloudShellRadio = canvasElement.querySelector('#google_cloud_shell');
  expect(cloudShellRadio).toHaveAttribute('checked');
};

export const changeCloudProvider = async ({
  canvas,
  cloudProvider,
}: {
  canvas: ReturnType<typeof within>;
  cloudProvider: string;
}) => {
  await waitFor(() => {
    expect(canvas.getByLabelText(cloudProvider)).toBeInTheDocument();
  });

  const cloudProviderSelect = canvas.getByLabelText(cloudProvider);
  await userEvent.click(cloudProviderSelect);
  // expect(cloudProviderSelect).toHaveValue('checked');
};

const changePolicyName = async ({
  canvas,
  policyName,
}: {
  canvas: ReturnType<typeof within>;
  policyName: string;
}) => {
  await waitFor(() => {
    expect(canvas.getByLabelText('Name')).toBeInTheDocument();
  });

  const nameInput = canvas.getByLabelText('Name');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, policyName);
  expect(nameInput).toHaveValue(policyName);
};

const toggleSetupTechnology = async ({
  canvas,
  toggle,
}: {
  canvas: ReturnType<typeof within>;
  toggle: 'agentless' | 'agent-based';
}) => {
  await waitFor(() => {
    expect(canvas.getByDisplayValue(toggle)).toBeInTheDocument();
  });

  const toggleButton = await waitFor(() => canvas.getByDisplayValue(toggle));
  await userEvent.click(toggleButton);

  await waitFor(() => {
    expect(canvas.getByDisplayValue(toggle)).toBeChecked();
  });
};

// test('should test the story GCPForm', async () => {
//   const { container } = render(<GCPForm />);
//   changePolicyName({ canvasElement: container, policyName: 'My GCP Policy' });
//   toggleSetupTechnology({ canvasElement: container, toggle: 'agent-based' });
// });

// test('should test the story AzureForm', async () => {
//   const { container } = render(<AzureForm />);
//   changePolicyName({ canvasElement: container, policyName: 'My Azure Policy' });
//   toggleSetupTechnology({ canvasElement: container, toggle: 'agent-based' });
// });
