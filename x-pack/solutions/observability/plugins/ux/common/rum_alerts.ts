/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { rumAlertGroupingFieldsFromQuery } from './rum_alert_esql';
import { RUM_SESSIONS_INDEX_PATTERN } from './rum_sessions';

export const RUM_ALERT_TAG = 'ux-rum';
export const RUM_ALERT_TEMPLATE_TAG_PREFIX = 'ux-rum:';
export const RUM_ALERT_SERVICE_TAG_PREFIX = 'ux-rum-service:';
export const RUM_ALERT_NOTIFICATIONS_SO_TYPE = 'ux-rum-alert-notifications';
export const RUM_ALERT_NOTIFICATIONS_SO_ID = 'default';

export const RUM_ALERT_TEMPLATE_IDS = [
  'web_vital',
  'error_rate',
  'error_spike',
  'frustration',
  'traffic_drop',
  'traffic_spike',
  'session_error_rate',
  'session_frustration',
  'session_traffic_drop',
  'session_traffic_spike',
  'ai',
] as const;

export type RumAlertTemplateId = (typeof RUM_ALERT_TEMPLATE_IDS)[number];

export const RUM_SESSION_ALERT_TEMPLATE_IDS = [
  'session_error_rate',
  'session_frustration',
  'session_traffic_drop',
  'session_traffic_spike',
] as const;
export type RumSessionAlertTemplateId = (typeof RUM_SESSION_ALERT_TEMPLATE_IDS)[number];

export const isRumAlertTemplateId = (value: string): value is RumAlertTemplateId =>
  (RUM_ALERT_TEMPLATE_IDS as readonly string[]).includes(value);

export const rumAlertServiceFromTags = (tags: string[] | undefined): string | undefined => {
  const tagged = (tags ?? []).find((tag) => tag.startsWith(RUM_ALERT_SERVICE_TAG_PREFIX));
  if (!tagged) {
    return undefined;
  }
  const name = tagged.slice(RUM_ALERT_SERVICE_TAG_PREFIX.length).trim();
  return name ? name : undefined;
};

export const rumAlertServiceFromQuery = (query: string): string | undefined => {
  const match =
    query.match(/`resource\.attributes\.service\.name`\s*==\s*"([^"]{1,256})"/) ??
    query.match(/`service\.name`\s*==\s*"([^"]{1,256})"/);
  return match?.[1];
};

export const isRumTrafficAlertTemplate = (templateId: RumAlertTemplateId): boolean =>
  templateId === 'traffic_drop' ||
  templateId === 'traffic_spike' ||
  templateId === 'session_traffic_drop' ||
  templateId === 'session_traffic_spike';

export const isRumSessionAlertTemplate = (
  templateId: RumAlertTemplateId
): templateId is RumSessionAlertTemplateId =>
  (RUM_SESSION_ALERT_TEMPLATE_IDS as readonly string[]).includes(templateId);

export const isRumAiAlertTemplate = (templateId: RumAlertTemplateId): boolean =>
  templateId === 'ai';

export const RUM_ALERT_VITALS = ['lcp', 'inp', 'cls'] as const;
export type RumAlertVital = (typeof RUM_ALERT_VITALS)[number];

export const isRumAlertVital = (value: string): value is RumAlertVital =>
  (RUM_ALERT_VITALS as readonly string[]).includes(value);

export interface RumAlertFilters {
  serviceName?: string;
  browser?: string;
  location?: string;
  pageUrl?: string;
}

export interface RumAlertParams {
  templateId: RumAlertTemplateId;
  name?: string;
  threshold: number;
  minSamples: number;
  groupByPage: boolean;
  lookback: string;
  every: string;
  vital?: RumAlertVital;
  errorType?: string;
  errorMessage?: string;
  prompt?: string;
  esqlQuery?: string;
  filters: RumAlertFilters;
}

export interface RumAlertEsqlBuild {
  query: string;
  groupingFields: string[];
  every: string;
  lookback: string;
  recoveryStrategy: 'no_breach';
  noDataStrategy: 'last_known_status' | 'none';
  description: string;
  tags: string[];
}

const DEFAULTS: Record<
  RumAlertTemplateId,
  { threshold: number; minSamples: number; lookback: string; every: string }
