/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { SECURITY_FEATURE_ID_V3 } from '../../../constants';
import { SecuritySubFeatureId } from '../../product_features_keys';
import type { SecurityFeatureParams } from '../types';
import type { SubFeatureReplacements } from '../../types';
import { addSubFeatureReplacements } from '../../utils';
import {
  endpointListSubFeature,
  endpointExceptionsSubFeature,
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
} from '../kibana_sub_features';

const replacements: Partial<Record<SecuritySubFeatureId, SubFeatureReplacements>> = {
  [SecuritySubFeatureId.endpointList]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.endpointExceptions]: [
    {
      feature: SECURITY_FEATURE_ID_V3,
      additionalPrivileges: { endpoint_exceptions_all: ['global_artifact_management_all'] },
    },
  ],
  [SecuritySubFeatureId.trustedApplications]: [
    {
      feature: SECURITY_FEATURE_ID_V3,
      additionalPrivileges: { trusted_applications_all: ['global_artifact_management_all'] },
    },
  ],
  [SecuritySubFeatureId.hostIsolationExceptionsBasic]: [
    {
      feature: SECURITY_FEATURE_ID_V3,
      additionalPrivileges: { host_isolation_exceptions_all: ['global_artifact_management_all'] },
    },
  ],
  [SecuritySubFeatureId.blocklist]: [
    {
      feature: SECURITY_FEATURE_ID_V3,
      additionalPrivileges: { blocklist_all: ['global_artifact_management_all'] },
    },
  ],
  [SecuritySubFeatureId.eventFilters]: [
    {
      feature: SECURITY_FEATURE_ID_V3,
      additionalPrivileges: { event_filters_all: ['global_artifact_management_all'] },
    },
  ],
  [SecuritySubFeatureId.policyManagement]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.responseActionsHistory]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.hostIsolation]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.processOperations]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.fileOperations]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.executeAction]: [{ feature: SECURITY_FEATURE_ID_V3 }],
  [SecuritySubFeatureId.scanAction]: [{ feature: SECURITY_FEATURE_ID_V3 }],
};

/**
 * Sub-features that will always be available for Security
 * regardless of the product type.
 */
export const getSecurityBaseKibanaSubFeatureIds = (
  { experimentalFeatures }: SecurityFeatureParams // currently un-used, but left here as a convenience for possible future use
): SecuritySubFeatureId[] => [];

/**
 * Defines all the Security Assistant subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getSecuritySubFeaturesMap = ({
  experimentalFeatures,
}: SecurityFeatureParams): Map<SecuritySubFeatureId, SubFeatureConfig> => {
  const securitySubFeaturesList: Array<[SecuritySubFeatureId, SubFeatureConfig]> = [
    [SecuritySubFeatureId.endpointList, endpointListSubFeature()],
    [SecuritySubFeatureId.endpointExceptions, endpointExceptionsSubFeature()],
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

  const securitySubFeaturesMap = new Map<SecuritySubFeatureId, SubFeatureConfig>(
    securitySubFeaturesList.map(([id, originalSubFeature]) => {
      let subFeature = originalSubFeature;

      const featureReplacements = replacements[id];
      if (featureReplacements) {
        subFeature = addSubFeatureReplacements(subFeature, featureReplacements);
      }

      // If the feature is space-aware, we need to set false to the requireAllSpaces flag and remove the privilegesTooltip
      if (experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
        subFeature = { ...subFeature, requireAllSpaces: false, privilegesTooltip: undefined };
      }

      return [id, subFeature];
    })
  );
  return Object.freeze(securitySubFeaturesMap);
};
