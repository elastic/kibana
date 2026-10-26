/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey } from '../../product_features_keys';
import { APP_ID } from '../../constants';
import type { SecurityProductFeaturesConfig } from '../types';
import { extendProductFeatureConfigs } from '../../utils';
import { securityDefaultProductFeaturesConfig } from '../product_feature_config';

export const securityV1ProductFeaturesConfig: SecurityProductFeaturesConfig =
  extendProductFeatureConfigs(securityDefaultProductFeaturesConfig, {
    // Add the global artifact management API privilege to the all privileges of siem and siemV2 features for backwards compatibility
    // The siemV3 adds the global artifact management API privilege as a sub-feature.
    // This config adds the new global artifact management API privilege to old versions so we have only one way of authorizing this functionality.
    // No need to add the ui capability here, since they are automatically added by the Kibana features framework via the `replacedBy` field.
    [ProductFeatureSecurityKey.endpointArtifactManagement]: {
      // Adds the action to the top-level feature "all" privilege
      privileges: { all: { api: [`${APP_ID}-writeGlobalArtifacts`] } },
      // Some sub-features were also allowing this action, they need to be extended as well (the top-level feature may be in "read" level).
      subFeaturesPrivileges: [
        { id: 'endpoint_exceptions_all', api: [`${APP_ID}-writeGlobalArtifacts`] },
        { id: 'trusted_applications_all', api: [`${APP_ID}-writeGlobalArtifacts`] },
        { id: 'host_isolation_exceptions_all', api: [`${APP_ID}-writeGlobalArtifacts`] },
        { id: 'blocklist_all', api: [`${APP_ID}-writeGlobalArtifacts`] },
        { id: 'event_filters_all', api: [`${APP_ID}-writeGlobalArtifacts`] },
      ],
    },
  });
