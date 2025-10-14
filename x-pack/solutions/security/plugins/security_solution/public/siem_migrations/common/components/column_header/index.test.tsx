/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TableHeader } from '.';
import userEvent from '@testing-library/user-event';

describe('TableHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(<TableHeader title="My Title" />);
    expect(getByText('My Title')).toBeInTheDocument();
  });

  it('renders the tooltip content', async () => {
    const { getByText, findByText } = render(
      <TableHeader title="My Title" tooltipContent="My Tooltip" />
    );
    await userEvent.hover(getByText('My Title'));
    const tooltip = await findByText((content, element) => content.includes('My Tooltip'));
    expect(tooltip).toBeInTheDocument();
  });

  it('renders with an id', () => {
    const { container } = render(<TableHeader title="My Title" id="my-id" />);
    expect(container.querySelector('#my-id')).toBeInTheDocument();
  });
});
