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
import { changePolicyName } from './policy_template_form.stories';
// import '@testing-library/jest-dom/extend-expect';

// Compose the stories
const { AgentBased } = composeStories(stories);

test('should execute interaction in the story', async () => {
  const { container } = render(<AgentBased />);
  changePolicyName(container);
});
