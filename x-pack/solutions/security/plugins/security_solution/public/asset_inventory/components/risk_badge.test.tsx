/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';
import { screen, render, cleanup, fireEvent } from '@testing-library/react';
import { RiskSeverity } from '../../../common/search_strategy';
import { RiskBadge } from './risk_badge';

describe('AssetInventory', () => {
  describe('RiskBadge', () => {
    beforeEach(() => {
      cleanup();
    });

    it('renders unknown risk with 0 risk score', async () => {
      render(<RiskBadge risk={0} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('0');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Unknown);
    });
    it('renders unknown risk with 19 risk score', async () => {
      render(<RiskBadge risk={19} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('19');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Unknown);
    });
    it('renders low risk with 20 risk score', async () => {
      render(<RiskBadge risk={20} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('20');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Low);
    });
    it('renders low risk with 39 risk score', async () => {
      render(<RiskBadge risk={39} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('39');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Low);
    });
    it('renders moderate risk with 40 risk score', async () => {
      render(<RiskBadge risk={40} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('40');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Moderate);
    });
    it('renders moderate risk with 69 risk score', async () => {
      render(<RiskBadge risk={69} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('69');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Moderate);
    });
    it('renders high risk with 70 risk score', async () => {
      render(<RiskBadge risk={70} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('70');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.High);
    });
    it('renders high risk with 89 risk score', async () => {
      render(<RiskBadge risk={89} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('89');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.High);
    });
    it('renders critical risk with 90 risk score', async () => {
      render(<RiskBadge risk={90} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('90');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Critical);
    });
    it('renders critical risk with 100 risk score', async () => {
      render(<RiskBadge risk={100} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('100');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Critical);
    });
    it('renders critical risk with risk score over limit (100)', async () => {
      render(<RiskBadge risk={400} data-test-subj="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('400');

      fireEvent.mouseOver(badge.parentElement as Node);
      await waitForEuiToolTipVisible();

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(RiskSeverity.Critical);
    });
  });
});
