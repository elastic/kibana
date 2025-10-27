/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, SchemaValue } from '@kbn/core/server';

export const KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT: EventTypeOpts<{
  model: string;
  resourceAccessed?: string;
  resultCount: number;
  responseTime: number;
}> = {
  eventType: 'knowledge_base_execution_success',
  schema: {
    model: {
      type: 'keyword',
      _meta: {
        description: 'ELSER model used to execute the knowledge base query',
      },
    },
    resourceAccessed: {
      type: 'keyword',
      _meta: {
        description: 'Which knowledge base resource was accessed',
        optional: true,
      },
    },
    resultCount: {
      type: 'long',
      _meta: {
        description: 'Number of documents returned from Elasticsearch',
      },
    },
    responseTime: {
      type: 'long',
      _meta: {
        description: `How long it took for Elasticsearch to respond to the knowledge base query`,
      },
    },
  },
};

export const KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT: EventTypeOpts<{
  model: string;
  resourceAccessed?: string;
  errorMessage: string;
}> = {
  eventType: 'knowledge_base_execution_error',
  schema: {
    model: {
      type: 'keyword',
      _meta: {
        description: 'ELSER model used to execute the knowledge base query',
      },
    },
    resourceAccessed: {
      type: 'keyword',
      _meta: {
        description: 'Which knowledge base resource was accessed',
        optional: true,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },
  },
};

const toolCountSchema: SchemaValue<number | undefined> = {
  type: 'long',
  _meta: {
    description: 'Number of times tool was invoked.',
    optional: true,
  },
};

export const INVOKE_ASSISTANT_SUCCESS_EVENT: EventTypeOpts<{
  assistantStreamingEnabled: boolean;
  actionTypeId: string;
  isEnabledKnowledgeBase: boolean;
  durationMs: number;
  toolsInvoked: {
    AlertCountsTool?: number;
    GenerateESQLTool?: number;
    AskAboutESQLTool?: number;
    KnowledgeBaseRetrievalTool?: number;
    KnowledgeBaseWriteTool?: number;
    OpenAndAcknowledgedAlertsTool?: number;
    SecurityLabsKnowledgeBaseTool?: number;
    ProductDocumentationTool?: number;
    CustomTool?: number;
    EntityRiskScoreTool?: number;
    IntegrationKnowledgeTool?: number;
  };
  model?: string;
  isOssModel?: boolean;
}> = {
  eventType: 'invoke_assistant_success',
  schema: {
    assistantStreamingEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Is streaming enabled',
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana action type id',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is knowledge base enabled',
      },
    },
    isOssModel: {
      type: 'boolean',
      _meta: {
        description: 'Is OSS model used on the request',
        optional: true,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: {
        description: 'The duration of the request.',
      },
    },
    toolsInvoked: {
      properties: {
        AlertCountsTool: toolCountSchema,
        GenerateESQLTool: toolCountSchema,
        AskAboutESQLTool: toolCountSchema,
        ProductDocumentationTool: toolCountSchema,
        KnowledgeBaseRetrievalTool: toolCountSchema,
        KnowledgeBaseWriteTool: toolCountSchema,
        OpenAndAcknowledgedAlertsTool: toolCountSchema,
        SecurityLabsKnowledgeBaseTool: toolCountSchema,
        CustomTool: toolCountSchema,
        EntityRiskScoreTool: toolCountSchema,
        IntegrationKnowledgeTool: toolCountSchema,
      },
    },
  },
};

export const INVOKE_ASSISTANT_ERROR_EVENT: EventTypeOpts<{
  errorMessage: string;
  assistantStreamingEnabled: boolean;
  isEnabledKnowledgeBase: boolean;
  actionTypeId: string;
  errorLocation: string;
  model?: string;
}> = {
  eventType: 'invoke_assistant_error',
  schema: {
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },
    assistantStreamingEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Is streaming enabled',
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana action type id',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    isEnabledKnowledgeBase: {
      type: 'boolean',
      _meta: {
        description: 'Is knowledge base enabled',
      },
    },
    errorLocation: {
      type: 'keyword',
      _meta: {
        description: 'Location of error in code',
      },
    },
  },
};

