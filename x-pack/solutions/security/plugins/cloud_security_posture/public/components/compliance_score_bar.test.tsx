/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComplianceScoreBar } from './compliance_score_bar';
import {
  COMPLIANCE_SCORE_BAR_UNKNOWN,
  COMPLIANCE_SCORE_BAR_PASSED,
  COMPLIANCE_SCORE_BAR_FAILED,
} from './test_subjects';

describe('<ComplianceScoreBar />', () => {
  it('should display 0% compliance score with status unknown when both passed and failed are 0', () => {
    render(<ComplianceScoreBar totalPassed={0} totalFailed={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_UNKNOWN)).not.toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_FAILED)).toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_PASSED)).toBeNull();
  });

  it('should display 100% compliance score when passed is greater than 0 and failed is 0', () => {
    render(<ComplianceScoreBar totalPassed={10} totalFailed={0} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_PASSED)).not.toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_FAILED)).toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_UNKNOWN)).toBeNull();
  });

  it('should display 0% compliance score when passed is 0 and failed is greater than 0', () => {
    render(<ComplianceScoreBar totalPassed={0} totalFailed={10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_FAILED)).not.toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_PASSED)).toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_UNKNOWN)).toBeNull();
  });

  it('should display 50% compliance score when passed is equal to failed', () => {
    render(<ComplianceScoreBar totalPassed={5} totalFailed={5} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_FAILED)).not.toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_PASSED)).not.toBeNull();
    expect(screen.queryByTestId(COMPLIANCE_SCORE_BAR_UNKNOWN)).toBeNull();
  });
});
