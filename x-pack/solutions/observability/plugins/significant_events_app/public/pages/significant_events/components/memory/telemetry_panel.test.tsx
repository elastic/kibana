/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryTelemetryPanel } from './telemetry_panel';
import type { MemoryPage } from './types';

const page = (overrides: Partial<MemoryPage> = {}): MemoryPage => ({
  id: 'memory_kafka-lag',
  slug: 'kafka-lag',
  title: 'Kafka consumer lag',
  content: 'Scale the consumer.',
  tags: ['memory'],
  archived: false,
  categories: [],
  references: [],
  created_at: '',
  updated_at: '',
  created_by: '',
  updated_by: '',
  telemetry: { impressions: 0, conversions: 0, last_impression_time: '' },
  ...overrides,
});

const renderPanel = (target: MemoryPage, usefulness: number, confidence: number) =>
  render(
    <I18nProvider>
      <MemoryTelemetryPanel page={target} usefulness={usefulness} confidence={confidence} />
    </I18nProvider>
  );

/**
 * EUI renders colour through Emotion rather than an attribute, and names the
 * modifier in the class: `color="danger"` yields `euiTextColor-danger`.
 */
const classesOf = (testSubj: string) => screen.getByTestId(testSubj).className;
const ALERT_COLOURS = ['euiTextColor-danger', 'euiTextColor-warning'];

describe('MemoryTelemetryPanel', () => {
  it('renders the two numbers the ranking reasons about', () => {
    renderPanel(page(), 0.75, 0.6);

    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('75%');
    expect(screen.getByTestId('nightshiftMemoryConfidenceValue')).toHaveTextContent('60%');
  });

  it('does not style 0% usefulness as a warning or a danger', () => {
    renderPanel(page(), 0, 0);

    const classes = classesOf('nightshiftMemoryUsefulnessValue');
    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('0%');
    for (const colour of ALERT_COLOURS) {
      expect(classes).not.toContain(colour);
    }
  });

  it('does not style 0% confidence as a warning either', () => {
    // Confidence is near zero for any memory with a handful of impressions, so the
    // same reasoning applies.
    renderPanel(page(), 0, 0);

    const classes = classesOf('nightshiftMemoryConfidenceValue');
    for (const colour of ALERT_COLOURS) {
      expect(classes).not.toContain(colour);
    }
  });

  it('keeps a proven memory uncoloured too, so colour never carries the verdict', () => {
    // 100% usefulness on a single impression is the case a warning would target.
    // It is a sample-size problem that confidence already reports, so neither
    // number is painted.
    renderPanel(page(), 1, 0.05);

    for (const colour of ALERT_COLOURS) {
      expect(classesOf('nightshiftMemoryUsefulnessValue')).not.toContain(colour);
      expect(classesOf('nightshiftMemoryConfidenceValue')).not.toContain(colour);
    }
  });

  it('clamps a rate outside [0, 1] rather than rendering 4000%', () => {
    renderPanel(page(), 4, -1);

    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('100%');
    expect(screen.getByTestId('nightshiftMemoryConfidenceValue')).toHaveTextContent('0%');
  });

  it('badges the reason a memory was retired, so archived is not just a boolean', () => {
    renderPanel(page({ archived: true, archive_reason: 'harmful' }), 0, 0);

    expect(screen.getByTestId('nightshiftMemoryArchivedBadge')).toHaveTextContent(
      'judged misleading'
    );
  });

  it('shows no reason badge for a legacy archived page that has none', () => {
    // A pre-`archive_reason` document reads as archived with nothing to say why.
    renderPanel(page({ archived: true }), 0, 0);

    expect(screen.queryByTestId('nightshiftMemoryArchivedBadge')).not.toBeInTheDocument();
  });

  it('lists the memory tags but not the internal memory marker', () => {
    renderPanel(page({ tags: ['memory', 'kafka', 'checkout'] }), 0, 0);

    expect(screen.getByText('kafka')).toBeInTheDocument();
    expect(screen.getByText('checkout')).toBeInTheDocument();
    // `memory` is the store's own type tag, not something the investigator wrote.
    expect(screen.queryByText('memory')).not.toBeInTheDocument();
  });
});
