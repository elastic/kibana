/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFocusTrap,
  EuiIcon,
  EuiOverlayMask,
  EuiScreenReaderOnly,
  EuiToolTip,
  keys,
  transparentize,
  useEuiShadow,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import nightshiftPromoPoster from './nightshift_promo_poster.jpg';

/** Vidyard share id for the Nightshift home-page promo video. */
export const NIGHTSHIFT_PROMO_VIDEO_ID = 'EU8nJMgSQEZUpkv6Eg9Wck';

const VIDYARD_PLAYER_ORIGIN = 'https://play.vidyard.com';

/** The expanded 16:9 player fills up to this share of the viewport width and height. */
const EXPANDED_MAX_VIEWPORT_PERCENT = 90;

function buildVidyardPlayerUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `${VIDYARD_PLAYER_ORIGIN}/${NIGHTSHIFT_PROMO_VIDEO_ID}.html?${params.toString()}`;
}

const previewPlayerSrc = buildVidyardPlayerUrl({
  autoplay: '1',
  muted: '1',
  hidden_controls: '1',
});

const expandedPlayerSrc = buildVidyardPlayerUrl({
  autoplay: '1',
});

const previewAriaLabel = i18n.translate('xpack.nightshift.onboarding.introVideoPreviewAriaLabel', {
  defaultMessage: 'Nightshift introduction video. Click to open video player.',
});

const closeButtonAriaLabel = i18n.translate(
  'xpack.nightshift.onboarding.introVideoCloseAriaLabel',
  {
    defaultMessage: 'Close video player',
  }
);

const iframeTitle = i18n.translate('xpack.nightshift.onboarding.introVideoIframeTitle', {
  defaultMessage: 'Nightshift introduction video',
});

/**
 * Intro-banner media: muted autoplay Vidyard preview with hover play chrome;
 * click opens an expanded Vidyard player in a modal.
 */
