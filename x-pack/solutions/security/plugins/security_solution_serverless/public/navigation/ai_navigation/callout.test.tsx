/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AiSocCallout } from './callout';
import { CALLOUT_TITLE, CALLOUT_DESCRIPTION, CALLOUT_ARIA_LABEL } from './translations';

describe('AiSocCallout', () => {
  it('renders the callout with correct content', () => {
    render(<AiSocCallout />);

    // Check that the title and description are rendered
    expect(screen.getByText(CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(CALLOUT_DESCRIPTION)).toBeInTheDocument();
  });

  it('has the correct accessibility attributes', () => {
    render(<AiSocCallout />);

    // Check that the callout has the correct aria-label
    const callout = screen.getByLabelText(CALLOUT_ARIA_LABEL);
    expect(callout).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    render(<AiSocCallout />);

    // Check that the callout has the correct data-test-subj attribute
    const callout = screen.getByTestId('ai-soc-callout');
    expect(callout).toBeInTheDocument();
  });
});
