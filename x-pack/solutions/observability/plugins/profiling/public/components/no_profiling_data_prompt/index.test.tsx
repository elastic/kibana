/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  NO_BASELINE_DATA_BODY,
  NO_BASELINE_DATA_TITLE,
  NO_DATA_BODY,
  NO_DATA_TITLE,
  NoProfilingDataPrompt,
} from '.';

const renderPrompt = (
  hasData: boolean,
  variant?: React.ComponentProps<typeof NoProfilingDataPrompt>['variant']
) =>
  render(
    <NoProfilingDataPrompt hasData={hasData} variant={variant}>
      <div data-test-subj="profilingData" />
    </NoProfilingDataPrompt>
  );

describe('NoProfilingDataPrompt', () => {
  it('renders the data when there is some', () => {
    renderPrompt(true);

    expect(screen.getByTestId('profilingData')).toBeInTheDocument();
    expect(screen.queryByTestId('profilingNoDataPrompt')).not.toBeInTheDocument();
  });

  it('prompts to change the search instead of rendering the data when there is none', () => {
    renderPrompt(false);

    expect(screen.queryByTestId('profilingData')).not.toBeInTheDocument();
    expect(screen.getByTestId('profilingNoDataPrompt')).toHaveTextContent(
      `${NO_DATA_TITLE}${NO_DATA_BODY}`
    );
  });

  it('prompts to change the baseline search when the baseline has no data', () => {
    renderPrompt(false, 'baseline');

    expect(screen.getByTestId('profilingNoDataPrompt')).toHaveTextContent(
      `${NO_BASELINE_DATA_TITLE}${NO_BASELINE_DATA_BODY}`
    );
  });
});