export interface AttackDiscoveryScheduleInfo {
  id: string;
  interval: string;
  actions: string[];
}

const scheduleInfoSchema: SchemaValue<AttackDiscoveryScheduleInfo | undefined> = {
  properties: {
    id: {
      type: 'keyword',
      _meta: {
        description: 'Attack discovery schedule id',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: 'Attack discovery schedule interval',
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Action type',
        },
      },
      _meta: {
        description: 'Actions used within the schedule',
      },
    },
  },
  _meta: {
    description: 'Attack discovery schedule info',
    optional: true,
  },
};

interface AttackDiscoverySuccessTelemetryEvent {
  actionTypeId: string;
  alertsContextCount: number;
  alertsCount: number;
  configuredAlertsCount: number;
  dateRangeDuration: number;
  discoveriesGenerated: number;
  durationMs: number;
  hasFilter: boolean;
  isDefaultDateRange: boolean;
  model?: string;
  provider?: string;
  scheduleInfo?: AttackDiscoveryScheduleInfo;
}

export const ATTACK_DISCOVERY_SUCCESS_EVENT: EventTypeOpts<AttackDiscoverySuccessTelemetryEvent> = {
  eventType: 'attack_discovery_success',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    alertsContextCount: {
      type: 'integer',
      _meta: {
        description: 'Number of alerts sent as context to the LLM',
        optional: false,
      },
    },
    alertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of unique alerts referenced in the attack discoveries',
        optional: false,
      },
    },
    configuredAlertsCount: {
      type: 'integer',
      _meta: {
        description: 'Number of alerts configured by the user',
        optional: false,
      },
    },
    dateRangeDuration: {
      type: 'integer',
      _meta: {
        description: 'Duration of time range of request in hours',
        optional: false,
      },
    },
    discoveriesGenerated: {
      type: 'integer',
      _meta: {
        description: 'Quantity of attack discoveries generated',
        optional: false,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: {
        description: 'Duration of request in ms',
        optional: false,
      },
    },
    hasFilter: {
      type: 'boolean',
      _meta: {
        description: 'Whether a filter was applied to the alerts used as context',
        optional: false,
      },
    },
    isDefaultDateRange: {
      type: 'boolean',
      _meta: {
        description: 'Whether the date range is the default of last 24 hours',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
    scheduleInfo: scheduleInfoSchema,
  },
};

interface AttackDiscoveryErrorTelemetryEvent {
  actionTypeId: string;
  errorMessage: string;
  model?: string;
  provider?: string;
  scheduleInfo?: AttackDiscoveryScheduleInfo;
}

export const ATTACK_DISCOVERY_ERROR_EVENT: EventTypeOpts<AttackDiscoveryErrorTelemetryEvent> = {
  eventType: 'attack_discovery_error',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },

    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
    scheduleInfo: scheduleInfoSchema,
  },
};

export const CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT: EventTypeOpts<{
  entryType: 'index' | 'document';
  required: boolean;
  sharing: 'private' | 'global';
  source?: string;
}> = {
  eventType: 'create_knowledge_base_entry_success',
  schema: {
    entryType: {
      type: 'keyword',
      _meta: {
        description: 'Index entry or document entry',
      },
    },
    sharing: {
      type: 'keyword',
      _meta: {
        description: 'Sharing setting: private or global',
      },
    },
    required: {
      type: 'boolean',
      _meta: {
        description: 'Whether this resource should always be included',
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the knowledge base document entry was created',
        optional: true,
      },
    },
  },
};

export const CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT: EventTypeOpts<{
  entryType: 'index' | 'document';
  required: boolean;
  sharing: 'private' | 'global';
  source?: string;
  errorMessage: string;
}> = {
  eventType: 'create_knowledge_base_entry_error',
  schema: {
    entryType: {
      type: 'keyword',
      _meta: {
        description: 'Index entry or document entry',
      },
    },
    sharing: {
      type: 'keyword',
      _meta: {
        description: 'Sharing setting: private or global',
      },
    },
    required: {
      type: 'boolean',
      _meta: {
        description: 'Whether this resource should always be included',
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the knowledge base document entry was created',
        optional: true,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message',
      },
    },
  },
};

