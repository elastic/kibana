/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { Misconfiguration } from '.';

vi.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding', () => {
  const mocked = {
    useMisconfigurationFinding: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../shared/components/flyout_error', () => {
  const mocked = {
    FlyoutError: () => <div data-test-subj="mockFlyoutError" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../shared/components/flyout_loading', () => {
  const mocked = {
    FlyoutLoading: ({ 'data-test-subj': dataTestSubj }: { 'data-test-subj'?: string }) => (
      <div data-test-subj={dataTestSubj ?? 'mockFlyoutLoading'} />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./header', () => {
  const mocked = {
    Header: () => <div data-test-subj="mockMisconfigurationHeader" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./content', () => {
  const mocked = {
    Content: () => <div data-test-subj="mockMisconfigurationContent" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./footer', () => {
  const mocked = {
    Footer: () => <div data-test-subj="mockMisconfigurationFooter" />,
  };
  return { ...mocked, default: mocked };
});

const useMisconfigurationFindingMock = useMisconfigurationFinding as Mock;

const renderPanel = () => render(<Misconfiguration resourceId="resource-1" ruleId="rule-1" />);

describe('<Misconfiguration />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while fetching the finding', () => {
    useMisconfigurationFindingMock.mockReturnValue({ data: undefined, isLoading: true });
    const { getByTestId } = renderPanel();
    expect(getByTestId('misconfiguration-panel-loading')).toBeInTheDocument();
  });

  it('renders the error state when the request fails', () => {
    useMisconfigurationFindingMock.mockReturnValue({ data: undefined, isError: true });
    const { getByTestId } = renderPanel();
    expect(getByTestId('mockFlyoutError')).toBeInTheDocument();
  });

  it('renders the error state when no finding is returned', () => {
    useMisconfigurationFindingMock.mockReturnValue({ data: { result: { hits: [] } } });
    const { getByTestId } = renderPanel();
    expect(getByTestId('mockFlyoutError')).toBeInTheDocument();
  });

  it('renders header and content when a finding is available', () => {
    useMisconfigurationFindingMock.mockReturnValue({
      data: {
        result: {
          hits: [
            {
              _source: {
                '@timestamp': '2024-01-15T10:30:00.000Z',
                result: { evaluation: 'failed' },
                rule: { name: 'My Rule' },
              },
            },
          ],
        },
      },
    });
    const { getByTestId } = renderPanel();
    expect(getByTestId('mockMisconfigurationHeader')).toBeInTheDocument();
    expect(getByTestId('mockMisconfigurationContent')).toBeInTheDocument();
    expect(getByTestId('mockMisconfigurationFooter')).toBeInTheDocument();
  });
});
