/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderTelemetryEvent } from './types';
import { AgentBuilderEventTypes } from './types';

export const optInStepReachedEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.OptInStepReached,
  schema: {
    step: {
      type: 'keyword',
      _meta: {
        description: 'Step in the opt-in flow (initial|confirmation_modal|final)',
        optional: false,
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour)',
        optional: false,
      },
    },
  },
};

export const optInConfirmationShownEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.OptInConfirmationShown,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour)',
        optional: false,
      },
    },
  },
};

export const optInConfirmedEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.OptInConfirmed,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour)',
        optional: false,
      },
    },
  },
};

export const optInCancelledEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.OptInCancelled,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour)',
        optional: false,
      },
    },
    step: {
      type: 'keyword',
      _meta: {
        description: 'Step where cancellation occurred (initial|confirmation_modal|final)',
        optional: false,
      },
    },
  },
};

export const optOutEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.OptOut,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description: 'Source of the opt-out action (security_settings_menu|stack_management)',
        optional: false,
      },
    },
  },
};

export const addToChatClickedEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.AddToChatClicked,
  schema: {
    pathway: {
      type: 'keyword',
      _meta: {
        description:
          'Pathway where Add to Chat was clicked (alerts_flyout|entity_flyout|rules_table|rule_creation|attack_discovery|other)',
        optional: false,
      },
    },
    attachmentType: {
      type: 'keyword',
      _meta: {
        description: 'Type of attachment (alert|entity|rule|attack_discovery|other)',
        optional: true,
      },
    },
    attachmentCount: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
  },
};

export const messageSentEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.MessageSent,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: false,
      },
    },
    messageLength: {
      type: 'integer',
      _meta: {
        description: 'Length of the message in characters',
        optional: true,
      },
    },
    hasAttachments: {
      type: 'boolean',
      _meta: {
        description: 'Whether the message has attachments',
        optional: false,
      },
    },
    attachmentCount: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
    attachmentTypes: {
      type: 'array',
      items: {
        type: 'keyword',
      },
      _meta: {
        description: 'Types of attachments',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description: 'ID of the agent',
        optional: true,
      },
    },
  },
};

export const messageReceivedEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.MessageReceived,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: false,
      },
    },
    responseLength: {
      type: 'integer',
      _meta: {
        description: 'Length of the response in characters',
        optional: true,
      },
    },
    roundNumber: {
      type: 'integer',
      _meta: {
        description: 'Round number in the conversation',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description: 'ID of the agent',
        optional: true,
      },
    },
    toolsUsed: {
      type: 'array',
      items: {
        type: 'keyword',
      },
      _meta: {
        description: 'Names of tools used in the response',
        optional: true,
      },
    },
    toolCount: {
      type: 'integer',
      _meta: {
        description: 'Number of tools used',
        optional: true,
      },
    },
    toolsInvoked: {
      type: 'array',
      items: {
        type: 'keyword',
      },
      _meta: {
        description:
          'Tool IDs invoked in the round (normalized: built-in tools keep ID, custom tools become "Custom")',
        optional: true,
      },
    },
  },
};

export const errorEvent: AgentBuilderTelemetryEvent = {
  eventType: AgentBuilderEventTypes.Error,
  schema: {
    errorType: {
      type: 'keyword',
      _meta: {
        description:
          'Type of error (e.g., network_error, tool_execution_error, message_send_error, opt_in_error)',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'Error message',
        optional: true,
      },
    },
    context: {
      type: 'keyword',
      _meta: {
        description:
          'Context where error occurred (opt_in|message_send|tool_execution|invocation|other)',
        optional: true,
      },
    },
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID if applicable',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description: 'Agent ID if applicable',
        optional: true,
      },
    },
    pathway: {
      type: 'keyword',
      _meta: {
        description: 'Pathway where error occurred',
        optional: true,
      },
    },
  },
};

export const agentBuilderTelemetryEvents = [
  optInStepReachedEvent,
  optInConfirmationShownEvent,
  optInConfirmedEvent,
  optInCancelledEvent,
  optOutEvent,
  addToChatClickedEvent,
  messageSentEvent,
  messageReceivedEvent,
  errorEvent,
];
