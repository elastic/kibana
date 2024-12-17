/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Title } from '.';

describe('Title', () => {
  const title = 'Malware Delivery and Credentials Access on macOS';

  it('renders the assistant avatar', () => {
    render(<Title isLoading={false} title={title} />);
    const assistantAvatar = screen.getByTestId('assistantAvatar');

    expect(assistantAvatar).toBeInTheDocument();
  });

  it('renders the expected title', () => {
    render(<Title isLoading={false} title={title} />);
    const titleText = screen.getByTestId('titleText');

    expect(titleText).toHaveTextContent(title);
  });

  it('renders the skeleton title when isLoading is true', () => {
    render(<Title isLoading={true} title={title} />);
    const skeletonTitle = screen.getByTestId('skeletonTitle');

    expect(skeletonTitle).toBeInTheDocument();
  });
});
