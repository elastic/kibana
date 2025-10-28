/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { UnknownMigration } from '.';

describe('UnknownMigration', () => {
  it('renders the container component', () => {
    const { getByTestId } = render(<UnknownMigration />);
    expect(getByTestId('siemMigrationsUnknown')).toBeInTheDocument();
  });

  it('renders the empty prompt component', () => {
    const { getByTestId } = render(<UnknownMigration />);
    expect(getByTestId('unknownMigration')).toBeInTheDocument();
  });

  it('renders the empty prompt title', () => {
    const { getByTestId } = render(<UnknownMigration />);
    expect(getByTestId('unknownMigration')).toHaveTextContent('Unknown migration');
  });

  it('renders the empty prompt description', () => {
    const { getByTestId } = render(<UnknownMigration />);
    expect(getByTestId('unknownMigration')).toHaveTextContent(
      'Selected migration does not exist. Please select one of the available migrations'
    );
  });
});
