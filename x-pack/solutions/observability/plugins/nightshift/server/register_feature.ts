/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES,
  NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES,
  NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES,
  NIGHTSHIFT_FEATURE_ID,
} from '@kbn/nightshift-shared';

/**
 * Registers the Nightshift parent Kibana feature and its Context Engine /
 * Detection Engine sub-features.
 */
export function registerNightshiftFeature(features: FeaturesPluginSetup): void {
  features.registerKibanaFeature({
    id: NIGHTSHIFT_FEATURE_ID,
    name: i18n.translate('xpack.nightshift.featureRegistry.featureName', {
      defaultMessage: 'Nightshift',
    }),
    order: 1300,
    category: DEFAULT_APP_CATEGORIES.observability,
    // Root `app` is the allowlist. Privileges cannot grant an app that is not
    // listed here. SIGNIFICANT_EVENTS_APP_ID stays off parent all/read so
    // minimal_all / minimal_read do not keep the management app after a
    // sub-feature is stripped.
    app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
    privileges: {
      all: {
        app: [NIGHTSHIFT_APP_ID],
        api: [],
        ui: [],
        savedObject: { all: [], read: [] },
      },
      read: {
        app: [NIGHTSHIFT_APP_ID],
        api: [],
        ui: [],
        savedObject: { all: [], read: [] },
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.nightshift.featureRegistry.contextEngineSubFeatureName', {
          defaultMessage: 'Context Engine',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES.all,
                name: 'All',
                includeIn: 'all',
                app: [SIGNIFICANT_EVENTS_APP_ID],
                api: [
                  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read,
                  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.manage,
                ],
                ui: [
                  NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show,
                  NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.manage,
                ],
                aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
                savedObject: { all: [], read: [] },
              },
              {
                id: NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES.read,
                name: 'Read',
                includeIn: 'read',
                app: [SIGNIFICANT_EVENTS_APP_ID],
                api: [NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read],
                ui: [NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show],
                aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
                savedObject: { all: [], read: [] },
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.nightshift.featureRegistry.detectionEngineSubFeatureName', {
          defaultMessage: 'Detection Engine',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES.all,
                name: 'All',
                includeIn: 'all',
                app: [SIGNIFICANT_EVENTS_APP_ID],
                api: [
                  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read,
                  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage,
                ],
                ui: [
                  NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show,
                  NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.manage,
                ],
                savedObject: { all: [], read: [] },
              },
              {
                id: NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES.read,
                name: 'Read',
                includeIn: 'read',
                app: [SIGNIFICANT_EVENTS_APP_ID],
                api: [NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read],
                ui: [NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show],
                savedObject: { all: [], read: [] },
              },
            ],
          },
        ],
      },
    ],
  });
}
