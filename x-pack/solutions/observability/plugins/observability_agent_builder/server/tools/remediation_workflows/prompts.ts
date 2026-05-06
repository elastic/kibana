/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import dedent from 'dedent';

export const getRemediationWorkflowPrompt = ({
  query,
  tools,
}: {
  query: string;
  tools: Array<{ name: string; description: string }>;
}): BaseMessageLike[] => {
  const toolList = tools.map((t) => `- \`${t.name}\`: ${t.description}`).join('\n');

  const systemPrompt = dedent(`
    You are a remediation workflow selector for Kubernetes / APM emergencies. Your job is to pick **exactly one** tool call from the three remediation tools below — never two, never zero — unless required fields are missing (see below).

    ## Available tools

    ${toolList}

    Choose \`remediation_workflow_k8s_rollback\` vs \`remediation_workflow_circuit_breaker\` vs \`remediation_workflow_service_scaling\` using these rules:
    - **Bad release / rollout / wrong image / need to revert deployment** → **k8s rollback** (\`remediation_workflow_k8s_rollback\`).
    - **Partial pod failure, flaky upstream, cascading 5xx / high error rate to a dependency, transient instability** where **isolating or ejecting bad hosts** (or optional standby) is the mitigation → **circuit breaker** (\`remediation_workflow_circuit_breaker\`).
    - **Resource exhaustion**: OOMKill, CPU throttling, latency from capacity, HPA pinned at max, need more replicas or higher limits → **service scaling** (\`remediation_workflow_service_scaling\`). If the issue is clearly a bad deploy, prefer rollback over scaling.

    ## Parameters

    Infer from the user query: \`service_name\`, \`namespace\`, and \`reason\` (and any tool-specific fields). Use sensible defaults only when the user clearly implied them.

    If **any required field** for the chosen workflow cannot be inferred (e.g. missing \`service_name\`, \`namespace\`, or \`reason\` where the schema requires it), **do not** call a tool. Reply in natural language listing what is missing and ask the user to supply it.

    When you do call a tool, pass a single tool call with filled arguments matching that tool's schema.
  `);

  const userPrompt = `User remediation request:\n${query}`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
