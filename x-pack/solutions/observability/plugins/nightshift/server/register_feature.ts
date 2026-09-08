/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
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

interface IEngineSubFeatureSpec {
  name: string;
  allId: string;
  readId: string;
  app: string[];
  apiRead: string;
  apiManage: string;
  uiShow: string;
  uiManage: string;
  aiIndex?: { read: string[] };
}

function createEngineSubFeature({
  name,
  allId,
  readId,
  app,
  apiRead,
  apiManage,
  uiShow,
  uiManage,
  aiIndex,
}: IEngineSubFeatureSpec): NonNullable<KibanaFeatureConfig['subFeatures']>[number] {
  return {
    name,
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            id: allId,
            name: 'All',
            includeIn: 'all',
            app,
            api: [apiRead, apiManage],
            ui: [uiShow, uiManage],
            ...(aiIndex ? { aiIndex } : {}),
            savedObject: { all: [], read: [] },
          },
          {
            id: readId,
            name: 'Read',
            includeIn: 'read',
            app,
            api: [apiRead],
            ui: [uiShow],
            ...(aiIndex ? { aiIndex } : {}),
            savedObject: { all: [], read: [] },
          },
        ],
      },
    ],
  };
}

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
      createEngineSubFeature({
        // Distinct from the top-level AI Index "Context Engine" feature.
        name: i18n.translate('xpack.nightshift.featureRegistry.contextEngineSubFeatureName', {
          defaultMessage: 'Context Engine',
        }),
        allId: NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES.all,
        readId: NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES.read,
        app: [SIGNIFICANT_EVENTS_APP_ID],
        apiRead: NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read,
        apiManage: NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.manage,
        uiShow: NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show,
        uiManage: NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.manage,
        aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
      }),
      createEngineSubFeature({
        name: i18n.translate('xpack.nightshift.featureRegistry.detectionEngineSubFeatureName', {
          defaultMessage: 'Detection Engine',
        }),
        allId: NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES.all,
        readId: NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES.read,
        app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
        apiRead: NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read,
        apiManage: NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage,
        uiShow: NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show,
        uiManage: NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.manage,
      }),
      createEngineSubFeature({
        name: i18n.translate('xpack.nightshift.featureRegistry.investigationEngineSubFeatureName', {
          defaultMessage: 'Investigation Engine',
        }),
        allId: NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES.all,
        readId: NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES.read,
        app: [NIGHTSHIFT_APP_ID],
        apiRead: NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.read,
        apiManage: NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.manage,
        uiShow: NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES.show,
        uiManage: NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES.manage,
      }),
    ],
  });
}
