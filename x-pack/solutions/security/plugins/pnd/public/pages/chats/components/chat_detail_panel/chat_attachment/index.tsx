/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { PndConversationAttachment } from '@kbn/pnd-common';

import * as i18n from '../../../translations';

export interface ChatAttachmentProps {
  attachment: PndConversationAttachment;
}

/**
 * One Agent Builder attachment on the conversation the detail panel is open on.
 *
 * Collapsed by default: the Attack Discovery markdown alone runs to thousands of characters, and
 * the panel sits beside the list rather than replacing it, so an expanded attachment would push the
 * "Open in Agent Builder" hand-off off the bottom of a narrow column.
 *
 * `content` is optional and its absence is a real state rather than a failure — a human can add an
 * `esql` or `visualization` attachment to a PND thread in Agent Builder, and PND lists what it
 * cannot render inline rather than dropping it. `description` is optional too, so the id is the
 * fallback label; PND's own three ids are stable and self-describing.
 *
 * The content is rendered as **text** in an `EuiCodeBlock`, never as markup: it is whatever Agent
 * Builder stored, and the prototype's `dangerouslySetInnerHTML` treatment is deliberately not
 * ported.
 */
export const ChatAttachment: React.FC<ChatAttachmentProps> = ({
  attachment: { content, description, id, type },
}) => (
  <>
    <EuiAccordion
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{description ?? id}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="pndChatsDetailAttachmentType">
              {type}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      data-attachment-id={id}
      data-test-subj="pndChatsDetailAttachment"
      id={`pndChatsDetailAttachment-${id}`}
      paddingSize="s"
    >
      {content != null ? (
        <EuiCodeBlock
          data-test-subj="pndChatsDetailAttachmentContent"
          fontSize="s"
          isCopyable
          overflowHeight={240}
          paddingSize="s"
        >
          {content}
        </EuiCodeBlock>
      ) : (
        <EuiText color="subdued" data-test-subj="pndChatsDetailAttachmentNoContent" size="xs">
          {i18n.DETAILS_ATTACHMENT_NO_CONTENT}
        </EuiText>
      )}
    </EuiAccordion>
    <EuiSpacer size="xs" />
  </>
);
