/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DemoDataType } from './data_types';
import { APM_METRICS_INDEX, DEMO_DATA_TAG } from './constants';

/** APM rule type ids. Hardcoded to avoid a runtime dependency on the APM plugin. */
export const APM_TRANSACTION_ERROR_RATE_RULE_TYPE_ID = 'apm.transaction_error_rate';
export const APM_TRANSACTION_DURATION_RULE_TYPE_ID = 'apm.transaction_duration';
export const APM_ERROR_COUNT_RULE_TYPE_ID = 'apm.error_rate';

/** Infrastructure and logs rule type ids. */
export const METRIC_THRESHOLD_RULE_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_RULE_TYPE_ID = 'metrics.alert.inventory.threshold';
export const LOG_DOCUMENT_COUNT_RULE_TYPE_ID = 'logs.alert.document.count';

/** APM SLO indicator types. */
export const APM_TRANSACTION_ERROR_RATE_INDICATOR = 'sli.apm.transactionErrorRate';
export const APM_TRANSACTION_DURATION_INDICATOR = 'sli.apm.transactionDuration';
export const KQL_CUSTOM_INDICATOR = 'sli.kql.custom';

/** Index patterns and source ids for non-APM signals. */
export const LOGS_INDEX_PATTERN = 'logs-*';
export const INFRA_SOURCE_ID = 'default';

/** Sentinel meaning "all environments" for APM rule params. */
export const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
/** Sentinel meaning "all" for SLO indicator params. */
export const SLO_ALL_VALUE = '*';

/**
 * Fields used to partition APM alerts and SLOs so they produce one
 * instance per service (and per environment) rather than a single aggregate.
 */
export const APM_GROUP_BY_FIELDS = ['service.name', 'service.environment'];

export type PresetId = 'loose' | 'recommended' | 'strict';

export const PRESET_IDS: PresetId[] = ['loose', 'recommended', 'strict'];

export interface PresetDefinition {
  id: PresetId;
  label: string;
  description: string;
}

