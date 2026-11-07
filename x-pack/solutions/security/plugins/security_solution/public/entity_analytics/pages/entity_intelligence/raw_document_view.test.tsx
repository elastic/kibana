/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RawDocumentView } from './raw_document_view';

jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <span>{value.toISOString()}</span>,
}));

const alertSource = {
  '@timestamp': '2026-07-07T09:03:18.643Z',
  event: { kind: 'signal', action: 'alert', category: ['process'] },
  'kibana.alert.severity': 'high',
  'kibana.alert.risk_score': 75,
  'kibana.alert.rule.name': 'Docker - Image Pulled from Untrusted Registry',
  'kibana.alert.reason': 'Image pulled from untrusted registry',
  'kibana.alert.rule.threat': [
    {
      tactic: { id: 'TA0001', name: 'Initial Access' },
      technique: [{ id: 'T1195.002', name: 'Compromise Software Supply Chain' }],
    },
  ],
  host: { name: 'docker-host-prod-01' },
  user: { name: 'a.rodriguez' },
};

const eventSource = {
  '@timestamp': '2026-07-11T09:16:34.433Z',
  event: { kind: 'event', action: 'connection', category: ['network'] },
  destination: { ip: '185.220.101.5', port: 4444 },
  host: { name: 'docker-host-prod-01' },
};

const renderView = (source: unknown) =>
  render(
    <I18nProvider>
      <RawDocumentView source={source} />
    </I18nProvider>
  );

describe('RawDocumentView', () => {
  it('renders a friendly fallback for an unreadable document', () => {
    renderView(undefined);
    expect(screen.getByText(/no readable fields/i)).toBeInTheDocument();
  });

  it('leads with a plain-language summary of the alert', () => {
    renderView(alertSource);
    const summary = screen.getByTestId('entityIntelligenceRawSummary');
    expect(summary).toHaveTextContent('Alert: Docker - Image Pulled from Untrusted Registry');
    expect(summary).toHaveTextContent('high severity');
    expect(summary).toHaveTextContent('MITRE Initial Access (T1195.002)');
  });

  it('leads with a plain-language summary of the event', () => {
    renderView(eventSource);
    const summary = screen.getByTestId('entityIntelligenceRawSummary');
    expect(summary).toHaveTextContent('made a network connection');
    expect(summary).toHaveTextContent('185.220.101.5:4444');
  });

  it('renders a pretty alert view with rule, severity, and MITRE threat', () => {
    renderView(alertSource);
    expect(screen.getByTestId('entityIntelligenceRawView')).toBeInTheDocument();
    // Rule name appears in the summary; severity + threat render as badges.
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Initial Access')).toBeInTheDocument();
    expect(screen.getByText(/T1195.002 · Compromise Software Supply Chain/)).toBeInTheDocument();
    expect(screen.getByTestId('rawViewSection-threat')).toBeInTheDocument();
    // Humanized field labels, never the raw ECS key.
    expect(screen.getByTestId('rawViewSection-host')).toBeInTheDocument();
    expect(screen.getAllByText('Host').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('host.name')).not.toBeInTheDocument();
  });

  it('renders destination ip:port for an event and omits absent sections', () => {
    renderView(eventSource);
    expect(screen.getByText('185.220.101.5:4444')).toBeInTheDocument();
    expect(screen.getByTestId('rawViewSection-destination')).toBeInTheDocument();
    // No process / file / threat sections on this network event.
    expect(screen.queryByTestId('rawViewSection-process')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rawViewSection-threat')).not.toBeInTheDocument();
  });

  it('hides verbose fields behind a "technical details" disclosure', () => {
    const detailedEvent = {
      '@timestamp': '2026-07-07T14:06:18.635Z',
      event: {
        kind: 'event',
        action: 'ProcessRollup2',
        category: ['process'],
        dataset: 'crowdstrike.fdr',
      },
      process: { name: 'schtasks.exe', pid: 5700, command_line: 'schtasks.exe /create' },
      host: { name: 'LAPTOP-FIN03' },
    };
    renderView(detailedEvent);
    // Command line (primary) shows; PID (detail) is hidden until expanded.
    expect(screen.getByText('Command line')).toBeInTheDocument();
    expect(screen.queryByText('Process ID')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('entityIntelligenceRawViewDetailsToggle'));
    expect(screen.getByText('Process ID')).toBeInTheDocument();
    expect(screen.getByTestId('rawViewSection-details')).toBeInTheDocument();
  });

  it('toggles the raw JSON disclosure without losing the pretty view', () => {
    renderView(alertSource);
    expect(screen.queryByText(/"kibana.alert.severity"/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('entityIntelligenceRawViewJsonToggle'));
    expect(screen.getByText(/"kibana.alert.severity"/)).toBeInTheDocument();
    // Pretty summary still present alongside the JSON.
    expect(screen.getByTestId('entityIntelligenceRawSummary')).toBeInTheDocument();
  });
});