export function IntroBannerVideo(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const expandedShadow = useEuiShadow('xl');
  const mediaRootRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'nightshiftIntroVideoTitle' });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviewHighlighted, setIsPreviewHighlighted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Clear the hover/focus chrome only — do not blur the trigger before EuiModal
  // mounts, or focus restoration after close will lose the user's place.
  const clearPreviewHighlight = useCallback(() => {
    setIsPreviewHighlighted(false);
  }, []);

  const openExpanded = useCallback(() => {
    clearPreviewHighlight();
    setIsExpanded(true);
  }, [clearPreviewHighlight]);

  const closeExpanded = useCallback(() => {
    clearPreviewHighlight();
    setIsExpanded(false);
  }, [clearPreviewHighlight]);

  const handleMaskClick = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (event.target === maskRef.current) {
        closeExpanded();
      }
    },
    [closeExpanded]
  );

  const handleExpandedKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      closeExpanded();
    }
  };

  const handleMediaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    openExpanded();
  };

  const handlePreviewHighlight = useCallback(() => {
    if (!isExpanded) {
      setIsPreviewHighlighted(true);
    }
  }, [isExpanded]);

  const handlePreviewUnhighlight = useCallback(() => {
    setIsPreviewHighlighted(false);
  }, []);

  const showInlinePreview = !prefersReducedMotion && !isExpanded;

  const mediaRootStyles = css`
    position: absolute;
    inset: 0;
    cursor: pointer;
    overflow: hidden;
    background: ${euiTheme.colors.plainDark};
  `;

  const posterStyles = css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    pointer-events: none;
  `;

  const previewIframeStyles = css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    pointer-events: none;
  `;

  const dimStyles = css`
    position: absolute;
    inset: 0;
    background: ${euiTheme.colors.plainDark};
    opacity: ${isPreviewHighlighted ? 0.45 : 0};
    transition: opacity 160ms ease;
    pointer-events: none;
  `;

  // Dark scrim + textGhost keeps play/close glyphs legible over light poster
  // frames in both light and dark mode (emptyShade + textGhost fails in light).
  const glassIconButtonStyles = css`
    inline-size: 48px;
    block-size: 48px;
    border-radius: 50%;
    background: ${transparentize(euiTheme.colors.plainDark, 0.75)};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: ${euiTheme.colors.textGhost};
    transition: background 160ms ease;

    &:hover,
    &:focus {
      background: ${transparentize(euiTheme.colors.plainDark, 0.6)};
      color: ${euiTheme.colors.textGhost};
    }
  `;

  const playBadgeStyles = css`
    position: absolute;
    z-index: ${euiTheme.levels.content};
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 48px;
    block-size: 48px;
    border-radius: 50%;
    background: ${transparentize(euiTheme.colors.plainDark, 0.75)};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: ${euiTheme.colors.textGhost};
    transform: translate(-50%, -50%);
    opacity: ${isPreviewHighlighted ? 1 : 0};
    transition: opacity 160ms ease;
    pointer-events: none;

    svg {
      transform: translateX(1px);
    }
  `;

  const expandedPanelStyles = css`
    ${expandedShadow};
    position: relative;
    width: min(${EXPANDED_MAX_VIEWPORT_PERCENT}vw, ${(EXPANDED_MAX_VIEWPORT_PERCENT * 16) / 9}vh);
    aspect-ratio: 16 / 9;
    background: ${euiTheme.colors.plainDark};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;

  const closeButtonStyles = css`
    ${glassIconButtonStyles};
    position: absolute;
    z-index: ${euiTheme.levels.flyout};
    top: ${euiTheme.size.s};
    right: ${euiTheme.size.s};
  `;

  const expandedIframeStyles = css`
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  `;

  return (
    <>
      <div
        ref={mediaRootRef}
        css={mediaRootStyles}
        role="button"
        tabIndex={0}
        aria-label={previewAriaLabel}
        data-test-subj="nightshiftOnboardingIntroVideoPreview"
        onClick={handleMediaClick}
        onMouseEnter={handlePreviewHighlight}
        onMouseLeave={handlePreviewUnhighlight}
        onFocus={handlePreviewHighlight}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            handlePreviewUnhighlight();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === keys.ENTER || event.key === ' ') {
            event.preventDefault();
            openExpanded();
          }
        }}
      >
        <img css={posterStyles} src={nightshiftPromoPoster} alt="" aria-hidden={true} />
        {showInlinePreview ? (
          <iframe
            css={previewIframeStyles}
            src={previewPlayerSrc}
            title={iframeTitle}
            allow="autoplay"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
            aria-hidden={true}
            tabIndex={-1}
          />
        ) : null}
        <div css={dimStyles} aria-hidden={true} />
        <div
          css={playBadgeStyles}
          aria-hidden={true}
          data-test-subj="nightshiftOnboardingIntroVideoPlay"
        >
          <EuiIcon type="play" size="m" aria-hidden={true} />
        </div>
      </div>

      {isExpanded ? (
        <EuiOverlayMask maskRef={maskRef} data-test-subj="nightshiftOnboardingIntroVideoMask">
          <EuiFocusTrap scrollLock preventScrollOnFocus onClickOutside={handleMaskClick}>
            {/* Escape is handled on the dialog itself, as EuiModal does. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div
              css={expandedPanelStyles}
              role="dialog"
              aria-modal={true}
              aria-labelledby={modalTitleId}
              tabIndex={0}
              onKeyDown={handleExpandedKeyDown}
              data-test-subj="nightshiftOnboardingIntroVideoExpanded"
            >
              <EuiScreenReaderOnly>
                <h2 id={modalTitleId}>{iframeTitle}</h2>
              </EuiScreenReaderOnly>
              <EuiToolTip content={closeButtonAriaLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  css={closeButtonStyles}
                  type="button"
                  display="empty"
                  color="text"
                  size="m"
                  iconType="cross"
                  aria-label={closeButtonAriaLabel}
                  data-test-subj="nightshiftOnboardingIntroVideoClose"
                  onClick={closeExpanded}
                />
              </EuiToolTip>
              <iframe
                css={expandedIframeStyles}
                src={expandedPlayerSrc}
                title={iframeTitle}
                allowFullScreen={true}
                allow="autoplay; fullscreen"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </EuiFocusTrap>
        </EuiOverlayMask>
      ) : null}
    </>
  );
}
