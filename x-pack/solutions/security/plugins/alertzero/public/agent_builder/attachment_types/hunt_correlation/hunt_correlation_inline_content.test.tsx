/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  HuntCorrelationInlineContent,
  HUNT_CORRELATION_ATTACHMENT_TEST_ID,
  HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID,
} from './hunt_correlation_inline_content';
import type { HuntCorrelationAttachment } from './types';

const buildAttachment = (data: HuntCorrelationAttachment['data']): HuntCorrelationAttachment =>
  ({ id: 'att-1', type: 'security.hunt_correlation', data } as HuntCorrelationAttachment);

const baseData: HuntCorrelationAttachment['data'] = {
  anchors: [
    { kind: 'hash', value: 'abc123' },
    { kind: 'actor', value: 'APT-99' },
  ],
  diamond_scores: [{ vertex: 'infrastructure', related_report_id: 'report-2', score: 0.75 }],
  thresholds: { anchor_match: 0.9, diamond_vertex: 0.6 },
  self_match_excluded: true,
};

describe('HuntCorrelationInlineContent', () => {
  it('renders the empty state for malformed data', () => {
    render(
      <HuntCorrelationInlineContent
        attachment={buildAttachment(undefined as unknown as HuntCorrelationAttachment['data'])}
        isSidebar={false}
      />
    );
    expect(screen.getByTestId(HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it('renders anchors, diamond scores, and thresholds from a valid payload', () => {
    render(
      <HuntCorrelationInlineContent attachment={buildAttachment(baseData)} isSidebar={false} />
    );
    expect(screen.getByTestId(HUNT_CORRELATION_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('APT-99')).toBeInTheDocument();
    expect(screen.getByText('infrastructure')).toBeInTheDocument();
    expect(screen.getByText('report-2')).toBeInTheDocument();
    expect(screen.getByText('0.75')).toBeInTheDocument();
    expect(
      screen.getByText('Thresholds: anchor_match=0.9, diamond_vertex=0.6')
    ).toBeInTheDocument();
  });

  it('drops malformed anchor entries but keeps the valid ones', () => {
    const data = {
      ...baseData,
      anchors: [
        { kind: 'hash', value: 'valid-anchor' },
        { kind: 'hash' },
        { value: 'missing-kind' },
      ] as unknown as HuntCorrelationAttachment['data']['anchors'],
    };
    render(<HuntCorrelationInlineContent attachment={buildAttachment(data)} isSidebar={false} />);
    expect(screen.getByText('valid-anchor')).toBeInTheDocument();
    expect(screen.queryByText('missing-kind')).not.toBeInTheDocument();
  });

  it('shows the empty-anchors sentinel when anchors is empty', () => {
    render(
      <HuntCorrelationInlineContent
        attachment={buildAttachment({ ...baseData, anchors: [] })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('No anchors recorded')).toBeInTheDocument();
  });

  it('shows the empty-diamond-scores sentinel when diamond_scores is empty', () => {
    render(
      <HuntCorrelationInlineContent
        attachment={buildAttachment({ ...baseData, diamond_scores: [] })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('No diamond scores recorded')).toBeInTheDocument();
  });
});
