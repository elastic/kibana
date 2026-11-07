/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type {
  SecurityActivityEvent,
  SecurityActivityType,
  SecurityPolicyControl,
} from '../../common/entity_intelligence/security_events';
import { securityEventsIndex } from '../../common/entity_intelligence/security_events';

interface StoryIdentity {
  id: string;
  name: string;
  entityId: string;
}

export interface GeneratedEntityStoryOptions {
  spaceId: string;
  scenarioId: string;
  startedAt: string;
  user: StoryIdentity;
  host: StoryIdentity;
}

export type GeneratedEntityStoryEvent = SecurityActivityEvent & { entity: { id: string[] } };

interface StoryStep {
  minutesBefore: number;
  activity: SecurityActivityType;
  target: string;
  category: SecurityActivityEvent['event']['category'];
  eventType: SecurityActivityEvent['event']['type'];
  outcome: SecurityActivityEvent['event']['outcome'];
  control?: SecurityPolicyControl;
}

const policy = (
  id: string,
  name: string,
  mode: SecurityPolicyControl['mode'],
  reason: string
): SecurityPolicyControl => ({
  id,
  name,
  version: '1',
  engine: 'Generated policy observations',
  mode,
  decision: 'deny',
  outcome: mode === 'enforce' ? 'blocked' : 'allowed',
  reason,
});

const steps: readonly StoryStep[] = [
  {
    minutesBefore: 12,
    activity: 'suspicious_authentication',
    target: 'Finance fixture sign-in',
    category: ['authentication'],
    eventType: ['start'],
    outcome: 'success',
  },
  {
    minutesBefore: 8,
    activity: 'privilege_change',
    target: 'Finance fixture administrator role',
    category: ['iam'],
    eventType: ['change', 'allowed'],
    outcome: 'success',
    control: policy(
      'entity-intelligence-generated-privilege-policy',
      'Generated privilege approval policy',
      'monitor',
      'Generated fixture observation: an unapproved privilege change was allowed in monitor mode. No real privileges changed.'
    ),
  },
  {
    minutesBefore: 4,
    activity: 'protected_file_access',
    target: 'Protected finance fixture',
    category: ['file'],
    eventType: ['access', 'denied'],
    outcome: 'failure',
    control: policy(
      'entity-intelligence-generated-file-policy',
      'Generated protected-file access policy',
      'enforce',
      'Generated fixture observation: protected-file access was denied and blocked. This does not record a real endpoint enforcement action.'
    ),
  },
  {
    minutesBefore: 1,
    activity: 'unapproved_export',
    target: 'Unapproved export fixture destination',
    category: ['network'],
    eventType: ['allowed'],
    outcome: 'success',
    control: policy(
      'entity-intelligence-generated-export-policy',
      'Generated export destination policy',
      'monitor',
      'Generated fixture observation: a prohibited export was allowed in monitor mode. No real endpoint transfer occurred.'
    ),
  },
];

const validId = (value: string): boolean => /^[a-zA-Z0-9][a-zA-Z0-9_.:@/-]{0,511}$/.test(value);
const validIdentity = ({ id, name, entityId }: StoryIdentity): boolean =>
  validId(id) &&
  validId(entityId) &&
  name.trim() === name &&
  /^[\p{L}\p{N} _.@/-]{1,256}$/u.test(name);

/** Creates deterministic, explicitly generated entity observations without performing endpoint activity. */
export const buildGeneratedEntityStory = (
  options: GeneratedEntityStoryOptions
): GeneratedEntityStoryEvent[] => {
  securityEventsIndex(options.spaceId);
  const started = Date.parse(options.startedAt);
  if (
    !Number.isFinite(started) ||
    started < 12 * 60_000 ||
    new Date(started).toISOString() !== options.startedAt
  ) {
    throw new Error(
      'The story requires a valid canonical UTC timestamp with twelve minutes of history.'
    );
  }
  if (
    !validId(options.scenarioId) ||
    !validIdentity(options.user) ||
    !validIdentity(options.host)
  ) {
    throw new Error(
      'The story requires bounded scenario and entity identifiers and display names.'
    );
  }
  return steps.map((step, index) => ({
    '@timestamp': new Date(started - step.minutesBefore * 60_000).toISOString(),
    event: {
      id: createHash('sha256')
        .update(JSON.stringify([options.spaceId, options.scenarioId, index + 1]))
        .digest('hex'),
      kind: 'event',
      dataset: 'entity_intelligence.security',
      action: `generated_${step.activity}`,
      category: [...step.category],
      type: [...step.eventType],
      outcome: step.outcome,
    },
    user: { id: options.user.id, name: options.user.name },
    host: { id: options.host.id, name: options.host.name },
    entity: { id: [options.user.entityId, options.host.entityId] },
    kibana: { space_id: options.spaceId },
    entity_intelligence: {
      schema_version: 1,
      actor_provenance: 'generated',
      activity: { type: step.activity, target: step.target },
      ...(step.control ? { control: { ...step.control } } : {}),
      scenario: { id: options.scenarioId, step: index + 1, kind: 'generated' },
    },
  }));
};
