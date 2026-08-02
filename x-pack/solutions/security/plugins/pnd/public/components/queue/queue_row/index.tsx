/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';

import { composeRowAriaLabel } from '../helpers/compose_row_aria_label';
import { stopRowActivation } from '../helpers/stop_row_activation';
import { QueueRiskBadge } from '../queue_risk_badge';
import { QueueRowActionsMenu } from '../queue_row_actions_menu';
import * as i18n from '../translations';
import type { QueueDecision, QueueEvent } from '../types';

const TITLE_FONT_SIZE_PX = 14;
const TITLE_LINE_HEIGHT_PX = 20;
const DESC_FONT_SIZE_PX = 13;
const DESC_LINE_HEIGHT_PX = 20;
const CARD_PADDING_PX = 24;
const DIVIDER_HEIGHT_PX = 16;
const RESOLVED_OPACITY = 0.75;

export interface QueueRowProps {
  event: QueueEvent;
  grouped?: boolean;
  latestDecision?: QueueDecision;
  onOpenChat?: (event: QueueEvent) => void;
  onRequestApproval?: (event: QueueEvent) => void;
  onSelect: () => void;
  onViewLifecycle?: (event: QueueEvent) => void;
  selected: boolean;
}

/**
 * Shared queue row. It proposes; the HITL card decides. States only add or
 * remove affordances — an absent action is a state, not a product variant.
 */
export const QueueRow: React.FC<QueueRowProps> = ({
  event,
  grouped = false,
  latestDecision,
  onOpenChat,
  onRequestApproval,
  onSelect,
  onViewLifecycle,
  selected,
}) => {
  const { euiTheme } = useEuiTheme();
  const { actionIcon, actionLabel, actionTone, caseId, description, riskScore, title } = event;
  const pendingAction = latestDecision == null ? actionLabel : undefined;
  const hasIconActions = onOpenChat != null || onViewLifecycle != null;

  const onKeyDown = useCallback(
    (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') {
        return;
      }

      keyEvent.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  const onPrimaryAction = useCallback(
    (clickEvent: React.MouseEvent) => {
      stopRowActivation(clickEvent);
      onRequestApproval?.(event);
    },
    [event, onRequestApproval]
  );

  const onChat = useCallback(
    (clickEvent: React.MouseEvent) => {
      stopRowActivation(clickEvent);
      onOpenChat?.(event);
    },
    [event, onOpenChat]
  );

  return (
    <div
      aria-current={selected ? 'true' : undefined}
      aria-label={composeRowAriaLabel({ caseId, riskScore, title })}
      css={css`
        align-items: center;
        background: ${selected ? euiTheme.colors.backgroundBasePrimary : 'transparent'};
        box-sizing: border-box;
        cursor: pointer;
        display: flex;
        gap: ${euiTheme.size.l};
        inline-size: 100%;
        opacity: ${latestDecision == null ? 1 : RESOLVED_OPACITY};
        padding: ${CARD_PADDING_PX}px;
        text-align: left;
        transition: background ${euiTheme.animation.fast} ease-in-out;

        ${grouped
          ? css`
              border: none;
              border-block-end: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
              border-radius: 0;

              &:last-child {
                border-block-end: none;
              }
            `
          : css`
              border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
              border-radius: ${euiTheme.size.s};
            `}

        &:hover {
          background: ${selected
            ? euiTheme.colors.backgroundBasePrimary
            : euiTheme.colors.backgroundBaseInteractiveHover};
        }

        &:focus-visible {
          outline: ${euiTheme.focus.width} solid ${euiTheme.colors.primary};
          outline-offset: -${euiTheme.focus.width};
        }
      `}
      data-test-subj="pndQueueRow"
      onClick={onSelect}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      {riskScore != null && <QueueRiskBadge score={riskScore} />}

      <div
        css={css`
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          justify-content: center;
          min-inline-size: 0;
        `}
      >
        <p
          css={css`
            color: ${euiTheme.colors.textHeading};
            font-size: ${TITLE_FONT_SIZE_PX}px;
            font-weight: ${euiTheme.font.weight.semiBold};
            line-height: ${TITLE_LINE_HEIGHT_PX}px;
            margin: 0;
            min-inline-size: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          data-test-subj="pndQueueRowTitle"
        >
          {title}
        </p>

        <p
          css={css`
            color: ${euiTheme.colors.textSubdued};
            font-size: ${DESC_FONT_SIZE_PX}px;
            line-height: ${DESC_LINE_HEIGHT_PX}px;
            margin: 0;
            min-inline-size: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          data-test-subj="pndQueueRowSummary"
        >
          {description}
        </p>
      </div>

      <div
        css={css`
          align-items: center;
          align-self: flex-start;
          block-size: ${TITLE_LINE_HEIGHT_PX}px;
          display: flex;
          flex-shrink: 0;
          gap: ${euiTheme.size.xs};
        `}
      >
        {pendingAction != null && (
          <EuiButtonEmpty
            aria-label={i18n.primaryActionAriaLabel({ label: pendingAction, title })}
            color={actionTone ?? 'primary'}
            data-test-subj="pndQueueRowPrimaryAction"
            flush="both"
            iconType={actionIcon}
            onClick={onPrimaryAction}
            onKeyDown={stopRowActivation}
            size="xs"
          >
            {pendingAction}
          </EuiButtonEmpty>
        )}

        {latestDecision != null && (
          <p
            css={css`
              color: ${euiTheme.colors.textSuccess};
              font-size: ${DESC_FONT_SIZE_PX}px;
              font-weight: ${euiTheme.font.weight.medium};
              line-height: ${DESC_LINE_HEIGHT_PX}px;
              margin: 0;
              white-space: nowrap;
            `}
            data-test-subj="pndQueueRowResult"
          >
            {latestDecision.label}
          </p>
        )}

        {pendingAction != null && hasIconActions && (
          <span
            aria-hidden
            css={css`
              background: ${euiTheme.border.color};
              block-size: ${DIVIDER_HEIGHT_PX}px;
              inline-size: ${euiTheme.border.width.thin};
              margin-inline: ${euiTheme.size.m} ${euiTheme.size.xs};
            `}
            data-test-subj="pndQueueRowActionDivider"
          />
        )}

        {onOpenChat != null && (
          <EuiToolTip content={i18n.OPEN_IN_CHAT} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={i18n.openInChatAriaLabel(title)}
              color="text"
              data-test-subj="pndQueueRowOpenInChatButton"
              iconType="productAgent"
              onClick={onChat}
              onKeyDown={stopRowActivation}
              size="s"
            />
          </EuiToolTip>
        )}

        {onViewLifecycle != null && (
          <QueueRowActionsMenu event={event} onViewLifecycle={onViewLifecycle} />
        )}
      </div>
    </div>
  );
};
