/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  euiShadowHover,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';
import { nightshiftStatusCardTransition } from '../common/transition';

type SignificantEventStatusGroup = 'needsAction' | 'resolved';

interface SignificantEventStatusCardProps {
  count: number;
  label: string;
  onClick: () => void;
  status: SignificantEventStatusGroup;
  testSubj: string;
}

function SignificantEventStatusCard({
  count,
  label,
  onClick,
  status,
  testSubj,
}: SignificantEventStatusCardProps) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const isNeedsAction = status === 'needsAction';
  const isInteractive = count > 0;
  const ebtProps = isInteractive
    ? getEbtProps({
        action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNIFICANT_EVENTS,
        element: NIGHTSHIFT_EBT_ELEMENTS.STATUS_SUMMARY,
        detail: isNeedsAction
          ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
          : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
      })
    : {};

  return (
    <EuiPanel
      aria-label={`${label}: ${count}`}
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.size.s};
        box-sizing: border-box;
        padding: ${euiTheme.size.m};

        ${isInteractive
          ? css`
              && {
                box-shadow: none;
                cursor: pointer;
                transform: none;
                transition: ${nightshiftStatusCardTransition(euiTheme)};
              }

              &&:hover,
              &&:focus {
                background: ${euiTheme.colors.backgroundBasePlain};
                border-color: ${euiTheme.border.color};
                transform: none;
                ${euiShadowHover(euiThemeContext, 's')}
              }

              &&:focus {
                outline: none;
              }

              &&:focus-visible {
                outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
                outline-offset: ${euiTheme.border.width.thin};
              }
            `
          : ''}
      `}
      data-test-subj={testSubj}
      {...ebtProps}
      hasBorder={false}
      hasShadow={false}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
              if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
                return;
              }
              keyboardEvent.preventDefault();
              keyboardEvent.currentTarget.click();
            }
          : undefined
      }
      onMouseDown={
        isInteractive ? (mouseEvent: React.MouseEvent) => mouseEvent.preventDefault() : undefined
      }
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText
            component="span"
            size="s"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            css={css`
              height: ${euiTheme.size.xl};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiAvatar
                aria-hidden={true}
                color={
                  isNeedsAction
                    ? euiTheme.colors.backgroundLightDanger
                    : euiTheme.colors.backgroundLightSuccess
                }
                iconColor={isNeedsAction ? 'danger' : 'success'}
                iconType={isNeedsAction ? 'faceNeutral' : 'faceHappy'}
                name={label}
                size="m"
                type="user"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span
                css={css`
                  align-items: center;
                  color: ${euiTheme.colors.textHeading};
                  display: inline-flex;
                  font-size: calc(${euiTheme.size.xl} - ${euiTheme.size.xs});
                  font-weight: ${euiTheme.font.weight.medium};
                  height: ${euiTheme.size.xl};
                  line-height: calc(${euiTheme.size.xl} - ${euiTheme.size.xs});
                `}
              >
                {count}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export interface SignificantEventStatusesProps {
  needsActionCount: number;
  onNeedsActionClick: () => void;
  onResolvedClick: () => void;
  resolvedCount: number;
}

export function SignificantEventStatuses({
  needsActionCount,
  onNeedsActionClick,
  onResolvedClick,
  resolvedCount,
}: SignificantEventStatusesProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <SignificantEventStatusCard
            count={needsActionCount}
            label={i18n.translate('xpack.nightshift.summary.needActionLabel', {
              defaultMessage: 'Need action',
            })}
            onClick={onNeedsActionClick}
            status="needsAction"
            testSubj="o11yNightshiftNeedActionSummaryCard"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <SignificantEventStatusCard
            count={resolvedCount}
            label={i18n.translate('xpack.nightshift.summary.resolvedLabel', {
              defaultMessage: 'Resolved',
            })}
            onClick={onResolvedClick}
            status="resolved"
            testSubj="o11yNightshiftResolvedSummaryCard"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
