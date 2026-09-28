/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getConversationMetadataStepCommonDefinition } from '@kbn/agent-builder-plugin/common/workflows/steps/get_conversation_metadata';
import { updateConversationMetadataStepCommonDefinition } from '@kbn/agent-builder-plugin/common/workflows/steps/update_conversation_metadata';
import { createConversationStepCommonDefinition } from '@kbn/agent-builder-plugin/common/workflows/steps/create_conversation';
import { addAttachmentStepCommonDefinition } from '@kbn/agent-builder-plugin/common/workflows/steps/attachment_add';
import { readAttachmentStepCommonDefinition } from '@kbn/agent-builder-plugin/common/workflows/steps/attachment_read';
import { updateAttachmentStepCommonDefinition } from '@kbn/agent-builder-plugin/common/workflows/steps/attachment_update';
import { runAgentStepCommonDefinition } from '@kbn/agent-builder-plugin/common/step_types/run_agent_step';
import { setAttackStatusStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/set_attack_status_step/set_attack_status_step_common';
import { createKiStepCommonDefinition } from '@kbn/context-engine-plugin/common/step_types/create_ki';

/**
 * One conversation record: metadata plus every attachment, versioned.
 *
 * Modeled as a Map keyed by conversation id so the fake behaves like the real
 * `ai.conversation.*` / `ai.attachment.*` steps do for THIS suite's purposes —
 * good enough to prove the chain reads back what it wrote, not a reimplementation
 * of Agent Builder's conversation service.
 */
export interface FakeConversation {
  id: string;
  templateId?: string;
  metadata: Record<string, unknown>;
  attachments: Map<string, { type: string; data: unknown; version: number }>;
}

export interface FakeAlertZeroBackend {
  conversations: Map<string, FakeConversation>;
  /** Every `security.setAttackStatus` call, in order, for assertions. */
  attackStatusCalls: Array<{ ids: string[]; status: string; reason?: string }>;
  /** Every knowledge indicator `context-engine.createKi` wrote, keyed by ki_id. */
  knowledgeIndicators: Map<string, { ai_index_id: string; ki: unknown }>;
  /**
   * Queue of canned `ai.agent` responses for the FP/TP `analyze` step, consumed
   * one per call in order. Throws if the queue runs dry, so a suite that forgot
   * to queue a verdict fails loudly rather than silently degrading to
   * `inconclusive` and passing for the wrong reason.
   */
  queueAgentVerdict: (verdict: {
    verdict: 'false_positive' | 'true_positive' | 'inconclusive';
    summary_markdown: string;
    rationale_markdown?: string;
    confidence?: number;
  }) => void;
  agentCallCount: () => number;
}

const CONVERSATION_TEMPLATE_DEFAULT_METADATA: Record<string, Record<string, unknown>> = {
  investigation: { status: 'open' },
};

/**
 * Builds the fake backend AND every step definition the AlertZero worker chain
 * needs beyond what the shared `WorkflowRunFixture` already provides
 * (`workflow.execute`, `data.set`, `switch`, `parallel`, connectors, …).
 *
 * Every definition here reuses the REAL `*StepCommonDefinition` — schema and all
 * — from the plugin that ships it, and fakes only the `handler`. A future
 * contract drift between the real schema and this fake handler's assumptions is
 * caught by the schema (a rendered `with:` that no longer validates), not
 * silently absorbed.
 */
export const createFakeAlertZeroBackend = (): {
  backend: FakeAlertZeroBackend;
  stepDefinitions: unknown[];
} => {
  const conversations = new Map<string, FakeConversation>();
  const attackStatusCalls: Array<{ ids: string[]; status: string; reason?: string }> = [];
  const knowledgeIndicators = new Map<string, { ai_index_id: string; ki: unknown }>();
  const agentVerdictQueue: Array<{
    verdict: 'false_positive' | 'true_positive' | 'inconclusive';
    summary_markdown: string;
    rationale_markdown?: string;
    confidence?: number;
  }> = [];
  let agentCalls = 0;

  const getConversation = (id: string): FakeConversation => {
    const existing = conversations.get(id);
    if (!existing) {
      throw new Error(`fake backend: no conversation ${id} — was ai.conversation.create run?`);
    }
    return existing;
  };

  const createConversationStep = createServerStepDefinition({
    ...createConversationStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as {
        conversation_id?: string;
        title?: string;
        template_id?: string;
        agent_id?: string;
        metadata?: Record<string, unknown>;
      };
      const id = input.conversation_id ?? `fake-conversation-${conversations.size + 1}`;
      const templateDefaults = input.template_id
        ? CONVERSATION_TEMPLATE_DEFAULT_METADATA[input.template_id] ?? {}
        : {};
      conversations.set(id, {
        id,
        templateId: input.template_id,
        metadata: { ...templateDefaults, ...(input.metadata ?? {}) },
        attachments: new Map(),
      });
      return {
        output: {
          conversation_id: id,
          agent_id: input.agent_id ?? 'default',
          ...(input.template_id ? { template_id: input.template_id } : {}),
          metadata: conversations.get(id)!.metadata,
        },
      };
    },
  });

  const getConversationMetadataStep = createServerStepDefinition({
    ...getConversationMetadataStepCommonDefinition,
    handler: async (context) => {
      const { conversation_id: conversationId } = context.input as { conversation_id: string };
      const conversation = conversations.get(conversationId);
      return { output: { metadata: conversation?.metadata ?? {} } };
    },
  });

  const updateConversationMetadataStep = createServerStepDefinition({
    ...updateConversationMetadataStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as {
        conversation_id: string;
        updates: Record<string, unknown>;
      };
      const conversation = getConversation(input.conversation_id);
      const changedFields = Object.entries(input.updates)
        .filter(([key, value]) => conversation.metadata[key] !== value)
        .map(([key]) => key);
      conversation.metadata = { ...conversation.metadata, ...input.updates };
      return {
        output: {
          conversation_id: conversation.id,
          changed_fields: changedFields,
          metadata: conversation.metadata,
        },
      };
    },
  });

  const addAttachmentStep = createServerStepDefinition({
    ...addAttachmentStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as {
        conversation_id: string;
        id?: string;
        type: string;
        data?: unknown;
        origin?: string;
      };
      const conversation = getConversation(input.conversation_id);
      const attachmentId = input.id ?? `attachment-${conversation.attachments.size + 1}`;
      if (conversation.attachments.has(attachmentId)) {
        // Mirrors the real service's version conflict on a duplicate id, which
        // `attach_alert_batch`/`attach_discovery` in the review rely on to
        // detect a re-review (see `refresh_verdict`'s `if`).
        return {
          output: { attachment_id: attachmentId, type: input.type, current_version: 1 },
          error: new Error(`Attachment ${attachmentId} already exists on ${conversation.id}`),
        };
      }
      conversation.attachments.set(attachmentId, {
        type: input.type,
        data: input.data ?? { origin: input.origin },
        version: 1,
      });
      return { output: { attachment_id: attachmentId, type: input.type, current_version: 1 } };
    },
  });

  const readAttachmentStep = createServerStepDefinition({
    ...readAttachmentStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as { conversation_id: string; attachment_id: string };
      const conversation = getConversation(input.conversation_id);
      const attachment = conversation.attachments.get(input.attachment_id);
      if (!attachment) {
        return {
          output: { data: null, version: 0 },
          error: new Error(`Attachment ${input.attachment_id} not found`),
        };
      }
      return { output: { data: attachment.data, version: attachment.version } };
    },
  });

  const updateAttachmentStep = createServerStepDefinition({
    ...updateAttachmentStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as {
        conversation_id: string;
        attachment_id: string;
        data?: unknown;
        description?: string;
      };
      const conversation = getConversation(input.conversation_id);
      const existing = conversation.attachments.get(input.attachment_id);
      const nextVersion = (existing?.version ?? 0) + 1;
      conversation.attachments.set(input.attachment_id, {
        type: existing?.type ?? 'unknown',
        data: input.data ?? existing?.data,
        version: nextVersion,
      });
      return {
        output: { attachment_id: input.attachment_id, current_version: nextVersion },
      };
    },
  });

  const setAttackStatusStep = createServerStepDefinition({
    ...setAttackStatusStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as {
        ids: string | string[];
        status: 'open' | 'acknowledged' | 'closed';
        reason?: string;
      };
      const ids = Array.isArray(input.ids) ? input.ids : [input.ids];
      attackStatusCalls.push({ ids, status: input.status, reason: input.reason });
      return {
        output: {
          success: true,
          message: `Successfully updated status to ${input.status} for ${ids.length} attack(s)`,
        },
      };
    },
  });

  const createKiStep = createServerStepDefinition({
    ...createKiStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as { ai_index_id: string; ki_id?: string; ki: unknown };
      const id = input.ki_id ?? `ki-${knowledgeIndicators.size + 1}`;
      knowledgeIndicators.set(id, { ai_index_id: input.ai_index_id, ki: input.ki });
      return { output: { id } };
    },
  });

  // `ai.agent`: schema and every config field are the REAL
  // `runAgentStepCommonDefinition` (agent_builder/common/step_types/run_agent_step),
  // per the approved design — only the handler is faked. A canned verdict is
  // consumed per call; running out means the suite under-queued and fails loudly
  // rather than silently degrading through the review's own `inconclusive`
  // fallback, which would mask exactly the seam this suite exists to exercise.
  const runAgentStep = createServerStepDefinition({
    ...runAgentStepCommonDefinition,
    handler: async () => {
      agentCalls += 1;
      const next = agentVerdictQueue.shift();
      if (!next) {
        throw new Error(
          `fake ai.agent: no queued verdict for call #${agentCalls} — call queueAgentVerdict() once per expected ai.agent invocation`
        );
      }
      return {
        output: {
          message: JSON.stringify(next),
          structured_output: next,
          metadata: {
            usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 },
          },
        },
      };
    },
  });

  const backend: FakeAlertZeroBackend = {
    conversations,
    attackStatusCalls,
    knowledgeIndicators,
    queueAgentVerdict: (verdict) => agentVerdictQueue.push(verdict),
    agentCallCount: () => agentCalls,
  };

  return {
    backend,
    stepDefinitions: [
      createConversationStep,
      getConversationMetadataStep,
      updateConversationMetadataStep,
      addAttachmentStep,
      readAttachmentStep,
      updateAttachmentStep,
      setAttackStatusStep,
      createKiStep,
      runAgentStep,
    ],
  };
};
