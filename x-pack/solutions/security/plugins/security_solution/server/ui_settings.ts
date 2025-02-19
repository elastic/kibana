/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import type { CoreSetup, UiSettingsParams } from '@kbn/core/server';
import {
  APP_ID,
  DEFAULT_ANOMALY_SCORE,
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_FROM,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_MAX_UNASSOCIATED_NOTES,
  DEFAULT_RULE_REFRESH_INTERVAL_ON,
  DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
  DEFAULT_RULES_TABLE_REFRESH_SETTING,
  DEFAULT_THREAT_INDEX_KEY,
  DEFAULT_THREAT_INDEX_VALUE,
  DEFAULT_TO,
  ENABLE_NEWS_FEED_SETTING,
  IP_REPUTATION_LINKS_SETTING,
  IP_REPUTATION_LINKS_SETTING_DEFAULT,
  MAX_UNASSOCIATED_NOTES,
  NEWS_FEED_URL_SETTING,
  NEWS_FEED_URL_SETTING_DEFAULT,
  ENABLE_CCS_READ_WARNING_SETTING,
  SHOW_RELATED_INTEGRATIONS_SETTING,
  EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING,
  EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING,
  DEFAULT_ALERT_TAGS_KEY,
  DEFAULT_ALERT_TAGS_VALUE,
  EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER,
  EXCLUDED_DATA_TIERS_FOR_RULE_EXECUTION,
  ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING,
  ENABLE_GRAPH_VISUALIZATION_SETTING,
} from '../common/constants';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { LogLevelSetting } from '../common/api/detection_engine/rule_monitoring';

type SettingsConfig = Record<string, UiSettingsParams<unknown>>;

/**
 * This helper is used to preserve settings order in the UI
 *
 * @param settings - UI settings config
 * @returns Settings config with the order field added
 */
const orderSettings = (settings: SettingsConfig): SettingsConfig => {
  return Object.fromEntries(
    Object.entries(settings).map(([id, setting], index) => [id, { ...setting, order: index }])
  );
};

