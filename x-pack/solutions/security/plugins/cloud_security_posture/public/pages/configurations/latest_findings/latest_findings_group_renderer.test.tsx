/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import type { RawBucket } from '@kbn/grouping/src';
import type { FindingsGroupingAggregation } from '@kbn/cloud-security-posture';
import { ComplianceBarComponent, groupPanelRenderer } from './latest_findings_group_renderer';
import { ComplianceScoreBar } from '../../../components/compliance_score_bar';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { CloudProviderIcon } from '../../../components/cloud_provider_icon';
import { FINDINGS_GROUPING_OPTIONS } from '../../../common/constants';

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

jest.mock('../../../components/cloud_security_grouping', () => ({
  firstNonNullValue: jest.requireActual('../../../components/cloud_security_grouping')
    .firstNonNullValue,
  LoadingGroup: () => <div data-test-subj="loading-group">Loading</div>,
  NullGroup: ({ title }: { title: string }) => <div data-test-subj="null-group">{title}</div>,
}));

jest.mock('../../../components/cis_benchmark_icon', () => ({
  CISBenchmarkIcon: jest.fn(() => <div data-test-subj="cis-benchmark-icon" />),
}));

jest.mock('../../../components/cloud_provider_icon', () => ({
  CloudProviderIcon: jest.fn(() => <div data-test-subj="cloud-provider-icon" />),
}));

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

describe('groupPanelRenderer - CLOUD_ACCOUNT_ID', () => {
  const baseBucket = {
    key: 'account-123',
    key_as_string: 'account-123',
    doc_count: 10,
    failedFindings: { doc_count: 4 },
    passedFindings: { doc_count: 6 },
    accountName: { buckets: [{ key: 'My Account', doc_count: 10 }] },
  } as unknown as RawBucket<FindingsGroupingAggregation>;

  beforeEach(() => {
    (CISBenchmarkIcon as jest.Mock).mockClear();
    (CloudProviderIcon as jest.Mock).mockClear();
  });

  it('renders CISBenchmarkIcon when benchmarkId is present (native integration)', () => {
    const bucket = {
      ...baseBucket,
      benchmarkId: { buckets: [{ key: 'cis_aws', doc_count: 10 }] },
      benchmarkName: { buckets: [{ key: 'CIS AWS', doc_count: 10 }] },
      cloudProvider: { buckets: [{ key: 'aws', doc_count: 10 }] },
    } as unknown as RawBucket<FindingsGroupingAggregation>;

    const { getByTestId, queryByTestId } = render(
      <>
        {groupPanelRenderer(FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID, bucket, undefined, false)}
      </>
    );

    expect(getByTestId('cis-benchmark-icon')).toBeInTheDocument();
    expect(queryByTestId('cloud-provider-icon')).not.toBeInTheDocument();
    expect(CISBenchmarkIcon).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cis_aws', name: 'CIS AWS' }),
      expect.anything()
    );
  });

  it('renders CloudProviderIcon when benchmarkId is absent but cloudProvider is present (3P integration)', () => {
    const bucket = {
      ...baseBucket,
      benchmarkId: { buckets: [] },
      benchmarkName: { buckets: [] },
      cloudProvider: { buckets: [{ key: 'aws', doc_count: 10 }] },
    } as unknown as RawBucket<FindingsGroupingAggregation>;

    const { getByTestId, queryByTestId } = render(
      <>
        {groupPanelRenderer(FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID, bucket, undefined, false)}
      </>
    );

    expect(getByTestId('cloud-provider-icon')).toBeInTheDocument();
    expect(queryByTestId('cis-benchmark-icon')).not.toBeInTheDocument();
    expect(CloudProviderIcon).toHaveBeenCalledWith(
      expect.objectContaining({ cloudProvider: 'aws' }),
      expect.anything()
    );
  });

  it('shows cloud provider full name as subtitle when benchmark name is absent', () => {
    const bucket = {
      ...baseBucket,
      benchmarkId: { buckets: [] },
      benchmarkName: { buckets: [] },
      cloudProvider: { buckets: [{ key: 'gcp', doc_count: 10 }] },
    } as unknown as RawBucket<FindingsGroupingAggregation>;

    const { getByText } = render(
      <>
        {groupPanelRenderer(FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID, bucket, undefined, false)}
      </>
    );

    expect(getByText('Google Cloud Platform')).toBeInTheDocument();
  });

  it('shows benchmark name as subtitle when both benchmarkName and cloudProvider are present', () => {
    const bucket = {
      ...baseBucket,
      benchmarkId: { buckets: [{ key: 'cis_azure', doc_count: 10 }] },
      benchmarkName: { buckets: [{ key: 'CIS Azure', doc_count: 10 }] },
      cloudProvider: { buckets: [{ key: 'azure', doc_count: 10 }] },
    } as unknown as RawBucket<FindingsGroupingAggregation>;

    const { getByText, queryByText } = render(
      <>
        {groupPanelRenderer(FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID, bucket, undefined, false)}
      </>
    );

    expect(getByText('CIS Azure')).toBeInTheDocument();
    expect(queryByText('Microsoft Azure')).not.toBeInTheDocument();
  });

  it('renders no icon and no subtitle when both benchmarkId and cloudProvider are absent', () => {
    const bucket = {
      ...baseBucket,
      benchmarkId: { buckets: [] },
      benchmarkName: { buckets: [] },
      cloudProvider: { buckets: [] },
    } as unknown as RawBucket<FindingsGroupingAggregation>;

    const { queryByTestId } = render(
      <>
        {groupPanelRenderer(FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID, bucket, undefined, false)}
      </>
    );

    expect(queryByTestId('cis-benchmark-icon')).not.toBeInTheDocument();
    expect(queryByTestId('cloud-provider-icon')).not.toBeInTheDocument();
  });

  it('renders NullGroup when nullGroupMessage is provided', () => {
    const { getByTestId } = render(
      <>
        {groupPanelRenderer(
          FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID,
          baseBucket,
          'No data',
          false
        )}
      </>
    );

    expect(getByTestId('null-group')).toBeInTheDocument();
  });
});
