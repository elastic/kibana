/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import {
  ProductFeaturesPrivilegeId,
  ProductFeaturesPrivileges,
} from '../../product_features_privileges';

import { SecuritySubFeatureId } from '../../product_features_keys';
import { APP_ID } from '../../constants';
import type { SecurityFeatureParams } from '../types';

const TRANSLATIONS = Object.freeze({
  all: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.allPrivilegeName',
    {
      defaultMessage: 'All',
    }
  ),
  read: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.readPrivilegeName',
    {
      defaultMessage: 'Read',
    }
  ),
});

const endpointListSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.endpointList.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Endpoint List access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.endpointList',
    {
      defaultMessage: 'Endpoint List',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.endpointList.description',
    {
      defaultMessage:
        'Displays all hosts running Elastic Defend and their relevant integration details.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeEndpointList`, `${APP_ID}-readEndpointList`],
          id: 'endpoint_list_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeEndpointList', 'readEndpointList'],
        },
        {
          api: [`${APP_ID}-readEndpointList`],
          id: 'endpoint_list_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readEndpointList'],
        },
      ],
    },
  ],
});

const trustedApplicationsSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.trustedApplications.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Trusted Applications access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.trustedApplications',
    {
      defaultMessage: 'Trusted Applications',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.trustedApplications.description',
    {
      defaultMessage:
        'Helps mitigate conflicts with other software, usually other antivirus or endpoint security applications.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [
            'lists-all',
            'lists-read',
            'lists-summary',
            `${APP_ID}-writeTrustedApplications`,
            `${APP_ID}-readTrustedApplications`,
          ],
          id: 'trusted_applications_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
            read: [],
          },
          ui: ['writeTrustedApplications', 'readTrustedApplications'],
        },
        {
          api: ['lists-read', 'lists-summary', `${APP_ID}-readTrustedApplications`],
          id: 'trusted_applications_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readTrustedApplications'],
        },
      ],
    },
  ],
});
const hostIsolationExceptionsBasicSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.hostIsolationExceptions.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Host Isolation Exceptions access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.hostIsolationExceptions',
    {
      defaultMessage: 'Host Isolation Exceptions',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.hostIsolationExceptions.description',
    {
      defaultMessage:
        'Add specific IP addresses that isolated hosts are still allowed to communicate with, even when isolated from the rest of the network.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [
            'lists-all',
            'lists-read',
            'lists-summary',
            `${APP_ID}-deleteHostIsolationExceptions`,
            `${APP_ID}-readHostIsolationExceptions`,
          ],
          id: 'host_isolation_exceptions_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
            read: [],
          },
          ui: ['readHostIsolationExceptions', 'deleteHostIsolationExceptions'],
        },
        {
          api: ['lists-read', 'lists-summary', `${APP_ID}-readHostIsolationExceptions`],
          id: 'host_isolation_exceptions_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readHostIsolationExceptions'],
        },
      ],
    },
  ],
});
const blocklistSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.blockList.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Blocklist access.',
    }
  ),
  name: i18n.translate('securitySolutionPackages.features.featureRegistry.subFeatures.blockList', {
    defaultMessage: 'Blocklist',
  }),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.blockList.description',
    {
      defaultMessage:
        'Extend Elastic Defend’s protection against malicious processes and protect against potentially harmful applications.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [
            'lists-all',
            'lists-read',
            'lists-summary',
            `${APP_ID}-writeBlocklist`,
            `${APP_ID}-readBlocklist`,
          ],
          id: 'blocklist_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
            read: [],
          },
          ui: ['writeBlocklist', 'readBlocklist'],
        },
        {
          api: ['lists-read', 'lists-summary', `${APP_ID}-readBlocklist`],
          id: 'blocklist_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readBlocklist'],
        },
      ],
    },
  ],
});
const eventFiltersSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.eventFilters.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Event Filters access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.eventFilters',
    {
      defaultMessage: 'Event Filters',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.eventFilters.description',
    {
      defaultMessage:
        'Filter out endpoint events that you do not need or want stored in Elasticsearch.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [
            'lists-all',
            'lists-read',
            'lists-summary',
            `${APP_ID}-writeEventFilters`,
            `${APP_ID}-readEventFilters`,
          ],
          id: 'event_filters_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
            read: [],
          },
          ui: ['writeEventFilters', 'readEventFilters'],
        },
        {
          api: ['lists-read', 'lists-summary', `${APP_ID}-readEventFilters`],
          id: 'event_filters_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readEventFilters'],
        },
      ],
    },
  ],
});
const policyManagementSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.policyManagement.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Policy Management access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.policyManagement',
    {
      defaultMessage: 'Elastic Defend Policy Management',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.policyManagement.description',
    {
      defaultMessage:
        'Access the Elastic Defend integration policy to configure protections, event collection, and advanced policy features.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writePolicyManagement`, `${APP_ID}-readPolicyManagement`],
          id: 'policy_management_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: ['policy-settings-protection-updates-note'],
            read: [],
          },
          ui: ['writePolicyManagement', 'readPolicyManagement'],
        },
        {
          api: [`${APP_ID}-readPolicyManagement`],
          id: 'policy_management_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: ['policy-settings-protection-updates-note'],
          },
          ui: ['readPolicyManagement'],
        },
      ],
    },
  ],
});

const responseActionsHistorySubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.responseActionsHistory.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Response Actions History access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.responseActionsHistory',
    {
      defaultMessage: 'Response Actions History',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.responseActionsHistory.description',
    {
      defaultMessage: 'Access the history of response actions performed on endpoints.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeActionsLogManagement`, `${APP_ID}-readActionsLogManagement`],
          id: 'actions_log_management_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeActionsLogManagement', 'readActionsLogManagement'],
        },
        {
          api: [`${APP_ID}-readActionsLogManagement`],
          id: 'actions_log_management_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readActionsLogManagement'],
        },
      ],
    },
  ],
});
const hostIsolationSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.hostIsolation.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Host Isolation access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.hostIsolation',
    {
      defaultMessage: 'Host Isolation',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.hostIsolation.description',
    { defaultMessage: 'Perform the "isolate" and "release" response actions.' }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeHostIsolationRelease`],
          id: 'host_isolation_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeHostIsolationRelease'],
        },
      ],
    },
  ],
});

const processOperationsSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.processOperations.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Process Operations access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.processOperations',
    {
      defaultMessage: 'Process Operations',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.processOperations.description',
    {
      defaultMessage: 'Perform process-related response actions in the response console.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeProcessOperations`],
          id: 'process_operations_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeProcessOperations'],
        },
      ],
    },
  ],
});
const fileOperationsSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.fileOperations.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for File Operations access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.fileOperations',
    {
      defaultMessage: 'File Operations',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.fileOperations.description',
    {
      defaultMessage: 'Perform file-related response actions in the response console.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeFileOperations`],
          id: 'file_operations_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeFileOperations'],
        },
      ],
    },
  ],
});

// execute operations are not available in 8.7,
// but will be available in 8.8
const executeActionSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.executeOperations.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Execute Operations access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.executeOperations',
    {
      defaultMessage: 'Execute Operations',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.executeOperations.description',
    {
      defaultMessage: 'Perform script execution response actions in the response console.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeExecuteOperations`],
          id: 'execute_operations_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeExecuteOperations'],
        },
      ],
    },
  ],
});

// 8.15 feature
const scanActionSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.scanOperations.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Scan Operations access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.scanOperations',
    {
      defaultMessage: 'Scan Operations',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.scanOperations.description',
    {
      defaultMessage: 'Perform folder scan response actions in the response console.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeScanOperations`],
          id: 'scan_operations_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeScanOperations'],
        },
      ],
    },
  ],
});

const workflowInsightsSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.workflowInsights.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Endpoint Insights access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.workflowInsights',
    {
      defaultMessage: 'Endpoint Insights',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.workflowInsights.description',
    {
      defaultMessage: 'Access the endpoint insights.',
    }
  ),

  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeWorkflowInsights`, `${APP_ID}-readWorkflowInsights`],
          id: 'workflow_insights_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeWorkflowInsights', 'readWorkflowInsights'],
        },
        {
          api: [`${APP_ID}-readWorkflowInsights`],
          id: 'workflow_insights_read',
          includeIn: 'none',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readWorkflowInsights'],
        },
      ],
    },
  ],
});

const endpointExceptionsSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.endpointExceptions.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Endpoint Exceptions access.',
    }
  ),
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.endpointExceptions',
    {
      defaultMessage: 'Endpoint Exceptions',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.endpointExceptions.description',
    {
      defaultMessage: 'Use Endpoint Exceptions (this is a test sub-feature).',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          id: 'endpoint_exceptions_all',
          includeIn: 'all',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ...ProductFeaturesPrivileges[ProductFeaturesPrivilegeId.endpointExceptions].all,
        },
        {
          id: 'endpoint_exceptions_read',
          includeIn: 'read',
          name: TRANSLATIONS.read,
          savedObject: {
            all: [],
            read: [],
          },
          ...ProductFeaturesPrivileges[ProductFeaturesPrivilegeId.endpointExceptions].read,
        },
      ],
    },
  ],
});

const globalArtifactManagementSubFeature = (): SubFeatureConfig => ({
  requireAllSpaces: false,
  privilegesTooltip: undefined,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.globalArtifactManagement',
    {
      defaultMessage: 'Global Artifact Management',
    }
  ),
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.globalArtifactManagement.description',
    {
      defaultMessage:
        'Manage global assignment of endpoint artifacts (e.g., Trusted Applications, Event Filters) ' +
        'across all policies. This privilege controls global assignment rights only; privileges for each ' +
        'artifact type are required for full artifact management.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeGlobalArtifacts`],
          id: 'global_artifact_management_all',
          includeIn: 'none',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeGlobalArtifacts'],
        },
      ],
    },
  ],
});

