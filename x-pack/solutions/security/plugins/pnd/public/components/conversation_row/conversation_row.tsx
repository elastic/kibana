/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { PndConversation } from '@kbn/pnd-common';
import { ConversationKindBadge } from '../conversation_kind_badge';
import * as i18n from './translations';

export interface ConversationRowProps {
  conversation: PndConversation;
  /**
   * The HITL gate this conversation's thread is paired with, already in words — e.g.
   * "Apply a rule tuning".
   *
   * Passed in rather than derived from `conversation.gateId` here, matching how this row already
   * takes `href` and `onOpen` rather than building them: the caller owns what a gate is called,
   * and a shared row must not reach for a page's copy. Omitted on the three alert-keyed kinds,
   * which have no gate, and on a gate this browser's registry does not know — a thread whose gate
   * cannot be named renders without the line rather than with an id in it.
   */
  gate?: string;
  /**
   * The conversation's Agent Builder URL, from
   * `getUrlForApp(AGENT_BUILDER_APP_ID, { path: '/conversations/<id>' })`. Passing
   * it makes the title a real link, so Ctrl/Cmd+click opens a new tab; `onOpen`
   * still handles the plain click, in-app.
   */
  href?: string;
  /**
   * Opens the conversation. Omitted when there is nowhere to open it — the row
   * then renders as text rather than an inert link.
   */
  onOpen?: (conversation: PndConversation) => void;
  /**
   * Opens the four-phase lifecycle of `conversation.correlationId`.
   * Omitted when the conversation names no discovery, so the row never shows a
   * disabled control with no explanation.
   */
  onViewLifecycle?: () => void;
}

interface TimestampProps {
  'data-test-subj': string;
  label: string;
  value: string;
}

/**
 * Renders the raw ISO 8601 timestamp inside a `<time>` element.
 *
 * Deliberately not localized: the projection returns ISO strings, PND's existing
 * run table renders them verbatim, and a locale-formatted value would make these
 * rows untestable without pinning a timezone. See the `UX-DEVIATION:` note on the
 * epic — a designer should decide the final format once.
 */
const Timestamp: React.FC<TimestampProps> = ({ 'data-test-subj': dataTestSubj, label, value }) => (
  <EuiText color="subdued" size="xs">
    {`${label}: `}
    <time data-test-subj={dataTestSubj} dateTime={value}>
      {value}
    </time>
  </EuiText>
);

/**
 * One PND conversation, rendering the six fields
 * `GET /internal/pnd/conversations` actually projects: `id`, `kind`, `title`,
 * `correlationId`, `createdAt` and `updatedAt` — plus the caller-supplied {@link
 * ConversationRowProps.gate} on the seventh, `gateId`, which the projection returns only for a
 * `thread`.
 *
 * No rename and no delete affordance, deliberately: both require
 * `access: 'owner'`, which `public-conversation: true` does not grant, so both
 * would 404 for any analyst who is not the workflow identity.
 */
export const ConversationRow: React.FC<ConversationRowProps> = ({
  conversation,
  gate,
  href,
  onOpen,
  onViewLifecycle,
}) => {
  const { correlationId, createdAt, id, kind, title, updatedAt } = conversation;
  const displayTitle = title.trim().length > 0 ? title : i18n.UNTITLED;
  // `preventDefault` only when there is an in-app handler to take over from the
  // browser; with `href` alone the link navigates normally.
  const onTitleClick = (event: React.MouseEvent) => {
    if (onOpen == null) {
      return;
    }
    event.preventDefault();
    onOpen(conversation);
  };

  return (
    <EuiPanel
      data-conversation-id={id}
      data-test-subj="pndConversationRow"
      hasBorder
      hasShadow={false}
      paddingSize="s"
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>
              {onOpen != null || href != null ? (
                <EuiLink
                  aria-label={i18n.openConversationAriaLabel(displayTitle)}
                  data-test-subj="pndConversationRowTitle"
                  href={href}
                  onClick={onTitleClick}
                >
                  {displayTitle}
                </EuiLink>
              ) : (
                <span data-test-subj="pndConversationRowTitle">{displayTitle}</span>
              )}
            </h3>
          </EuiTitle>
          <EuiText color="subdued" size="xs">
            {`${i18n.ATTACK_DISCOVERY_ALERT_ID}: `}
            <code data-test-subj="pndConversationRowAttackDiscoveryAlertId">{correlationId}</code>
          </EuiText>
          <EuiText color="subdued" size="xs">
            {`${i18n.CONVERSATION_ID}: `}
            <code data-test-subj="pndConversationRowId">{id}</code>
          </EuiText>
          {gate != null ? (
            <EuiText color="subdued" size="xs">
              {`${i18n.GATE}: `}
              <span data-test-subj="pndConversationRowGate">{gate}</span>
            </EuiText>
          ) : null}
          {onViewLifecycle != null ? (
            <>
              <EuiSpacer size="xs" />
              {/* a plain block, so the button sizes to its content inside the flex column */}
              <div>
                <EuiButtonEmpty
                  aria-label={i18n.viewLifecycleAriaLabel(displayTitle)}
                  data-test-subj="pndConversationRowViewLifecycle"
                  flush="left"
                  iconType="inspect"
                  onClick={onViewLifecycle}
                  size="xs"
                >
                  {i18n.VIEW_LIFECYCLE}
                </EuiButtonEmpty>
              </div>
            </>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="flexEnd" direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <ConversationKindBadge kind={kind} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Timestamp
                data-test-subj="pndConversationRowCreatedAt"
                label={i18n.CREATED_AT}
                value={createdAt}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Timestamp
                data-test-subj="pndConversationRowUpdatedAt"
                label={i18n.UPDATED_AT}
                value={updatedAt}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