export const PRESETS: Record<PresetId, PresetDefinition> = {
  loose: {
    id: 'loose',
    label: i18n.translate('xpack.observability_onboarding.demoData.presets.loose.label', {
      defaultMessage: 'Loose',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.presets.loose.description',
      {
        defaultMessage:
          'Fewer alerts with relaxed thresholds and lower SLO targets — good for noisy dev or sandbox environments.',
      }
    ),
  },
  recommended: {
    id: 'recommended',
    label: i18n.translate('xpack.observability_onboarding.demoData.presets.recommended.label', {
      defaultMessage: 'Recommended',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.presets.recommended.description',
      {
        defaultMessage:
          'Balanced SRE starting points across APM, logs, and infrastructure: six alert rules and three SLOs with widely used 99% targets.',
      }
    ),
  },
  strict: {
    id: 'strict',
    label: i18n.translate('xpack.observability_onboarding.demoData.presets.strict.label', {
      defaultMessage: 'Strict',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.demoData.presets.strict.description',
      {
        defaultMessage:
          'Tighter thresholds, shorter evaluation windows, higher SLO targets, and extra APM latency spike coverage.',
      }
    ),
  },
};

export interface RecommendedConfigTarget {
  /** APM environment, or `ENVIRONMENT_ALL` for all environments. */
  environment: string;
  /** Threshold preset; defaults to recommended when omitted. */
  preset?: PresetId;
}

/** Body accepted by `POST /api/alerting/rule` (snake_case public API). */
export interface CreateRuleBody {
  name: string;
  rule_type_id: string;
  consumer: string;
  enabled: boolean;
  schedule: { interval: string };
  tags: string[];
  actions: never[];
  params: Record<string, unknown>;
}

/** Body accepted by `POST /api/observability/slos`. */
export interface CreateSloBody {
  name: string;
  description: string;
  indicator: {
    type: string;
    params: Record<string, unknown>;
  };
  budgetingMethod: 'occurrences' | 'timeslices';
  timeWindow: { duration: string; type: 'rolling' | 'calendarAligned' };
  objective: { target: number };
  tags: string[];
  groupBy: string | string[];
}

export interface AlertRulePreview {
  name: string;
  description: string;
  detail: string;
  dataType: DemoDataType;
}

export interface SloPreview {
  name: string;
  description: string;
  detail: string;
  dataType: DemoDataType;
}

export interface MlJobPreview {
  name: string;
  description: string;
  detail: string;
}

interface RulePresetValues {
  failedTransactionRatePercent: number;
  avgLatencyMs: number;
  errorCount: number;
  maxLatencyMs: number;
  windowSizeMinutes: number;
  includeErrorCountRule: boolean;
  includeMaxLatencyRule: boolean;
  cpuThresholdPct: number;
  hostCpuThresholdPct: number;
  errorLogCount: number;
  includeInfraRules: boolean;
  includeLogsRule: boolean;
}

interface SloPresetValues {
  availabilityTarget: number;
  latencyTarget: number;
  latencyThresholdMs: number;
  logsAvailabilityTarget: number;
  windowDays: number;
  includeLatencySlo: boolean;
  includeLogsSlo: boolean;
}

const RULE_PRESETS: Record<PresetId, RulePresetValues> = {
  loose: {
    failedTransactionRatePercent: 50,
    avgLatencyMs: 3000,
    errorCount: 50,
    maxLatencyMs: 5000,
    windowSizeMinutes: 10,
    includeErrorCountRule: false,
    includeMaxLatencyRule: false,
    cpuThresholdPct: 0.95,
    hostCpuThresholdPct: 0.95,
    errorLogCount: 200,
    includeInfraRules: false,
    includeLogsRule: false,
  },
  recommended: {
    failedTransactionRatePercent: 30,
    avgLatencyMs: 1500,
    errorCount: 25,
    maxLatencyMs: 3000,
    windowSizeMinutes: 5,
    includeErrorCountRule: true,
    includeMaxLatencyRule: false,
    cpuThresholdPct: 0.85,
    hostCpuThresholdPct: 0.85,
    errorLogCount: 50,
    includeInfraRules: true,
    includeLogsRule: true,
  },
  strict: {
    failedTransactionRatePercent: 15,
    avgLatencyMs: 800,
    errorCount: 10,
    maxLatencyMs: 2000,
    windowSizeMinutes: 3,
    includeErrorCountRule: true,
    includeMaxLatencyRule: true,
    cpuThresholdPct: 0.7,
    hostCpuThresholdPct: 0.7,
    errorLogCount: 15,
    includeInfraRules: true,
    includeLogsRule: true,
  },
};

// NOTE: these are intentionally generous starting values so the SLOs look
// meaningful out of the box rather than permanently breached. `latencyThresholdMs`
// should be lowered to match your real workload latencies, and `availabilityTarget`
// adjusted to your SLA — they are demo defaults, not production recommendations.
const SLO_PRESETS: Record<PresetId, SloPresetValues> = {
  loose: {
    availabilityTarget: 0.95,
    latencyTarget: 0.95,
    latencyThresholdMs: 3000,
    logsAvailabilityTarget: 0.95,
    windowDays: 30,
    includeLatencySlo: false,
    includeLogsSlo: false,
  },
  recommended: {
    availabilityTarget: 0.99,
    latencyTarget: 0.99,
    latencyThresholdMs: 1500,
    logsAvailabilityTarget: 0.99,
    windowDays: 30,
    includeLatencySlo: true,
    includeLogsSlo: true,
  },
  strict: {
    availabilityTarget: 0.995,
    latencyTarget: 0.999,
    latencyThresholdMs: 1200,
    logsAvailabilityTarget: 0.995,
    windowDays: 7,
    includeLatencySlo: true,
    includeLogsSlo: true,
  },
};

const resolvePreset = (preset?: PresetId): PresetId => preset ?? 'recommended';

const environmentSuffix = (environment: string): string =>
  environment === ENVIRONMENT_ALL ? 'all environments' : environment;

const formatPercent = (value: number): string => `${Math.round(value * 1000) / 10}%`;

const formatObjective = (target: number): string => formatPercent(target);

const formatCpuThreshold = (threshold: number): string => formatPercent(threshold);

const buildInfraRules = (values: RulePresetValues): CreateRuleBody[] => {
  if (!values.includeInfraRules) {
    return [];
  }

  const sharedCriteria = {
    comparator: '>',
    timeUnit: 'm' as const,
    timeSize: values.windowSizeMinutes,
  };

  return [
    {
      name: '[Demo] High host CPU (metric threshold)',
      rule_type_id: METRIC_THRESHOLD_RULE_TYPE_ID,
      consumer: 'infrastructure',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['infrastructure', DEMO_DATA_TAG],
      actions: [],
      params: {
        sourceId: INFRA_SOURCE_ID,
        criteria: [
          {
            aggType: 'avg',
            metric: 'system.cpu.total.norm.pct',
            threshold: [values.cpuThresholdPct],
            ...sharedCriteria,
          },
        ],
      },
    },
    {
      name: '[Demo] High host CPU (inventory threshold)',
      rule_type_id: METRIC_INVENTORY_THRESHOLD_RULE_TYPE_ID,
      consumer: 'infrastructure',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['infrastructure', DEMO_DATA_TAG],
      actions: [],
      params: {
        nodeType: 'host',
        sourceId: INFRA_SOURCE_ID,
        criteria: [
          {
            metric: 'cpu',
            threshold: [values.hostCpuThresholdPct],
            ...sharedCriteria,
          },
        ],
      },
    },
  ];
};

const buildLogsRules = (values: RulePresetValues): CreateRuleBody[] => {
  if (!values.includeLogsRule) {
    return [];
  }

  return [
    {
      name: '[Demo] Error log volume threshold',
      rule_type_id: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
      consumer: 'logs',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['logs', DEMO_DATA_TAG],
      actions: [],
      params: {
        criteria: [{ field: 'log.level', comparator: 'equals', value: 'error' }],
        count: { comparator: 'more than', value: values.errorLogCount },
        timeSize: values.windowSizeMinutes,
        timeUnit: 'm',
        logView: { logViewId: 'default', type: 'log-view-reference' },
      },
    },
  ];
};

/**
 * SRE-recommended rules across APM, logs, and infrastructure signals.
 */
export const buildRecommendedRules = ({
  environment,
  preset,
}: RecommendedConfigTarget): CreateRuleBody[] => {
  const resolvedPreset = resolvePreset(preset);
  const values = RULE_PRESETS[resolvedPreset];
  const suffix = environmentSuffix(environment);
  const baseParams = {
    environment,
    windowSize: values.windowSizeMinutes,
    windowUnit: 'm' as const,
    groupBy: APM_GROUP_BY_FIELDS,
  };

  const rules: CreateRuleBody[] = [
    {
      name: `[Demo] Failed transaction rate - ${suffix}`,
      rule_type_id: APM_TRANSACTION_ERROR_RATE_RULE_TYPE_ID,
      consumer: 'apm',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['apm', DEMO_DATA_TAG],
      actions: [],
      params: { ...baseParams, threshold: values.failedTransactionRatePercent },
    },
    {
      name: `[Demo] Latency threshold - ${suffix}`,
      rule_type_id: APM_TRANSACTION_DURATION_RULE_TYPE_ID,
      consumer: 'apm',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['apm', DEMO_DATA_TAG],
      actions: [],
      params: { ...baseParams, aggregationType: 'avg', threshold: values.avgLatencyMs },
    },
  ];

  if (values.includeErrorCountRule) {
    rules.push({
      name: `[Demo] Error count threshold - ${suffix}`,
      rule_type_id: APM_ERROR_COUNT_RULE_TYPE_ID,
      consumer: 'apm',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['apm', DEMO_DATA_TAG],
      actions: [],
      params: { ...baseParams, threshold: values.errorCount },
    });
  }

  if (values.includeMaxLatencyRule) {
    rules.push({
      name: `[Demo] Latency spike (max) - ${suffix}`,
      rule_type_id: APM_TRANSACTION_DURATION_RULE_TYPE_ID,
      consumer: 'apm',
      enabled: true,
      schedule: { interval: '1m' },
      tags: ['apm', DEMO_DATA_TAG],
      actions: [],
      params: { ...baseParams, aggregationType: 'max', threshold: values.maxLatencyMs },
    });
  }

  return [...rules, ...buildInfraRules(values), ...buildLogsRules(values)];
};

/**
 * SRE-recommended SLOs across APM and logs signals.
 */
export const buildRecommendedSlos = ({
  environment,
  preset,
}: RecommendedConfigTarget): CreateSloBody[] => {
  const resolvedPreset = resolvePreset(preset);
  const values = SLO_PRESETS[resolvedPreset];
  const suffix = environmentSuffix(environment);
  const sloEnvironment = environment === ENVIRONMENT_ALL ? SLO_ALL_VALUE : environment;
  const sharedIndicatorParams = {
    service: SLO_ALL_VALUE,
    environment: sloEnvironment,
    transactionType: SLO_ALL_VALUE,
    transactionName: SLO_ALL_VALUE,
    index: APM_METRICS_INDEX,
  };
  const windowDuration = `${values.windowDays}d`;

  const slos: CreateSloBody[] = [
    {
      name: `[Demo] APM availability SLO - ${suffix}`,
      description: 'Recommended availability SLO based on APM transaction error rate.',
      indicator: {
        type: APM_TRANSACTION_ERROR_RATE_INDICATOR,
        params: sharedIndicatorParams,
      },
      budgetingMethod: 'occurrences',
      timeWindow: { duration: windowDuration, type: 'rolling' },
      objective: { target: values.availabilityTarget },
      tags: [DEMO_DATA_TAG],
      groupBy: APM_GROUP_BY_FIELDS,
    },
  ];

  if (values.includeLatencySlo) {
    slos.push({
      name: `[Demo] APM latency SLO - ${suffix}`,
      description: `Recommended latency SLO: ${formatObjective(
        values.latencyTarget
      )} of transactions under ${values.latencyThresholdMs}ms.`,
      indicator: {
        type: APM_TRANSACTION_DURATION_INDICATOR,
        params: { ...sharedIndicatorParams, threshold: values.latencyThresholdMs },
      },
      budgetingMethod: 'occurrences',
      timeWindow: { duration: windowDuration, type: 'rolling' },
      objective: { target: values.latencyTarget },
      tags: [DEMO_DATA_TAG],
      groupBy: APM_GROUP_BY_FIELDS,
    });
  }

  if (values.includeLogsSlo) {
    slos.push({
      name: `[Demo] Logs availability SLO - ${suffix}`,
      description: 'Recommended logs availability SLO: non-error log events as good events.',
      indicator: {
        type: KQL_CUSTOM_INDICATOR,
        params: {
          index: LOGS_INDEX_PATTERN,
          filter: '',
          good: 'NOT log.level: "error"',
          total: '*',
          timestampField: '@timestamp',
        },
      },
      budgetingMethod: 'occurrences',
      timeWindow: { duration: windowDuration, type: 'rolling' },
      objective: { target: values.logsAvailabilityTarget },
      tags: [DEMO_DATA_TAG],
      groupBy: SLO_ALL_VALUE,
    });
  }

  return slos;
};

export const buildAlertRulePreviews = ({
  environment,
  preset,
}: RecommendedConfigTarget): AlertRulePreview[] => {
  const resolvedPreset = resolvePreset(preset);
  const values = RULE_PRESETS[resolvedPreset];
  const suffix = environmentSuffix(environment);
  const windowLabel = i18n.translate(
    'xpack.observability_onboarding.demoData.preview.ruleWindowDetail',
    {
      defaultMessage: '{windowSize}-minute rolling window',
      values: { windowSize: values.windowSizeMinutes },
    }
  );

  const previews: AlertRulePreview[] = [
    {
      name: `[Demo] Failed transaction rate - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.failedTransactionRateDescription',
        {
          defaultMessage: 'Alerts when the share of failed APM transactions exceeds the threshold.',
        }
      ),
      detail: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.failedTransactionRateDetail',
        {
          defaultMessage: 'Threshold: {threshold}% failed transactions · {windowLabel}',
          values: { threshold: values.failedTransactionRatePercent, windowLabel },
        }
      ),
      dataType: 'apm',
    },
    {
      name: `[Demo] Latency threshold - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.avgLatencyDescription',
        {
          defaultMessage: 'Alerts when average transaction latency stays above the threshold.',
        }
      ),
      detail: i18n.translate('xpack.observability_onboarding.demoData.preview.avgLatencyDetail', {
        defaultMessage: 'Threshold: {threshold} ms average latency · {windowLabel}',
        values: { threshold: values.avgLatencyMs, windowLabel },
      }),
      dataType: 'apm',
    },
  ];

  if (values.includeErrorCountRule) {
    previews.push({
      name: `[Demo] Error count threshold - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.errorCountDescription',
        {
          defaultMessage: 'Alerts when the number of APM error events crosses the threshold.',
        }
      ),
      detail: i18n.translate('xpack.observability_onboarding.demoData.preview.errorCountDetail', {
        defaultMessage: 'Threshold: {threshold} errors · {windowLabel}',
        values: { threshold: values.errorCount, windowLabel },
      }),
      dataType: 'apm',
    });
  }

  if (values.includeMaxLatencyRule) {
    previews.push({
      name: `[Demo] Latency spike (max) - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.maxLatencyDescription',
        {
          defaultMessage: 'Alerts on sudden latency spikes using the maximum transaction duration.',
        }
      ),
      detail: i18n.translate('xpack.observability_onboarding.demoData.preview.maxLatencyDetail', {
        defaultMessage: 'Threshold: {threshold} ms max latency · {windowLabel}',
        values: { threshold: values.maxLatencyMs, windowLabel },
      }),
      dataType: 'apm',
    });
  }

  if (values.includeInfraRules) {
    previews.push(
      {
        name: '[Demo] High host CPU (metric threshold)',
        description: i18n.translate(
          'xpack.observability_onboarding.demoData.preview.metricCpuDescription',
          {
            defaultMessage:
              'Alerts when average normalized CPU usage across hosts exceeds the threshold.',
          }
        ),
        detail: i18n.translate('xpack.observability_onboarding.demoData.preview.metricCpuDetail', {
          defaultMessage: 'Threshold: {threshold} avg CPU · {windowLabel}',
          values: { threshold: formatCpuThreshold(values.cpuThresholdPct), windowLabel },
        }),
        dataType: 'infra',
      },
      {
        name: '[Demo] High host CPU (inventory threshold)',
        description: i18n.translate(
          'xpack.observability_onboarding.demoData.preview.inventoryCpuDescription',
          {
            defaultMessage: 'Inventory-based host CPU alert using Infrastructure Metrics.',
          }
        ),
        detail: i18n.translate(
          'xpack.observability_onboarding.demoData.preview.inventoryCpuDetail',
          {
            defaultMessage: 'Threshold: {threshold} host CPU · {windowLabel}',
            values: { threshold: formatCpuThreshold(values.hostCpuThresholdPct), windowLabel },
          }
        ),
        dataType: 'infra',
      }
    );
  }

  if (values.includeLogsRule) {
    previews.push({
      name: '[Demo] Error log volume threshold',
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.errorLogsDescription',
        {
          defaultMessage:
            'Alerts when the count of error-level log documents exceeds the threshold.',
        }
      ),
      detail: i18n.translate('xpack.observability_onboarding.demoData.preview.errorLogsDetail', {
        defaultMessage: 'Threshold: more than {threshold} error logs · {windowLabel}',
        values: { threshold: values.errorLogCount, windowLabel },
      }),
      dataType: 'logs',
    });
  }

  return previews;
};

