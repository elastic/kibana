/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IntroBannerVideo, NIGHTSHIFT_PROMO_VIDEO_ID } from './intro_banner_video';

jest.mock('./nightshift_promo_poster.jpg', () => 'nightshift-promo-poster.jpg');

const PREVIEW_SRC = `https://play.vidyard.com/${NIGHTSHIFT_PROMO_VIDEO_ID}.html?autoplay=1&muted=1&hidden_controls=1`;
const EXPANDED_SRC = `https://play.vidyard.com/${NIGHTSHIFT_PROMO_VIDEO_ID}.html?autoplay=1`;

function mockPrefersReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

const renderVideo = () =>
  render(
    <I18nProvider>
      <div style={{ position: 'relative', width: 425, height: 239 }}>
        <IntroBannerVideo />
      </div>
    </I18nProvider>
  );

describe('IntroBannerVideo', () => {
  beforeEach(() => {
    mockPrefersReducedMotion(false);
  });

  it('mounts a muted autoplay preview iframe and swaps to the expanded player', () => {
    renderVideo();

    const preview = screen.getByTestId('nightshiftOnboardingIntroVideoPreview');
    const previewIframe = within(preview).getByTitle('Nightshift introduction video');
    expect(previewIframe).toHaveAttribute('src', PREVIEW_SRC);
    expect(screen.queryByTestId('nightshiftOnboardingIntroVideoExpanded')).toBeNull();

    fireEvent.click(preview);

    const expanded = screen.getByTestId('nightshiftOnboardingIntroVideoExpanded');
    expect(within(preview).queryByTitle('Nightshift introduction video')).toBeNull();
    expect(within(expanded).getByTitle('Nightshift introduction video')).toHaveAttribute(
      'src',
      EXPANDED_SRC
    );

    fireEvent.keyDown(screen.getByRole('dialog'), {
      key: 'Escape',
    });
    expect(screen.queryByTestId('nightshiftOnboardingIntroVideoExpanded')).toBeNull();
    expect(within(preview).getByTitle('Nightshift introduction video')).toHaveAttribute(
      'src',
      PREVIEW_SRC
    );
  });

  it('closes the expanded player from the close button without leaving focus on the document body', () => {
    renderVideo();

    const preview = screen.getByTestId('nightshiftOnboardingIntroVideoPreview');
    act(() => {
      preview.focus();
    });
    fireEvent.keyDown(preview, { key: 'Enter' });
    expect(screen.getByTestId('nightshiftOnboardingIntroVideoExpanded')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingIntroVideoClose'));
    expect(screen.queryByTestId('nightshiftOnboardingIntroVideoExpanded')).toBeNull();
    // Without the pre-open blur, EuiFocusTrap restores focus to the preview instead of <body>.
    expect(preview).toHaveFocus();
  });

  it('skips the muted preview iframe when the user prefers reduced motion', () => {
    mockPrefersReducedMotion(true);
    renderVideo();

    const preview = screen.getByTestId('nightshiftOnboardingIntroVideoPreview');
    expect(within(preview).queryByTitle('Nightshift introduction video')).toBeNull();

    fireEvent.click(preview);
    const expanded = screen.getByTestId('nightshiftOnboardingIntroVideoExpanded');
    expect(within(expanded).getByTitle('Nightshift introduction video')).toHaveAttribute(
      'src',
      EXPANDED_SRC
    );
  });
});
