/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { foldChildren } from '../helpers/fold_children';
import { stopRowActivation } from '../helpers/stop_row_activation';
import { QueueRiskBadge } from '../queue_risk_badge';
import * as i18n from '../translations';
import type { QueueDecision, QueueEvent, QueueParent } from '../types';

const HEADER_PADDING_PX = 24;
const CHILD_INDENT_PX = 48;
const TITLE_FONT_SIZE_PX = 14;
const TITLE_LINE_HEIGHT_PX = 20;
const DESC_FONT_SIZE_PX = 13;
const DESC_LINE_HEIGHT_PX = 20;
const SUCCESS_CIRCLE_PX = 20;
const RESOLVED_OPACITY = 0.75;

export interface ThreadGroupCardProps {
  /** Drops card chrome when nested inside a {@link TypeSection} shell. */
  embedded?: boolean;
  getLatestDecision?: (eventId: string) => QueueDecision | undefined;
  headerMetaTrailing?: string;
  headerScore?: number;
  onChildApprovalRequest?: (event: QueueEvent) => void;
  onOpenChat?: (id: string) => void;
  onOpenParent: (parentId: string) => void;
  onSelectChild: (eventId: string) => void;
  parent: QueueParent;
  pendingChildren: readonly QueueEvent[];
  resolvedChildren?: readonly QueueEvent[];
  selectedChildId?: string;
}

/**
 * The group header IS the parent conversation. Children keep their own HITL
 * actions; resolved children demote in place; `+N more` folds after 3.
 */