> = {
  web_vital: { threshold: 4000, minSamples: 5, lookback: '15m', every: '5m' },
  error_rate: { threshold: 0.05, minSamples: 10, lookback: '15m', every: '5m' },
  error_spike: { threshold: 10, minSamples: 1, lookback: '15m', every: '1m' },
  frustration: { threshold: 5, minSamples: 1, lookback: '15m', every: '5m' },
  traffic_drop: { threshold: 5, minSamples: 1, lookback: '30m', every: '5m' },
  traffic_spike: { threshold: 50, minSamples: 1, lookback: '15m', every: '5m' },
  session_error_rate: { threshold: 0.05, minSamples: 10, lookback: '15m', every: '5m' },
  session_frustration: { threshold: 5, minSamples: 1, lookback: '15m', every: '5m' },
  session_traffic_drop: { threshold: 5, minSamples: 1, lookback: '30m', every: '5m' },
  session_traffic_spike: { threshold: 50, minSamples: 1, lookback: '15m', every: '5m' },
  ai: { threshold: 0, minSamples: 1, lookback: '15m', every: '5m' },
};

export const rumAlertDefaults = (
  templateId: RumAlertTemplateId
): (typeof DEFAULTS)[RumAlertTemplateId] => DEFAULTS[templateId];

export const rumAlertTemplateLabel = (templateId: RumAlertTemplateId): string => {
  switch (templateId) {
    case 'web_vital':
      return i18n.translate('xpack.ux.alerts.template.webVitalLabel', {
        defaultMessage: 'Web vital threshold',
      });
    case 'error_rate':
      return i18n.translate('xpack.ux.alerts.template.errorRateLabel', {
        defaultMessage: 'JS error rate',
      });
    case 'error_spike':
      return i18n.translate('xpack.ux.alerts.template.errorSpikeLabel', {
        defaultMessage: 'Error spike',
      });
    case 'frustration':
      return i18n.translate('xpack.ux.alerts.template.frustrationLabel', {
        defaultMessage: 'Frustration signals',
      });
    case 'traffic_drop':
      return i18n.translate('xpack.ux.alerts.template.trafficDropLabel', {
        defaultMessage: 'Traffic drop',
      });
    case 'traffic_spike':
      return i18n.translate('xpack.ux.alerts.template.trafficSpikeLabel', {
        defaultMessage: 'Traffic spike',
      });
    case 'session_error_rate':
      return i18n.translate('xpack.ux.alerts.template.sessionErrorRateLabel', {
        defaultMessage: 'Session error rate',
      });
    case 'session_frustration':
      return i18n.translate('xpack.ux.alerts.template.sessionFrustrationLabel', {
        defaultMessage: 'Frustrated sessions',
      });
    case 'session_traffic_drop':
      return i18n.translate('xpack.ux.alerts.template.sessionTrafficDropLabel', {
        defaultMessage: 'Session traffic drop',
      });
    case 'session_traffic_spike':
      return i18n.translate('xpack.ux.alerts.template.sessionTrafficSpikeLabel', {
        defaultMessage: 'Session traffic spike',
      });
    case 'ai':
      return i18n.translate('xpack.ux.alerts.template.aiLabel', {
        defaultMessage: 'Describe with AI',
      });
  }
};

