/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, SchemaValue } from '@elastic/ebt/client';

interface FlowEventFields {
  flow_type: string;
  flow_id: string;
  step: string;
  step_status: string;
  step_message?: string;
  payload?: {
    integrations?: Array<{
      installSource: string;
      pkgName: string;
      pkgVersion: string;
      title: string;
    }>;
    agentId?: string;
    os?: string;
    arch?: string;
  };
}

type ObservabilityOnboardingTelemetryEvent = EventTypeOpts<FlowEventFields>;

export const OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT: ObservabilityOnboardingTelemetryEvent = {
  eventType: 'observability_onboarding',
  schema: {
    flow_type: {
      type: 'keyword',
      _meta: {
        description:
          "The current onboarding flow type user is going through (e.g. 'autoDetect', 'logFiles', 'kubernetes'). If not present, user is on the landing screen.",
      },
    },
    flow_id: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier of the current onboarding session',
      },
    },
    step: {
      type: 'keyword',
      _meta: {
        description: 'The current step in the onboarding flow.',
      },
    },
    step_status: {
      type: 'keyword',
      _meta: {
        description: 'The status of the step in the onboarding flow.',
      },
    },
    step_message: {
      type: 'keyword',
      _meta: {
        description: 'Error or warning message of the current step in the onboarding flow',
        optional: true,
      },
    },
    payload: {
      properties: {
        integrations: {
          type: 'array',
          items: {
            properties: {
              installSource: {
                type: 'keyword',
                _meta: {
                  description:
                    'The source of the package used to create the integration. Usually "registry" or "custom".',
                },
              },
              pkgName: {
                type: 'keyword',
                _meta: {
                  description: 'The name of the package used to create the integration.',
                },
              },
              pkgVersion: {
                type: 'keyword',
                _meta: {
                  description: 'The version of the package used to create the integration.',
                },
              },
              title: { type: 'keyword', _meta: { description: 'The visual name of the package.' } },
            },
          },
          _meta: {
            optional: true,
          },
        },
        agentId: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the Elastic Agent installed on the host.',
            optional: true,
          },
        },
        os: {
          type: 'keyword',
          _meta: {
            description: 'OS used by the host.',
            optional: true,
          },
        },
        arch: {
          type: 'keyword',
          _meta: {
            description: 'Architecture used by the host.',
            optional: true,
          },
        },
      },
      _meta: {
        optional: true,
      },
    },
  },
};

export const OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT: EventTypeOpts<{
  flow: string;
  feedback: string;
}> = {
  eventType: 'observability_onboarding_feedback',
  schema: {
    flow: {
      type: 'keyword',
      _meta: {
        description:
          "The current onboarding flow user is going through (e.g. 'system_logs', 'nginx'). If not present, user is on the landing screen.",
      },
    },
    feedback: {
      type: 'keyword',
      _meta: {
        description: 'The feedback the user left (e.g. positive, negative)',
      },
    },
  },
};

interface OnboardingFirehoseFlowEventContext {
  selectedCreateStackOption?: string;
  cloudServiceProvider?: string;
}

interface OnboardingAutoDetectEventContext {
  installSource: string;
  pkgVersion: string;
  title: string;
}

/**
 * Additional flow-specific context that might
 * be attached to telemetry events.
 */
export interface OnboardingFlowEventContext {
  autoDetect?: OnboardingAutoDetectEventContext;
  firehose?: OnboardingFirehoseFlowEventContext;
}

const flowContextSchema: SchemaValue<OnboardingFlowEventContext | undefined> = {
  properties: {
    autoDetect: {
      properties: {
        installSource: {
          type: 'keyword',
          _meta: {
            description:
              'The source of the package used to create the integration. Usually "registry" or "custom".',
          },
        },
        pkgVersion: {
          type: 'keyword',
          _meta: { description: 'The version of the package used to create the integration.' },
        },
        title: { type: 'keyword', _meta: { description: 'The visual name of the package.' } },
      },
      _meta: {
        optional: true,
      },
    },
    firehose: {
      properties: {
        selectedCreateStackOption: {
          type: 'keyword',
          _meta: {
            description:
              'Which option for creating CloudFormation stack is selected in the UI while data was detected. Serves as a good indication of the way user chose to create the stack.',
            optional: true,
          },
        },
        cloudServiceProvider: {
          type: 'keyword',
          _meta: {
            description:
              "The cloud service provider where the stack is deployed. Can be 'aws', 'gcp' or 'azure'",
            optional: true,
          },
        },
      },
      _meta: {
        optional: true,
      },
    },
  },
  _meta: {
    optional: true,
  },
};

export const OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT: EventTypeOpts<{
  onboardingFlowType: string;
  onboardingId?: string;
  step: string;
  context?: OnboardingFlowEventContext;
}> = {
  eventType: 'observability_onboarding_flow_progress',
  schema: {
    onboardingFlowType: {
      type: 'keyword',
      _meta: {
        description: 'The type of onboarding flow',
      },
    },
    onboardingId: {
      type: 'keyword',
      _meta: {
        description: 'The unique identifier of the onboarding session',
        optional: true,
      },
    },
    step: {
      type: 'keyword',
      _meta: {
        description:
          'The current step in the onboarding flow. Possible values: "in_progress", "awaiting_data", "data_received"',
      },
    },
    context: flowContextSchema,
  },
};

export const OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT: EventTypeOpts<{
  onboardingFlowType: string;
  onboardingId?: string;
  error: string;
  context?: OnboardingFlowEventContext;
}> = {
  eventType: 'observability_onboarding_flow_error',
  schema: {
    onboardingFlowType: {
      type: 'keyword',
      _meta: {
        description: 'The type of onboarding flow',
      },
    },
    onboardingId: {
      type: 'keyword',
      _meta: {
        description: 'The unique identifier of the onboarding session',
        optional: true,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'The error message that occurred during the onboarding flow.',
      },
    },
    context: flowContextSchema,
  },
};

export const OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT: EventTypeOpts<{
  onboardingFlowType: string;
  onboardingId: string;
  dataset: string;
  context?: OnboardingFlowEventContext;
}> = {
  eventType: 'observability_onboarding_flow_dataset_detected',
  schema: {
    onboardingFlowType: {
      type: 'keyword',
      _meta: {
        description: 'The type of onboarding flow',
      },
    },
    onboardingId: {
      type: 'keyword',
      _meta: {
        description: 'The unique identifier of the onboarding session',
      },
    },
    dataset: {
      type: 'keyword',
      _meta: {
        description: 'ES index which was detected to have data from the firehose stream',
      },
    },
    context: flowContextSchema,
  },
};