export const buildSloPreviews = ({
  environment,
  preset,
}: RecommendedConfigTarget): SloPreview[] => {
  const resolvedPreset = resolvePreset(preset);
  const values = SLO_PRESETS[resolvedPreset];
  const suffix = environmentSuffix(environment);
  const windowLabel = i18n.translate(
    'xpack.observability_onboarding.demoData.preview.sloWindowDetail',
    {
      defaultMessage: '{days}-day rolling window',
      values: { days: values.windowDays },
    }
  );

  const previews: SloPreview[] = [
    {
      name: `[Demo] APM availability SLO - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.availabilitySloDescription',
        {
          defaultMessage: 'Tracks successful transactions as a share of all transactions.',
        }
      ),
      detail: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.availabilitySloDetail',
        {
          defaultMessage: 'Objective: {target} · {windowLabel}',
          values: { target: formatObjective(values.availabilityTarget), windowLabel },
        }
      ),
      dataType: 'apm',
    },
  ];

  if (values.includeLatencySlo) {
    previews.push({
      name: `[Demo] APM latency SLO - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.latencySloDescription',
        {
          defaultMessage:
            'Tracks transactions completing faster than the latency threshold as good events.',
        }
      ),
      detail: i18n.translate('xpack.observability_onboarding.demoData.preview.latencySloDetail', {
        defaultMessage: 'Objective: {target} under {latencyMs} ms · {windowLabel}',
        values: {
          target: formatObjective(values.latencyTarget),
          latencyMs: values.latencyThresholdMs,
          windowLabel,
        },
      }),
      dataType: 'apm',
    });
  }

  if (values.includeLogsSlo) {
    previews.push({
      name: `[Demo] Logs availability SLO - ${suffix}`,
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.logsAvailabilitySloDescription',
        {
          defaultMessage: 'Tracks non-error log events as good events across logs-* indices.',
        }
      ),
      detail: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.logsAvailabilitySloDetail',
        {
          defaultMessage: 'Objective: {target} non-error logs · {windowLabel}',
          values: { target: formatObjective(values.logsAvailabilityTarget), windowLabel },
        }
      ),
      dataType: 'logs',
    });
  }

  return previews;
};

