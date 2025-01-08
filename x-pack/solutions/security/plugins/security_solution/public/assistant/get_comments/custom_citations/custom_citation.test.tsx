/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomCitation } from './custom_citation';
import userEvent from '@testing-library/user-event';

describe('CustomCitation', () => {
  it('renders correctly', async () => {
    render(
      <CustomCitation
        citationLable={'exampleLable'}
        citationLink={'/example/link'}
        citationNumber={5}
      />
    );
    expect(screen.getByText('[5]')).toBeInTheDocument();
    expect(screen.queryByText('exampleLable')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('[5]'));
    expect(screen.getByText('exampleLable')).toBeInTheDocument();
  });
});
