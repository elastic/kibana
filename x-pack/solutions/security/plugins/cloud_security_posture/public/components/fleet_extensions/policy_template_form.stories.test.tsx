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
  it('Checks if changing the name updated the package policy', async () => {
    // const onChange = (obj: any) => console.log('onChange', obj);
    const onChange = jest.fn();
    const { container, getByLabelText, getByRole } = render(<AgentBased onChange={onChange} />);

    // make sure the loading spinner is niot displayed
    await waitFor(() => {
      expect(container.querySelector('#name')).toBeInTheDocument();
    });

    const name = getByLabelText('Name');
    // await userEvent.clear(name);
    await userEvent.type(name, 'CSPM AWS Package Policy');

    // await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ updatedPolicy: { name: 'CSPM AWS Package Policy' } })
    );
  });
});
