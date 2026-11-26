/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StatusBadge, type StatusBadgeProps } from '.';

const renderBadge = (props: Partial<StatusBadgeProps> = {}) =>
  render(<StatusBadge isInstalled={false} isFailed={false} {...props} />);

const hoverBadge = () => fireEvent.mouseOver(screen.getByTestId('translation-result'));

describe('StatusBadge', () => {
  describe('installed', () => {
    it('should show "Installed" when the item is installed', () => {
      renderBadge({ isInstalled: true });

      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('should show "Installed" rather than the failure when the item is installed and failed', () => {
      renderBadge({ isInstalled: true, isFailed: true });

      expect(screen.getByText('Installed')).toBeInTheDocument();
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });

    it('should explain the installed state in a tooltip', async () => {
      renderBadge({ isInstalled: true });

      hoverBadge();

      await waitFor(() =>
        expect(screen.getByTestId('installedStatusTooltip')).toHaveTextContent('Installed')
      );
    });
  });

  describe('failed', () => {
    it('should show "Failed" when the item failed', () => {
      renderBadge({ isFailed: true });

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should show the failure message in a tooltip', async () => {
      renderBadge({ isFailed: true, failedMessage: 'Something went wrong' });

      hoverBadge();

      await waitFor(() =>
        expect(screen.getByTestId('failedStatusTooltip')).toHaveTextContent('Something went wrong')
      );
    });

    it('should fall back to the label in the tooltip when there is no failure message', async () => {
      renderBadge({ isFailed: true });

      hoverBadge();

      await waitFor(() =>
        expect(screen.getByTestId('failedStatusTooltip')).toHaveTextContent('Failed')
      );
    });
  });

  describe('translation result', () => {
    it.each([
      ['full', 'Translated'],
      ['partial', 'Partially translated'],
      ['untranslatable', 'Not translated'],
    ] as const)('should show the %s result as "%s"', (translationResult, label) => {
      renderBadge({ translationResult });

      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('should show a missing result as not translated', () => {
      renderBadge({ translationResult: undefined });

      expect(screen.getByText('Not translated')).toBeInTheDocument();
    });

    it('should show the result in a tooltip', async () => {
      renderBadge({ translationResult: 'partial' });

      hoverBadge();

      await waitFor(() =>
        expect(screen.getByTestId('translationStatusTooltip')).toHaveTextContent(
          'Partially translated'
        )
      );
    });

    it('should use the given test subject on the badge', () => {
      renderBadge({ translationResult: 'full', 'data-test-subj': 'translationStatus-full' });

      expect(screen.getByTestId('translationStatus-full')).toHaveTextContent('Translated');
    });
  });
});
