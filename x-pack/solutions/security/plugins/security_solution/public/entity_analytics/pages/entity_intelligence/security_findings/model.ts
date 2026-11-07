/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parsePolicyEvidence, parseSecurityInvocation } from './evidence_model';
import type {
  SecurityAgentProvider,
  SecurityAlertHit,
  SecurityControlFields,
  SecurityEvidenceReference,
  SecurityFinding,
  SecuritySearchResponse,
} from './types';

export const securityString = (
  value: SecurityControlFields['id'],
  maximum = 512
): string | undefined => {
  const scalar = Array.isArray(value) ? value[0] : value;
  return typeof scalar === 'string' && scalar.trim() ? scalar.trim().slice(0, maximum) : undefined;
};

export const securityScalarString = (
  value: SecurityControlFields['id'],
  maximum = 512
): string | undefined => (typeof value === 'string' ? securityString(value, maximum) : undefined);

export const isSecurityAgentProvider = (
  value: string | undefined
): value is SecurityAgentProvider =>
  value === 'codex' ||
  value === 'cursor' ||
  value === 'claude_desktop' ||
  value === 'google_adk' ||
  value === 'agent_builder';

const stringValues = (value: SecurityControlFields['id']): string[] =>
  (Array.isArray(value) ? value : [value]).flatMap((item) => {
    const text = securityString(item);
    return text ? [text] : [];
  });

export const securitySingletonString = (
  value: SecurityControlFields['id'],
  maximum = 512
): string | undefined =>
  securityScalarString(Array.isArray(value) && value.length === 1 ? value[0] : value, maximum);

const identity = (
  id: SecurityControlFields['id'],
  name: SecurityControlFields['id']
): { id?: string; name?: string } | undefined => {
  if ([id, name].some((value) => Array.isArray(value) && value.length > 1)) return undefined;
  const parsed = { id: securitySingletonString(id), name: securitySingletonString(name, 160) };
  return parsed.id || parsed.name ? parsed : undefined;
};

