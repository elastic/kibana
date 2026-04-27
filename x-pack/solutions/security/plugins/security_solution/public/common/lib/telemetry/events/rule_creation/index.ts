/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreationTelemetryEvent } from './types';
import { RuleCreationEventTypes } from './types';

const creationSourceSchema = {
  type: 'keyword' as const,
  _meta: {
    description: 'How the rule was created: "ai" or "manual"',
    optional: false as const,
  },
};

const sessionIdSchema = {
  type: 'keyword' as const,
  _meta: {
    description: 'Unique session ID correlating events in a rule creation session',
    optional: false as const,
  },
};

const ruleTypeSchema = {
  type: 'keyword' as const,
  _meta: {
    description: 'The type of the detection rule (e.g. esql, query, eql)',
    optional: false as const,
  },
};

const enabledSchema = {
  type: 'boolean' as const,
  _meta: {
    description: 'Whether the rule is enabled',
    optional: false as const,
  },
};

const numberOfAiEditsSchema = {
  type: 'long' as const,
  _meta: {
    description: 'How many times AI-generated rule was applied to the form (0 for manual)',
    optional: false as const,
  },
};

const durationSchema = {
  type: 'long' as const,
  _meta: {
    description: 'Milliseconds elapsed since the rule creation session started (0 for manual)',
    optional: false as const,
  },
};

const creationInitializedEvent: RuleCreationTelemetryEvent = {
  eventType: RuleCreationEventTypes.CreationInitialized,
  schema: {
    creationSource: creationSourceSchema,
    sessionId: sessionIdSchema,
  },
};

const aiAppliedToFormEvent: RuleCreationTelemetryEvent = {
  eventType: RuleCreationEventTypes.AiAppliedToForm,
  schema: {
    ruleType: ruleTypeSchema,
    sessionId: sessionIdSchema,
    durationSinceSessionStartMs: durationSchema,
  },
};

const ruleCreatedEvent: RuleCreationTelemetryEvent = {
  eventType: RuleCreationEventTypes.RuleCreated,
  schema: {
    creationSource: creationSourceSchema,
    sessionId: sessionIdSchema,
    ruleType: ruleTypeSchema,
    enabled: enabledSchema,
    numberOfAiEdits: numberOfAiEditsSchema,
    threatTechniques: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'MITRE ATT&CK technique ID',
          optional: false,
        },
      },
      _meta: {
        description: 'MITRE ATT&CK technique IDs included in the rule',
        optional: false,
      },
    },
    durationSinceSessionStartMs: durationSchema,
  },
};

const ruleEditedEvent: RuleCreationTelemetryEvent = {
  eventType: RuleCreationEventTypes.RuleEdited,
  schema: {
    creationSource: creationSourceSchema,
    sessionId: sessionIdSchema,
    ruleType: ruleTypeSchema,
    enabled: enabledSchema,
    numberOfAiEdits: numberOfAiEditsSchema,
    durationSinceSessionStartMs: durationSchema,
  },
};

const ruleCreationErrorEvent: RuleCreationTelemetryEvent = {
  eventType: RuleCreationEventTypes.RuleCreationError,
  schema: {
    creationSource: creationSourceSchema,
    sessionId: sessionIdSchema,
    ruleType: ruleTypeSchema,
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message from the failed rule creation',
        optional: false,
      },
    },
    numberOfAiEdits: numberOfAiEditsSchema,
    durationSinceSessionStartMs: durationSchema,
  },
};

const creationAbandonedEvent: RuleCreationTelemetryEvent = {
  eventType: RuleCreationEventTypes.CreationAbandoned,
  schema: {
    creationSource: creationSourceSchema,
    sessionId: sessionIdSchema,
    ruleType: ruleTypeSchema,
    numberOfAiEdits: numberOfAiEditsSchema,
    durationSinceSessionStartMs: durationSchema,
  },
};

export const ruleCreationTelemetryEvents = [
  creationInitializedEvent,
  aiAppliedToFormEvent,
  ruleCreatedEvent,
  ruleEditedEvent,
  ruleCreationErrorEvent,
  creationAbandonedEvent,
];
