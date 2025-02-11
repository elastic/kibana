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
import {
  changePolicyName,
  toggleSetupTechnology,
} from './policy_template_form.stories.interactions';

// Compose the stories
const { AWSForm, GCPForm, AzureForm } = composeStories(stories);

test('should execute interaction in the story AWSForm', async () => {
  const { container } = render(<AWSForm isAgentlessEnabled={true} />);
  changePolicyName({ canvasElement: container, policyName: 'My AWS Policy' });
  toggleSetupTechnology({ canvasElement: container, toggle: 'agent-based' });
});

test('should execute interaction in the story GCPForm', async () => {
  const { container } = render(<GCPForm />);
  changePolicyName({ canvasElement: container, policyName: 'My GCP Policy' });
  toggleSetupTechnology({ canvasElement: container, toggle: 'agent-based' });
});

test('should execute interaction in the story AzureForm', async () => {
  const { container } = render(<AzureForm />);
  changePolicyName({ canvasElement: container, policyName: 'My Azure Policy' });
  toggleSetupTechnology({ canvasElement: container, toggle: 'agent-based' });
});
