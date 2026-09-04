/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { QualityWarning } from '../../../../common/log_analysis';
import { CategoryQualityWarnings } from './quality_warning_notices';

const renderQualityWarnings = (qualityWarnings: QualityWarning[]) =>
  renderWithKibanaRenderContext(
    <CategoryQualityWarnings
      hasSetupCapabilities={true}
      onRecreateMlJob={jest.fn()}
      qualityWarnings={qualityWarnings}
    />
  );

const expandDetails = () => {
  fireEvent.click(screen.getByText('Details'));
};

describe('CategoryQualityWarnings', () => {
  it('renders a friendly label instead of "unknown" for unpartitioned (empty dataset) warnings', () => {
    renderQualityWarnings([
      {
        type: 'categoryQualityWarning',
        jobId: 'theMlJobId',
        dataset: '',
        reasons: [{ type: 'singleCategory' }],
      },
    ]);

    expandDetails();

    expect(screen.getByText('Log entries without dataset')).toBeInTheDocument();
    expect(screen.queryByText('unknown')).not.toBeInTheDocument();
  });

  it('renders a generic explanation when a warning has no specific reasons', () => {
    renderQualityWarnings([
      {
        type: 'categoryQualityWarning',
        jobId: 'theMlJobId',
        dataset: '',
        reasons: [],
      },
    ]);

    expandDetails();

    expect(
      screen.getByText(
        'The analysis produced results of reduced quality. Consider recreating the job over a time range containing more log data.'
      )
    ).toBeInTheDocument();
  });

  it('renders the specific description for known reasons', () => {
    renderQualityWarnings([
      {
        type: 'categoryQualityWarning',
        jobId: 'theMlJobId',
        dataset: 'first.dataset',
        reasons: [{ type: 'singleCategory' }],
      },
    ]);

    expandDetails();

    expect(screen.getByText('first.dataset')).toBeInTheDocument();
    expect(
      screen.getByText(
        "The analysis couldn't extract more than a single category from the log messages."
      )
    ).toBeInTheDocument();
  });
});
