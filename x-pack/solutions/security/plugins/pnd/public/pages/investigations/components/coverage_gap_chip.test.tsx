/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TimelineEvent } from '@kbn/pnd-common';
import { CoverageGapChip, DETECTION_CHANGE_EVENT_TYPE } from './coverage_gap_chip';

const event = (type: string, summary: string, id = type): TimelineEvent => ({
  id,
  timestamp: '2026-07-24T00:00:00.000Z',
  type,
  summary,
});

describe('CoverageGapChip', () => {
  it('renders nothing when there is no detection-change event (conditional contract)', () => {
    const { container } = render(
      <CoverageGapChip events={[event('triage', 'Triaged'), event('proposal', 'Proposed')]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a single-gap chip when one detection-change signal is present', () => {
    render(
      <CoverageGapChip
        events={[
          event('triage', 'Triaged'),
          event(DETECTION_CHANGE_EVENT_TYPE, 'T1071.001 uncovered'),
        ]}
      />
    );
    expect(screen.getByTestId('pndCoverageGapChip')).toHaveTextContent('Coverage gap');
  });

  it('pluralizes the label when multiple detection-change signals are present', () => {
    render(
      <CoverageGapChip
        events={[
          event(DETECTION_CHANGE_EVENT_TYPE, 'T1071.001 uncovered', 'a'),
          event(DETECTION_CHANGE_EVENT_TYPE, 'T1003.001 uncovered', 'b'),
        ]}
      />
    );
    expect(screen.getByTestId('pndCoverageGapChip')).toHaveTextContent('2 coverage gaps');
  });
});
