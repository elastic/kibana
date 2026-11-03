/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RiskScoreStatusPanel } from './risk_score_status_panel';
import type { RiskScoreStatusReason } from './types';

describe('RiskScoreStatusPanel', () => {
  describe('reason copy', () => {
    const reasons: RiskScoreStatusReason[] = [
      'no_matching_alerts',
      'engine_never_run',
      'engine_disabled',
      'engine_not_installed',
      'unknown',
    ];

    it.each(reasons)('renders a title and description for reason "%s"', (reason) => {
      render(<RiskScoreStatusPanel reason={reason} />);

      const panel = screen.getByTestId('risk-score-status-panel');
      expect(panel).toBeInTheDocument();
      // Both title and description should have non-empty text content.
      expect(panel.textContent ?? '').not.toBe('');
    });

    it('uses an override title and description when provided', () => {
      render(
        <RiskScoreStatusPanel
          reason="no_matching_alerts"
          title="Custom title"
          description="Custom description"
        />
      );

      expect(screen.getByText('Custom title')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('renders an EuiEmptyPrompt by default (variant="panel")', () => {
      render(<RiskScoreStatusPanel reason="no_matching_alerts" />);
      // EuiEmptyPrompt has a `euiEmptyPrompt` class on its container.
      expect(screen.getByTestId('risk-score-status-panel')).toHaveClass('euiEmptyPrompt', {
        exact: false,
      });
    });

    it('renders an EuiCallOut for variant="callout"', () => {
      render(<RiskScoreStatusPanel reason="no_matching_alerts" variant="callout" />);
      expect(screen.getByTestId('risk-score-status-panel')).toHaveClass('euiCallOut', {
        exact: false,
      });
    });

    it('renders only the description for variant="inline"', () => {
      render(
        <RiskScoreStatusPanel
          reason="no_matching_alerts"
          variant="inline"
          description="Inline copy"
          // primaryAction should be ignored for inline variant.
          primaryAction={{ label: 'Action', onClick: jest.fn() }}
          facts={{ entitiesTracked: 5 }}
        />
      );

      expect(screen.getByText('Inline copy')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('risk-score-status-panel-facts')).not.toBeInTheDocument();
    });
  });

  describe('facts list', () => {
    it('renders supplied facts and omits absent ones', () => {
      render(
        <RiskScoreStatusPanel
          reason="no_matching_alerts"
          facts={{
            entitiesTracked: 1247,
            matchingAlertsCount: 0,
            // scoringWindow and lastSuccessTimestamp deliberately omitted
          }}
        />
      );

      expect(
        screen.getByTestId('risk-score-status-panel-facts-entitiesTracked')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('risk-score-status-panel-facts-matchingAlerts')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('risk-score-status-panel-facts-scoringWindow')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('risk-score-status-panel-facts-lastRun')
      ).not.toBeInTheDocument();
    });

    it('does not render the facts list when no facts are supplied', () => {
      render(<RiskScoreStatusPanel reason="no_matching_alerts" />);
      expect(screen.queryByTestId('risk-score-status-panel-facts')).not.toBeInTheDocument();
    });
  });

  describe('primaryAction', () => {
    it('renders the action button when an action is supplied', async () => {
      const onClick = jest.fn();
      render(
        <RiskScoreStatusPanel
          reason="no_matching_alerts"
          primaryAction={{ label: 'Review settings', onClick }}
        />
      );

      const button = screen.getByRole('button', { name: 'Review settings' });
      await userEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('omits the action button when no primaryAction is supplied', () => {
      render(<RiskScoreStatusPanel reason="no_matching_alerts" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('omits the action button when primaryAction is explicitly null', () => {
      render(<RiskScoreStatusPanel reason="no_matching_alerts" primaryAction={null} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('data-test-subj', () => {
    it('honours a custom data-test-subj prefix', () => {
      render(
        <RiskScoreStatusPanel
          reason="no_matching_alerts"
          data-test-subj="my-panel"
          facts={{ entitiesTracked: 1 }}
          primaryAction={{ label: 'Go', onClick: jest.fn() }}
        />
      );

      expect(screen.getByTestId('my-panel')).toBeInTheDocument();
      expect(screen.getByTestId('my-panel-facts')).toBeInTheDocument();
      expect(screen.getByTestId('my-panel-primaryAction')).toBeInTheDocument();
    });
  });
});
