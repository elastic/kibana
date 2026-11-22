/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RawBucket } from '@kbn/grouping/src';
import type { VulnerabilitiesGroupingAggregation } from '@kbn/cloud-security-posture';
import { groupPanelRenderer } from './latest_vulnerabilities_group_renderer';
import { TestProvider } from '../../test/test_provider';
import { VULNERABILITY_GROUPING_OPTIONS } from '../../common/constants';
import { FIX_GROUP_KEY_SEPARATOR, FIX_GROUP_NO_FIX } from './hooks/fix_group_runtime_fields';

type VulnerabilityGroupingOption =
  (typeof VULNERABILITY_GROUPING_OPTIONS)[keyof typeof VULNERABILITY_GROUPING_OPTIONS];

const renderFixGroup = (
  key: string,
  options?: {
    selectedGroup?: VulnerabilityGroupingOption;
    bucket?: Partial<RawBucket<VulnerabilitiesGroupingAggregation>>;
  }
) => {
  const { selectedGroup = VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_PACKAGE_FIXED, bucket = {} } =
    options ?? {};
  return render(
    <TestProvider>
      {
        groupPanelRenderer(
          selectedGroup,
          {
            key_as_string: key,
            key: [key],
            doc_count: 3,
            ...bucket,
          } as RawBucket<VulnerabilitiesGroupingAggregation>,
          undefined,
          false
        ) as React.ReactElement
      }
    </TestProvider>
  );
};

describe('fix group panel renderer', () => {
  it('renders package and fix version on two lines', () => {
    const { getByText } = renderFixGroup(`krb5-libs${FIX_GROUP_KEY_SEPARATOR}1.19.1-24.el9_3`);

    expect(getByText('krb5-libs')).toBeInTheDocument();
    expect(getByText('1.19.1-24.el9_3')).toBeInTheDocument();
    expect(screen.queryByTestId('fix-group-no-fix-badge')).toBeNull();
  });

  it('badges unfixed package groups and hides the sentinel value', () => {
    renderFixGroup(`webkit2gtk3-jsc${FIX_GROUP_KEY_SEPARATOR}${FIX_GROUP_NO_FIX}`);

    expect(screen.getByText('webkit2gtk3-jsc')).toBeInTheDocument();
    // the NO_FIX sentinel never leaks into the UI
    expect(screen.queryByText(FIX_GROUP_NO_FIX)).toBeNull();
    const badge = screen.getByTestId('fix-group-no-fix-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('no fix available yet');
  });

  it('renders the fix version stats aggregation for advisory groups', () => {
    renderFixGroup(`krb5-libs${FIX_GROUP_KEY_SEPARATOR}RHSA-2026:99715`, {
      selectedGroup: VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_ADVISORY_PACKAGE,
      bucket: {
        fixVersion: { buckets: [{ key: '1.19.1-24.el9_3', doc_count: 3 }] },
      },
    });

    expect(screen.getByText('krb5-libs')).toBeInTheDocument();
    expect(screen.getByText('RHSA-2026:99715')).toBeInTheDocument();
    expect(screen.getByText('fix version: 1.19.1-24.el9_3')).toBeInTheDocument();
    expect(screen.queryByTestId('fix-group-no-fix-badge')).toBeNull();
  });

  it('badges advisory groups whose findings have no fix version', () => {
    renderFixGroup(`libsoup${FIX_GROUP_KEY_SEPARATOR}CVE-2026-107493`, {
      selectedGroup: VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_ADVISORY_PACKAGE,
    });

    expect(screen.getByText('libsoup')).toBeInTheDocument();
    expect(screen.getByText('CVE-2026-107493')).toBeInTheDocument();
    expect(screen.getByTestId('fix-group-no-fix-badge')).toBeInTheDocument();
  });

  it('renders malformed keys as a single line instead of crashing', () => {
    renderFixGroup('plain-key-without-separator');

    expect(screen.getByText('plain-key-without-separator')).toBeInTheDocument();
  });
});
