/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { PndConversation } from '@kbn/pnd-common';

import { useOpenAgentBuilderConversation } from '../../../../components/lifecycle_view';
import { useConversationAttachments } from '../../../../hooks/use_conversation_attachments';
import { PndErrorState, PndLoadingState, getErrorMessage } from '../../../../states';
import { describeThreadGate } from '../../helpers/describe_thread_gate';
import * as i18n from '../../translations';
import { ChatAttachment } from './chat_attachment';

export interface ChatDetailPanelProps {
  /** The conversation `?conversationId=` named, already resolved against the list. */
  conversation: PndConversation;
  /** Clears `?conversationId=`, so Back and the close button agree on what closing means. */
  onClose: () => void;
}

/**
 * What one conversation looks like without leaving PND.
 *
 * **Only what PND already exposes.** `EmbeddableConversation` cannot be pointed at an existing
 * `conversationId`, and the single-conversation route deliberately excludes rounds (G9, README
 * finding S11) — so this is not, and must not become, a read of the conversation itself. It shows
 * the six-field projection's `title`, the gate a thread is paired with, and the attachments the
 * existing `GET /internal/pnd/conversations/{id}/attachments` route already returns. Reading the
 * conversation still means going to Agent Builder, which is what the footer button is for.
 *
 * The attachments read is **guarded on the discovery id** rather than left to fail: the route takes
 * `correlationId` for its S11 check and `useConversationAttachments` disables itself
 * without one, which in react-query v4 is indistinguishable from a request in flight — an
 * unguarded panel would spin forever on a conversation that names no discovery. Saying so is both
 * honest and cheap.
 *
 * **No type tag in the header** (2026-08-18 — *"flyout and chat case headers drop the same type tags
 * (Sub-investigation, Investigation, Incident)"*). This is the chat **case** header, so the tag came
 * off here; the list beside it keeps its `ConversationKindBadge`, because that list is the surface
 * the kind filter pills filter, and a pill that counts a kind no row admits to is unreadable. What
 * the header says about *what* this conversation is, it says through the gate line below the title —
 * which names the decision the thread is paired with rather than the shape of its container.
 */
export const ChatDetailPanel: React.FC<ChatDetailPanelProps> = ({ conversation, onClose }) => {
  const { correlationId, id, title } = conversation;
  const displayTitle = title.trim().length > 0 ? title : i18n.DETAILS_UNTITLED;
  const hasAttackDiscovery = correlationId.length > 0;
  const openConversation = useOpenAgentBuilderConversation();
  const gate = describeThreadGate(conversation);

  const { data, error, isLoading, refetch } = useConversationAttachments({
    correlationId,
    conversationId: id,
    enabled: hasAttackDiscovery,
  });

  const onOpenInAgentBuilder = useCallback(() => {
    openConversation(id);
  }, [id, openConversation]);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const attachments = data?.attachments ?? [];

  return (
    <EuiPanel
      data-conversation-id={id}
      data-test-subj="pndChatsDetailPanel"
      hasBorder
      hasShadow={false}
      paddingSize="m"
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h2 data-test-subj="pndChatsDetailPanelTitle">{displayTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* `disableScreenReaderOutput`, so the tooltip does not repeat the `aria-label` */}
          <EuiToolTip content={i18n.DETAILS_CLOSE} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={i18n.DETAILS_CLOSE}
              data-test-subj="pndChatsDetailPanelClose"
              iconType="cross"
              onClick={onClose}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {gate != null ? (
        <EuiText color="subdued" size="xs">
          {`${i18n.DETAILS_GATE}: `}
          <span data-test-subj="pndChatsDetailPanelGate">{gate}</span>
        </EuiText>
      ) : null}

      <EuiHorizontalRule margin="s" />

      {!hasAttackDiscovery ? (
        <EuiText color="subdued" data-test-subj="pndChatsDetailAttachmentsUnavailable" size="xs">
          {i18n.DETAILS_ATTACHMENTS_UNAVAILABLE}
        </EuiText>
      ) : (
        <>
          {isLoading ? <PndLoadingState label={i18n.DETAILS_ATTACHMENTS_LOADING} /> : null}

          {!isLoading && error != null ? (
            <PndErrorState
              body={getErrorMessage(error, i18n.DETAILS_ATTACHMENTS_ERROR)}
              onRetry={onRetry}
            />
          ) : null}

          {!isLoading && error == null && attachments.length === 0 ? (
            <EuiText color="subdued" data-test-subj="pndChatsDetailAttachmentsEmpty" size="xs">
              {i18n.DETAILS_ATTACHMENTS_EMPTY}
            </EuiText>
          ) : null}

          {attachments.length > 0 ? (
            <>
              <EuiText color="subdued" data-test-subj="pndChatsDetailAttachmentsCount" size="xs">
                {i18n.detailsAttachmentCount(attachments.length)}
              </EuiText>
              <EuiSpacer size="xs" />
            </>
          ) : null}

          {attachments.map((attachment) => (
            <ChatAttachment attachment={attachment} key={attachment.id} />
          ))}
        </>
      )}

      <EuiSpacer size="m" />

      <EuiButton
        aria-label={i18n.openInAgentBuilderAriaLabel(displayTitle)}
        data-test-subj="pndChatsDetailPanelOpenInAgentBuilder"
        fullWidth
        iconType="popout"
        onClick={onOpenInAgentBuilder}
        size="s"
      >
        {i18n.DETAILS_OPEN_IN_AGENT_BUILDER}
      </EuiButton>
    </EuiPanel>
  );
};