export const rumAlertTemplateDescription = (templateId: RumAlertTemplateId): string => {
  switch (templateId) {
    case 'web_vital':
      return i18n.translate('xpack.ux.alerts.template.webVitalDescription', {
        defaultMessage: 'Alert when p75 LCP, INP, or CLS exceeds a threshold.',
      });
    case 'error_rate':
      return i18n.translate('xpack.ux.alerts.template.errorRateDescription', {
        defaultMessage: 'Alert when JS exceptions as a share of page views exceed a rate.',
      });
    case 'error_spike':
      return i18n.translate('xpack.ux.alerts.template.errorSpikeDescription', {
        defaultMessage: 'Alert when a specific exception group fires too often.',
      });
    case 'frustration':
      return i18n.translate('xpack.ux.alerts.template.frustrationDescription', {
        defaultMessage: 'Alert when rage, dead, or error clicks exceed a count.',
      });
    case 'traffic_drop':
      return i18n.translate('xpack.ux.alerts.template.trafficDropDescription', {
        defaultMessage: 'Alert when distinct sessions fall below a floor.',
      });
    case 'traffic_spike':
      return i18n.translate('xpack.ux.alerts.template.trafficSpikeDescription', {
        defaultMessage: 'Alert when distinct sessions exceed a ceiling.',
      });
    case 'session_error_rate':
      return i18n.translate('xpack.ux.alerts.template.sessionErrorRateDescription', {
        defaultMessage: 'Alert when the share of sessions with a JS exception exceeds a rate.',
      });
    case 'session_frustration':
      return i18n.translate('xpack.ux.alerts.template.sessionFrustrationDescription', {
        defaultMessage: 'Alert when too many sessions have a rage or dead click.',
      });
    case 'session_traffic_drop':
      return i18n.translate('xpack.ux.alerts.template.sessionTrafficDropDescription', {
        defaultMessage: 'Alert when settled session count falls below a floor.',
      });
    case 'session_traffic_spike':
      return i18n.translate('xpack.ux.alerts.template.sessionTrafficSpikeDescription', {
        defaultMessage: 'Alert when settled session count exceeds a ceiling.',
      });
    case 'ai':
      return i18n.translate('xpack.ux.alerts.template.aiDescription', {
        defaultMessage: 'Type the condition in plain language. AI writes the ES|QL.',
      });
  }
};

export const esqlString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const andJoin = (clauses: string[]): string => clauses.filter(Boolean).join(' AND ');

const filterClauses = (filters: RumAlertFilters): string[] => {
  const clauses: string[] = [];
  if (filters.serviceName) {
    clauses.push(`\`resource.attributes.service.name\` == ${esqlString(filters.serviceName)}`);
  }
  if (filters.pageUrl) {
    const value = esqlString(filters.pageUrl);
    clauses.push(
      `(\`attributes.page.url.path\` == ${value} OR \`attributes.url.full\` == ${value})`
    );
  }
  if (filters.browser) {
    clauses.push(`\`resource.attributes.browser.name\` == ${esqlString(filters.browser)}`);
  }
  return clauses;
};

const pageExpr = 'COALESCE(`attributes.page.url.path`, `attributes.url.full`)';

const sessionFilterClauses = (filters: RumAlertFilters): string[] => {
  const clauses: string[] = [];
  if (filters.serviceName) {
    clauses.push(`\`service.name\` == ${esqlString(filters.serviceName)}`);
  }
  if (filters.pageUrl) {
    clauses.push(`\`entry_page\` == ${esqlString(filters.pageUrl)}`);
  }
  if (filters.browser) {
    clauses.push(`\`browser.name\` == ${esqlString(filters.browser)}`);
  }
  if (filters.location) {
    clauses.push(`\`country_iso\` == ${esqlString(filters.location)}`);
  }
  return clauses;
};

const whereLine = (clauses: string[]): string =>
  clauses.length > 0 ? `| WHERE ${andJoin(clauses)}` : '';

const normalizeDuration = (value: string, fallback: string): string =>
  /^\d+(ms|s|m|h|d)$/.test(value) ? value : fallback;

