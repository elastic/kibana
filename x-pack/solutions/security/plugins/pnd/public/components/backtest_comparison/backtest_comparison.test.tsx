/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { BacktestComparison } from './backtest_comparison';
import type { PndBacktestSide } from './backtest_comparison';

const before: PndBacktestSide = {
  alertCount: 120,
  from: '2026-07-27T00:00:00.000Z',
  to: '2026-08-03T00:00:00.000Z',
};

const after: PndBacktestSide = {
  alertCount: 3,
  from: '2026-07-27T00:00:00.000Z',
  to: '2026-08-03T00:00:00.000Z',
};

describe('BacktestComparison', () => {
  describe('a missing preview is stated explicitly', () => {
    it('says no backtest is available when preview is absent', () => {
      renderWithPndProviders(<BacktestComparison />);

      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toBeInTheDocument();
    });

    it('says no backtest is available when both sides are absent', () => {
      renderWithPndProviders(<BacktestComparison preview={{}} />);

      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toBeInTheDocument();
    });

    it('never renders a zero for an absent preview, which would read as "no change expected"', () => {
      renderWithPndProviders(<BacktestComparison />);

      expect(screen.queryByTestId('pndBacktestComparisonBeforeCount')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pndBacktestComparisonAfterCount')).not.toBeInTheDocument();
    });

    it('explains why the number is missing rather than only that it is', () => {
      renderWithPndProviders(<BacktestComparison />);

      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toHaveTextContent(
        /rule preview/i
      );
    });
  });

  describe('both sides present', () => {
    it('renders the before alert count', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonBeforeCount')).toHaveTextContent('120');
    });

    it('renders the after alert count', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent('3');
    });

    it('renders the window for each side', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonBeforeWindow')).toHaveTextContent(
        '2026-07-27T00:00:00.000Z'
      );
      expect(screen.getByTestId('pndBacktestComparisonAfterWindow')).toHaveTextContent(
        '2026-08-03T00:00:00.000Z'
      );
    });

    it('renders the delta, which is the number the approver is deciding on', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonDelta')).toHaveTextContent('117');
    });

    it('says the alert count went down', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonDelta')).toHaveTextContent(/fewer/i);
    });

    it('says the alert count went up', () => {
      renderWithPndProviders(
        <BacktestComparison preview={{ after: { alertCount: 130 }, before }} />
      );

      expect(screen.getByTestId('pndBacktestComparisonDelta')).toHaveTextContent(/more/i);
    });

    it('says there was no change when the counts match', () => {
      renderWithPndProviders(
        <BacktestComparison preview={{ after: { alertCount: 120 }, before }} />
      );

      expect(screen.getByTestId('pndBacktestComparisonDelta')).toHaveTextContent(/no change/i);
    });

    it('renders a genuine zero as zero, because zero alerts is a real result', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after: { alertCount: 0 }, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent('0');
    });
  });

  // Two reasons a side can be unmeasured, and they call for different reactions: nothing to
  // backtest, or a preview that never finished. `notMeasured` carries which one rather than leaving
  // the approver to infer it from two absent numbers.
  describe('an unmeasured backtest says why', () => {
    const notMeasured =
      'This action rewrites no rule query, so there was nothing to backtest: only a query change alters which documents the rule matches.';

    it('renders the reason the workflow gave in place of the generic copy', () => {
      renderWithPndProviders(
        <BacktestComparison preview={{ after: {}, before: {}, notMeasured }} />
      );

      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toHaveTextContent(
        /nothing to backtest/
      );
    });

    // A preview object carrying only a reason is still not a backtest, so the warning has to stay.
    it('still says no backtest is available when only a reason was carried', () => {
      renderWithPndProviders(
        <BacktestComparison preview={{ after: {}, before: {}, notMeasured }} />
      );

      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toBeInTheDocument();
    });

    it('still marks each side as not measured beside the reason', () => {
      renderWithPndProviders(
        <BacktestComparison preview={{ after: {}, before: {}, notMeasured }} />
      );

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent(
        /not measured/i
      );
    });

    it('drops the warning once a side really was measured', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after, before, notMeasured }} />);

      expect(screen.queryByTestId('pndBacktestComparisonUnavailable')).not.toBeInTheDocument();
    });
  });

  describe('a partial preview degrades honestly', () => {
    it('marks a missing side as not measured', () => {
      renderWithPndProviders(<BacktestComparison preview={{ before }} />);

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent(
        /not measured/i
      );
    });

    it('marks a side with no alert count as not measured', () => {
      renderWithPndProviders(<BacktestComparison preview={{ after: {}, before }} />);

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent(
        /not measured/i
      );
    });

    it('marks a non-numeric alert count as not measured, because the value is model-authored', () => {
      renderWithPndProviders(
        <BacktestComparison
          preview={{ after: { alertCount: 'lots' as unknown as number }, before }}
        />
      );

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent(
        /not measured/i
      );
    });

    it('omits the delta when one side was not measured', () => {
      renderWithPndProviders(<BacktestComparison preview={{ before }} />);

      expect(screen.queryByTestId('pndBacktestComparisonDelta')).not.toBeInTheDocument();
    });

    it('still renders the measured side', () => {
      renderWithPndProviders(<BacktestComparison preview={{ before }} />);

      expect(screen.getByTestId('pndBacktestComparisonBeforeCount')).toHaveTextContent('120');
    });

    it('omits a window that was not reported rather than rendering an empty range', () => {
      renderWithPndProviders(<BacktestComparison preview={{ before: { alertCount: 5 } }} />);

      expect(screen.queryByTestId('pndBacktestComparisonBeforeWindow')).not.toBeInTheDocument();
    });
  });
});
