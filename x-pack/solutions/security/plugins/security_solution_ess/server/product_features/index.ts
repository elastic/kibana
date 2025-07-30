/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeaturesConfiguratorExtensions } from '@kbn/security-solution-features';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { APP_ID } from '@kbn/security-solution-plugin/common';
import { updateGlobalArtifactManageReplacements } from './update_global_artifact_replacements';

export const productFeaturesExtensions: ProductFeaturesConfiguratorExtensions = {
  security: {
    allVersions: {
      [ProductFeatureSecurityKey.endpointExceptions]: {
        privileges: {
          all: {
            ui: ['showEndpointExceptions', 'crudEndpointExceptions'],
            api: [`${APP_ID}-showEndpointExceptions`, `${APP_ID}-crudEndpointExceptions`],
          },
          read: {
            ui: ['showEndpointExceptions'],
            api: [`${APP_ID}-showEndpointExceptions`],
          },
        },
      },
    },
    version: {
      siem: {
        [ProductFeatureSecurityKey.endpointArtifactManagement]: {
          featureConfigModifier: updateGlobalArtifactManageReplacements,
        },
      },
      siemV2: {
        [ProductFeatureSecurityKey.endpointArtifactManagement]: {
          featureConfigModifier: updateGlobalArtifactManageReplacements,
        },
      },
    },
  },
};