export const DEFEND_INSIGHT_SUCCESS_EVENT: EventTypeOpts<{
  actionTypeId: string;
  eventsContextCount: number;
  insightsGenerated: number;
  durationMs: number;
  model?: string;
  provider?: string;
  insightType: string;
  insightsDetails: string[];
}> = {
  eventType: 'defend_insight_success',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    eventsContextCount: {
      type: 'integer',
      _meta: {
        description: 'Number of events sent as context to the LLM',
        optional: false,
      },
    },
    insightsGenerated: {
      type: 'integer',
      _meta: {
        description: 'Quantity of Defend insights generated',
        optional: false,
      },
    },
    durationMs: {
      type: 'integer',
      _meta: {
        description: 'Duration of request in ms',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
    insightType: {
      type: 'keyword',
      _meta: {
        description: 'Defend insight type',
        optional: false,
      },
    },
    insightsDetails: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Details of the generated Defend insights',
        },
      },
      _meta: {
        description: 'Details of the generated Defend insights',
      },
    },
  },
};

export const DEFEND_INSIGHT_ERROR_EVENT: EventTypeOpts<{
  actionTypeId: string;
  errorMessage: string;
  model?: string;
  provider?: string;
}> = {
  eventType: 'defend_insight_error',
  schema: {
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'Kibana connector type',
        optional: false,
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message from Elasticsearch',
      },
    },

    model: {
      type: 'keyword',
      _meta: {
        description: 'LLM model',
        optional: true,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'OpenAI provider',
        optional: true,
      },
    },
  },
};

export type ElasticAssistantTelemetryEvents =
  | { [key: string]: unknown }
  | AttackDiscoveryErrorTelemetryEvent
  | AttackDiscoverySuccessTelemetryEvent;

// Conversation sharing

export const CONVERSATION_SHARED_SUCCESS_EVENT: EventTypeOpts<{
  sharing: 'private' | 'shared' | 'restricted';
  total?: number;
}> = {
  eventType: 'conversation_shared_success',
  schema: {
    sharing: {
      type: 'keyword',
      _meta: {
        description:
          'Whether the conversation was shared privately, shared with all users in the space, or restricted to selected users in the space',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'If restricted, how many users can access',
        optional: true,
      },
    },
  },
};

export const CONVERSATION_SHARED_ERROR_EVENT: EventTypeOpts<{
  sharing: 'private' | 'shared' | 'restricted';
  errorMessage: string;
}> = {
  eventType: 'conversation_shared_error',
  schema: {
    sharing: {
      type: 'keyword',
      _meta: {
        description:
          'Whether the conversation was shared privately, shared with all users in the space, or restricted to selected users in the space',
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Error message',
      },
    },
  },
};
// only reported when a non-owner accesses a shared conversation
export const SHARED_CONVERSATION_ACCESSED_EVENT: EventTypeOpts<{
  sharing: 'private' | 'shared' | 'restricted';
}> = {
  eventType: 'shared_conversation_accessed',
  schema: {
    sharing: {
      type: 'keyword',
      _meta: {
        description:
          'Whether the conversation was shared privately, shared with all users in the space, or restricted to selected users in the space',
      },
    },
  },
};

export const CONVERSATION_DUPLICATED_EVENT: EventTypeOpts<{
  isSourceConversationOwner: boolean;
}> = {
  eventType: 'conversation_duplicated',
  schema: {
    isSourceConversationOwner: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the conversation being duplicated is owned by the user duplicating it',
      },
    },
  },
};

export const events: Array<EventTypeOpts<ElasticAssistantTelemetryEvents>> = [
  KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT,
  KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT,
  CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT,
  CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
  INVOKE_ASSISTANT_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
  ATTACK_DISCOVERY_ERROR_EVENT,
  DEFEND_INSIGHT_SUCCESS_EVENT,
  DEFEND_INSIGHT_ERROR_EVENT,
  CONVERSATION_DUPLICATED_EVENT,
  CONVERSATION_SHARED_SUCCESS_EVENT,
  CONVERSATION_SHARED_ERROR_EVENT,
  SHARED_CONVERSATION_ACCESSED_EVENT,
];
