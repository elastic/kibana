/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reconstruct an ordered agent step trace (reasoning + tool calls) from the
 * OTLP `gen_ai.output.messages` on a run's chat spans.
 *
 * The `--scores es:<run>` export only captures `tool_call` steps, so the
 * rendered "Step trace" drops the model's THINK/reasoning narration that the
 * original Chrysalis report shows. Each assistant message in `gen_ai.output.messages`
 * carries `parts[]` interleaving `{type:'text'}` (reasoning) and
 * `{type:'tool_call'}` (tool invocations); we flatten those into the same
 * `steps[]` shape the renderer already understands.
 */

import { loadTracingEsAuth, type TracingEsAuth } from './trace_run_source';

interface MessagePart {
  type?: string;
  content?: string;
  text?: string;
  name?: string;
  arguments?: unknown;
}

interface OutputMessage {
  role?: string;
  parts?: MessagePart[];
}

export interface AgentStep {
  type: 'reasoning' | 'tool_call';
  reasoning?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

interface SpanHit {
  _source?: { attributes?: Record<string, unknown> };
}

async function esSearch(auth: TracingEsAuth, body: unknown): Promise<SpanHit[]> {
  const res = await fetch(`${auth.url}/traces-*,.ds-traces-*/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${auth.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`tracing ES ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { hits?: { hits?: SpanHit[] } };
  return json?.hits?.hits ?? [];
}

function parseMessages(raw: unknown): OutputMessage[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Tool-call `arguments` arrive as a JSON string on the span; parse them into a
 * real object so the renderer shows `key=value` params instead of spreading the
 * raw string into per-character entries.
 */
function parseArguments(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Build ordered steps for one trace. Chat spans are time-sorted; within each
 * assistant message, text parts become reasoning steps and tool_call parts
 * become tool_call steps, preserving the model's actual think -> act order.
 */
export async function enrichStepsFromTrace(
  auth: TracingEsAuth,
  traceId: string,
  modelId?: string
): Promise<AgentStep[]> {
  const hits = await esSearch(auth, {
    size: 200,
    query: {
      bool: {
        must: [
          { term: { 'trace.id': traceId } },
          { exists: { field: 'attributes.gen_ai.output.messages' } },
        ],
      },
    },
    sort: [{ '@timestamp': 'asc' }],
    _source: ['attributes.gen_ai.output.messages', 'attributes.gen_ai.request.model'],
  });

  const steps: AgentStep[] = [];
  for (const hit of hits) {
    const attrs = hit?._source?.attributes ?? {};
    const spanModel = attrs['gen_ai.request.model'];
    // Skip the title-generator (haiku) and any non-subject model spans.
    const modelMatches = !modelId || !spanModel || spanModel === modelId;
    if (!modelMatches) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const messages = parseMessages(attrs['gen_ai.output.messages']);
    for (const message of messages) {
      const isAssistant = !message.role || message.role === 'assistant';
      if (!isAssistant) {
        // eslint-disable-next-line no-continue
        continue;
      }
      for (const part of message.parts ?? []) {
        if (part.type === 'text') {
          const text = (part.content ?? part.text ?? '').trim();
          if (text) steps.push({ type: 'reasoning', reasoning: text });
        } else if (part.type === 'tool_call') {
          steps.push({
            type: 'tool_call',
            tool_id: part.name ?? '?',
            params: parseArguments(part.arguments),
            results: [],
          });
        }
      }
    }
  }
  return steps;
}

export { loadTracingEsAuth };
