/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { screen } from '@elastic/eui/lib/test/rtl';
import { AlertsSection } from './alerts_section';
import * as hasDataHook from '../../../../../hooks/use_has_data';
import * as datePickerHook from '../../../../../hooks/use_date_picker_context';
import * as kibanaHook from '../../../../../utils/kibana_react';
import type { HasDataContextValue } from '../../../../../context/has_data_context/has_data_context';

jest.mock('./classic_alerts_section', () => ({
  ClassicAlertsSection: () => <div data-test-subj="classicAlertsSection" />,
}));

jest.mock('./universal_alerts_section', () => ({
  __esModule: true,
  default: () => <div data-test-subj="universalAlertsSection" />,
}));

jest.mock('../section_container', () => ({
  SectionContainer: ({
    children,
    appLink,
  }: {
    children: React.ReactNode;
    appLink: { href: string };
  }) => (
    <div data-test-subj="sectionContainer">
      <a data-test-subj="sectionAppLink" href={appLink.href}>
        link
      </a>
      {children}
    </div>
  ),
}));

const bucketSize = { intervalString: '60s', bucketSize: 60, dateFormat: 'YYYY-MM-DD HH:mm' };

const setup = ({
  universalEnabled,
  alertingVTwoAvailable = true,
  hasAlertingRules = true,
  showV1AlertsTable = false,
}: {
  universalEnabled: boolean;
  alertingVTwoAvailable?: boolean;
  hasAlertingRules?: boolean;
  showV1AlertsTable?: boolean;
}) => {
  jest.spyOn(datePickerHook, 'useDatePickerContext').mockReturnValue({
    relativeStart: 'now-15m',
    relativeEnd: 'now',
    updateTimeRange: jest.fn(),
  } as unknown as ReturnType<typeof datePickerHook.useDatePickerContext>);

  jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
    hasDataMap: { alert: { hasData: hasAlertingRules, status: 'success' } },
  } as unknown as HasDataContextValue);

  jest.spyOn(kibanaHook, 'useKibana').mockReturnValue({
    services: {
      settings: {
        globalClient: {
          isDeclared: () => universalEnabled,
          get: () => universalEnabled,
        },
        client: { get: () => showV1AlertsTable },
      },
      ...(alertingVTwoAvailable
        ? { alertingVTwo: { AlertsProvider: () => null, createAlertingV2HostApp: jest.fn() } }
        : {}),
    },
  } as unknown as ReturnType<typeof kibanaHook.useKibana>);
};

describe('AlertsSection', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders the classic summary and table when universal alerting is off', () => {
    setup({ universalEnabled: false });
    render(<AlertsSection bucketSize={bucketSize} />);

    expect(screen.getByTestSubject('classicAlertsSection')).toBeInTheDocument();
    expect(screen.queryByTestSubject('universalAlertsSection')).not.toBeInTheDocument();
  });

  it('links to the classic alerts page when universal alerting is off', () => {
    setup({ universalEnabled: false });
    render(<AlertsSection bucketSize={bucketSize} />);

    expect(screen.getByTestSubject('sectionAppLink')).toHaveAttribute(
      'href',
      '/app/observability/alerts'
    );
  });

  it('renders the universal histogram and table when universal alerting is on', async () => {
    setup({ universalEnabled: true });
    render(<AlertsSection bucketSize={bucketSize} />);

    await waitFor(() =>
      expect(screen.getByTestSubject('universalAlertsSection')).toBeInTheDocument()
    );
    expect(screen.queryByTestSubject('classicAlertsSection')).not.toBeInTheDocument();
  });

  it('links to the universal alerts page carrying the current time range', () => {
    setup({ universalEnabled: true });
    render(<AlertsSection bucketSize={bucketSize} />);

    const href = screen.getByTestSubject('sectionAppLink').getAttribute('href');
    expect(href).toContain('/app/observability/alerting/alerts');
    expect(href).toContain('timeFrom');
    expect(href).toContain('now-15m');
    expect(href).toContain('now');
  });

  it('renders nothing when the space has no alerting rules', () => {
    setup({ universalEnabled: true, hasAlertingRules: false });
    const { container } = render(<AlertsSection bucketSize={bucketSize} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the space has no alerting rules and universal alerting is off', () => {
    setup({ universalEnabled: false, hasAlertingRules: false });
    const { container } = render(<AlertsSection bucketSize={bucketSize} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('falls back to the classic section when the alertingVTwo plugin is unavailable', () => {
    setup({ universalEnabled: true, alertingVTwoAvailable: false });
    render(<AlertsSection bucketSize={bucketSize} />);

    expect(screen.getByTestSubject('classicAlertsSection')).toBeInTheDocument();
  });

  it('renders the classic section when the space opts into the classic alerts table', () => {
    setup({ universalEnabled: true, showV1AlertsTable: true });
    render(<AlertsSection bucketSize={bucketSize} />);

    expect(screen.getByTestSubject('classicAlertsSection')).toBeInTheDocument();
    expect(screen.queryByTestSubject('universalAlertsSection')).not.toBeInTheDocument();
  });

  it('links to the classic alerts page when the space opts into the classic alerts table', () => {
    setup({ universalEnabled: true, showV1AlertsTable: true });
    render(<AlertsSection bucketSize={bucketSize} />);

    expect(screen.getByTestSubject('sectionAppLink')).toHaveAttribute(
      'href',
      '/app/observability/alerts'
    );
  });
});
