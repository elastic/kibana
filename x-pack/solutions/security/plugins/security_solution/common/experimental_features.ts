/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = { [K in keyof typeof allowedExperimentalValues]: boolean };

/**
 * A list of allowed values that can be used in `xpack.securitySolution.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  donutChartEmbeddablesEnabled: false, // Depends on https://github.com/elastic/kibana/issues/136409 item 2 - 6

  /**
   * This is used for enabling the end-to-end tests for the security_solution telemetry.
   * We disable the telemetry since we don't have specific roles or permissions around it and
   * we don't want people to be able to violate security by getting access to whole documents
   * around telemetry they should not.
   * @see telemetry_detection_rules_preview_route.ts
   * @see test/security_solution_api_integration/test_suites/telemetry/README.md
   */
  previewTelemetryUrlEnabled: false,

  /**
   * Enables extended rule execution logging to Event Log. When this setting is enabled:
   * - Rules write their console error, info, debug, and trace messages to Event Log,
   *   in addition to other events they log there (status changes and execution metrics).
   * - We add a Kibana Advanced Setting that controls this behavior (on/off and log level).
   * - We show a table with plain execution logs on the Rule Details page.
   */
  extendedRuleExecutionLoggingEnabled: false,

  /**
   * Enables the SOC trends timerange and stats on D&R page
   */
  socTrendsEnabled: false,

  /**
   * Enables the ability to send Response actions to Crowdstrike and persist the results
   * in ES.
   */
  responseActionsCrowdstrikeManualHostIsolationEnabled: true,

  /**
   * `runscript` response actions for SentinelOne hosts.
   *
   * Release: 9.2.0 (earlier for serverless)
   */
  responseActionsSentinelOneRunScriptEnabled: true,

  /**
   * Space awareness for Elastic Defend management.
   * Feature depends on Fleet's corresponding features also being enabled:
   * - `subfeaturePrivileges`
   * - `useSpaceAwareness`
   * and Fleet must set it runtime mode to spaces by calling the following API:
   * - `POST /internal/fleet/enable_space_awareness`
   */
  endpointManagementSpaceAwarenessEnabled: true,

  /**
   * Disables new notes
   */
  securitySolutionNotesDisabled: false,

  /**
   * Enables the Assistant Model Evaluation advanced setting and API endpoint, introduced in `8.11.0`.
   */
  assistantModelEvaluation: false,

  /**
   * Enables the Managed User section inside the new user details flyout.
   */
  newUserDetailsFlyoutManagedUser: false,

  /**
   * Enable risk engine client and initialisation of datastream, component templates and mappings
   */
  riskScoringPersistence: true,

  /**
   * Enables experimental Entity Analytics HTTP endpoints
   */
  riskScoringRoutesEnabled: true,

  /**
   * Disables ESQL-based risk scoring
   */
  disableESQLRiskScoring: false,

  /**
   * Enable resetting risk scores to zero for outdated entities
   */
  enableRiskScoreResetToZero: true,

  /**
   * Entity Analytics: Disables the Risk Score AI Assistant tool.
   */
  riskScoreAssistantToolDisabled: false,

  /**
   * disables ES|QL rules
   */
  esqlRulesDisabled: false,

  /**
   * Enables Protection Updates tab in the Endpoint Policy Details page
   */
  protectionUpdatesEnabled: true,

  /**
   * Enables Response actions telemetry collection
   * Should be enabled in 8.17.0
   */
  responseActionsTelemetryEnabled: true,

  /**
   * Enables experimental Microsoft Defender for Endpoint integration data to be available in Analyzer
   */
  microsoftDefenderEndpointDataInAnalyzerEnabled: true,

  /**
   * Enables the new modal for the value list items
   */
  valueListItemsModalEnabled: true,

  /**
   * Enables the storing of gaps in the event log
   */
  storeGapsInEventLogEnabled: true,

  /**
   * Enables scheduling gap fills for rules
   */
  bulkFillRuleGapsEnabled: true,

  /**
   * Adds a new option to filter descendants of a process for Management / Event Filters
   */
  filterProcessDescendantsForEventFiltersEnabled: true,

  /**
   * Adds a new option to filter descendants of a process for Management / Trusted Apps
   */
  filterProcessDescendantsForTrustedAppsEnabled: false,

  /**
   * Enables the rule's bulk action to manage alert suppression
   */
  bulkEditAlertSuppressionEnabled: true,

  /**
   * Enables the ability to use does not match condition for indicator match rules
   */
  doesNotMatchForIndicatorMatchRuleEnabled: true,

  /**
   * Disables Security's Entity Store engine routes. The Entity Store feature is available by default, but
   * can be disabled if necessary in a given environment.
   */
  entityStoreDisabled: false,

  /**
   * Disables the siem migrations feature
   */
  siemMigrationsDisabled: false,

  /**
   * Enables the Defend Insights Policy Response Failure feature
   */
  defendInsightsPolicyResponseFailure: true,

  /**
   * Removes Endpoint Exceptions from Rules/Alerts pages, and shows it instead in Manage/Assets.
   */
  endpointExceptionsMovedUnderManagement: false,

  /**
   * Disables flyout history and new preview navigation
   */
  newExpandableFlyoutNavigationDisabled: false,

  /**
   * Enables the ability to edit highlighted fields in the alertflyout
   */
  editHighlightedFields: true,

  /**
   * Enables CrowdStrike's RunScript RTR command
   * Release: 8.18/9.0
   */
  crowdstrikeRunScriptEnabled: true,

  /**
   * Enabled Microsoft Defender for  Endpoint actions: Isolate and Release.
   * Release: 8.18/9.0
   */
  responseActionsMSDefenderEndpointEnabled: true,

  /**
   * Enables banner for informing users about changes in data collection.
   */
  eventCollectionDataReductionBannerEnabled: true,

  /** Enables new Data View Picker */
  newDataViewPickerEnabled: true,

  /**
   * Enables Microsoft Defender for Endpoint's RunScript command
   * Release: 8.19/9.1
   */
  microsoftDefenderEndpointRunScriptEnabled: true,

  /**
   * Enables advanced mode for Trusted Apps creation and update
   */
  trustedAppsAdvancedMode: true,

  /**
   * Enables Trusted Devices artifact management for device control protections.
   * Allows users to manage trusted USB and external devices
   */
  trustedDevices: true,

  /**
   * Enables the ability to import and migration dashboards through automatic migration service
   */
  automaticDashboardsMigration: true,

  /**
   * Enables the SIEM Readiness Dashboard feature
   */
  siemReadinessDashboard: false,
  /**
   * Enables Microsoft Defender for Endpoint's Cancel command
   * Release: 9.2.0
   */
  microsoftDefenderEndpointCancelEnabled: true,
  /**
   * Protects all the work related to the attacks and alert alignment effort
   */
  attacksAlertAlignment: false,
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

const disableExperimentalPrefix = 'disable:' as const;

/**
 * Parses the string value used in `xpack.securitySolution.enableExperimental` kibana configuration,
 * which should be an array of strings corresponding to allowedExperimentalValues keys.
 * Use the `disable:` prefix to disable a feature.
 *
 * @param configValue
 */
export const parseExperimentalConfigValue = (
  configValue: string[]
): { features: ExperimentalFeatures; invalid: string[] } => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};
  const invalidKeys: string[] = [];

  for (let value of configValue) {
    const isDisabled = value.startsWith(disableExperimentalPrefix);
    if (isDisabled) {
      value = value.replace(disableExperimentalPrefix, '');
    }
    if (!allowedKeys.includes(value as keyof ExperimentalFeatures)) {
      invalidKeys.push(value);
    } else {
      enabledFeatures[value as keyof ExperimentalFeatures] = !isDisabled;
    }
  }

  return {
    features: {
      ...allowedExperimentalValues,
      ...enabledFeatures,
    },
    invalid: invalidKeys,
  };
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
