/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
  const { euiTheme } = useEuiTheme();
  const isNeedsAction = status === 'needsAction';
  // The card's only action is to scroll to its list, so it is inert when the list is empty.
  const isInteractive = count > 0;

  return (
    <EuiPanel
      aria-label={`${label}: ${count}`}
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.size.s};
        box-sizing: border-box;
        overflow: hidden;
        padding: ${euiTheme.size.m};

        ${isInteractive
          ? css`
              && {
                transition: background-color ${euiTheme.animation.fast} ease,
                  border-color ${euiTheme.animation.fast} ease;
              }

              &&:hover {
                background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                border-color: ${euiTheme.colors.borderInteractiveFormsHoverPlain};
                box-shadow: none;
                transform: none;
              }

              /* The cards only scroll on click, so suppress EUI's focus shadow/transform
                 (which otherwise leaves a persistent "active" look) and show a focus ring
                 for keyboard users only. */
              &&:focus {
                box-shadow: none;
                outline: none;
                transform: none;
              }

              &&:focus-visible {
                outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
                outline-offset: ${euiTheme.border.width.thin};
              }
            `
          : ''}
      `}
      data-test-subj={testSubj}
      hasBorder={false}
      hasShadow={false}
      onClick={isInteractive ? onClick : undefined}
      // Prevent the card from taking focus on mouse click (it only scrolls, so a
      // lingering focus ring is misleading). Keyboard focus via Tab is preserved.
      onMouseDown={
        isInteractive ? (mouseEvent: React.MouseEvent) => mouseEvent.preventDefault() : undefined
      }
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
                  display: flex;
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
            label={i18n.translate('xpack.observability.nightshift.summary.needActionLabel', {
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
            label={i18n.translate('xpack.observability.nightshift.summary.resolvedLabel', {
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
