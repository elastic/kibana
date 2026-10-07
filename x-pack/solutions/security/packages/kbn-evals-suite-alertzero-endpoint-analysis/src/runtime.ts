/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import {
  PROPOSALS_INTERNAL_URL,
  PROPOSALS_API_VERSION,
  type ListProposalsResponse,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
  proposalSchema,
} from '@kbn/proposals-common';
import { analysisWorkflowId, workerWorkflowId, proposalWorkflowId } from './contracts';

const workflowHeaders = { 'elastic-api-version': '2023-10-31', 'kbn-xsrf': 'true' };
const proposalHeaders = {
  'elastic-api-version': PROPOSALS_API_VERSION,
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
};
export class AlertZeroRuntime {
  readonly executionIds = new Set<string>();
  constructor(public readonly fetch: HttpHandler) {}
  async run(workflowId: string, inputs: Record<string, unknown>) {
    const result = await this.fetch<{ workflowExecutionId: string }>(
      workflowId === workerWorkflowId
        ? '/api/workflows/test'
        : `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
      {
        method: 'POST',
        headers: workflowHeaders,
        body: JSON.stringify(workflowId === workerWorkflowId ? { workflowId, inputs } : { inputs }),
      }
    );
    this.executionIds.add(result.workflowExecutionId);
    return result.workflowExecutionId;
  }
  async read(id: string) {
    return this.fetch<WorkflowExecutionDto>(`/api/workflows/executions/${encodeURIComponent(id)}`, {
      headers: workflowHeaders,
    });
  }
  async wait(id: string, accept: (execution: WorkflowExecutionDto) => boolean, timeout = 180_000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const execution = await this.read(id);
      if (accept(execution)) return execution;
      if ([ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(execution.status)) {
        throw new Error(
          `AlertZero execution ${id}: ${execution.status}: ${JSON.stringify(execution.error)}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`AlertZero execution ${id} timed out`);
  }
  async proposals(conversationId: string) {
    const response = await this.fetch<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
      headers: proposalHeaders,
      query: { conversationId, size: 100 },
    });
    return response.proposals.map((proposal) => proposalSchema.parse(proposal));
  }
  async readProposal(id: string) {
    return proposalSchema.parse(
      await this.fetch(PROPOSAL_BY_ID_URL.replace('{id}', encodeURIComponent(id)), {
        headers: proposalHeaders,
      })
    );
  }
  async dismiss(id: string) {
    await this.fetch(PROPOSAL_DISMISS_URL.replace('{id}', encodeURIComponent(id)), {
      method: 'POST',
      headers: proposalHeaders,
      body: JSON.stringify({ dismissReason: 'no_reason', rationale: 'AlertZero eval cleanup' }),
    });
  }
  async cancelAll() {
    for (const id of this.executionIds) {
      const execution = await this.read(id);
      if (
        ![ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(
          execution.status
        )
      ) {
        await this.fetch(`/api/workflows/executions/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          headers: workflowHeaders,
        });
      }
    }
  }
  async assertInstalled() {
    for (const id of [workerWorkflowId, analysisWorkflowId, proposalWorkflowId]) {
      const workflow = await this.fetch<{ id: string; valid: boolean }>(
        `/api/workflows/workflow/${encodeURIComponent(id)}`,
        { headers: workflowHeaders }
      );
      if (workflow.id !== id || !workflow.valid)
        throw new Error(`Required production workflow unavailable: ${id}`);
    }
  }
}

export const seedAlertZeroEndpoint = async (es: Client, fetch: HttpHandler) => {
  const id = randomUUID();
  const host = `AZ-EVAL-${id.slice(0, 8)}`;
  const index = `logs-endpoint.events.process-alertzero-eval-${id}`;
  const aiIndexId = `alertzero-eval-${id}`;
  const kiId = `alertzero-ki-${id}`;
  const conversation = await fetch<{ id: string }>('/api/agent_builder/conversations', {
    method: 'POST',
    headers: workflowHeaders,
    body: JSON.stringify({ title: `AlertZero endpoint eval ${id}`, template_id: 'investigation' }),
  });
  await es.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        event: {
          properties: {
            id: { type: 'keyword' },
            category: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
        host: { properties: { name: { type: 'keyword' } } },
        process: {
          properties: {
            name: { type: 'keyword' },
            command_line: { type: 'keyword' },
            entity_id: { type: 'keyword' },
            parent: { properties: { name: { type: 'keyword' }, entity_id: { type: 'keyword' } } },
          },
        },
      },
    },
  });
  const now = Date.now();
  const command = 'powershell.exe -EncodedCommand SQBFAFgA';
  const events = [
    { name: 'WINWORD.EXE', command_line: 'WINWORD.EXE invoice.docm', parent: 'explorer.exe' },
    { name: 'powershell.exe', command_line: command, parent: 'WINWORD.EXE' },
  ];
  const eventIds = events.map((_, i) => `${id}-${i}`);
  for (const [i, event] of events.entries()) {
    await es.index({
      index,
      id: eventIds[i],
      document: {
        '@timestamp': new Date(now - (2 - i) * 60_000).toISOString(),
        event: { id: eventIds[i], category: ['process'], type: ['start'], kind: 'event' },
        host: { name: host, id: host, os: { type: 'windows' } },
        agent: { id: `alertzero-eval-${id}`, type: 'endpoint' },
        process: {
          name: event.name,
          command_line: event.command_line,
          entity_id: eventIds[i],
          parent: { name: event.parent, entity_id: i ? eventIds[0] : 'root' },
        },
      },
      refresh: 'wait_for',
    });
  }
  await fetch('/api/context-engine/ai-indices', {
    method: 'POST',
    headers: workflowHeaders,
    body: JSON.stringify({
      id: aiIndexId,
      description: 'Isolated AlertZero endpoint eval indicators',
      sources: [{ type: 'index', value: index }],
      dest: { type: 'index', value: `ai-index-idx-${aiIndexId}` },
    }),
  });
  await es.index({
    index: `ai-index-idx-${aiIndexId}`,
    id: kiId,
    refresh: 'wait_for',
    document: {
      '@timestamp': new Date().toISOString(),
      id: kiId,
      type: 'security.analyze_endpoint',
      name: 'AlertZero endpoint eval',
      content: `Analyze ${host}`,
      attributes: {
        space_id: 'default',
        status: 'pending',
        investigation_id: conversation.id,
        attack_discovery_alert_id: `alertzero-discovery-${id}`,
        host_name: host,
        autonomy: 'manual',
        reason: 'Encoded PowerShell launched by document process',
      },
    },
  });
  return {
    host,
    eventIds,
    command: 'EncodedCommand',
    index,
    aiIndexId,
    kiId,
    conversationId: conversation.id,
    async cleanup() {
      await fetch(`/api/agent_builder/conversations/${encodeURIComponent(conversation.id)}`, {
        method: 'DELETE',
        headers: workflowHeaders,
      });
      await fetch(`/api/context-engine/ai-indices/${encodeURIComponent(aiIndexId)}`, {
        method: 'DELETE',
        headers: workflowHeaders,
      });
      await es.indices.delete({
        index: [index, `ai-index-idx-${aiIndexId}`],
        ignore_unavailable: true,
      });
    },
  };
};
