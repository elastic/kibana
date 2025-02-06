/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import * as stories from './policy_template_form.stories';
import { composeStories } from '@storybook/react';
import userEvent from '@testing-library/user-event';

const { AgentBased } = composeStories(stories);

describe('LinkPreview', () => {
  it('Checks if the form is valid', async () => {
    const { getByLabelText } = render(<AgentBased />);

    const name = getByLabelText('Name');
    expect(name).toBeInTheDocument();

    await userEvent.type(name, '1');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: { ...policy, name: `${policy.name}1` },
      });
    });
  });
});
