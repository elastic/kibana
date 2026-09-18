/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SignificantSecurityEventInlineContent,
  SSE_ATTACHMENT_TEST_ID,
  SSE_ATTACHMENT_EMPTY_TEST_ID,
} from './significant_security_event_inline_content';
import type { SignificantSecurityEventAttachment } from './types';

const buildAttachment = (
  data: SignificantSecurityEventAttachment['data']
): SignificantSecurityEventAttachment =>
  ({
    id: 'att-1',
    type: 'security.significant_security_event',
    data,
  } as SignificantSecurityEventAttachment);

const navigation = { spaceId: 'default', prependPath: (path: string) => path };

const renderProps = (attachment: SignificantSecurityEventAttachment) => ({
  attachment,
  navigation,
  isSidebar: false,
});

const baseData = {
  title: 'Suspicious lateral movement',
  severity: 'high' as const,
  confidence: 0.8,
  status: 'open',
  source_watch: 'watch-1',
  capability: 'lateral-movement-detector',
  run_id: 'run-1',
  security_knowledge_indicators: [{ type: 'hash', value: 'abc123' }],
  entities: ['host-1', 'user-1'],
  timeline: [{ at: '2024-01-01T00:00:00Z', what: 'RDP session opened' }],
  hypothesis_tested: 'Attacker pivoted via RDP',
  evidence_for: ['e1', 'e2'],
  evidence_against: [],
  evaluation_record_ref: 'eval-1',
};

describe('SignificantSecurityEventInlineContent', () => {
  it('renders the empty state for malformed data', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({} as SignificantSecurityEventAttachment['data']))}
      />
    );
    expect(screen.getByTestId(SSE_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders every field from a valid payload', () => {
    render(<SignificantSecurityEventInlineContent {...renderProps(buildAttachment(baseData))} />);
    expect(screen.getByTestId(SSE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Suspicious lateral movement')).toBeInTheDocument();
    expect(screen.getByText('high (0.8)')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('watch-1')).toBeInTheDocument();
    expect(screen.getByText('lateral-movement-detector')).toBeInTheDocument();
    expect(screen.getByText('Attacker pivoted via RDP')).toBeInTheDocument();
    expect(screen.getByText('RDP session opened')).toBeInTheDocument();
    expect(screen.getByText('host-1')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(
      screen.getByText('Evidence for: 2 · Evidence against: 0 · Indicators: 1')
    ).toBeInTheDocument();
  });

  it('drops malformed timeline entries but still renders the valid ones', () => {
    const data = {
      ...baseData,
      timeline: [
        { at: '2024-01-01T00:00:00Z', what: 'valid entry' },
        { at: 123, what: 'bad at type' },
        { what: 'missing at' },
      ] as unknown as SignificantSecurityEventAttachment['data']['timeline'],
    };
    render(<SignificantSecurityEventInlineContent {...renderProps(buildAttachment(data))} />);
    expect(screen.getByText('valid entry')).toBeInTheDocument();
    expect(screen.queryByText('bad at type')).not.toBeInTheDocument();
    expect(screen.queryByText('missing at')).not.toBeInTheDocument();
  });

  it('shows the empty-timeline sentinel when there are no entries', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, timeline: [] }))}
      />
    );
    expect(screen.getByText('No timeline entries recorded')).toBeInTheDocument();
  });

  it('shows the no-entities sentinel when entities is empty', () => {
    render(
      <SignificantSecurityEventInlineContent
        {...renderProps(buildAttachment({ ...baseData, entities: [] }))}
      />
    );
    expect(screen.getByText('No entities recorded')).toBeInTheDocument();
  });
});
