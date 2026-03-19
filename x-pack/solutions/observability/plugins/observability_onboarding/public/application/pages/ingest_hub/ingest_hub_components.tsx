/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiCard, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';

const COMPACT_LOGO_SIZE = 20;
const COMPACT_LOGO_BG_PADDING = 6;

const LOGO_SIZE = 24;
const LOGO_BG_PADDING = 8;
const CARD_PADDING_PX = 16;

export const CardLogoIcon: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = useState(false);
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: LOGO_SIZE + LOGO_BG_PADDING * 2,
    height: LOGO_SIZE + LOGO_BG_PADDING * 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: 12,
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
  };
  if (errored) {
    return (
      <div style={wrapperStyle}>
        <EuiIcon type="logoElastic" size="m" color="text" />
      </div>
    );
  }
  return (
    <div style={wrapperStyle}>
      <img
        src={src}
        alt={alt}
        style={{ width: LOGO_SIZE, height: LOGO_SIZE, objectFit: 'contain' }}
        onError={() => setErrored(true)}
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
  onClick?: () => void;
}> = ({ name, description, logoUrl, badge, onClick }) => {
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
        layout="vertical"
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
            margin-bottom: 12px;
          }
          .euiCard__content {
            text-align: center;
            min-width: 0;
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
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    height: COMPACT_LOGO_SIZE + COMPACT_LOGO_BG_PADDING * 2,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    borderRadius: 8,
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    flexShrink: 0,
  };
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
        src={src}
        alt={alt}
        style={{ width: COMPACT_LOGO_SIZE, height: COMPACT_LOGO_SIZE, objectFit: 'contain' }}
        onError={() => setErrored(true)}
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
    <span css={css`display: flex; align-items: center; gap: 8px;`}>
      {name}
      <EuiBadge
        color="default"
        css={css`
          font-size: 10px;
          line-height: 1;
          padding: 0 4px;
          height: 18px;
          .euiBadge__content { padding: 0; }
          .euiBadge__text { padding: 0; }
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
        cursor: pointer;
        .euiCard__top {
          min-width: 0;
          flex-shrink: 0;
          margin-block-end: 0 !important;
          margin-inline-end: 12px !important;
        }
        .euiCard__content {
          min-width: 0;
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
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .euiCard__description {
          display: none;
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
        `}
      >
        {description || '\u00A0'}
      </EuiText>
    </EuiCard>
  );
};