export const buildMlJobPreviews = ({
  environment,
  preset,
}: RecommendedConfigTarget): MlJobPreview[] => {
  const resolvedPreset = resolvePreset(preset);
  const sensitivityNote =
    resolvedPreset === 'strict'
      ? i18n.translate('xpack.observability_onboarding.demoData.preview.mlStrictNote', {
          defaultMessage:
            'After creation, consider tightening ML job settings if you expect low baseline noise.',
        })
      : resolvedPreset === 'loose'
      ? i18n.translate('xpack.observability_onboarding.demoData.preview.mlLooseNote', {
          defaultMessage:
            'After creation, consider relaxing ML job settings if you see frequent false positives.',
        })
      : i18n.translate('xpack.observability_onboarding.demoData.preview.mlRecommendedNote', {
          defaultMessage: 'Uses APM defaults; review sensitivity after the first week of data.',
        });

  return [
    {
      name: i18n.translate('xpack.observability_onboarding.demoData.preview.mlJobName', {
        defaultMessage: 'APM anomaly detection ({environment})',
        values: { environment },
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.demoData.preview.mlJobDescription',
        {
          defaultMessage:
            'Detects unusual latency and error-rate patterns across APM services in the selected environment.',
        }
      ),
      detail: i18n.translate('xpack.observability_onboarding.demoData.preview.mlJobDetail', {
        defaultMessage: 'Scoped to service.environment: {environment}. {sensitivityNote}',
        values: { environment, sensitivityNote },
      }),
    },
  ];
};