export const initUiSettings = (
  uiSettings: CoreSetup['uiSettings'],
  experimentalFeatures: ExperimentalFeatures,
  validationsEnabled: boolean
) => {
  const enableVisualizationsInFlyoutLabel = i18n.translate(
    'xpack.securitySolution.uiSettings.enableVisualizationsInFlyoutLabel',
    {
      defaultMessage: 'Enable visualizations in flyout',
    }
  );
  const securityUiSettings: Record<string, UiSettingsParams<unknown>> = {
    [DEFAULT_APP_REFRESH_INTERVAL]: {
      type: 'json',
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultRefreshIntervalLabel', {
        defaultMessage: 'Time filter refresh interval',
      }),
      value: `{
  "pause": ${DEFAULT_INTERVAL_PAUSE},
  "value": ${DEFAULT_INTERVAL_VALUE}
}`,
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.defaultRefreshIntervalDescription',
        {
          defaultMessage:
            '<p>Default refresh interval for the Security time filter, in milliseconds.</p>',
          values: { p: (chunks) => `<p>${chunks}</p>` },
        }
      ),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.object({
        value: schema.number(),
        pause: schema.boolean(),
      }),
    },
    [DEFAULT_APP_TIME_RANGE]: {
      type: 'json',
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultTimeRangeLabel', {
        defaultMessage: 'Time filter period',
      }),
      value: `{
  "from": "${DEFAULT_FROM}",
  "to": "${DEFAULT_TO}"
}`,
      description: i18n.translate('xpack.securitySolution.uiSettings.defaultTimeRangeDescription', {
        defaultMessage: '<p>Default period of time in the Security time filter.</p>',
        values: { p: (chunks) => `<p>${chunks}</p>` },
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.object({
        from: schema.string(),
        to: schema.string(),
      }),
    },
    [DEFAULT_INDEX_KEY]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultIndexLabel', {
        defaultMessage: 'Elasticsearch indices',
      }),
      sensitive: true,

      value: DEFAULT_INDEX_PATTERN,
      description: i18n.translate('xpack.securitySolution.uiSettings.defaultIndexDescription', {
        defaultMessage:
          '<p>Comma-delimited list of Elasticsearch indices from which the Security app collects events.</p>',
        values: { p: (chunks) => `<p>${chunks}</p>` },
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: validationsEnabled
        ? schema.arrayOf(schema.string(), { maxSize: 50 })
        : schema.arrayOf(schema.string()),
    },
    [DEFAULT_THREAT_INDEX_KEY]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultThreatIndexLabel', {
        defaultMessage: 'Threat indices',
      }),
      sensitive: true,
      value: DEFAULT_THREAT_INDEX_VALUE,
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.defaultThreatIndexDescription',
        {
          defaultMessage:
            '<p>Comma-delimited list of Threat Intelligence indices from which the Security app collects indicators.</p>',
          values: { p: (chunks) => `<p>${chunks}</p>` },
        }
      ),
      category: [APP_ID],
      requiresPageReload: true,
      schema: validationsEnabled
        ? schema.arrayOf(schema.string(), { maxSize: 10 })
        : schema.arrayOf(schema.string()),
    },
    [DEFAULT_ANOMALY_SCORE]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultAnomalyScoreLabel', {
        defaultMessage: 'Anomaly threshold',
      }),
      value: 50,
      type: 'number',
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.defaultAnomalyScoreDescription',
        {
          defaultMessage:
            '<p>Value above which Machine Learning job anomalies are displayed in the Security app.</p><p>Valid values: 0 to 100.</p>',
          values: { p: (chunks) => `<p>${chunks}</p>` },
        }
      ),
      category: [APP_ID],
      requiresPageReload: true,
      schema: validationsEnabled ? schema.number({ max: 100, min: 0 }) : schema.number(),
    },
    [ENABLE_NEWS_FEED_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.enableNewsFeedLabel', {
        defaultMessage: 'News feed',
      }),
      value: true,
      description: i18n.translate('xpack.securitySolution.uiSettings.enableNewsFeedDescription', {
        defaultMessage: '<p>Enables the News feed</p>',
        values: { p: (chunks) => `<p>${chunks}</p>` },
      }),
      type: 'boolean',
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    [EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER]: {
      name: i18n.translate(
        'xpack.securitySolution.uiSettings.excludeColdAndFrozenTiersInAnalyzer',
        {
          defaultMessage: 'Exclude cold and frozen tiers in Analyzer',
        }
      ),
      value: false,
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.excludeColdAndFrozenTiersInAnalyzerDescription',
        {
          defaultMessage:
            '<p>When enabled, cold and frozen tiers will be skipped in analyzer queries</p>',
          values: { p: (chunks) => `<p>${chunks}</p>` },
        }
      ),
      type: 'boolean',
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    [ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING]: {
      name: enableVisualizationsInFlyoutLabel,
      value: false,
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.enableVisualizationsInFlyoutDescription',
        {
          defaultMessage:
            '<em>[technical preview]</em> Enable visualizations (analyzer and session viewer) in flyout.',
          values: { em: (chunks) => `<em>${chunks}</em>` },
        }
      ),
      type: 'boolean',
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    [ENABLE_GRAPH_VISUALIZATION_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.enableGraphVisualizationLabel', {
        defaultMessage: 'Enable graph visualization',
      }),
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.enableGraphVisualizationDescription',
        {
          defaultMessage: `<em>[technical preview]</em> Enable the Graph Visualization feature within the Security Solution.
            <br/>Note: This feature requires the {visualizationFlyoutFeatureFlag} setting to be enabled.
            <br/>Please ensure both settings are enabled to use graph visualizations in flyout.`,
          values: {
            em: (chunks) => `<em>${chunks}</em>`,
            visualizationFlyoutFeatureFlag: `<code>${enableVisualizationsInFlyoutLabel}</code>`,
          },
        }
      ),
      type: 'boolean',
      value: false,
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    [DEFAULT_RULES_TABLE_REFRESH_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.rulesTableRefresh', {
        defaultMessage: 'Rules auto refresh',
      }),
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.rulesTableRefreshDescription',
        {
          defaultMessage:
            '<p>Enables auto refresh on the rules and monitoring tables, in milliseconds</p>',
          values: { p: (chunks) => `<p>${chunks}</p>` },
        }
      ),
      type: 'json',
      value: `{
  "on": ${DEFAULT_RULE_REFRESH_INTERVAL_ON},
  "value": ${DEFAULT_RULE_REFRESH_INTERVAL_VALUE}
}`,
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.object({
        value: schema.number({ min: 60000 }),
        on: schema.boolean(),
      }),
    },
    [NEWS_FEED_URL_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.newsFeedUrl', {
        defaultMessage: 'News feed URL',
      }),
      value: NEWS_FEED_URL_SETTING_DEFAULT,
      sensitive: true,
      description: i18n.translate('xpack.securitySolution.uiSettings.newsFeedUrlDescription', {
        defaultMessage: '<p>News feed content will be retrieved from this URL</p>',
        values: { p: (chunks) => `<p>${chunks}</p>` },
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.string(),
    },
    [IP_REPUTATION_LINKS_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.ipReputationLinks', {
        defaultMessage: 'IP Reputation Links',
      }),
      value: IP_REPUTATION_LINKS_SETTING_DEFAULT,
      type: 'json',
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.ipReputationLinksDescription',
        {
          defaultMessage:
            'Array of URL templates to build the list of reputation URLs to be displayed on the IP Details page.',
        }
      ),
      sensitive: true,
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.arrayOf(
        schema.object({
          name: schema.string(),
          url_template: schema.string(),
        })
      ),
    },
    [ENABLE_CCS_READ_WARNING_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.enableCcsReadWarningLabel', {
        defaultMessage: 'CCS Rule Privileges Warning',
      }),
      value: true,
      description: i18n.translate('xpack.securitySolution.uiSettings.enableCcsWarningDescription', {
        defaultMessage: '<p>Enables privilege check warnings in rules for CCS indices</p>',
        values: { p: (chunks) => `<p>${chunks}</p>` },
      }),
      type: 'boolean',
      category: [APP_ID],
      requiresPageReload: false,
      schema: schema.boolean(),
    },
    [SHOW_RELATED_INTEGRATIONS_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.showRelatedIntegrationsLabel', {
        defaultMessage: 'Related integrations',
      }),
      value: true,
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.showRelatedIntegrationsDescription',
        {
          defaultMessage: '<p>Shows related integrations on the rules and monitoring tables</p>',
          values: { p: (chunks) => `<p>${chunks}</p>` },
        }
      ),
      type: 'boolean',
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    [DEFAULT_ALERT_TAGS_KEY]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultAlertTagsLabel', {
        defaultMessage: 'Alert tagging options',
      }),
      sensitive: true,
      value: DEFAULT_ALERT_TAGS_VALUE,
      description: i18n.translate('xpack.securitySolution.uiSettings.defaultAlertTagsDescription', {
        defaultMessage:
          '<p>List of tag options for use with alerts generated by Security Solution rules.</p>',
        values: { p: (chunks) => `<p>${chunks}</p>` },
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.arrayOf(schema.string()),
    },
    [MAX_UNASSOCIATED_NOTES]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.maxUnassociatedNotesLabel', {
        defaultMessage: 'Maximum amount of unassociated notes',
      }),
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.maxUnassociatedNotesDescription',
        {
          defaultMessage:
            'Defines the maximum amount of unassociated notes (notes that are not assigned to a timeline) that can be created.',
        }
      ),
      type: 'number',
      value: DEFAULT_MAX_UNASSOCIATED_NOTES,
      schema: schema.number({
        min: 1,
        max: 1000,
        defaultValue: DEFAULT_MAX_UNASSOCIATED_NOTES,
      }),
      category: [APP_ID],
      requiresPageReload: false,
    },
    [EXCLUDED_DATA_TIERS_FOR_RULE_EXECUTION]: {
      name: i18n.translate(
        'xpack.securitySolution.uiSettings.excludedDataTiersForRuleExecutionLabel',
        {
          defaultMessage: 'Exclude cold or frozen data tier from rule execution',
        }
      ),
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.excludedDataTiersForRuleExecutionDescription',
        {
          defaultMessage: `
          When configured, events from the specified data tiers are not searched during rules executions.
          <br/>This might help to improve rule performance or reduce execution time.
          <br/>If you specify multiple data tiers, separate values with commas. For example: data_frozen,data_cold`,
        }
      ),
      type: 'array',
      schema: schema.arrayOf(
        schema.oneOf([schema.literal('data_cold'), schema.literal('data_frozen')])
      ),
      value: [],
      category: [APP_ID],
      requiresPageReload: false,
    },
    ...(experimentalFeatures.extendedRuleExecutionLoggingEnabled
      ? {
          [EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING]: {
            name: i18n.translate(
              'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingEnabledLabel',
              {
                defaultMessage: 'Extended rule execution logging',
              }
            ),
            description: i18n.translate(
              'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingEnabledDescription',
              {
                defaultMessage:
                  '<p>Enables extended rule execution logging to .kibana-event-log-* indices. Shows plain execution events on the Rule Details page.</p>',
                values: { p: (chunks) => `<p>${chunks}</p>` },
              }
            ),
            type: 'boolean',
            schema: schema.boolean(),
            value: true,
            category: [APP_ID],
            requiresPageReload: false,
          },
          [EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING]: {
            name: i18n.translate(
              'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelLabel',
              {
                defaultMessage: 'Extended rule execution logging: min level',
              }
            ),
            description: i18n.translate(
              'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelDescription',
              {
                defaultMessage:
                  '<p>Sets minimum log level starting from which rules will write extended logs to .kibana-event-log-* indices. This affects only events of type Message, other events are being written to .kibana-event-log-* regardless of this setting and their log level.</p>',
                values: { p: (chunks) => `<p>${chunks}</p>` },
              }
            ),
            type: 'select',
            schema: schema.oneOf([
              schema.literal(LogLevelSetting.off),
              schema.literal(LogLevelSetting.error),
              schema.literal(LogLevelSetting.warn),
              schema.literal(LogLevelSetting.info),
              schema.literal(LogLevelSetting.debug),
              schema.literal(LogLevelSetting.trace),
            ]),
            value: LogLevelSetting.error,
            options: [
              LogLevelSetting.off,
              LogLevelSetting.error,
              LogLevelSetting.warn,
              LogLevelSetting.info,
              LogLevelSetting.debug,
              LogLevelSetting.trace,
            ],
            optionLabels: {
              [LogLevelSetting.off]: i18n.translate(
                'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelOff',
                {
                  defaultMessage: 'Off',
                }
              ),
              [LogLevelSetting.error]: i18n.translate(
                'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelError',
                {
                  defaultMessage: 'Error',
                }
              ),
              [LogLevelSetting.warn]: i18n.translate(
                'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelWarn',
                {
                  defaultMessage: 'Warn',
                }
              ),
              [LogLevelSetting.info]: i18n.translate(
                'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelInfo',
                {
                  defaultMessage: 'Info',
                }
              ),
              [LogLevelSetting.debug]: i18n.translate(
                'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelDebug',
                {
                  defaultMessage: 'Debug',
                }
              ),
              [LogLevelSetting.trace]: i18n.translate(
                'xpack.securitySolution.uiSettings.extendedRuleExecutionLoggingMinLevelTrace',
                {
                  defaultMessage: 'Trace',
                }
              ),
            },
            category: [APP_ID],
            requiresPageReload: false,
          },
        }
      : {}),
  };

  uiSettings.register(orderSettings(securityUiSettings));
};
