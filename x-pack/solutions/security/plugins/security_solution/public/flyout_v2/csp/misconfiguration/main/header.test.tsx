/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { Header } from './header';

vi.mock('@kbn/cloud-security-posture', () => {
      const mocked = {
      CspEvaluationBadge: ({ type }: { type?: string }) => (
        <div data-test-subj="mockCspEvaluationBadge" data-type={type} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../shared/components/flyout_title', () => {
      const mocked = {
      FlyoutTitle: ({ title }: { title: string }) => (
        <div data-test-subj="mockFlyoutTitle">{title}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/components/formatted_date', () => {
      const mocked = {
      PreferenceFormattedDate: () => <span data-test-subj="mockFormattedDate" />,
    };
      return { ...mocked, default: mocked };
    });

const mockCspHeader = vi.fn(() => <div data-test-subj="mockCspFlyoutHeader" />);

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          cloudSecurityPosture: {
            getCloudSecurityPostureMisconfigurationFlyout: () => ({
              Header: mockCspHeader,
            }),
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

const finding = {
  '@timestamp': '2024-01-15T10:30:00.000Z',
  result: { evaluation: 'failed' },
  rule: { name: 'My Rule' },
} as unknown as CspFinding;

describe('<Header /> (misconfiguration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the evaluation badge, title, and CSP header', () => {
    const { getByTestId } = render(<Header finding={finding} />);
    expect(getByTestId('mockCspEvaluationBadge')).toHaveAttribute('data-type', 'failed');
    expect(getByTestId('mockFlyoutTitle')).toHaveTextContent('My Rule');
    expect(getByTestId('mockFormattedDate')).toBeInTheDocument();
    expect(getByTestId('mockCspFlyoutHeader')).toBeInTheDocument();
  });
});