/** Projects alert metadata without interpreting tool success, free text, or drift as prevention. */
export const toSecurityFinding = (
  hit: SecurityAlertHit,
  spaceId: string
): SecurityFinding | undefined => {
  const source = hit._source;
  if (!source || !hit._id || !hit._index) return undefined;
  const spaces = stringValues(source['kibana.space_ids'] ?? source.kibana?.space_ids);
  if (spaces.length && !spaces.includes(spaceId)) return undefined;
  const detectedTime = securityString(source['@timestamp']);
  const detectedAt =
    detectedTime && Number.isFinite(Date.parse(detectedTime)) ? detectedTime : undefined;
  const observedTime = securityString(
    source['kibana.alert.original_time'] ?? source.kibana?.alert?.original_time
  );
  const timestamp =
    observedTime && Number.isFinite(Date.parse(observedTime)) ? observedTime : detectedAt;
  const severity = securityString(
    source['kibana.alert.severity'] ?? source.kibana?.alert?.severity
  );
  if (
    !timestamp ||
    !Number.isFinite(Date.parse(timestamp)) ||
    (severity !== 'low' && severity !== 'medium' && severity !== 'high' && severity !== 'critical')
  )
    return undefined;
  const status = securityString(
    source['kibana.alert.workflow_status'] ?? source.kibana?.alert?.workflow_status
  );
  const ruleName =
    securityString(source['kibana.alert.rule.name'] ?? source.kibana?.alert?.rule?.name, 240) ??
    i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.security.findingFallback', {
      defaultMessage: 'Detection alert',
    });
  const context =
    source.entity_intelligence?.schema_version === 1 ? source.entity_intelligence : undefined;
  const scenarioId = securityScalarString(context?.scenario?.id);
  const scenarioKind = securityScalarString(context?.scenario?.kind);
  const scenarioStep = context?.scenario?.step;
  const scenario: SecurityFinding['scenario'] =
    scenarioId &&
    (scenarioKind === 'controlled' || scenarioKind === 'generated') &&
    typeof scenarioStep === 'number' &&
    Number.isSafeInteger(scenarioStep) &&
    scenarioStep > 0
      ? { id: scenarioId, kind: scenarioKind, step: scenarioStep }
      : undefined;
  const control = context?.control;
  const policyId = securityScalarString(control?.id);
  const policyName = securityScalarString(control?.name, 160);
  const engine = securityScalarString(control?.engine, 160);
  const mode = securityScalarString(control?.mode);
  const decision = securityScalarString(control?.decision);
  const explicitOutcome = securityScalarString(control?.outcome);
  const policy: SecurityFinding['policy'] =
    control &&
    policyId &&
    policyName &&
    engine &&
    (mode === 'enforce' || mode === 'monitor') &&
    (decision === 'deny' || decision === 'allow')
      ? {
          id: policyId,
          name: policyName,
          engine,
          mode,
          decision,
          reason: securityScalarString(control?.reason, 800),
          ...parsePolicyEvidence(control),
        }
      : undefined;
  const blocked =
    policy?.mode === 'enforce' && policy.decision === 'deny' && explicitOutcome === 'blocked';
  const allowed = Boolean(policy && explicitOutcome === 'allowed');
  const violated = policy?.decision === 'deny' && allowed;
  const actor = identity(
    source['user.id'] ?? source.user?.id,
    source['user.name'] ?? source.user?.name
  );
  const rawAgentId = source['agent.id'] ?? source.agent?.id;
  const rawProvider = source['agent.type'] ?? source.agent?.type;
  const rawAgentName = source['agent.name'] ?? source.agent?.name;
  const ambiguousAgent = [rawAgentId, rawProvider, rawAgentName].some(
    (value) => Array.isArray(value) && value.length > 1
  );
  const ecsAgentId = securitySingletonString(rawAgentId);
  const ecsProvider = securitySingletonString(rawProvider);
  const agentId = securityScalarString(context?.agent?.id) ?? ecsAgentId;
  const provider = securityScalarString(context?.agent?.provider) ?? ecsProvider;
  const matchingAgent =
    !ambiguousAgent &&
    (!ecsAgentId || ecsAgentId === agentId) &&
    (!ecsProvider || ecsProvider === provider);
  const agent: SecurityFinding['agent'] =
    agentId && isSecurityAgentProvider(provider) && matchingAgent
      ? {
          id: agentId,
          provider,
          name: securitySingletonString(context?.agent?.name ?? rawAgentName, 160),
          sessionId: securityScalarString(context?.agent?.session_id),
        }
      : undefined;
  const ancestors = (
    source['kibana.alert.ancestors'] ??
    source.kibana?.alert?.ancestors ??
    []
  ).flatMap((ancestor): SecurityEvidenceReference[] => {
    const index =
      typeof ancestor.index === 'string' && ancestor.index.trim() ? ancestor.index : undefined;
    const id = typeof ancestor.id === 'string' && ancestor.id.trim() ? ancestor.id : undefined;
    return index && id ? [{ index, id }] : [];
  });
  return {
    id: JSON.stringify([hit._index, hit._id]),
    timestamp,
    detectedAt,
    traceId: securitySingletonString(source['trace.id'] ?? source.trace?.id),
    scenario,
    title: ruleName,
    severity,
    status:
      status === 'open' || status === 'acknowledged' || status === 'closed' ? status : 'unknown',
    kind: blocked ? 'guardrail' : violated ? 'policy_violation' : 'detection',
    outcome: blocked ? 'blocked' : allowed ? 'allowed' : 'unknown',
    reason: securityString(source['kibana.alert.reason'] ?? source.kibana?.alert?.reason, 800),
    action: securityString(
      context?.activity?.type ?? source['event.action'] ?? source.event?.action,
      160
    ),
    target: securityString(context?.activity?.target, 320),
    actor: actor
      ? { ...actor, provenance: securityScalarString(context?.actor_provenance, 160) }
      : undefined,
    host: identity(source['host.id'] ?? source.host?.id, source['host.name'] ?? source.host?.name),
    service: identity(
      source['service.id'] ?? source.service?.id,
      source['service.name'] ?? source.service?.name
    ),
    agent,
    invocation: parseSecurityInvocation(context, agent, spaceId),
    rule: {
      id: securityString(source['kibana.alert.rule.uuid'] ?? source.kibana?.alert?.rule?.uuid),
      name: ruleName,
    },
    policy,
    source: { index: hit._index, id: hit._id },
    ancestors,
    entityIds: stringValues(source['entity.id'] ?? source.entity?.id),
  };
};

export const securitySearchPartial = (response: SecuritySearchResponse): boolean =>
  Boolean(
    response.timed_out ||
      response.timeout ||
      (response._shards?.failed ?? 0) > 0 ||
      (typeof response.hits.total === 'object' && response.hits.total.relation !== 'eq')
  );

export const securitySearchTotal = (response: SecuritySearchResponse): number | undefined => {
  const total = response.hits.total;
  const value = typeof total === 'number' ? total : total?.value;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
};

/** Checks an actual ancestor pair because Elasticsearch object-array predicates can cross-match. */
export const hasSecurityAncestor = (
  finding: SecurityFinding,
  index: string,
  ids: ReadonlySet<string>
): boolean =>
  finding.ancestors.some((ancestor) => ancestor.index === index && ids.has(ancestor.id));
