/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';

export type InfoPanelColor = 'default' | 'primary';

export interface InfoPanelProps {
  title: React.ReactNode;
  titleIcon?: React.ReactNode;
  headerRightContent?: React.ReactNode;
  color?: InfoPanelColor;
  collapsible?: boolean;
  initialCollapsed?: boolean;
  children: React.ReactNode;
}

const getPaletteForColor = (euiTheme: EuiThemeComputed, color: InfoPanelColor) => {
  if (color === 'primary') {
    return {
      panelBackground: euiTheme.colors.backgroundBasePrimary,
      headerBackground: euiTheme.colors.backgroundBasePrimary,
      borderColor: euiTheme.colors.borderBasePrimary,
      showHeaderDivider: false,
    };
  }

  return {
    panelBackground: undefined,
    headerBackground: euiTheme.colors.backgroundBaseSubdued,
    borderColor: undefined,
    showHeaderDivider: true,
  };
};

export const InfoPanel = ({
  title,
  titleIcon,
  headerRightContent,
  color = 'default',
  collapsible = false,
  initialCollapsed = true,
  children,
}: InfoPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const palette = getPaletteForColor(euiTheme, color);
  const bodyId = useGeneratedHtmlId({ prefix: 'infoPanelBody' });

  const [isOpen, setIsOpen] = useState<boolean>(() => (collapsible ? !initialCollapsed : true));

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const panelCss = css`
    padding: 0;
    border-radius: 8px;
    ${palette.panelBackground ? `background: ${palette.panelBackground};` : ''}
    ${palette.borderColor ? `border-color: ${palette.borderColor};` : ''}
  `;

  const headerCss = css`
    background: ${palette.headerBackground};
    padding: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    ${palette.showHeaderDivider && isOpen ? `border-bottom: ${euiTheme.border.thin};` : ''}
    ${collapsible ? 'cursor: pointer;' : ''}
  `;

  const bodyCss = css`
    padding: ${euiTheme.size.m};
  `;

  const handleHeaderClick = collapsible ? toggleOpen : undefined;
  const handleHeaderKeyDown = collapsible
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleOpen();
        }
      }
    : undefined;

  const chevronAriaLabel = isOpen
    ? i18n.translate('xpack.observability.sigeventsOverview.infoPanel.collapseAria', {
        defaultMessage: 'Collapse panel',
      })
    : i18n.translate('xpack.observability.sigeventsOverview.infoPanel.expandAria', {
        defaultMessage: 'Expand panel',
      });

  return (
    <EuiPanel
      hasBorder
      borderRadius="none"
      css={panelCss}
      data-test-subj="sigeventsOverviewInfoPanel"
    >
      <EuiText
        size="s"
        css={headerCss}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        aria-controls={collapsible ? bodyId : undefined}
        data-test-subj={collapsible ? 'sigeventsOverviewInfoPanelToggle' : undefined}
      >
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={1}>
            {titleIcon ? (
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>{titleIcon}</EuiFlexItem>
                <EuiFlexItem grow={true}>{title}</EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              title
            )}
          </EuiFlexItem>
          {headerRightContent ? <EuiFlexItem grow={false}>{headerRightContent}</EuiFlexItem> : null}
          {collapsible ? (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="o11yInfoPanelButton"
                iconType={isOpen ? 'arrowUp' : 'arrowDown'}
                color="text"
                size="xs"
                aria-label={chevronAriaLabel}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  toggleOpen();
                }}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiText>
      {isOpen ? (
        <div id={bodyId} css={bodyCss}>
          {children}
        </div>
      ) : null}
    </EuiPanel>
  );
};
