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
   * `runscript` response actions for SentinelOne hosts.
   *
   * Release: 9.2.0 (earlier for serverless)
   */
  responseActionsSentinelOneRunScriptEnabled: true,

  /**
   * Memory Dump response actions support for Elastic Defend.
   * Release: v9.3
   */
  responseActionsEndpointMemoryDump: false,

  /**
   * `runscript` response action for Elastic Defend Endpoint
   * Release: 9.4
   */
  responseActionsEndpointRunScript: false,

  /**
   * Support for Endpoint `runscript` from rules (automated)
   * Release: 9.4
   */
  responseActionsEndpointAutomatedRunScript: false,

  /**
   * Scripts library in support of `runscript`/upload-execute` new command for elastic defend
   * Release: 9.4
   */
  responseActionsScriptLibraryManagement: false,

  /**
   * Enables the Assistant Model Evaluation advanced setting and API endpoint, introduced in `8.11.0`.
   */
  assistantModelEvaluation: false,

  /**
   * Enable resetting risk scores to zero for outdated entities
   */
  enableRiskScoreResetToZero: true,

  /**
   * Enable privmon modifier in risk scoring calculation
   */
  enableRiskScorePrivmonModifier: true,

  /**
   * Entity Analytics: Disables the Risk Score AI Assistant tool.
   */
  riskScoreAssistantToolDisabled: false,

  /**
   * Entity Analytics: Disables the Risk Score AI Assistant tool.
   */
  entityDetailsHighlightsEnabled: true,

  /**
   * Enables the experimental Threat Hunting home experience.
   */
  entityThreatHuntingEnabled: false,

  /**
   * disables ES|QL rules
   */
  esqlRulesDisabled: false,

  /**
   * Enables experimental Microsoft Defender for Endpoint integration data to be available in Analyzer
   */
  microsoftDefenderEndpointDataInAnalyzerEnabled: true,

  /**
   * Enables the storing of gaps in the event log
   */
  storeGapsInEventLogEnabled: true,

  /**
   * Enables scheduling gap fills for rules
   */
  bulkFillRuleGapsEnabled: true,

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
   * Enables CrowdStrike's RunScript RTR command
   * Release: 8.18/9.0
   */
  crowdstrikeRunScriptEnabled: true,

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
   * Protects all the work related to the attacks and alerts alignment effort
   */
  attacksAlertsAlignment: false,
  /**
   *  Enables the QRadar rules import feature
   */
  qradarRulesMigration: true,
  /**
   * Enables the Kubernetes Dashboard in Security Solution
   */
  kubernetesEnabled: true,

  /**
   * Enables the Entity Analytics Watchlist feature.
   */
  entityAnalyticsWatchlistEnabled: false,

  /**
   * Enables the Gap Auto Fill Scheduler feature.
   */
  gapAutoFillSchedulerEnabled: false,
  /**
   * Enables DNS events toggle for Linux in Endpoint policy configuration.
   * When disabled, DNS field is not added to Linux policies and not shown in UI.
   */
  linuxDnsEvents: false,
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
