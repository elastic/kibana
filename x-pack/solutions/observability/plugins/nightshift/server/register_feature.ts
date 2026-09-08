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
  NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES,
  NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES,
  NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES,
} from '@kbn/nightshift-shared';

/**
 * Registers the Nightshift parent Kibana feature and its Context Engine,
 * Detection Engine, and Investigation Engine sub-features.
 */
export function registerNightshiftFeature(features: FeaturesPluginSetup): void {
  features.registerKibanaFeature({
    id: NIGHTSHIFT_FEATURE_ID,
    name: i18n.translate('xpack.nightshift.featureRegistry.featureName', {
      defaultMessage: 'Nightshift',
    }),
    // After Observability AI Assistant (~1200) and before Stack Management extras.
    order: 1300,
    category: DEFAULT_APP_CATEGORIES.observability,
    minimumLicense: 'enterprise',
    // Root `app` is the allowlist. Privileges cannot grant an app that is not
    // listed here. SIGNIFICANT_EVENTS_APP_ID stays off parent all/read so
    // minimal_all / minimal_read do not keep the management app after a
    // sub-feature is stripped.
    app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
    privileges: {
      // Empty api/ui on purpose. `all` / `read` still pull every engine via
      // includeIn. `minimal_*` is this empty shell so a Scout role can add
      // one sub-feature without granting the others.
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
        // Distinct from the top-level AI Index "Context Engine" feature.
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
                app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
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
                app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
                api: [NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read],
                ui: [NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show],
                savedObject: { all: [], read: [] },
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.nightshift.featureRegistry.investigationEngineSubFeatureName', {
          defaultMessage: 'Investigation Engine',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES.all,
                name: 'All',
                includeIn: 'all',
                app: [NIGHTSHIFT_APP_ID],
                api: [
                  NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.read,
                  NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.manage,
                ],
                ui: [
                  NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES.show,
                  NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES.manage,
                ],
                savedObject: { all: [], read: [] },
              },
              {
                id: NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES.read,
                name: 'Read',
                includeIn: 'read',
                app: [NIGHTSHIFT_APP_ID],
                api: [NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.read],
                ui: [NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES.show],
                savedObject: { all: [], read: [] },
              },
            ],
          },
        ],
      },
    ],
  });
}
