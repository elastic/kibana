/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SignificantEventItem } from './significant_event_item';

const mockEvent: SignificantEvent = {
  '@timestamp': new Date().toISOString(),
  event_id: 'evt-1',
  status: 'active',
  source_ids: ['service-a'],
  title: 'Test significant event',
  summary: 'Something happened',
  severity: 'high',
  confidence: 0.9,
};

const investigatedEvent: SignificantEvent = {
  ...mockEvent,
  investigations: [
    {
      workflow_execution_id: 'exec-1',
      started_at: '2026-07-10T12:00:00Z',
      completed_at: '2026-07-10T12:05:00Z',
    },
  ],
};

describe('SignificantEventItem', () => {
  const renderItem = (props: Partial<React.ComponentProps<typeof SignificantEventItem>> = {}) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <SignificantEventItem event={mockEvent} {...props} />
        </EuiProvider>
      </I18nProvider>
    );

  describe('investigation marker', () => {
    it('falls back to completed_at while the status is still being fetched', () => {
      renderItem({ event: investigatedEvent });

      expect(screen.getByTestId('nightshiftInvestigatedStatus')).toHaveTextContent('Investigated');
      expect(screen.queryByTestId('nightshiftInvestigationFailedStatus')).not.toBeInTheDocument();
    });

    it('marks a run recorded as failed as unavailable, since investigations no longer fail', () => {
      renderItem({ event: investigatedEvent, investigationRunStatus: 'failed' });

      expect(screen.getByTestId('nightshiftInvestigationFailedStatus')).toHaveTextContent(
        'Investigation unavailable'
      );
      expect(screen.queryByTestId('nightshiftInvestigatedStatus')).not.toBeInTheDocument();
    });
  });
});
