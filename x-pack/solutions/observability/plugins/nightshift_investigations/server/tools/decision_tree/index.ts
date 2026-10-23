/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { LearningRecord } from '@kbn/nightshift-decision-trees';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import { createDecisionTreeStore } from '../../decision_trees/store';
import { createLearningStore } from '../../decision_trees/learning_store';
import type { AppliedWriteRecord, WriteProvenance } from '../../investigation_round';
import {
  RECORD_REMEDIATION_TOOL_ID,
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
  createRecordRemediationTool,
  createRecordSystemLearningTool,
  createRecordToolLearningTool,
} from './learning_tools';
import {
  DECISION_TREE_SUBMIT_TOOL_ID,
  createSubmitOptimizerResultTool,
} from './submit_optimizer_result_tool';

export { DECISION_TREE_PROMPT_TOOLS } from './prompt_tools';
export {
  DECISION_TREE_SUBMIT_TOOL_ID,
  RECORD_REMEDIATION_TOOL_ID,
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
};

/**
 * Learning tools the reinforcement agent gets only on follow-up turns. An initial investigation
 * has had no human correction yet, so there is nothing durable to record.
 */
export const DECISION_TREE_LEARNING_TOOL_IDS = [
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
  RECORD_REMEDIATION_TOOL_ID,
] as const;

/** Every tool the reinforcement agent owns, in the order it is expected to reach for them. */
export const DECISION_TREE_TOOL_IDS = [
  ...DECISION_TREE_LEARNING_TOOL_IDS,
  DECISION_TREE_SUBMIT_TOOL_ID,
] as const;

export interface ReinforcementSessionState {
  provenance?: WriteProvenance;
  learnings: LearningRecord[];
  appliedWrites: AppliedWriteRecord[];
}

/**
 * In-memory registry keyed by the space-scoped reinforcement conversation id
 * (`<spaceId>__<reinforcementConversationId>`). Bridges the standalone `agentBuilder.agents.runAgent`
 * boundary so `decisionTreeReinforce` can pass the investigator's `{ conversationId, roundId, workflowExecutionId }`
 * provenance into the reinforcement tools and collect their `applied_writes` when the turn finishes.
 */
class ReinforcementSessionRegistry {
  private readonly sessions = new Map<string, ReinforcementSessionState>();

  private getOrCreate(scopedConversationId: string): ReinforcementSessionState {
    let existing = this.sessions.get(scopedConversationId);
    if (!existing) {
      existing = { learnings: [], appliedWrites: [] };
      this.sessions.set(scopedConversationId, existing);
    }
    return existing;
  }

  registerSession(scopedConversationId: string, provenance: WriteProvenance): void {
    const state = this.getOrCreate(scopedConversationId);
    state.provenance = provenance;
  }

  getProvenance(scopedConversationId: string): WriteProvenance | undefined {
    return this.sessions.get(scopedConversationId)?.provenance;
  }

  recordLearning(scopedConversationId: string, record: LearningRecord): void {
    const state = this.getOrCreate(scopedConversationId);
    state.learnings.push(record);
  }

  peekLearnings(scopedConversationId: string): LearningRecord[] {
    return this.sessions.get(scopedConversationId)?.learnings ?? [];
  }

  drainLearnings(scopedConversationId: string): LearningRecord[] {
    const state = this.sessions.get(scopedConversationId);
    if (!state) {
      return [];
    }
    const buffered = state.learnings;
    state.learnings = [];
    if (!state.provenance && state.appliedWrites.length === 0) {
      this.sessions.delete(scopedConversationId);
    }
    return buffered;
  }

  recordAppliedWrite(scopedConversationId: string, write: AppliedWriteRecord): void {
    const state = this.getOrCreate(scopedConversationId);
    state.appliedWrites.push(write);
  }

  drainSession(scopedConversationId: string): ReinforcementSessionState {
    const state = this.sessions.get(scopedConversationId);
    this.sessions.delete(scopedConversationId);
    return state ?? { learnings: [], appliedWrites: [] };
  }
}

export const reinforcementSessionRegistry = new ReinforcementSessionRegistry();

export const createDecisionTreeTools = ({
  getSandboxStart,
  connectorNames,
  getSpaceId,
  getUsername,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  connectorNames: readonly string[];
  getSpaceId: (request: KibanaRequest) => string;
  getUsername?: (request: KibanaRequest) => string | undefined;
  logger: Logger;
}): Array<BuiltinToolDefinition<never>> => {
  const getTreeStore = (esClient: ElasticsearchClient, request: KibanaRequest) =>
    createDecisionTreeStore({ esClient, logger, spaceId: getSpaceId(request) });
  const getLearningStore = (esClient: ElasticsearchClient, request: KibanaRequest) =>
    createLearningStore({ esClient, logger, spaceId: getSpaceId(request) });

  const onRecord = (conversationId: string, record: LearningRecord) =>
    reinforcementSessionRegistry.recordLearning(conversationId, record);
  const peekLearnings = (conversationId: string): LearningRecord[] =>
    reinforcementSessionRegistry.peekLearnings(conversationId);
  const drainLearnings = (conversationId: string): LearningRecord[] =>
    reinforcementSessionRegistry.drainLearnings(conversationId);
  const getProvenance = (conversationId: string): WriteProvenance | undefined =>
    reinforcementSessionRegistry.getProvenance(conversationId);
  const onAppliedWrite = (conversationId: string, write: AppliedWriteRecord): void =>
    reinforcementSessionRegistry.recordAppliedWrite(conversationId, write);

  return [
    createRecordSystemLearningTool({
      getStore: getLearningStore,
      logger,
      getSpaceId,
      onRecord,
      getProvenance,
      onAppliedWrite,
    }),
    createRecordToolLearningTool({
      getStore: getLearningStore,
      logger,
      connectorNames,
      getSpaceId,
      onRecord,
      getProvenance,
      onAppliedWrite,
    }),
    createRecordRemediationTool({
      getStore: getLearningStore,
      logger,
      getSpaceId,
      onRecord,
      getProvenance,
      onAppliedWrite,
    }),
    createSubmitOptimizerResultTool({
      getSandboxStart,
      getStore: getTreeStore,
      getSpaceId,
      getUsername,
      peekLearnings,
      drainLearnings,
      getProvenance,
      onAppliedWrite,
      logger,
    }),
  ] as Array<BuiltinToolDefinition<never>>;
};
