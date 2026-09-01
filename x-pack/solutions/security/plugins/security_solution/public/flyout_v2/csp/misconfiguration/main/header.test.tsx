/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { Header } from './header';

jest.mock('@kbn/cloud-security-posture', () => ({
  CspEvaluationBadge: ({ type }: { type?: string }) => (
    <div data-test-subj="mockCspEvaluationBadge" data-type={type} />
  ),
}));

jest.mock('../../../shared/components/flyout_title', () => ({
  FlyoutTitle: ({ title }: { title: string }) => (
    <div data-test-subj="mockFlyoutTitle">{title}</div>
  ),
}));

jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: () => <span data-test-subj="mockFormattedDate" />,
}));

const mockCspHeader = jest.fn(() => <div data-test-subj="mockCspFlyoutHeader" />);

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cloudSecurityPosture: {
        getCloudSecurityPostureMisconfigurationFlyout: () => ({
          Header: mockCspHeader,
        }),
      },
    },
  }),
}));

const finding = {
  '@timestamp': '2024-01-15T10:30:00.000Z',
  result: { evaluation: 'failed' },
  rule: { name: 'My Rule' },
} as unknown as CspFinding;

describe('<Header /> (misconfiguration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the evaluation badge, title, and CSP header', () => {
    const { getByTestId } = render(<Header finding={finding} />);
    expect(getByTestId('mockCspEvaluationBadge')).toHaveAttribute('data-type', 'failed');
    expect(getByTestId('mockFlyoutTitle')).toHaveTextContent('My Rule');
    expect(getByTestId('mockFormattedDate')).toBeInTheDocument();
    expect(getByTestId('mockCspFlyoutHeader')).toBeInTheDocument();
  });
});
