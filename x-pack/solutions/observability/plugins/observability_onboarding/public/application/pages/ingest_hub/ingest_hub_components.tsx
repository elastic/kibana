/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiCard, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';

const COMPACT_LOGO_SIZE = 16;
const COMPACT_LOGO_BG_PADDING = 6;

const LOGO_SIZE = 24;
const LOGO_BG_PADDING = 8;

/** Same padding as integration cards; 16px image matching card logos at smaller size. */
const LIST_LOGO_SIZE = 16;
const LIST_LOGO_BG_PADDING = LOGO_BG_PADDING;
const CARD_PADDING_PX = 16;

export type CardLogoIconSize = 'default' | 'compact' | 'list';

export const CardLogoIcon: React.FC<{
  src: string;
  alt: string;
  /** `default`: integration cards. `list`: same treatment at 16×16. `compact`: dense legacy row. */
  size?: CardLogoIconSize;
}> = ({ src, alt, size = 'default' }) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    setErrored(false);
  }, [src]);
  const isCompact = size === 'compact';
  const isList = size === 'list';
  const logoPx = isList ? LIST_LOGO_SIZE : isCompact ? COMPACT_LOGO_SIZE : LOGO_SIZE;
  const padPx = isList
    ? LIST_LOGO_BG_PADDING
    : isCompact
    ? COMPACT_LOGO_BG_PADDING
    : LOGO_BG_PADDING;
  const cornerRadius = isCompact && !isList ? Math.round((COMPACT_LOGO_SIZE / LOGO_SIZE) * 8) : 8;
  const fallbackIconSize = isCompact || isList ? 's' : 'm';
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: logoPx + padPx * 2,
    height: logoPx + padPx * 2,
    borderRadius: cornerRadius,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
  };

  useEffect(() => {
    if (errored) return;
    const img = imgRef.current;
    if (!img) return;
    const onErr = () => setErrored(true);
    img.addEventListener('error', onErr);
    return () => img.removeEventListener('error', onErr);
  }, [src, errored, logoPx]);

  if (errored) {
    return (
      <div style={wrapperStyle}>
        <EuiIcon type="logoElastic" size={fallbackIconSize} color="text" />
      </div>
    );
  }
  return (
    <div style={wrapperStyle}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{ width: logoPx, height: logoPx, objectFit: 'contain' }}
      />
    </div>
  );
};

