/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent, ToolResult } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ToolResultType,
  isConversationCreatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isReasoningEvent,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolProgressEvent,
  isToolResultEvent,
} from '@kbn/agent-builder-common';
import { isConversationIdSetEvent } from '@kbn/agent-builder-common/chat/events';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { HuntArtifact } from './hunt_artifacts';
import {
  artifactsFromAttachments,
  artifactsFromStructuredOutput,
  artifactsFromToolResults,
  mergeHuntArtifacts,
} from './hunt_artifacts';
import { buildGroundedDirectiveArtifacts } from './hunt_directive_artifacts';

export interface HuntActivity {
  id: string;
  toolId: string;
  status: 'running' | 'complete';
  detail?: string;
}

export interface HuntStreamState {
  message: string;
  conversationId?: string;
  activities: HuntActivity[];
  artifacts: HuntArtifact[];
  messageCompleted: boolean;
  status: 'running' | 'completed';
}

export const createHuntStreamState = (conversationId?: string): HuntStreamState => ({
  message: '',
  conversationId,
  activities: [],
  artifacts: [],
  messageCompleted: false,
  status: 'running',
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasString = (record: Record<string, unknown>, key: string): boolean =>
  typeof record[key] === 'string';

const isToolResult = (value: unknown): value is ToolResult => {
  if (!isRecord(value) || !hasString(value, 'tool_result_id') || !hasString(value, 'type')) {
    return false;
  }
  if (value.type === ToolResultType.esqlResults) {
    if (!isRecord(value.data)) return false;
    return (
      typeof value.data.query === 'string' &&
      Array.isArray(value.data.columns) &&
      value.data.columns.every((column) => isRecord(column) && typeof column.name === 'string') &&
      Array.isArray(value.data.values) &&
      value.data.values.every(Array.isArray)
    );
  }
  if (value.type === ToolResultType.query) {
    return isRecord(value.data) && typeof value.data.esql === 'string';
  }
  return 'data' in value;
};

const isVersionedAttachment = (value: unknown): value is VersionedAttachment => {
  if (!isRecord(value)) return false;
  return (
    hasString(value, 'id') &&
    hasString(value, 'type') &&
    typeof value.current_version === 'number' &&
    Array.isArray(value.versions) &&
    value.versions.every(
      (version) =>
        isRecord(version) &&
        typeof version.version === 'number' &&
        'data' in version &&
        typeof version.created_at === 'string' &&
        typeof version.content_hash === 'string'
    )
  );
};

/**
 * The Agent Builder event guards only discriminate on `type`. This validates
 * the fields consumed by AI Hunt before allowing an event to update UI state.
 */
export const isValidHuntChatEvent = (value: unknown): value is ChatEvent => {
  if (!isRecord(value) || typeof value.type !== 'string' || !isRecord(value.data)) return false;
  const { data } = value;
  switch (value.type) {
    case ChatEventType.messageChunk:
      return hasString(data, 'message_id') && hasString(data, 'text_chunk');
    case ChatEventType.messageComplete:
      return (
        hasString(data, 'message_id') &&
        hasString(data, 'message_content') &&
        (data.structured_output === undefined || isRecord(data.structured_output))
      );
    case ChatEventType.toolCall:
      return hasString(data, 'tool_call_id') && hasString(data, 'tool_id') && isRecord(data.params);
    case ChatEventType.toolProgress:
      return hasString(data, 'tool_call_id') && hasString(data, 'message');
    case ChatEventType.toolResult:
      return (
        hasString(data, 'tool_call_id') &&
        hasString(data, 'tool_id') &&
        Array.isArray(data.results) &&
        data.results.every(isToolResult)
      );
    case ChatEventType.reasoning:
      return hasString(data, 'reasoning');
    case ChatEventType.conversationCreated:
      return hasString(data, 'conversation_id');
    case ChatEventType.conversationIdSet:
      return hasString(data, 'conversation_id');
    case ChatEventType.roundComplete:
      if (!isRecord(data.round) || !isRecord(data.round.input)) return false;
      const attachmentRefs = data.round.input.attachment_refs;
      return (
        (attachmentRefs === undefined ||
          (Array.isArray(attachmentRefs) &&
            attachmentRefs.every(
              (ref) =>
                isRecord(ref) &&
                hasString(ref, 'attachment_id') &&
                (ref.actor === undefined || typeof ref.actor === 'string')
            ))) &&
        (data.attachments === undefined ||
          (Array.isArray(data.attachments) && data.attachments.every(isVersionedAttachment)))
      );
    default:
      return false;
  }
};

const upsertActivity = (activities: HuntActivity[], update: HuntActivity): HuntActivity[] => {
  const existing = activities.some((activity) => activity.id === update.id);
  return existing
    ? activities.map((activity) =>
        activity.id === update.id ? { ...activity, ...update } : activity
      )
    : [...activities, update];
};

export const reduceHuntStreamEvent = (
  state: HuntStreamState,
  eventValue: unknown
): HuntStreamState => {
  if (!isValidHuntChatEvent(eventValue)) return state;
  const event = eventValue;
  if (isMessageChunkEvent(event)) {
    return { ...state, message: state.message + event.data.text_chunk };
  }
  if (isMessageCompleteEvent(event)) {
    const hasRunningActivity = state.activities.some(({ status }) => status === 'running');
    const structuredOutput = event.data.structured_output;
    const withStructured = structuredOutput
      ? mergeHuntArtifacts(
          state.artifacts,
          artifactsFromStructuredOutput(event.data.message_id, structuredOutput)
        )
      : state.artifacts;
    // Ground any AI-directed artifact directives (from structured_output or a
    // fenced block in the narrative) against the REAL collected artifacts.
    // Ungroundable directives are dropped by groundHuntDirectives.
    const directiveArtifacts = buildGroundedDirectiveArtifacts({
      structuredOutput,
      narrative: event.data.message_content,
      artifacts: withStructured,
    });
    return {
      ...state,
      message: event.data.message_content,
      messageCompleted: true,
      status: hasRunningActivity ? 'running' : 'completed',
      artifacts:
        directiveArtifacts.length > 0
          ? mergeHuntArtifacts(withStructured, directiveArtifacts)
          : withStructured,
    };
  }
  if (isToolCallEvent(event)) {
    return {
      ...state,
      activities: upsertActivity(state.activities, {
        id: event.data.tool_call_id,
        toolId: event.data.tool_id,
        status: 'running',
      }),
      messageCompleted: false,
      status: 'running',
    };
  }
  if (isToolProgressEvent(event)) {
    const existing = state.activities.find((activity) => activity.id === event.data.tool_call_id);
    return {
      ...state,
      activities: upsertActivity(state.activities, {
        id: event.data.tool_call_id,
        toolId: existing?.toolId ?? event.data.tool_call_id,
        status: 'running',
        detail: event.data.message,
      }),
    };
  }
  if (isToolResultEvent(event)) {
    const activities = upsertActivity(state.activities, {
      id: event.data.tool_call_id,
      toolId: event.data.tool_id,
      status: 'complete',
    });
    return {
      ...state,
      activities,
      status:
        state.messageCompleted && activities.every(({ status }) => status === 'complete')
          ? 'completed'
          : 'running',
      artifacts: mergeHuntArtifacts(
        state.artifacts,
        artifactsFromToolResults(event.data.tool_id, event.data.results)
      ),
    };
  }
  if (isRoundCompleteEvent(event)) {
    const refs = event.data.round.input?.attachment_refs;
    const agentAttachmentIds = refs
      ? new Set(
          refs
            .filter((ref) => ref.actor !== ATTACHMENT_REF_ACTOR.user)
            .map((ref) => ref.attachment_id)
        )
      : undefined;
    const attachments = (event.data.attachments ?? []).filter(
      (attachment) => !agentAttachmentIds || agentAttachmentIds.has(attachment.id)
    );
    return {
      ...state,
      status: 'completed',
      messageCompleted: true,
      artifacts: mergeHuntArtifacts(state.artifacts, artifactsFromAttachments(attachments)),
    };
  }
  if (isConversationCreatedEvent(event) || isConversationIdSetEvent(event)) {
    return { ...state, conversationId: event.data.conversation_id };
  }
  if (isReasoningEvent(event)) {
    return state;
  }
  return state;
};