export const buildRumAlertEsql = (params: RumAlertParams): RumAlertEsqlBuild => {
  const defaults = DEFAULTS[params.templateId];
  const lookback = normalizeDuration(params.lookback, defaults.lookback);
  const every = normalizeDuration(params.every, defaults.every);
  const threshold = Number.isFinite(params.threshold) ? params.threshold : defaults.threshold;
  const minSamples = Math.max(1, Math.trunc(params.minSamples || defaults.minSamples));
  const filters = isRumSessionAlertTemplate(params.templateId)
    ? sessionFilterClauses(params.filters)
    : filterClauses(params.filters);
  const tags = [RUM_ALERT_TAG, `${RUM_ALERT_TEMPLATE_TAG_PREFIX}${params.templateId}`];
  if (params.filters.serviceName) {
    tags.push(`${RUM_ALERT_SERVICE_TAG_PREFIX}${params.filters.serviceName}`);
  }
  const groupByPage =
    params.groupByPage &&
    !isRumTrafficAlertTemplate(params.templateId) &&
    !isRumSessionAlertTemplate(params.templateId);

  if (params.templateId === 'web_vital') {
    const vital = params.vital && isRumAlertVital(params.vital) ? params.vital : 'lcp';
    const clauses = [
      '`event_name` == "browser.web_vital"',
      `\`attributes.browser.web_vital.name\` == ${esqlString(vital)}`,
      ...filters,
    ];
    const stats = groupByPage
      ? `STATS p75 = PERCENTILE(\`attributes.browser.web_vital.value\`, 75), samples = COUNT(*) BY page = ${pageExpr}`
      : 'STATS p75 = PERCENTILE(`attributes.browser.web_vital.value`, 75), samples = COUNT(*)';
    const query = [
      'FROM logs-*.otel-*',
      `| WHERE ${andJoin(clauses)}`,
      `| ${stats}`,
      `| WHERE p75 > ${threshold} AND samples >= ${minSamples}`,
    ].join('\n');
    return {
      query,
      groupingFields: groupByPage ? ['page'] : [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: i18n.translate('xpack.ux.alerts.desc.webVital', {
        defaultMessage: 'p75 {vital} > {threshold} (min {minSamples} samples)',
        values: { vital: vital.toUpperCase(), threshold, minSamples },
      }),
      tags,
    };
  }

  if (params.templateId === 'error_rate') {
    const stats = groupByPage
      ? `STATS errors = COUNT(*) WHERE is_error, views = COUNT(*) WHERE is_view BY page = ${pageExpr}`
      : 'STATS errors = COUNT(*) WHERE is_error, views = COUNT(*) WHERE is_view';
    const query = [
      'FROM traces-*.otel-*,logs-*.otel-*',
      whereLine(filters),
      '| EVAL is_error = (`event_name` == "exception" OR `name` == "exception")',
      '| EVAL is_view = (`name` == "documentLoad" OR `event_name` == "browser.navigation")',
      `| ${stats}`,
      `| EVAL error_rate = TO_DOUBLE(errors) / views`,
      `| WHERE views >= ${minSamples} AND error_rate > ${threshold}`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      query,
      groupingFields: groupByPage ? ['page'] : [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: i18n.translate('xpack.ux.alerts.desc.errorRate', {
        defaultMessage: 'Error rate > {threshold} (min {minSamples} views)',
        values: { threshold, minSamples },
      }),
      tags,
    };
  }

  if (params.templateId === 'error_spike') {
    const clauses = ['`event_name` == "exception"', ...filters];
    if (params.errorType) {
      clauses.push(`\`attributes.exception.type\` == ${esqlString(params.errorType)}`);
    }
    if (params.errorMessage) {
      clauses.push(
        `\`attributes.exception.message\` LIKE ${esqlString(`${params.errorMessage}*`)}`
      );
    }
    const query = [
      'FROM logs-*.otel-*',
      `| WHERE ${andJoin(clauses)}`,
      '| STATS events = COUNT(*)',
      `| WHERE events >= ${threshold}`,
    ].join('\n');
    return {
      query,
      groupingFields: [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: i18n.translate('xpack.ux.alerts.desc.errorSpike', {
        defaultMessage: '{errorType} fires >= {threshold} times',
        values: { errorType: params.errorType || 'Exception', threshold },
      }),
      tags,
    };
  }

  if (params.templateId === 'frustration') {
    const clauses = [
      '`event_name` IN ("browser.frustration.rage_click", "browser.frustration.dead_click", "browser.frustration.error_click")',
      ...filters,
    ];
    const stats = groupByPage
      ? `STATS clicks = COUNT(*) BY page = ${pageExpr}`
      : 'STATS clicks = COUNT(*)';
    const query = [
      'FROM logs-*.otel-*',
      `| WHERE ${andJoin(clauses)}`,
      `| ${stats}`,
      `| WHERE clicks >= ${threshold}`,
    ].join('\n');
    return {
      query,
      groupingFields: groupByPage ? ['page'] : [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: i18n.translate('xpack.ux.alerts.desc.frustration', {
        defaultMessage: 'Frustration clicks >= {threshold}',
        values: { threshold },
      }),
      tags,
    };
  }

  if (params.templateId === 'session_error_rate') {
    const query = [
      `FROM ${RUM_SESSIONS_INDEX_PATTERN}`,
      whereLine(filters),
      '| STATS errors = COUNT(*) WHERE error_count > 0, sessions = COUNT(*)',
      '| EVAL error_rate = TO_DOUBLE(errors) / sessions',
      `| WHERE sessions >= ${minSamples} AND error_rate > ${threshold}`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      query,
      groupingFields: [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: i18n.translate('xpack.ux.alerts.desc.sessionErrorRate', {
        defaultMessage: 'Session error rate > {threshold} (min {minSamples} sessions)',
        values: { threshold, minSamples },
      }),
      tags,
    };
  }

  if (params.templateId === 'session_frustration') {
    const query = [
      `FROM ${RUM_SESSIONS_INDEX_PATTERN}`,
      whereLine(filters),
      '| STATS frustrated = COUNT(*) WHERE rage_click_count > 0 OR dead_click_count > 0',
      `| WHERE frustrated >= ${threshold}`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      query,
      groupingFields: [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: i18n.translate('xpack.ux.alerts.desc.sessionFrustration', {
        defaultMessage: 'Frustrated sessions >= {threshold}',
        values: { threshold },
      }),
      tags,
    };
  }

  if (
    params.templateId === 'session_traffic_drop' ||
    params.templateId === 'session_traffic_spike'
  ) {
    const isSpike = params.templateId === 'session_traffic_spike';
    const query = [
      `FROM ${RUM_SESSIONS_INDEX_PATTERN}`,
      whereLine(filters),
      '| STATS sessions = COUNT(*)',
      `| WHERE sessions ${isSpike ? '>' : '<'} ${threshold}`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      query,
      groupingFields: [],
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description: isSpike
        ? i18n.translate('xpack.ux.alerts.desc.sessionTrafficSpike', {
            defaultMessage: 'Sessions > {threshold}',
            values: { threshold },
          })
        : i18n.translate('xpack.ux.alerts.desc.sessionTrafficDrop', {
            defaultMessage: 'Sessions < {threshold}',
            values: { threshold },
          }),
      tags,
    };
  }

  if (params.templateId === 'ai') {
    const query = params.esqlQuery?.trim() || 'FROM logs-*.otel-*\n| WHERE false';
    return {
      query,
      groupingFields: rumAlertGroupingFieldsFromQuery(query),
      every,
      lookback,
      recoveryStrategy: 'no_breach',
      noDataStrategy: 'none',
      description:
        params.prompt?.trim().slice(0, 300) ||
        i18n.translate('xpack.ux.alerts.desc.ai', {
          defaultMessage: 'Natural-language RUM condition',
        }),
      tags,
    };
  }

  const isSpike = params.templateId === 'traffic_spike';
  const query = [
    'FROM traces-*.otel-*,logs-*.otel-*',
    whereLine(filters),
    '| STATS sessions = COUNT_DISTINCT(`attributes.session.id`)',
    `| WHERE sessions ${isSpike ? '>' : '<'} ${threshold}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    query,
    groupingFields: [],
    every,
    lookback,
    recoveryStrategy: 'no_breach',
    noDataStrategy: 'none',
    description: isSpike
      ? i18n.translate('xpack.ux.alerts.desc.trafficSpike', {
          defaultMessage: 'Distinct sessions > {threshold}',
          values: { threshold },
        })
      : i18n.translate('xpack.ux.alerts.desc.trafficDrop', {
          defaultMessage: 'Distinct sessions < {threshold}',
          values: { threshold },
        }),
    tags,
  };
};

export const defaultAlertName = (params: RumAlertParams): string => {
  if (params.templateId === 'ai' && params.prompt?.trim()) {
    return params.prompt.trim().slice(0, 80);
  }
  const label = rumAlertTemplateLabel(params.templateId);
  const scope = params.filters.serviceName || params.filters.pageUrl;
  return scope ? `${label} — ${scope}` : label;
};

export const buildRumEmailWorkflowYaml = (connectorId: string, to: string[]): string => {
  const recipients = to.map((address) => `        - ${JSON.stringify(address)}`).join('\n');
  return `name: UX RUM alert email
enabled: true
triggers:
  - type: manual
    inputs:
      type: object
      properties:
        payload:
          $ref: "#/kibana/definitions/alertingV2NotificationGroup"
      required:
        - payload
steps:
  - name: send_email
    type: email
    connector-id: ${JSON.stringify(connectorId)}
    with:
      to:
${recipients}
      subject: "RUM alert fired"
      message: |
        A User Experience alert fired.

        Policy: {{ inputs.payload.policyId }}
        Episodes: {{ inputs.payload.episodes | size }}
`;
};
