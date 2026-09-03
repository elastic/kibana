/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { PndConversation, PndConversationAttachment } from '@kbn/pnd-common';

import { useConversationAttachments } from '../../../../../hooks/use_conversation_attachments';
import { describeThreadGate } from '../../../../../pages/chats/helpers/describe_thread_gate';
import { PndErrorState, PndLoadingState, getErrorMessage } from '../../../../../states';
import * as i18n from '../../../translations';

interface AttachmentProps {
  attachment: PndConversationAttachment;
}

/**
 * One Agent Builder attachment: what it is, and — collapsed — what it says.
 *
 * Collapsed by default rather than open: the Attack Discovery markdown alone runs to thousands of
 * characters, and three of them expanded would bury the other two tabs' worth of context under a
 * wall of text in a flyout.
 *
 * `content` is optional and its absence is a real state, not a failure (a human can add an `esql` or
 * `visualization` attachment to a PND thread in Agent Builder, and PND lists what it cannot render
 * inline rather than dropping it). `description` is optional too, so the id is the fallback label —
 * PND's own three ids are stable and self-describing.
 */
const Attachment: React.FC<AttachmentProps> = ({
  attachment: { content, createdAt, description, id, type },
}) => (
  <>
    <EuiAccordion
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{description ?? id}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="pndLifecycleAttachmentType">
              {type}
            </EuiBadge>
          </EuiFlexItem>
          {createdAt != null ? (
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                <time dateTime={createdAt} data-test-subj="pndLifecycleAttachmentCreatedAt">
                  {createdAt}
                </time>
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
      data-attachment-id={id}
      data-test-subj="pndLifecycleAttachment"
      id={`pndLifecycleAttachment-${id}`}
      paddingSize="s"
    >
      {content != null ? (
        <EuiCodeBlock
          data-test-subj="pndLifecycleAttachmentContent"
          fontSize="s"
          isCopyable
          overflowHeight={320}
          paddingSize="s"
        >
          {content}
        </EuiCodeBlock>
      ) : (
        <EuiText color="subdued" data-test-subj="pndLifecycleAttachmentNoContent" size="xs">
          {i18n.ATTACHMENT_NO_CONTENT}
        </EuiText>
      )}
    </EuiAccordion>
    <EuiSpacer size="xs" />
  </>
);

export interface ThreadAttachmentsProps {
  correlationId: string;
  /** A `kind: 'thread'` row from `GET /internal/pnd/conversations`, so the thread provably exists. */
  conversation: PndConversation;
}

/**
 * The attachments on one proposal thread.
 *
 * One component per thread rather than one query for the discovery, because the route is per
 * conversation and a discovery has up to one thread per registered gate (D1). Each instance owns its
 * own read, so a thread that 404s cannot blank the threads either side of it.
 *
 * The **gate** is what identifies a thread, never the title: titles are written by Agent Builder from
 * the seed message and PND is forbidden to rename a conversation to encode anything (D9), so two
 * threads on one discovery differ only by the gate they are paired with.
 */
export const ThreadAttachments: React.FC<ThreadAttachmentsProps> = ({
  correlationId,
  conversation,
}) => {
  const { data, error, isLoading, refetch } = useConversationAttachments({
    correlationId,
    conversationId: conversation.id,
  });

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const gate = describeThreadGate(conversation);
  const attachments = data?.attachments ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <EuiPanel
        data-conversation-id={conversation.id}
        data-gate-id={conversation.gateId}
        data-test-subj="pndLifecycleThreadAttachments"
        hasBorder
        hasShadow={false}
        paddingSize="s"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          {gate != null ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="neutral" data-test-subj="pndLifecycleThreadGate">
                {gate}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h4 data-test-subj="pndLifecycleThreadTitle">{conversation.title}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {isLoading ? <PndLoadingState label={i18n.ATTACHMENTS_LOADING} /> : null}

        {!isLoading && error != null ? (
          <PndErrorState
            body={getErrorMessage(error, i18n.ATTACHMENTS_THREAD_ERROR)}
            onRetry={onRetry}
          />
        ) : null}

        {!isLoading && error == null && attachments.length === 0 ? (
          <EuiText color="subdued" data-test-subj="pndLifecycleThreadAttachmentsEmpty" size="xs">
            {i18n.ATTACHMENTS_THREAD_EMPTY}
          </EuiText>
        ) : null}

        {attachments.map((attachment) => (
          <Attachment attachment={attachment} key={attachment.id} />
        ))}

        {/* the route caps the list at 100; PND creates 3, so this is only reachable once a human
            has added attachments of their own in Agent Builder */}
        {total > attachments.length ? (
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="pndLifecycleAttachmentsTruncated"
            iconType="warning"
            size="s"
            title={i18n.attachmentsTruncated(attachments.length, total)}
          />
        ) : null}
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
