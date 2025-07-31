/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { SecuritySubFeatureId } from '../../product_features_keys';
import type { SecurityFeatureParams } from '../types';
import {
  endpointListSubFeature,
  endpointExceptionsSubFeature,
  globalArtifactManagementSubFeature,
  trustedApplicationsSubFeature,
  hostIsolationExceptionsBasicSubFeature,
  blocklistSubFeature,
  eventFiltersSubFeature,
  policyManagementSubFeature,
  responseActionsHistorySubFeature,
  hostIsolationSubFeature,
  processOperationsSubFeature,
  fileOperationsSubFeature,
  executeActionSubFeature,
  scanActionSubFeature,
  workflowInsightsSubFeature,
} from '../kibana_sub_features';

/**
 * Sub-features that will always be available for Security
 * regardless of the product type.
 */
export const getSecurityV3BaseKibanaSubFeatureIds = (
  { experimentalFeatures }: SecurityFeatureParams // currently un-used, but left here as a convenience for possible future use
): SecuritySubFeatureId[] => [];

/**
 * Defines all the Security Assistant subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getSecurityV3SubFeaturesMap = ({
  experimentalFeatures,
}: SecurityFeatureParams): Map<SecuritySubFeatureId, SubFeatureConfig> => {
  const securitySubFeaturesList: Array<[SecuritySubFeatureId, SubFeatureConfig]> = [
    [SecuritySubFeatureId.endpointList, endpointListSubFeature()],
    [SecuritySubFeatureId.endpointExceptions, endpointExceptionsSubFeature()],
    [
      SecuritySubFeatureId.globalArtifactManagement,
      globalArtifactManagementSubFeature(experimentalFeatures),
    ],
    [SecuritySubFeatureId.trustedApplications, trustedApplicationsSubFeature()],
    [SecuritySubFeatureId.hostIsolationExceptionsBasic, hostIsolationExceptionsBasicSubFeature()],
    [SecuritySubFeatureId.blocklist, blocklistSubFeature()],
    [SecuritySubFeatureId.eventFilters, eventFiltersSubFeature()],
    [SecuritySubFeatureId.policyManagement, policyManagementSubFeature()],
    [SecuritySubFeatureId.responseActionsHistory, responseActionsHistorySubFeature()],
    [SecuritySubFeatureId.hostIsolation, hostIsolationSubFeature()],
    [SecuritySubFeatureId.processOperations, processOperationsSubFeature()],
    [SecuritySubFeatureId.fileOperations, fileOperationsSubFeature()],
    [SecuritySubFeatureId.executeAction, executeActionSubFeature()],
    [SecuritySubFeatureId.scanAction, scanActionSubFeature()],
  ];

  // Use the following code to add feature based on feature flag
  // if (experimentalFeatures.featureFlagName) {
  //   securitySubFeaturesList.push([SecuritySubFeatureId.featureId, featureSubFeature]);
  // }

  if (experimentalFeatures.defendInsights) {
    // place with other All/Read/None options
    securitySubFeaturesList.splice(1, 0, [
      SecuritySubFeatureId.workflowInsights,
      workflowInsightsSubFeature(),
    ]);
  }

  const subFeatures = securitySubFeaturesList.map<[SecuritySubFeatureId, SubFeatureConfig]>(
    ([id, rawSubFeature]) => {
      let subFeature = rawSubFeature;

      // If the feature is enabled for space awareness, we need to set false to the requireAllSpaces flag and remove the privilegesTooltip
      // to avoid showing the "Requires all spaces" tooltip in the UI.
      if (experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
        subFeature = { ...subFeature, requireAllSpaces: true, privilegesTooltip: undefined };
      }

      return [id, subFeature];
    }
  );

  const securitySubFeaturesMap = new Map<SecuritySubFeatureId, SubFeatureConfig>(subFeatures);
  return Object.freeze(securitySubFeaturesMap);
};
