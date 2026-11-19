/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { Misconfiguration } from '.';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding', () => ({
  useMisconfigurationFinding: jest.fn(),
}));

jest.mock('../../../shared/components/flyout_error', () => ({
  FlyoutError: () => <div data-test-subj="mockFlyoutError" />,
}));

jest.mock('../../../shared/components/flyout_loading', () => ({
  FlyoutLoading: ({ 'data-test-subj': dataTestSubj }: { 'data-test-subj'?: string }) => (
    <div data-test-subj={dataTestSubj ?? 'mockFlyoutLoading'} />
  ),
}));

jest.mock('./header', () => ({
  Header: () => <div data-test-subj="mockMisconfigurationHeader" />,
}));

jest.mock('./content', () => ({
  Content: () => <div data-test-subj="mockMisconfigurationContent" />,
}));

jest.mock('./footer', () => ({
  Footer: () => <div data-test-subj="mockMisconfigurationFooter" />,
}));

const useMisconfigurationFindingMock = useMisconfigurationFinding as jest.Mock;

const renderPanel = () => render(<Misconfiguration resourceId="resource-1" ruleId="rule-1" />);

describe('<Misconfiguration />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
