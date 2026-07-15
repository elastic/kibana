/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The JSONL row contract for Agent Builder skill eval results.
 *
 * This is the 25-field schema shared between Dhrumil's Python harness
 * (`run_agent_eval.py` -> `agent_eval_full.jsonl`) and the kbn-evals TS port.
 * Any system that produces rows matching this interface can feed
 * {@link renderAgentEvalHtml} to produce a self-contained HTML report.
 */

export interface AgentEvalStep {
  readonly type: 'reasoning' | 'tool_call';
  readonly reasoning?: string;
  readonly tool_id?: string;
  readonly params?: Record<string, unknown>;
}

export interface WorkflowValidationStepStatus {
  readonly step?: string;
  readonly status?: string;
}

export interface WorkflowValidationDetail {
  readonly outcome?: string;
  readonly authored_yaml?: string;
  readonly create_valid?: boolean;
  readonly workflow_id?: string;
  readonly execution_id?: string;
  readonly exec_status?: string;
  readonly create_error?: string;
  readonly exec_error?: string;
  readonly step_statuses?: readonly WorkflowValidationStepStatus[];
}

export interface AgentEvalRow {
  readonly prompt_id: string;
  readonly target_skill?: string;
  readonly category?: string;
  readonly attached_alert?: boolean;
  readonly attached_rule?: boolean;
  readonly model_name: string;
  readonly model_id?: string;
  readonly connector_id?: string;
  readonly status?: string;
  readonly tools_called?: string | readonly string[];
  readonly num_steps?: number;
  readonly input_tokens?: number | string;
  readonly output_tokens?: number | string;
  readonly conversation_id?: string;
  readonly round_id?: string;
  readonly latency_ms?: number;
  readonly response_message?: string;
  readonly wf_validation_detail?: WorkflowValidationDetail;
  readonly wf_validation?: WorkflowValidationDetail;
  readonly error?: string;
  readonly cleanup?: string;
  readonly steps?: readonly AgentEvalStep[];
  readonly http_status?: number;
}

export interface AgentEvalAttachmentMeta {
  readonly _id?: string;
  readonly '@timestamp'?: string;
  readonly rule_name?: string;
  readonly name?: string;
  readonly id?: string;
  readonly type?: string;
}

export interface AgentEvalAttachments {
  readonly alert?: unknown;
  readonly rule?: unknown;
  readonly alert_meta?: AgentEvalAttachmentMeta;
  readonly rule_meta?: AgentEvalAttachmentMeta;
}

export interface AgentEvalPromptsMap {
  readonly [promptId: string]: string;
}

export interface RenderAgentEvalHtmlOptions {
  readonly rows: readonly AgentEvalRow[];
  readonly promptsMap?: AgentEvalPromptsMap;
  readonly attachments?: AgentEvalAttachments;
  readonly title?: string;
  readonly subtitle?: string;
}
