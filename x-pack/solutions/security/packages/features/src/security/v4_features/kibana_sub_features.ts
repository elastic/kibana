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
  socManagementSubFeature,
} from '../kibana_sub_features';
import type { SubFeatureReplacements } from '../../types';
import { SECURITY_FEATURE_ID_V5 } from '../../constants';
import { addSubFeatureReplacements } from '../../utils';

const replacements: Partial<Record<SecuritySubFeatureId, SubFeatureReplacements>> = {
  [SecuritySubFeatureId.endpointList]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.workflowInsights]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.globalArtifactManagement]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.trustedApplications]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.trustedDevices]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.hostIsolationExceptionsBasic]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.blocklist]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.eventFilters]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.endpointExceptions]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.policyManagement]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.responseActionsHistory]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.hostIsolation]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.processOperations]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.fileOperations]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.executeAction]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.scanAction]: [{ feature: SECURITY_FEATURE_ID_V5 }],
  [SecuritySubFeatureId.socManagement]: [{ feature: SECURITY_FEATURE_ID_V5 }],
};

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
    [SecuritySubFeatureId.socManagement, socManagementSubFeature()],
    [
      SecuritySubFeatureId.globalArtifactManagement,
      globalArtifactManagementSubFeature(experimentalFeatures),
    ],
    [SecuritySubFeatureId.trustedApplications, trustedApplicationsSubFeature()],
    [SecuritySubFeatureId.trustedDevices, trustedDevicesSubFeature()],
    [SecuritySubFeatureId.hostIsolationExceptionsBasic, hostIsolationExceptionsBasicSubFeature()],
    [SecuritySubFeatureId.blocklist, blocklistSubFeature()],
    [SecuritySubFeatureId.eventFilters, eventFiltersSubFeature()],
    [SecuritySubFeatureId.endpointExceptions, endpointExceptionsSubFeature()],
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

      const featureReplacements = replacements[id];
      if (featureReplacements) {
        subFeature = addSubFeatureReplacements(subFeature, featureReplacements);
      }

      return [id, subFeature];
    })
  );

  // Remove disabled experimental features
  if (!experimentalFeatures.trustedDevices) {
    securitySubFeaturesMap.delete(SecuritySubFeatureId.trustedDevices);
  }

  return Object.freeze(securitySubFeaturesMap);
};
