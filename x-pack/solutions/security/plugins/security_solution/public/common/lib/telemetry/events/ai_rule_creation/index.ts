/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiRuleCreationTelemetryEvent } from './types';
import { AiRuleCreationEventTypes } from './types';

const sessionStartedEvent: AiRuleCreationTelemetryEvent = {
  eventType: AiRuleCreationEventTypes.SessionStarted,
  schema: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'Unique session ID correlating all events in an AI rule creation session',
        optional: false,
      },
    },
  },
};

const appliedToFormEvent: AiRuleCreationTelemetryEvent = {
  eventType: AiRuleCreationEventTypes.AppliedToForm,
  schema: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'Unique session ID correlating all events in an AI rule creation session',
        optional: false,
      },
    },
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'The type of the AI-generated rule (e.g. esql, query)',
        optional: false,
      },
    },
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
    durationSinceSessionStartMs: {
      type: 'long',
      _meta: {
        description: 'Milliseconds elapsed since the AI rule creation session started',
        optional: false,
      },
    },
    isRegeneration: {
      type: 'boolean',
      _meta: {
        description: 'Whether this is a regeneration (not the first apply to form)',
        optional: false,
      },
    },
  },
};

const ruleCreatedEvent: AiRuleCreationTelemetryEvent = {
  eventType: AiRuleCreationEventTypes.RuleCreated,
  schema: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'Unique session ID correlating all events in an AI rule creation session',
        optional: false,
      },
    },
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'The type of the detection rule (e.g. esql, query, eql)',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Whether the rule was saved as enabled',
        optional: false,
      },
    },
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
    durationSinceSessionStartMs: {
      type: 'long',
      _meta: {
        description: 'Milliseconds from AI session start to rule save',
        optional: false,
      },
    },
  },
};

const ruleEditedEvent: AiRuleCreationTelemetryEvent = {
  eventType: AiRuleCreationEventTypes.RuleEdited,
  schema: {
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'The type of the detection rule (e.g. esql, query, eql)',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Whether the rule is enabled after editing',
        optional: false,
      },
    },
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
        description: 'MITRE ATT&CK technique IDs included in the rule after editing',
        optional: false,
      },
    },
  },
};

const ruleCreationErrorEvent: AiRuleCreationTelemetryEvent = {
  eventType: AiRuleCreationEventTypes.RuleCreationError,
  schema: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'Unique session ID correlating all events in an AI rule creation session',
        optional: false,
      },
    },
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'The type of the detection rule',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message from the failed rule creation',
        optional: false,
      },
    },
  },
};

const sessionAbandonedEvent: AiRuleCreationTelemetryEvent = {
  eventType: AiRuleCreationEventTypes.SessionAbandoned,
  schema: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'Unique session ID of the abandoned AI rule creation session',
        optional: false,
      },
    },
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'The rule type at the time of abandonment',
        optional: false,
      },
    },
    durationSinceSessionStartMs: {
      type: 'long',
      _meta: {
        description: 'Milliseconds from AI session start to abandonment',
        optional: false,
      },
    },
  },
};

export const aiRuleCreationTelemetryEvents = [
  sessionStartedEvent,
  appliedToFormEvent,
  ruleCreatedEvent,
  ruleEditedEvent,
  ruleCreationErrorEvent,
  sessionAbandonedEvent,
];
