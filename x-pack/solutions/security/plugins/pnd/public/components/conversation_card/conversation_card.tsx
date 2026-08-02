/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { PndProposalRow } from '@kbn/pnd-common';

import { getHitlActionIcon } from '../hitl_action_card/helpers/get_hitl_action_icon';
import { getHitlTone } from '../hitl_action_card/helpers/get_hitl_tone';
import { buildConversationSearch } from '../../pages/chats/helpers/conversation_search_params';
import { primaryActionLabel } from './helpers/primary_action_label';
import { RiskScoreBadge } from './risk_score_badge';
import { RowActionsMenu } from './row_actions_menu';
import * as i18n from './translations';

/** The prototype's card metrics, which are finer-grained than the EUI size scale. */
const CARD_PADDING_PX = 24;
const TITLE_FONT_SIZE_PX = 14;
const TITLE_LINE_HEIGHT_PX = 20;
const SUMMARY_FONT_SIZE_PX = 13;
const SUMMARY_LINE_HEIGHT_PX = 20;
/**
 * Pins the actions to the **title's** line box rather than to the card's height, so the taller EUI
 * buttons cannot inflate the card and the trailing controls top-align with the title
 * (2026-08-18 — *"revoke and trailing icons top-align with the title"*).
 */
const ACTIONS_HEIGHT_PX = TITLE_LINE_HEIGHT_PX;
/** Shorter than the actions themselves, so the rule reads as a separator rather than a border. */
const DIVIDER_HEIGHT_PX = 16;

export interface ConversationCardProps {
  /** Opens the HITL approval modal, which owns the decision. The card's own activation. */
  onRequestApproval: (proposal: PndProposalRow) => void;
  onViewLifecycle: (correlationId: string) => void;
  /**
   * The pending gate this card draws.
   *
   * `PndProposalRow` rather than `Proposal`: the two are one contract with a projection between them
   * (bead `.29`), and the row is the half the live queue actually emits — `GET
   * /internal/pnd/proposals` groups rows, while `Proposal` is the per-investigation view of the same
   * object.
   */
  proposal: PndProposalRow;
  /**
   * The D5 max-of-constituent-alerts score from `GET /internal/pnd/discovery-context`, passed in
   * rather than fetched here: one derivation feeds both this badge and the blast radius, on one
   * react-query key (D10), and the card stays a pure render of its props.
   *
   * Absent — never zero — when no score could be derived, which is a normal card state: an
   * uncorrelated run, a discovery the caller cannot read, or one whose constituent alerts have aged
   * out. Branch on `!= null`, because a real score of `0` exists.
   */
  riskScore?: number;
}

/**
 * One pending HITL gate, as a card in a queue section (annotations 5, 6, 9a, 10, 11a).
 *
 * The replacement for the card that preceded it, and the difference is what has been taken **off**.
 * That card carried the phase, the watch, the reversibility, the full reasoning and two decision
 * buttons; this one carries its title, one line of summary and the verb of the decision it is asking
 * for. The phase is the accordion the card sits in, the watch is the filter above the queue, and the
 * reasoning and the decision both moved into the approval modal — where there is room to read before
 * answering, which is the point of moving them. The verb stayed because naming a decision is not
 * making it, and a queue whose cards all read "pending" costs four modals to triage.
 *
 * **Two more things came off on 2026-08-18**: the container type tag (`Investigation` /
 * `Sub-investigation` / `Incident`) and the relative timestamp. What is left is a two-line
 * title-and-description block **centred on the score**, with the actions top-aligned to the title.
 * The tag was also the affordance for reaching the container; that navigation moved into the overflow
 * menu, where {@link RowActionsMenu} draws it.
 *
 * Always a **pending** gate, which is why there is no decision badge here and no way to render one:
 * answering a gate takes it out of this list and into the Resolved section, where `ResolvedRow` draws
 * it as a single line. A card that could show both its bucket badge and a recorded decision is the
 * one thing the queue must not do — a card still asking to be answered would be indistinguishable
 * from one already answered.
 *
 * The card's own activation is the approval modal, and the leading action on its right is a labelled
 * door to that same modal rather than a shortcut past it. The two icon controls beside it are
 * deliberately neither: both stop propagation, so opening a thread in chat or reaching for the
 * lifecycle never opens an approval the analyst did not ask for.
 */
