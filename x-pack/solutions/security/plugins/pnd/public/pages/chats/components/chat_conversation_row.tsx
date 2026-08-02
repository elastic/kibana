/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { PndConversation } from '@kbn/pnd-common';

import { ConversationRow } from '../../../components/conversation_row';
import { useOpenLifecycle } from '../../../components/lifecycle_flyout';
import {
  AGENT_BUILDER_APP_ID,
  useOpenAgentBuilderConversation,
} from '../../../components/lifecycle_view';
import { describeThreadGate } from '../helpers/describe_thread_gate';
import { getSelectedRowStyles } from '../helpers/get_selected_row_styles';

export interface ChatConversationRowProps {
  conversation: PndConversation;
  /**
   * Whether `?conversationId=` named this row, so the detail panel beside the list is showing it.
   *
   * `aria-current` rather than colour alone, and on a wrapper rather than on `ConversationRow`:
   * that row is shared with the lifecycle flyout and the executions page, and selection is a
   * chats-page concept.
   */
  isSelected?: boolean;
}

/**
 * One row of the chats list, wired to the two places it can go.
 *
 * **Out to Agent Builder**, through the *legacy* `/conversations/{id}` route rather than the
 * canonical `/agents/{agentId}/conversations/{id}`: `PndConversation` carries no `agent_id`, and the
 * legacy route's redirect fetches the conversation to resolve the agent for us. In a new tab,
 * because `EmbeddableConversation` has no `conversationId` prop, no ref and no conversations service
 * on its public contract — reading a PND conversation genuinely means leaving PND, and a hand-off
 * that leaves PND on screen behind it reads as a hand-off rather than a dead end.
 *
 * **In to the lifecycle**, as an overlay over this very list (`?lifecycle=<adId>`), which closes the
 * loop between the demo's two surfaces: the flyout links out to a conversation, and a conversation
 * links back to the flyout.
 *
 * A `thread` row takes both routes unchanged — its id is a derived UUIDv5 like any other, and the
 * Attack Discovery it hangs off is half of the key it was derived from. The only difference is the
 * gate line, because a thread's title is Agent Builder's rather than PND's.
 *
 * Rename and delete are deliberately absent, here and in `ConversationRow`: both require
 * `access: 'owner'`, and `agents.ensure()` persists the PND agents as the SYSTEM user, so an analyst
 * is never the owner and both would 404.
 */
export const ChatConversationRow: React.FC<ChatConversationRowProps> = ({
  conversation,
  isSelected = false,
}) => {
  const { services } = useKibana<{ application?: ApplicationStart }>();
  const { application } = services;
  const { euiTheme } = useEuiTheme();
  const openConversation = useOpenAgentBuilderConversation();
  const openLifecycle = useOpenLifecycle(conversation.correlationId);

  const onOpen = useCallback(() => {
    openConversation(conversation.id);
  }, [conversation.id, openConversation]);

  return (
    <div
      aria-current={isSelected ? 'true' : undefined}
      css={isSelected ? getSelectedRowStyles(euiTheme) : undefined}
      data-test-subj="pndChatsConversationRow"
    >
      <ConversationRow
        conversation={conversation}
        // only a thread has one, and it is the only context a thread row has: its title is Agent
        // Builder's, not PND's, so the gate is what says which proposal the thread belongs to.
        gate={describeThreadGate(conversation)}
        // a real href as well as the handler, so Cmd/Ctrl+click and "copy link address" both work
        href={application?.getUrlForApp(AGENT_BUILDER_APP_ID, {
          path: `/conversations/${conversation.id}`,
        })}
        onOpen={onOpen}
        onViewLifecycle={conversation.correlationId.length > 0 ? openLifecycle : undefined}
      />
    </div>
  );
};