/**
 * Sub-features that will always be available for Security
 * regardless of the product type.
 */
export const getSecurityV2BaseKibanaSubFeatureIds = (
  { experimentalFeatures }: SecurityFeatureParams // currently un-used, but left here as a convenience for possible future use
): SecuritySubFeatureId[] => [SecuritySubFeatureId.hostIsolation];

/**
 * Defines all the Security Assistant subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */

export const getSecurityV2SubFeaturesMap = ({
  experimentalFeatures,
}: SecurityFeatureParams): Map<SecuritySubFeatureId, SubFeatureConfig> => {
  const enableSpaceAwarenessIfNeeded = (subFeature: SubFeatureConfig): SubFeatureConfig => {
    if (experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
      subFeature.requireAllSpaces = false;
      subFeature.privilegesTooltip = undefined;
    }

    return subFeature;
  };

  const securitySubFeaturesList: Array<[SecuritySubFeatureId, SubFeatureConfig]> = [
    [SecuritySubFeatureId.endpointList, enableSpaceAwarenessIfNeeded(endpointListSubFeature())],
    [
      SecuritySubFeatureId.endpointExceptions,
      enableSpaceAwarenessIfNeeded(endpointExceptionsSubFeature()),
    ],

    ...((experimentalFeatures.endpointManagementSpaceAwarenessEnabled
      ? [
          [
            SecuritySubFeatureId.globalArtifactManagement,
            enableSpaceAwarenessIfNeeded(globalArtifactManagementSubFeature()),
          ],
        ]
      : []) as Array<[SecuritySubFeatureId, SubFeatureConfig]>),

    [
      SecuritySubFeatureId.trustedApplications,
      enableSpaceAwarenessIfNeeded(trustedApplicationsSubFeature()),
    ],
    [
      SecuritySubFeatureId.hostIsolationExceptionsBasic,
      enableSpaceAwarenessIfNeeded(hostIsolationExceptionsBasicSubFeature()),
    ],
    [SecuritySubFeatureId.blocklist, enableSpaceAwarenessIfNeeded(blocklistSubFeature())],
    [SecuritySubFeatureId.eventFilters, enableSpaceAwarenessIfNeeded(eventFiltersSubFeature())],

    [
      SecuritySubFeatureId.policyManagement,
      enableSpaceAwarenessIfNeeded(policyManagementSubFeature()),
    ],
    [
      SecuritySubFeatureId.responseActionsHistory,
      enableSpaceAwarenessIfNeeded(responseActionsHistorySubFeature()),
    ],
    [SecuritySubFeatureId.hostIsolation, enableSpaceAwarenessIfNeeded(hostIsolationSubFeature())],
    [
      SecuritySubFeatureId.processOperations,
      enableSpaceAwarenessIfNeeded(processOperationsSubFeature()),
    ],
    [SecuritySubFeatureId.fileOperations, enableSpaceAwarenessIfNeeded(fileOperationsSubFeature())],
    [SecuritySubFeatureId.executeAction, enableSpaceAwarenessIfNeeded(executeActionSubFeature())],
    [SecuritySubFeatureId.scanAction, enableSpaceAwarenessIfNeeded(scanActionSubFeature())],
  ];

  // Use the following code to add feature based on feature flag
  // if (experimentalFeatures.featureFlagName) {
  //   securitySubFeaturesList.push([SecuritySubFeatureId.featureId, featureSubFeature]);
  // }

  if (experimentalFeatures.defendInsights) {
    // place with other All/Read/None options
    securitySubFeaturesList.splice(1, 0, [
      SecuritySubFeatureId.workflowInsights,
      enableSpaceAwarenessIfNeeded(workflowInsightsSubFeature()),
    ]);
  }

  const securitySubFeaturesMap = new Map<SecuritySubFeatureId, SubFeatureConfig>(
    securitySubFeaturesList
  );

  return Object.freeze(securitySubFeaturesMap);
};
