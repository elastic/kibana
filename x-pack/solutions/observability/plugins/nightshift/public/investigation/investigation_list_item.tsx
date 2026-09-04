/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedRelative } from '@kbn/i18n-react';
import type { ListInvestigationItem, Severity } from '@kbn/nightshift-investigations-plugin/common';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';
import { nightshiftBackgroundTransition } from '../common/transition';
import {
  getInvestigationPrimaryText,
  getInvestigationRunTimeLabel,
  getInvestigationSubtitleText,
} from './investigation_list_presentation';

const MAX_VISIBLE_ENTITY_CHIPS = 3;

const SEVERITY_DOT_COLOR_KEY: Record<Severity, 'danger' | 'warning' | 'primary' | 'success'> = {
  '80-critical': 'danger',
  '60-high': 'warning',
  '40-medium': 'primary',
  '20-low': 'success',
};

export interface InvestigationListItemProps {
  investigation: ListInvestigationItem;
  isSelected?: boolean;
  onClick?: (investigation: ListInvestigationItem) => void;
}

export function InvestigationListItem({
  investigation,
  isSelected = false,
  onClick,
}: InvestigationListItemProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const handleClick = (clickEvent: React.MouseEvent<HTMLDivElement>) => {
    if (
      clickEvent.target instanceof Element &&
      clickEvent.target.closest('[data-prevent-row-click]')
    ) {
      return;
    }
    if (window.getSelection()?.toString()) {
      return;
    }
    onClick?.(investigation);
  };

  const handleKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (keyboardEvent.target !== keyboardEvent.currentTarget) {
      return;
    }
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault();
      keyboardEvent.currentTarget.click();
    }
  };

  const primaryText = getInvestigationPrimaryText(investigation);
  const subtitleText =
    getInvestigationSubtitleText(investigation) ??
    getInvestigationRunTimeLabel({
      startedAt: investigation.started_at,
      completedAt: investigation.completed_at,
      status: investigation.status,
    });

  const severityDotColorKey =
    investigation.severity != null ? SEVERITY_DOT_COLOR_KEY[investigation.severity] : 'primary';

  return (
    <div
      data-test-subj="nightshiftInvestigationListItem"
      {...(onClick
        ? getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.VIEW_INVESTIGATION,
            element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
            detail: investigation.status,
          })
        : {})}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      css={css`
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        padding: ${euiTheme.size.base};
        ${onClick
          ? `
        cursor: pointer;
        transition: ${nightshiftBackgroundTransition(euiTheme)};

        &:hover {
          background: ${
            isSelected
              ? euiTheme.colors.backgroundBaseInteractiveSelect
              : euiTheme.colors.backgroundBaseSubdued
          };
        }
        `
          : ''}
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        {/* timestamp */}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedRelative value={investigation.created_at} />
          </EuiText>
        </EuiFlexItem>

        {/* headline */}
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              line-height: ${euiTheme.size.l};
            `}
          >
            <p
              className="eui-textTruncate"
              title={primaryText}
              css={css`
                margin: 0;
              `}
            >
              {primaryText}
            </p>
          </EuiText>
        </EuiFlexItem>

        {/* secondary line */}
        {subtitleText && (
          <EuiFlexItem grow={false}>
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                line-height: ${euiTheme.size.base};
              `}
            >
              <p
                className="eui-textTruncate"
                css={css`
                  margin: 0;
                `}
              >
                {subtitleText}
              </p>
            </EuiText>
          </EuiFlexItem>
        )}

        {/* entity chips */}
        <EntityChips
          entities={investigation.impact?.entities}
          severityColorKey={severityDotColorKey}
        />
      </EuiFlexGroup>
    </div>
  );
}

function EntityChips({
  entities,
  severityColorKey,
}: {
  entities?: Array<{ name: string; type?: string }>;
  severityColorKey: 'danger' | 'warning' | 'primary' | 'success';
}): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();

  if (!entities?.length) return null;

  const visible = entities.slice(0, MAX_VISIBLE_ENTITY_CHIPS);
  const overflow = entities.length - visible.length;
  const dotColor = euiTheme.colors[severityColorKey];

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        wrap
        data-prevent-row-click=""
      >
        {visible.map((entity) => {
          const chip = (
            <EuiBadge
              color="hollow"
              data-prevent-row-click=""
              css={css`
                .euiBadge__text {
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                }
              `}
            >
              <span
                aria-hidden={true}
                css={css`
                  color: ${dotColor};
                  font-size: ${euiTheme.size.s};
                  line-height: 1;
                `}
              >
                ●
              </span>
              {entity.name}
            </EuiBadge>
          );

          return (
            <EuiFlexItem key={entity.name} grow={false}>
              {entity.type ? (
                <EuiToolTip content={entity.type}>{chip}</EuiToolTip>
              ) : (
                chip
              )}
            </EuiFlexItem>
          );
        })}
        {overflow > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="xs">
              +{overflow}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
