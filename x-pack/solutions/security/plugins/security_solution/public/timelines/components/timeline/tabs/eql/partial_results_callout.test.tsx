/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PartialResultsCallout } from './partial_results_callout';
import { PARTIAL_RESULTS_WARNING_TITLE } from './translations';

describe('PartialResultsCallout', () => {
  it('renders the incomplete search results title', () => {
    render(<PartialResultsCallout />);
    expect(screen.getByTestId('eql-partial-results-warning')).toHaveTextContent(
      PARTIAL_RESULTS_WARNING_TITLE
    );
  });
});
