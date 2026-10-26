/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeprecatedRulesCallout } from './deprecated_rules_callout';

describe('DeprecatedRulesCallout', () => {
  const defaultProps = {
    title: 'Test Callout Title',
    description: 'Test callout description',
    buttons: [
      <button type="button" key="action">
        {'Do Action'}
      </button>,
    ],
  };

  it('renders the title', () => {
    render(<DeprecatedRulesCallout {...defaultProps} />);
    expect(screen.getByText('Test Callout Title')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<DeprecatedRulesCallout {...defaultProps} />);
    expect(screen.getByTestId('deprecated-rule-callout-description')).toHaveTextContent(
      'Test callout description'
    );
  });

  it('renders the provided buttons', () => {
    render(<DeprecatedRulesCallout {...defaultProps} />);
    expect(screen.getByText('Do Action')).toBeInTheDocument();
  });

  it('displays deprecation reason when provided', () => {
    render(<DeprecatedRulesCallout {...defaultProps} reason="Replaced by rule XYZ" />);

    const reasonEl = screen.getByTestId('deprecated-rule-reason');
    expect(reasonEl).toBeInTheDocument();
    expect(reasonEl).toHaveTextContent('Replaced by rule XYZ');
  });

  it('does not display deprecation reason section when reason is absent', () => {
    render(<DeprecatedRulesCallout {...defaultProps} />);

    expect(screen.queryByTestId('deprecated-rule-reason')).not.toBeInTheDocument();
  });
});
