/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { PipelineIndicator } from '.';
import { TestProviders } from '../../../../../common/mock';
import * as i18n from '../translations';

const defaultProps = {
  alertRetrievalHasError: false,
  validationHasError: false,
};

describe('PipelineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the pipeline indicator', () => {
    render(
      <TestProviders>
        <PipelineIndicator {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('pipelineIndicator')).toBeInTheDocument();
  });

  it('renders with default props when no props are provided', () => {
    render(
      <TestProviders>
        <PipelineIndicator />
      </TestProviders>
    );

    expect(screen.getByTestId('pipelineIndicator')).toBeInTheDocument();
    expect(screen.getByTestId('pipelineIndicatorAlertRetrievalBadge').className).not.toContain(
      'euiBadge-danger'
    );
    expect(screen.getByTestId('pipelineIndicatorValidationBadge').className).not.toContain(
      'euiBadge-danger'
    );
  });

  it.each([
    [i18n.PIPELINE_STAGE_ALERT_RETRIEVAL_LABEL],
    [i18n.PIPELINE_STAGE_GENERATION_LABEL],
    [i18n.PIPELINE_STAGE_VALIDATION_LABEL],
  ])('renders stage label %s', (label) => {
    render(
      <TestProviders>
        <PipelineIndicator {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders two arrow connectors', () => {
    render(
      <TestProviders>
        <PipelineIndicator {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('pipelineIndicatorArrow')).toHaveLength(2);
  });

  it('renders alert retrieval stage as danger when alertRetrievalHasError is true', () => {
    render(
      <TestProviders>
        <PipelineIndicator {...defaultProps} alertRetrievalHasError />
      </TestProviders>
    );

    expect(screen.getByTestId('pipelineIndicatorAlertRetrievalBadge').className).toContain(
      'euiBadge-danger'
    );
  });

  it('renders validation stage as danger when validationHasError is true', () => {
    render(
      <TestProviders>
        <PipelineIndicator {...defaultProps} validationHasError />
      </TestProviders>
    );

    expect(screen.getByTestId('pipelineIndicatorValidationBadge').className).toContain(
      'euiBadge-danger'
    );
  });
});