export const ConversationCard: React.FC<ConversationCardProps> = ({
  onRequestApproval,
  onViewLifecycle,
  proposal,
  riskScore,
}) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();

  const {
    correlationId,
    gateId,
    message,
    recommendedAction,
    reversible,
    sourceId,
    threadConversationId,
    threadTitle,
    title: gatePromptTitle,
  } = proposal;

  /**
   * The thread conversation's title, falling back to the gate prompt (D9). `threadTitle` is absent
   * — never blank — when the thread has not materialised, so this is the whole rule.
   */
  const title = threadTitle ?? gatePromptTitle;

  const primaryAction = useMemo(() => primaryActionLabel(gateId), [gateId]);

  /** What the divider would have to divide from: an uncorrelated run with no thread has neither. */
  const hasIconActions = threadConversationId != null || correlationId.length > 0;

  const onActivate = useCallback(() => onRequestApproval(proposal), [onRequestApproval, proposal]);

  const onPrimaryAction = useCallback(
    (event: React.MouseEvent) => {
      // The card opens the same modal, so letting this reach it would answer for two clicks.
      event.stopPropagation();

      onRequestApproval(proposal);
    },
    [onRequestApproval, proposal]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onActivate();
    },
    [onActivate]
  );

  const onOpenInChat = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      if (threadConversationId == null) {
        return;
      }

      // Push rather than replace: Back returns the analyst to the queue they left.
      history.push({
        pathname: '/chats',
        search: buildConversationSearch('', threadConversationId),
      });
    },
    [history, threadConversationId]
  );

  const stopRowActivation = useCallback((event: React.KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <div
      css={css`
        align-items: center;
        border: none;
        border-block-end: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
        border-radius: 0;
        box-sizing: border-box;
        cursor: pointer;
        display: flex;
        gap: ${euiTheme.size.l};
        inline-size: 100%;
        padding: ${CARD_PADDING_PX}px;
        text-align: left;
        transition: background ${euiTheme.animation.fast} ease-in-out;

        /* The section shell owns the outer chrome, so the last card must not draw a second line
           on top of it. */
        &:last-child {
          border-block-end: none;
        }

        &:hover {
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }

        /* EUI's global focus ring is scoped to real interactive elements, and this card is a div. */
        &:focus-visible {
          outline: ${euiTheme.focus.width} solid ${euiTheme.colors.primary};
          outline-offset: -${euiTheme.focus.width};
        }
      `}
      data-source-id={sourceId}
      data-test-subj="pndProposalRow"
      onClick={onActivate}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      {riskScore != null && <RiskScoreBadge score={riskScore} />}

      {/* Centred on the score rather than top-aligned with it: the two lines are one block, and the
          score is where the reading order starts (2026-08-18). */}
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
          data-test-subj="pndRowTitle"
        >
          {title}
        </p>

        <p
          css={css`
            color: ${euiTheme.colors.textSubdued};
            font-size: ${SUMMARY_FONT_SIZE_PX}px;
            line-height: ${SUMMARY_LINE_HEIGHT_PX}px;
            margin: 0;
            min-inline-size: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          data-test-subj="pndRowSummary"
        >
          {message}
        </p>
      </div>

      <div
        css={css`
          align-items: center;
          align-self: flex-start;
          block-size: ${ACTIONS_HEIGHT_PX}px;
          display: flex;
          flex-shrink: 0;
          gap: ${euiTheme.size.xs};
        `}
      >
        {/* The verb of the pending decision, so a queue can be read without opening every modal in
            it. Not a second way to decide: it opens the same modal the card does. */}
        {primaryAction != null && (
          <EuiButtonEmpty
            aria-label={i18n.primaryActionAriaLabel({ label: primaryAction, title })}
            color={getHitlTone({ recommendedAction, reversible })}
            data-test-subj="pndRowPrimaryAction"
            flush="both"
            iconType={getHitlActionIcon(recommendedAction)}
            onClick={onPrimaryAction}
            onKeyDown={stopRowActivation}
            size="xs"
          >
            {primaryAction}
          </EuiButtonEmpty>
        )}

        {primaryAction != null && hasIconActions && (
          <span
            aria-hidden
            css={css`
              background: ${euiTheme.border.color};
              block-size: ${DIVIDER_HEIGHT_PX}px;
              inline-size: ${euiTheme.border.width.thin};
              /* Targets an even visible gap on both sides: the chat button carries its own
                 internal padding, so the margin beside it is the smaller of the two. */
              margin-inline: ${euiTheme.size.m} ${euiTheme.size.xs};
            `}
            data-test-subj="pndRowActionDivider"
          />
        )}

        {threadConversationId != null && (
          <EuiToolTip content={i18n.OPEN_IN_CHAT} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={i18n.openInChatAriaLabel(title)}
              color="text"
              data-test-subj="pndRowOpenInChatButton"
              iconType="productAgent"
              onClick={onOpenInChat}
              onKeyDown={stopRowActivation}
              size="s"
            />
          </EuiToolTip>
        )}

        {/* An uncorrelated run has no discovery to open, and the lifecycle is the menu's only
            item — so the trigger would open an empty panel. */}
        {correlationId.length > 0 && (
          <RowActionsMenu
            correlationId={correlationId}
            onViewLifecycle={onViewLifecycle}
            title={title}
          />
        )}
      </div>
    </div>
  );
};
