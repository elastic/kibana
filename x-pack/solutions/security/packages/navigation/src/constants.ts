/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_UI_APP_ID = 'securitySolutionUI' as const;

export { SecurityPageName } from '@kbn/deeplinks-security';

export enum LinkCategoryType {
  title = 'title',
  collapsibleTitle = 'collapsibleTitle',
  accordion = 'accordion',
  separator = 'separator',
}

/**
 * External (non-Security) page names that need to be linked in the Security navigation.
 * Format: `<pluginId>:<deepLinkId>/<path>`.
 *
 * `pluginId`: is the id of the plugin that owns the deep link
 *
 * `deepLinkId`: is the id of the deep link inside the plugin.
 * Keep empty for the root page of the plugin, e.g. `osquery:`
 *
 * `path`: is the path to append to the plugin and deep link.
 * This is optional and only needed if the path is not registered in the plugin's `deepLinks`. e.g. `integrations:/browse/security`
 * The path should not be used for links displayed in the main left navigation, since highlighting won't work.
 **/
export enum ExternalPageName {
  // Discover
  discover = 'discover:',
  // Osquery
  osquery = 'osquery:',
  // Analytics
  maps = 'maps:',
  visualize = 'visualize:',
  // Machine Learning
  // Ref: src/platform/packages/private/default-nav/ml/default_navigation.ts
  mlOverview = 'ml:overview',
  mlNotifications = 'ml:notifications',
  mlMemoryUsage = 'ml:memoryUsage',
  mlAnomalyDetection = 'ml:anomalyDetection',
  mlAnomalyExplorer = 'ml:anomalyExplorer',
  mlSingleMetricViewer = 'ml:singleMetricViewer',
  mlSuppliedConfigurations = 'ml:suppliedConfigurations',
  mlSettings = 'ml:settings',
  mlDataFrameAnalytics = 'ml:dataFrameAnalytics',
  mlResultExplorer = 'ml:resultExplorer',
  mlAnalyticsMap = 'ml:analyticsMap',
  mlNodesOverview = 'ml:nodesOverview',
  mlNodes = 'ml:nodes',
  mlFileUpload = 'ml:fileUpload',
  mlIndexDataVisualizer = 'ml:indexDataVisualizer',
  mlESQLdataVisualizer = 'ml:esqlDataVisualizer',
  mlDataDrift = 'ml:dataDrift',
  mlExplainLogRateSpikes = 'ml:logRateAnalysis',
  mlLogPatternAnalysis = 'ml:logPatternAnalysis',
  mlChangePointDetections = 'ml:changePointDetections',
  // Dev Tools
  // Ref: src/platform/packages/private/default-nav/devtools/default_navigation.ts
  devTools = 'dev_tools:',
  // Fleet
  // Ref: x-pack/platform/plugins/shared/fleet/public/deep_links.ts
  fleet = 'fleet:',
  fleetAgents = 'fleet:agents',
  fleetPolicies = 'fleet:policies',
  fleetEnrollmentTokens = 'fleet:enrollment_tokens',
  fleetUninstallTokens = 'fleet:uninstall_tokens',
  fleetDataStreams = 'fleet:data_streams',
  fleetSettings = 'fleet:settings',
  // Integrations
  // No deepLinkId registered, using path for the security search
  integrationsSecurity = 'integrations:/browse/security',
  // Management
  // Ref: src/platform/packages/private/default-nav/management/default_navigation.ts
  management = 'management:',
  managementIngestPipelines = 'management:ingest_pipelines',
  managementPipelines = 'management:pipelines',
  managementIndexManagement = 'management:index_management',
  managementTransforms = 'management:transform',
  managementMaintenanceWindows = 'management:maintenanceWindows',
  managementTriggersActions = 'management:triggersActions',
  managementCases = 'management:cases',
  managementTriggersActionsConnectors = 'management:triggersActionsConnectors',
  managementReporting = 'management:reporting',
  managementJobsListLink = 'management:jobsListLink',
  managementDataViews = 'management:dataViews',
  managementObjects = 'management:objects',
  managementApiKeys = 'management:api_keys',
  managementTags = 'management:tags',
  managementFiles = 'management:filesManagement',
  managementSpaces = 'management:spaces',
  managementSettings = 'management:settings',
  managementMonitoring = 'monitoring:',
  // Cloud UI
  // These are links to Cloud UI outside Kibana
  // Special Format: <cloud>:<cloudUrlKey>
  // cloudUrlKey Ref: x-pack/solutions/security/plugins/security_solution_serverless/public/navigation/links/util.ts
  cloudUsersAndRoles = 'cloud:usersAndRoles',
  cloudBilling = 'cloud:billing',
  cloudPerformance = 'cloud:performance',
}
