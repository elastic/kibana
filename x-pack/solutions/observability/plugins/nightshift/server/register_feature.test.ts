/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type { KibanaFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import {
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES,
  NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES,
  NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES,
  NIGHTSHIFT_FEATURE_ID,
} from '@kbn/nightshift-shared';
import { registerNightshiftFeature } from './register_feature';

const getSubFeaturePrivilege = (
  feature: KibanaFeatureConfig,
  id: string
): SubFeaturePrivilegeConfig | undefined =>
  feature.subFeatures
    ?.flatMap((subFeature) => subFeature.privilegeGroups.flatMap((group) => group.privileges))
    .find((privilege) => privilege.id === id);

describe('registerNightshiftFeature', () => {
  it('registers a Nightshift parent with empty ui/api and both engine sub-features', () => {
    const features = featuresPluginMock.createSetup();

    registerNightshiftFeature(features);

    expect(features.registerKibanaFeature).toHaveBeenCalledTimes(1);

    const feature = features.registerKibanaFeature.mock.calls[0][0];

    expect(feature).toMatchObject({
      id: NIGHTSHIFT_FEATURE_ID,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
      privileges: {
        all: {
          app: [NIGHTSHIFT_APP_ID],
          api: [],
          ui: [],
        },
        read: {
          app: [NIGHTSHIFT_APP_ID],
          api: [],
          ui: [],
        },
      },
    });
    expect(feature.privileges?.all.aiIndex).toBeUndefined();
    expect(feature.privileges?.read.aiIndex).toBeUndefined();

    const contextAll = getSubFeaturePrivilege(
      feature,
      NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES.all
    );
    const contextRead = getSubFeaturePrivilege(
      feature,
      NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES.read
    );
    const detectionAll = getSubFeaturePrivilege(
      feature,
      NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES.all
    );
    const detectionRead = getSubFeaturePrivilege(
      feature,
      NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES.read
    );

    expect(contextAll).toMatchObject({
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
    });
    expect(contextRead).toMatchObject({
      includeIn: 'read',
      app: [SIGNIFICANT_EVENTS_APP_ID],
      api: [NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read],
      ui: [NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show],
      aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
    });
    expect(detectionAll).toMatchObject({
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
    });
    expect(detectionRead).toMatchObject({
      includeIn: 'read',
      app: [SIGNIFICANT_EVENTS_APP_ID],
      api: [NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read],
      ui: [NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show],
    });
    expect(detectionAll?.aiIndex).toBeUndefined();
    expect(detectionRead?.aiIndex).toBeUndefined();
  });
});
