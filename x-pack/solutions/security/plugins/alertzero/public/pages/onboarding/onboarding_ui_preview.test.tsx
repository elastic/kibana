/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { OnboardingUiPreview } from './onboarding_ui_preview';
import * as i18n from './translations';

const renderPreview = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <OnboardingUiPreview />
      </EuiProvider>
    </I18nProvider>
  );

const selectedTabLabel = () =>
  screen
    .getAllByRole('tab')
    .find((tab) => tab.getAttribute('aria-selected') === 'true')
    ?.getAttribute('aria-label');

describe('OnboardingUiPreview', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('rotates to the next slide after the auto-advance interval', () => {
    renderPreview();
    expect(selectedTabLabel()).toBe(i18n.PREVIEW_SLIDES[0].label);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(selectedTabLabel()).toBe(i18n.PREVIEW_SLIDES[1].label);
  });

  it('holds the current slide while the panel is hovered', () => {
    renderPreview();
    const panel = screen.getByTestId('alertZeroOnboardingUiPreview');

    fireEvent.mouseEnter(panel);
    act(() => {
      jest.advanceTimersByTime(18000);
    });
    expect(selectedTabLabel()).toBe(i18n.PREVIEW_SLIDES[0].label);

    fireEvent.mouseLeave(panel);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(selectedTabLabel()).toBe(i18n.PREVIEW_SLIDES[1].label);
  });

  describe('tab keyboard navigation', () => {
    const lastIndex = i18n.PREVIEW_SLIDES.length - 1;

    it('wraps to the last tab on ArrowLeft from the first', () => {
      renderPreview();
      fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'ArrowLeft' });

      const tabs = screen.getAllByRole('tab');
      expect(tabs[lastIndex]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[lastIndex]).toHaveFocus();
    });

    it('jumps to the last and first tabs with End and Home', () => {
      renderPreview();
      fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'End' });
      expect(screen.getAllByRole('tab')[lastIndex]).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(screen.getAllByRole('tab')[lastIndex], { key: 'Home' });
      expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
      expect(screen.getAllByRole('tab')[0]).toHaveFocus();
    });

    it('only the selected tab is in the tab order', () => {
      renderPreview();
      screen.getAllByRole('tab').forEach((tab, index) => {
        expect(tab).toHaveAttribute('tabindex', index === 0 ? '0' : '-1');
      });
    });
  });
});
