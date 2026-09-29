/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FindingsVulnerabilityPanel } from '.';
import { useDateFormat, useKibana, useTimeZone } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';
import type { FindingsVulnerabilityPanelExpandableFlyoutProps } from '@kbn/cloud-security-posture';

vi.mock('../../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
    useDateFormat: vi.fn(),
    useTimeZone: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: vi.fn(),
    useExpandableFlyoutHistory: vi.fn(),
    useExpandableFlyoutState: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params', () => {
  const mocked = {
    useGetNavigationUrlParams: () => () => 'mocked-nav-url',
  };
  return { ...mocked, default: mocked };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (Component: any) => {
  (useKibana as Mock).mockReturnValue({
    services: {
      cloudSecurityPosture: {
        getCloudSecurityPostureVulnerabilityFlyout: () => ({
          Component,
          Header: () => <div />,
          Body: () => <div />,
          Footer: () => <div />,
        }),
      },
    },
  });

  render(
    <TestProviders>
      <FindingsVulnerabilityPanel {...baseProps} />
    </TestProviders>
  );
};

const createMockFlyoutComponent =
  (title?: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ children }: any) =>
    children({
      finding: {
        vulnerability: {
          title,
          severity: 'High',
          published_date: '2025-05-22T00:00:00.000Z',
        },
        '@timestamp': '2025-05-22T00:00:00.000Z',
      },
      createRuleFn: vi.fn(),
    });

const baseProps: FindingsVulnerabilityPanelExpandableFlyoutProps['params'] = {
  vulnerabilityId: 'vulnerability_id',
  resourceId: 'resource_id',
  packageName: 'package_name',
  packageVersion: 'package_version',
  eventId: 'event_id',
  isPreviewMode: false,
};

const flyoutHistoryMock = [{ lastOpen: Date.now(), panel: { id: 'id_mock', params: {} } }];

beforeEach(() => {
  (useExpandableFlyoutApi as Mock).mockReturnValue({ closeLeftPanel: vi.fn() });
  (useExpandableFlyoutHistory as Mock).mockReturnValue(flyoutHistoryMock);
  (useExpandableFlyoutState as Mock).mockReturnValue({});

  (useDateFormat as Mock).mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
  (useTimeZone as Mock).mockReturnValue('UTC');
});

describe('FindingsVulnerabilityPanel', () => {
  it('renders the vulnerability title when available', () => {
    renderComponent(createMockFlyoutComponent('Test Vulnerability Title'));
    expect(screen.getByText('Test Vulnerability Title')).toBeInTheDocument();
  });

  it('renders fallback title when vulnerability title is missing', () => {
    renderComponent(createMockFlyoutComponent(undefined));
    expect(screen.getByText('No title available')).toBeInTheDocument();
  });
});
