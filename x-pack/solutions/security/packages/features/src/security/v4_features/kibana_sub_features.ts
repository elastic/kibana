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
  trustedDevicesSubFeature,
} from '../kibana_sub_features';

/**
 * Sub-features that will always be available for Security
 * regardless of the product type.
 */
export const getSecurityV4BaseKibanaSubFeatureIds = (
  { experimentalFeatures }: SecurityFeatureParams // currently un-used, but left here as a convenience for possible future use
): SecuritySubFeatureId[] => [];

/**
 * Defines all the Security Assistant subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getSecurityV4SubFeaturesMap = ({
  experimentalFeatures,
}: SecurityFeatureParams): Map<SecuritySubFeatureId, SubFeatureConfig> => {
  const securitySubFeaturesList: Array<[SecuritySubFeatureId, SubFeatureConfig]> = [
    [SecuritySubFeatureId.endpointList, endpointListSubFeature()],
    [SecuritySubFeatureId.workflowInsights, workflowInsightsSubFeature()],
    [SecuritySubFeatureId.endpointExceptions, endpointExceptionsSubFeature()],
    [
      SecuritySubFeatureId.globalArtifactManagement,
      globalArtifactManagementSubFeature(experimentalFeatures),
    ],
    [SecuritySubFeatureId.trustedApplications, trustedApplicationsSubFeature()],
    [SecuritySubFeatureId.trustedDevices, trustedDevicesSubFeature()],
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

  const securitySubFeaturesMap = new Map<SecuritySubFeatureId, SubFeatureConfig>(
    securitySubFeaturesList.map(([id, originalSubFeature]) => {
      let subFeature = originalSubFeature;

      // If the feature is space-aware, we need to set false to the requireAllSpaces flag and remove the privilegesTooltip
      if (experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
        subFeature = { ...subFeature, requireAllSpaces: false, privilegesTooltip: undefined };
      }

      return [id, subFeature];
    })
  );

  // Remove disabled experimental features
  if (!experimentalFeatures.defendInsights) {
    securitySubFeaturesMap.delete(SecuritySubFeatureId.workflowInsights);
  }
  if (!experimentalFeatures.trustedDevices) {
    securitySubFeaturesMap.delete(SecuritySubFeatureId.trustedDevices);
  }

  return Object.freeze(securitySubFeaturesMap);
};
