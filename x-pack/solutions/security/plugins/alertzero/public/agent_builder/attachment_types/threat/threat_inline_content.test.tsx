/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  ThreatAttachmentInlineContent,
  THREAT_ATTACHMENT_EMPTY_TEST_ID,
  THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID,
} from './threat_inline_content';
import { threatAttachmentQueryClient } from './query_client';
import type { ThreatAttachment } from './types';

const buildAttachment = (data: ThreatAttachment['data']): ThreatAttachment =>
  ({ id: 'att-1', type: 'security.threat', data } as ThreatAttachment);

const renderProps = (attachment: ThreatAttachment, http: HttpStart) => ({
  attachment,
  http,
  isSidebar: false,
});

describe('ThreatAttachmentInlineContent', () => {
  // The module-scoped query client caches by `report_id`; clear it between tests so a prior
  // test's resolved/errored query state can't leak into the next one via the shared cache.
  // Retries are also disabled for the suite: the rejection tests would otherwise wait out
  // the client's `retry: 1` (~1s each) before the fallback path renders.
  beforeEach(() => {
    threatAttachmentQueryClient.setDefaultOptions({
      queries: { refetchOnWindowFocus: false, retry: 0, staleTime: 30_000 },
    });
  });

  afterEach(() => {
    threatAttachmentQueryClient.clear();
  });

  it('renders the empty state when the payload has no report_id', () => {
    const http = { fetch: jest.fn() } as unknown as HttpStart;
    const attachment = buildAttachment({} as ThreatAttachment['data']);
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);
    expect(screen.getByTestId(THREAT_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders the live report fields when the fetch resolves', async () => {
    const http = {
      fetch: jest.fn().mockResolvedValue({
        reportId: 'r-1',
        content: { title: 'Live Title' },
        severity: { level: 'high', score: 0.9 },
        source: { name: 'Live Source' },
      }),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-1' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Live Title')).toBeInTheDocument();
    });
    expect(screen.getByText('Live Source')).toBeInTheDocument();
    expect(screen.queryByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('falls back to captured fields when the fetch fails (no status-code branching)', async () => {
    const http = {
      fetch: jest.fn().mockRejectedValue(new Error('403')),
    } as unknown as HttpStart;
    const attachment = buildAttachment({
      report_id: 'r-1',
      title: 'Captured Title',
      severity: 'medium',
      source: 'Captured Source',
    });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByTestId(THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID)).toBeInTheDocument();
    });
    expect(screen.getByText('Captured Title')).toBeInTheDocument();
  });

  it('shows "Report unavailable" when neither live nor captured fields exist', async () => {
    const http = {
      fetch: jest.fn().mockRejectedValue(new Error('404')),
    } as unknown as HttpStart;
    const attachment = buildAttachment({ report_id: 'r-1' });
    render(<ThreatAttachmentInlineContent {...renderProps(attachment, http)} />);

    await waitFor(() => {
      expect(screen.getByText('Report unavailable')).toBeInTheDocument();
    });
  });
});