export const ThreadGroupCard: React.FC<ThreadGroupCardProps> = ({
  embedded = false,
  getLatestDecision,
  headerMetaTrailing,
  headerScore,
  onChildApprovalRequest,
  onOpenChat,
  onOpenParent,
  onSelectChild,
  parent,
  pendingChildren,
  resolvedChildren = [],
  selectedChildId,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasPending = pendingChildren.length > 0;
  const children = hasPending ? [...pendingChildren, ...resolvedChildren] : [];
  const { hiddenCount, visible } = foldChildren({ children, expanded: isExpanded });
  const headerRisk = headerScore ?? parent.riskScore ?? pendingChildren[0]?.riskScore;
  const stateLabel = hasPending ? i18n.WAITING_FOR_INPUT : i18n.INVESTIGATING;

  const onHeaderKeyDown = useCallback(
    (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') {
        return;
      }

      keyEvent.preventDefault();
      onOpenParent(parent.id);
    },
    [onOpenParent, parent.id]
  );

  const onHeaderChat = useCallback(
    (clickEvent: React.MouseEvent) => {
      stopRowActivation(clickEvent);
      onOpenChat?.(parent.id);
    },
    [onOpenChat, parent.id]
  );

  const childRowCss = useMemo(
    () => css`
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      padding: ${euiTheme.size.m} ${HEADER_PADDING_PX}px ${euiTheme.size.m} ${CHILD_INDENT_PX}px;
      position: relative;
      transition: background ${euiTheme.animation.fast} ease;

      &::before {
        background: ${euiTheme.border.color};
        content: '';
        block-size: ${euiTheme.border.width.thin};
        inset-inline-end: 0;
        inset-inline-start: ${CHILD_INDENT_PX}px;
        inset-block-start: 0;
        position: absolute;
      }

      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `,
    [euiTheme]
  );

  return (
    <div
      css={css`
        background: ${euiTheme.colors.emptyShade};
        overflow: hidden;
        ${embedded
          ? ''
          : `border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color}; border-radius: ${euiTheme.size.s};`}
      `}
      data-test-subj="pndQueueThreadGroupCard"
    >
      <div
        aria-label={i18n.openParentAriaLabel(parent.title)}
        css={css`
          align-items: flex-start;
          cursor: pointer;
          display: flex;
          gap: ${euiTheme.size.l};
          padding: ${HEADER_PADDING_PX}px;
          text-align: left;
          transition: background ${euiTheme.animation.fast} ease;

          &:hover {
            background: ${euiTheme.colors.backgroundBaseInteractiveHover};
          }
        `}
        data-test-subj="pndQueueThreadGroupHeader"
        onClick={() => onOpenParent(parent.id)}
        onKeyDown={onHeaderKeyDown}
        role="button"
        tabIndex={0}
      >
        {hasPending && headerRisk != null && <QueueRiskBadge score={headerRisk} />}

        <div
          css={css`
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: ${euiTheme.size.xs};
            min-inline-size: 0;
          `}
        >
          <div
            css={css`
              align-items: center;
              display: flex;
              gap: ${euiTheme.size.s};
              justify-content: space-between;
              min-inline-size: 0;
            `}
          >
            <div
              css={css`
                align-items: center;
                display: flex;
                gap: ${euiTheme.size.s};
                min-inline-size: 0;
              `}
            >
              <EuiBadge color="hollow">{stateLabel}</EuiBadge>
              {headerMetaTrailing != null && (
                <p
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                    font-size: 12px;
                    line-height: 16px;
                    margin: 0;
                    white-space: nowrap;
                  `}
                >
                  · {headerMetaTrailing}
                </p>
              )}
            </div>

            {onOpenChat != null && (
              <EuiToolTip content={i18n.OPEN_IN_CHAT} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={i18n.openInChatAriaLabel(parent.title)}
                  color="text"
                  data-test-subj="pndQueueThreadGroupOpenInChat"
                  iconType="productAgent"
                  onClick={onHeaderChat}
                  onKeyDown={stopRowActivation}
                  size="s"
                />
              </EuiToolTip>
            )}
          </div>

          <p
            css={css`
              color: ${euiTheme.colors.textHeading};
              font-size: ${TITLE_FONT_SIZE_PX}px;
              font-weight: ${euiTheme.font.weight.semiBold};
              line-height: ${TITLE_LINE_HEIGHT_PX}px;
              margin: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {parent.title}
          </p>
          <p
            css={css`
              color: ${euiTheme.colors.textSubdued};
              font-size: ${DESC_FONT_SIZE_PX}px;
              line-height: ${DESC_LINE_HEIGHT_PX}px;
              margin: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {parent.summary}
          </p>
        </div>
      </div>

      {visible.map((child) => {
        const decision = getLatestDecision?.(child.id);
        const isResolved = decision != null || !pendingChildren.some(({ id }) => id === child.id);

        if (isResolved) {
          return (
            <div
              aria-label={child.title}
              css={[
                childRowCss,
                css`
                  opacity: ${RESOLVED_OPACITY};
                `,
                selectedChildId === child.id
                  ? css`
                      background: ${euiTheme.colors.backgroundBasePrimary};
                    `
                  : undefined,
              ]}
              data-test-subj="pndQueueThreadGroupResolvedRow"
              key={child.id}
              onClick={() => onSelectChild(child.id)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') {
                  return;
                }

                keyEvent.preventDefault();
                onSelectChild(child.id);
              }}
              role="button"
              tabIndex={0}
            >
              <span
                aria-hidden
                css={css`
                  align-items: center;
                  background: ${euiTheme.colors.backgroundBaseSuccess};
                  block-size: ${SUCCESS_CIRCLE_PX}px;
                  border-radius: 50%;
                  color: ${euiTheme.colors.textSuccess};
                  display: inline-flex;
                  flex-shrink: 0;
                  inline-size: ${SUCCESS_CIRCLE_PX}px;
                  justify-content: center;
                `}
              >
                <EuiIcon aria-hidden={true} size="s" type="check" />
              </span>
              <p
                css={css`
                  color: ${euiTheme.colors.textHeading};
                  flex-shrink: 0;
                  font-size: ${TITLE_FONT_SIZE_PX}px;
                  font-weight: ${euiTheme.font.weight.semiBold};
                  line-height: ${TITLE_LINE_HEIGHT_PX}px;
                  margin: 0;
                  white-space: nowrap;
                `}
              >
                {child.title}
              </p>
              <p
                css={css`
                  color: ${euiTheme.colors.textSubdued};
                  flex: 1;
                  font-size: ${DESC_FONT_SIZE_PX}px;
                  line-height: ${DESC_LINE_HEIGHT_PX}px;
                  margin: 0;
                  min-inline-size: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {child.description}
              </p>
              <p
                css={css`
                  color: ${euiTheme.colors.textSuccess};
                  flex-shrink: 0;
                  font-size: ${DESC_FONT_SIZE_PX}px;
                  font-weight: ${euiTheme.font.weight.medium};
                  line-height: ${DESC_LINE_HEIGHT_PX}px;
                  margin: 0;
                  white-space: nowrap;
                `}
              >
                {decision?.label}
              </p>
            </div>
          );
        }

        return (
          <div
            aria-label={`${child.title}, ${child.caseId}`}
            css={[
              childRowCss,
              selectedChildId === child.id
                ? css`
                    background: ${euiTheme.colors.backgroundBasePrimary};
                  `
                : undefined,
            ]}
            data-test-subj="pndQueueThreadGroupChildRow"
            key={child.id}
            onClick={() => onSelectChild(child.id)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') {
                return;
              }

              keyEvent.preventDefault();
              onSelectChild(child.id);
            }}
            role="button"
            tabIndex={0}
          >
            {child.riskScore != null && <QueueRiskBadge score={child.riskScore} size="s" />}
            <p
              css={css`
                color: ${euiTheme.colors.textHeading};
                flex-shrink: 0;
                font-size: ${TITLE_FONT_SIZE_PX}px;
                font-weight: ${euiTheme.font.weight.semiBold};
                line-height: ${TITLE_LINE_HEIGHT_PX}px;
                margin: 0;
                white-space: nowrap;
              `}
            >
              {child.title}
            </p>
            <p
              css={css`
                color: ${euiTheme.colors.textSubdued};
                flex: 1;
                font-size: ${DESC_FONT_SIZE_PX}px;
                line-height: ${DESC_LINE_HEIGHT_PX}px;
                margin: 0;
                min-inline-size: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              {child.description}
            </p>
            <div
              css={css`
                align-items: center;
                display: flex;
                flex-shrink: 0;
                gap: ${euiTheme.size.xs};
              `}
            >
              {child.actionLabel != null && (
                <EuiButtonEmpty
                  color={child.actionTone ?? 'primary'}
                  data-test-subj="pndQueueThreadGroupChildPrimaryAction"
                  flush="both"
                  iconType={child.actionIcon}
                  onClick={(clickEvent: React.MouseEvent) => {
                    stopRowActivation(clickEvent);
                    onChildApprovalRequest?.(child);
                  }}
                  onKeyDown={stopRowActivation}
                  size="xs"
                >
                  {child.actionLabel}
                </EuiButtonEmpty>
              )}
            </div>
          </div>
        );
      })}

      {hiddenCount > 0 && !isExpanded && (
        <button
          css={css`
            background: none;
            border: none;
            color: ${euiTheme.colors.textPrimary};
            cursor: pointer;
            display: block;
            font-size: ${DESC_FONT_SIZE_PX}px;
            font-weight: ${euiTheme.font.weight.medium};
            inline-size: 100%;
            line-height: ${DESC_LINE_HEIGHT_PX}px;
            padding: ${euiTheme.size.m} ${HEADER_PADDING_PX}px ${euiTheme.size.m}
              ${CHILD_INDENT_PX}px;
            position: relative;
            text-align: left;

            &::before {
              background: ${euiTheme.border.color};
              block-size: ${euiTheme.border.width.thin};
              content: '';
              inset-block-start: 0;
              inset-inline-end: 0;
              inset-inline-start: ${CHILD_INDENT_PX}px;
              position: absolute;
            }

            &:hover {
              text-decoration: underline;
            }
          `}
          data-test-subj="pndQueueThreadGroupShowMore"
          onClick={() => setIsExpanded(true)}
          type="button"
        >
          {i18n.showMoreButtonLabel(hiddenCount)}
        </button>
      )}
    </div>
  );
};
