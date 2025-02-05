/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { ComplianceBarComponent } from './latest_findings_group_renderer';
import { RawBucket } from '@kbn/grouping/src';
import { FindingsGroupingAggregation } from './use_grouped_findings';
import { ComplianceScoreBar } from '../../../components/compliance_score_bar';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: jest.fn(),
  };
});

jest.mock('../../../components/compliance_score_bar', () => ({
  ComplianceScoreBar: jest.fn(() => null),
}));

jest.mock('../../../components/cloud_security_grouping');

describe('<ComplianceBarComponent />', () => {
  beforeEach(() => {
    (useEuiTheme as jest.Mock).mockReturnValue({ euiTheme: { size: { s: 's' } } });
    (ComplianceScoreBar as jest.Mock).mockClear();
  });

  it('renders ComplianceScoreBar with correct totalFailed and totalPassed, when total = failed+passed', () => {
    const bucket = {
      doc_count: 10,
      failedFindings: {
        doc_count: 4,
      },
      passedFindings: {
        doc_count: 6,
      },
    } as RawBucket<FindingsGroupingAggregation>;

    render(<ComplianceBarComponent bucket={bucket} />);

    expect(ComplianceScoreBar).toHaveBeenCalledWith(
      expect.objectContaining({
        totalFailed: 4,
        totalPassed: 6,
      }),
      {}
    );
  });

  it('renders ComplianceScoreBar with correct totalFailed and totalPassed, when there are unknown findings', () => {
    const bucket = {
      doc_count: 10,
      failedFindings: {
        doc_count: 3,
      },
      passedFindings: {
        doc_count: 6,
      },
    } as RawBucket<FindingsGroupingAggregation>;

    render(<ComplianceBarComponent bucket={bucket} />);

    expect(ComplianceScoreBar).toHaveBeenCalledWith(
      expect.objectContaining({
        totalFailed: 3,
        totalPassed: 6,
      }),
      {}
    );
  });

  it('renders ComplianceScoreBar with correct totalFailed and totalPassed, when there are no findings', () => {
    const bucket = {
      doc_count: 10,
      failedFindings: {
        doc_count: 0,
      },
      passedFindings: {
        doc_count: 0,
      },
    } as RawBucket<FindingsGroupingAggregation>;

    render(<ComplianceBarComponent bucket={bucket} />);

    expect(ComplianceScoreBar).toHaveBeenCalledWith(
      expect.objectContaining({
        totalFailed: 0,
        totalPassed: 0,
      }),
      {}
    );
  });
});
