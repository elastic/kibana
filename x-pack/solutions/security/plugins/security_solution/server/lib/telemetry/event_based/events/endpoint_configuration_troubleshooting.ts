/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/core/server';

export type EndpointConfigurationTroubleshootingTargetResult =
  | 'resolved'
  | 'ambiguous'
  | 'not_found'
  | 'unauthorized'
  | 'unavailable'
  | 'no_target';

export interface EndpointConfigurationTroubleshootingDiagnoseRunEvent {
  target_result: EndpointConfigurationTroubleshootingTargetResult;
  health_state?: string;
  health_reasons: string[];
  unauthorized_parts: string[];
  unavailable_parts: string[];
  package_stale?: boolean;
  include_configurations: boolean;
  duration_ms: number;
}

export const ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_RUN_EVENT: EventTypeOpts<EndpointConfigurationTroubleshootingDiagnoseRunEvent> =
  {
    eventType: 'endpoint_configuration_troubleshooting_diagnose_run',
    schema: {
      target_result: {
        type: 'keyword',
        _meta: {
          description:
            'How the diagnose resolved its target: resolved, ambiguous, not_found, unauthorized, unavailable or no_target. A resolve step that failed with error records unavailable',
          optional: false,
        },
      },
      health_state: {
        type: 'keyword',
        _meta: {
          description:
            'Health state the diagnosis classified when a host diagnosis ran; absent when no host diagnosis ran',
          optional: true,
        },
      },
      health_reasons: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'A health reason from the health.reasons vocabulary, which may grow',
            optional: false,
          },
        },
        _meta: {
          description:
            'Health reasons of the diagnosed host from the health.reasons vocabulary, which may grow',
          optional: false,
        },
      },
      unauthorized_parts: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'A part the diagnosis could not read because of missing privileges',
            optional: false,
          },
        },
        _meta: {
          description:
            'Parts the diagnosis could not read because of missing privileges, from the closed part vocabulary',
          optional: false,
        },
      },
      unavailable_parts: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'A part the diagnosis could not read because it was unavailable',
            optional: false,
          },
        },
        _meta: {
          description:
            'Parts the diagnosis could not read because they were unavailable, from the closed part vocabulary',
          optional: false,
        },
      },
      package_stale: {
        type: 'boolean',
        _meta: {
          description:
            'True when the Elastic Defend package is stale; absent when freshness could not be read',
          optional: true,
        },
      },
      include_configurations: {
        type: 'boolean',
        _meta: {
          description:
            'Value passed to the package status step, so a run without a host records true',
          optional: false,
        },
      },
      duration_ms: {
        type: 'long',
        _meta: {
          description: 'Run duration in milliseconds',
          optional: false,
        },
      },
    },
  };