export const IntegrationCard: React.FC<{
  name: string;
  description?: string;
  logoDomain: string;
  logoUrl?: string;
  badge?: string;
  centerAlign?: boolean;
  layout?: 'vertical' | 'horizontal';
  onClick?: () => void;
}> = ({ name, description, logoUrl, badge, layout = 'vertical', onClick }) => {
  const { euiTheme } = useEuiTheme();
  const logoSrc = logoUrl ?? '';
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {badge && (
        <EuiBadge
          color="hollow"
          css={css`
            position: absolute;
            top: 8px;
            left: 8px;
            z-index: 1;
          `}
        >
          {badge}
        </EuiBadge>
      )}
      <EuiCard
        title={name}
        titleElement="h4"
        titleSize="xs"
        description={description ? undefined : ''}
        icon={<CardLogoIcon src={logoSrc} alt={`${name} logo`} />}
        layout={layout}
        hasBorder
        paddingSize="none"
        onClick={onClick}
        css={css`
          border-radius: 6px;
          box-shadow: ${euiTheme.shadows.s};
          padding: ${CARD_PADDING_PX}px;
          ${badge ? `padding-top: ${CARD_PADDING_PX + 24}px;` : ''}
          height: 100%;
          overflow: visible;
          cursor: pointer;
          transition: box-shadow 150ms ease-in;
          &:hover,
          &:focus {
            box-shadow: ${euiTheme.shadows.m};
          }
          .euiCard__top {
            display: flex;
            justify-content: center;
            ${layout === 'horizontal'
              ? 'margin-bottom: 0; margin-inline-end: 16px; flex-shrink: 0; align-self: flex-start;'
              : 'margin-bottom: 12px;'}
          }
          .euiCard__content {
            text-align: ${layout === 'horizontal' ? 'left' : 'center'};
            min-width: 0;
            justify-content: center;
          }
          .euiCard__content,
          .euiCard__children {
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .euiCard__title {
            font-family: ${euiTheme.font.family};
            font-weight: ${euiTheme.font.weight.bold};
            color: ${euiTheme.colors.text};
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      >
        <EuiText
          size="s"
          color="subdued"
          style={{ marginTop: 4, marginBottom: 0 }}
          css={css`
            min-height: 2.8em;
            p {
              margin-bottom: 0;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          `}
        >
          {description || '\u00A0'}
        </EuiText>
      </EuiCard>
    </div>
  );
};

const CompactLogoIcon: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    setErrored(false);
  }, [src]);
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    height: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: Math.round((COMPACT_LOGO_SIZE / LOGO_SIZE) * 8),
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    flexShrink: 0,
  };

  useEffect(() => {
    if (errored) return;
    const img = imgRef.current;
    if (!img) return;
    const onErr = () => setErrored(true);
    img.addEventListener('error', onErr);
    return () => img.removeEventListener('error', onErr);
  }, [src, errored]);

  if (errored) {
    return (
      <div style={wrapperStyle}>
        <EuiIcon type="logoElastic" size="s" color="text" />
      </div>
    );
  }
  return (
    <div style={wrapperStyle}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{ width: COMPACT_LOGO_SIZE, height: COMPACT_LOGO_SIZE, objectFit: 'contain' }}
      />
    </div>
  );
};

export const CompactIntegrationCard: React.FC<{
  name: string;
  description?: string;
  badge?: string;
  logoUrl?: string;
  logoDomain: string;
  onClick?: () => void;
}> = ({ name, description, badge, logoUrl, onClick }) => {
  const { euiTheme } = useEuiTheme();
  const logoSrc = logoUrl ?? '';
  const titleContent = badge ? (
    <span
      css={css`
        display: flex;
        align-items: center;
        gap: 8px;
      `}
    >
      {name}
      <EuiBadge
        color="default"
        css={css`
          font-size: 10px;
          line-height: 1;
          padding: 0 4px;
          height: 18px;
          .euiBadge__content {
            padding: 0;
          }
          .euiBadge__text {
            padding: 0;
          }
        `}
      >
        {badge}
      </EuiBadge>
    </span>
  ) : (
    name
  );
  return (
    <EuiCard
      title={titleContent}
      titleElement="h4"
      titleSize="xs"
      description=""
      icon={<CompactLogoIcon src={logoSrc} alt={`${name} logo`} />}
      layout="horizontal"
      hasBorder
      paddingSize="none"
      onClick={onClick}
      css={css`
        border-radius: 6px;
        padding: 12px;
        height: 100%;
        min-height: 74px;
        cursor: pointer;
        .euiCard__top {
          min-width: 0;
          flex-shrink: 0;
          margin-block-end: 0 !important;
          margin-inline-end: 12px !important;
        }
        .euiCard__content {
          min-width: 0;
          overflow: hidden;
          justify-content: flex-start !important;
        }
        .euiCard__main {
          min-width: 0;
          overflow: hidden;
        }
        .euiCard__content,
        .euiCard__children {
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .euiCard__title {
          min-width: 0;
          overflow: hidden;
          font-family: ${euiTheme.font.family};
          font-weight: ${euiTheme.font.weight.bold};
          color: ${euiTheme.colors.text};
          margin-block-end: 0 !important;
        }
        .euiCard__title h4 {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .euiCard__description {
          display: none;
        }
        .euiCard__children {
          margin-block-start: 4px !important;
          padding-block-start: 0 !important;
        }
        & [class*='euiCard__description'] {
          margin-block-start: 4px !important;
        }
      `}
    >
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.4em;
          margin-block-start: 4px !important;
        `}
      >
        {description || '\u00A0'}
      </EuiText>
    </EuiCard>
  );
};
