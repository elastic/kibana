/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  OTEL_DOCUMENT_LOAD,
  OTEL_EVENT_BROWSER_WEB_VITAL,
  OTEL_EVENT_DEAD_CLICK,
  OTEL_EVENT_ERROR_CLICK,
  OTEL_EVENT_EXCEPTION,
  OTEL_EVENT_NAME,
  OTEL_EVENT_NAVIGATION,
  OTEL_EVENT_RAGE_CLICK,
  OTEL_PAGE_PATH,
  OTEL_PAGE_URL,
  OTEL_SERVICE_NAME,
  OTEL_SPAN_NAME,
  OTEL_TRANSACTION_DURATION_US,
  OTEL_WEB_VITAL_NAME,
  OTEL_WEB_VITAL_VALUE,
  UX_OTEL_INDEX_PATTERNS,
} from './otel_rum';
import { RUM_BUDGET_AI_PLACEHOLDER_GOOD } from './rum_budget_kql';

export const RUM_BUDGET_TAG = 'ux-rum-budget';
export const RUM_BUDGET_TEMPLATE_TAG_PREFIX = 'ux-rum-budget:';
export const RUM_BUDGET_INDEX = 'logs-*.otel-*';
export const RUM_BUDGET_TRACES_INDEX = 'traces-*.otel-*';
export const RUM_BUDGET_COMBINED_INDEX = UX_OTEL_INDEX_PATTERNS.join(',');
export const RUM_BUDGET_TIMESTAMP_FIELD = '@timestamp';
export const RUM_BUDGET_GROUP_BY_PATH = OTEL_PAGE_PATH;

export const RUM_BUDGET_TEMPLATE_IDS = [
  'lcp',
  'inp',
  'cls',
  'ttfb',
  'fcp',
  'page_load',
  'error_rate',
  'frustration',
  'ai',
] as const;
export type RumBudgetTemplateId = (typeof RUM_BUDGET_TEMPLATE_IDS)[number];

export const RUM_BUDGET_VITAL_IDS = ['lcp', 'inp', 'cls', 'ttfb', 'fcp'] as const;
export type RumBudgetVitalId = (typeof RUM_BUDGET_VITAL_IDS)[number];

export const isRumBudgetTemplateId = (value: string): value is RumBudgetTemplateId =>
  (RUM_BUDGET_TEMPLATE_IDS as readonly string[]).includes(value);

export const isRumBudgetVitalTemplate = (
  templateId: RumBudgetTemplateId
): templateId is RumBudgetVitalId =>
  (RUM_BUDGET_VITAL_IDS as readonly string[]).includes(templateId);

export const isRumBudgetAiTemplate = (templateId: RumBudgetTemplateId): boolean =>
  templateId === 'ai';

export const rumBudgetHasThreshold = (templateId: RumBudgetTemplateId): boolean =>
  isRumBudgetVitalTemplate(templateId) || templateId === 'page_load';

export type RumBudgetScope = 'app' | 'page' | 'groupByPage';
export type RumBudgetStatus = 'HEALTHY' | 'DEGRADING' | 'VIOLATED' | 'NO_DATA';

export interface RumBudgetFilters {
  serviceName?: string;
  pageUrl?: string;
}

export interface RumBudgetParams {
  templateId: RumBudgetTemplateId;
  name?: string;
  threshold: number;
  target: number;
  scope: RumBudgetScope;
  filters: RumBudgetFilters;
  prompt?: string;
  filter?: string;
  good?: string;
  index?: string;
}

export interface RumBudgetSloInput {
  name: string;
  description: string;
  indicator: {
    type: 'sli.kql.custom';
    params: {
      index: string;
      timestampField: string;
      filter: string;
      good: string;
      total: string;
    };
  };
  budgetingMethod: 'occurrences';
  objective: { target: number };
  timeWindow: { duration: '30d'; type: 'rolling' };
  tags: string[];
  groupBy?: string[];
}

export interface RumBudgetBuild {
  slo: RumBudgetSloInput;
  tags: string[];
  filter: string;
  good: string;
  threshold: number;
  target: number;
}

export interface RumBudgetBurnRateWindow {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: { value: number; unit: 'm' | 'h' };
  shortWindow: { value: number; unit: 'm' | 'h' };
  actionGroup: string;
}

export interface RumBudgetItem {
  id: string;
  instanceId: string;
  name: string;
  description: string;
  templateId: RumBudgetTemplateId | null;
  status: RumBudgetStatus;
  sliValue: number;
  errorBudgetRemaining: number;
  errorBudgetConsumed: number;
  fiveMinuteBurnRate: number;
  oneHourBurnRate: number;
  oneDayBurnRate: number;
  target: number;
  timeWindow: string;
  tags: string[];
  groupings: Record<string, string | number>;
  filter: string;
  good: string;
  threshold: number | null;
  pagePath?: string;
}

export interface RumBudgetSloSource {
  id: string;
  instanceId: string;
  name: string;
  description: string;
  tags: string[];
  indicator: { type: string; params?: unknown };
  objective: { target: number };
  timeWindow: { duration: string };
  summary: {
    status: string;
    sliValue: number;
    errorBudget: { remaining: number; consumed: number };
    fiveMinuteBurnRate: number;
    oneHourBurnRate: number;
    oneDayBurnRate: number;
  };
  groupings?: Record<string, string | number>;
}

const DEFAULT_THRESHOLDS: Record<RumBudgetTemplateId, number> = {
  lcp: 2500,
  inp: 200,
  cls: 0.1,
  ttfb: 800,
  fcp: 1800,
  page_load: 3000,
  error_rate: 0,
  frustration: 0,
  ai: 0,
};

const FRUSTRATION_EVENT_VALUES = [
  OTEL_EVENT_RAGE_CLICK,
  OTEL_EVENT_DEAD_CLICK,
  OTEL_EVENT_ERROR_CLICK,
] as const;

const DEFAULT_TARGET = 0.95;

export const rumBudgetDefaults = (
  templateId: RumBudgetTemplateId
): { threshold: number; target: number } => ({
  threshold: DEFAULT_THRESHOLDS[templateId],
  target: DEFAULT_TARGET,
});

export const rumBudgetTemplateLabel = (templateId: RumBudgetTemplateId): string => {
  switch (templateId) {
    case 'lcp':
      return i18n.translate('xpack.ux.budgets.template.lcpLabel', {
        defaultMessage: 'LCP budget',
      });
    case 'inp':
      return i18n.translate('xpack.ux.budgets.template.inpLabel', {
        defaultMessage: 'INP budget',
      });
    case 'cls':
      return i18n.translate('xpack.ux.budgets.template.clsLabel', {
        defaultMessage: 'CLS budget',
      });
    case 'ttfb':
      return i18n.translate('xpack.ux.budgets.template.ttfbLabel', {
        defaultMessage: 'TTFB budget',
      });
    case 'fcp':
      return i18n.translate('xpack.ux.budgets.template.fcpLabel', {
        defaultMessage: 'FCP budget',
      });
    case 'page_load':
      return i18n.translate('xpack.ux.budgets.template.pageLoadLabel', {
        defaultMessage: 'Page-load budget',
      });
    case 'error_rate':
      return i18n.translate('xpack.ux.budgets.template.errorRateLabel', {
        defaultMessage: 'JS error-rate budget',
      });
    case 'frustration':
      return i18n.translate('xpack.ux.budgets.template.frustrationLabel', {
        defaultMessage: 'Frustration budget',
      });
    case 'ai':
      return i18n.translate('xpack.ux.budgets.template.aiLabel', {
        defaultMessage: 'Describe with AI',
      });
  }
};

export const rumBudgetTemplateDescription = (templateId: RumBudgetTemplateId): string => {
  switch (templateId) {
    case 'lcp':
      return i18n.translate('xpack.ux.budgets.template.lcpDescription', {
        defaultMessage: '95% of LCP samples stay at or under 2.5s (Google good).',
      });
    case 'inp':
      return i18n.translate('xpack.ux.budgets.template.inpDescription', {
        defaultMessage: '95% of INP samples stay at or under 200ms.',
      });
    case 'cls':
      return i18n.translate('xpack.ux.budgets.template.clsDescription', {
        defaultMessage: '95% of CLS samples stay at or under 0.1.',
      });
    case 'ttfb':
      return i18n.translate('xpack.ux.budgets.template.ttfbDescription', {
        defaultMessage: '95% of TTFB samples stay at or under 800ms.',
      });
    case 'fcp':
      return i18n.translate('xpack.ux.budgets.template.fcpDescription', {
        defaultMessage: '95% of FCP samples stay at or under 1.8s (Google good).',
      });
    case 'page_load':
      return i18n.translate('xpack.ux.budgets.template.pageLoadDescription', {
        defaultMessage: '95% of document loads finish in 3s or less.',
      });
    case 'error_rate':
      return i18n.translate('xpack.ux.budgets.template.errorRateDescription', {
        defaultMessage: 'Page views without a JS exception stay above the target.',
      });
    case 'frustration':
      return i18n.translate('xpack.ux.budgets.template.frustrationDescription', {
        defaultMessage: 'Page views without rage, dead, or error clicks stay above the target.',
      });
    case 'ai':
      return i18n.translate('xpack.ux.budgets.template.aiDescription', {
        defaultMessage: 'Type the contract in plain language. AI writes the KQL SLO.',
      });
  }
};

export const rumBudgetThresholdUnit = (templateId: RumBudgetTemplateId): 'ms' | 'score' | null => {
  if (!rumBudgetHasThreshold(templateId)) {
    return null;
  }
  return templateId === 'cls' ? 'score' : 'ms';
};

export const kqlQuote = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const andJoin = (clauses: string[]): string => clauses.filter(Boolean).join(' and ');

const pageClause = (pageUrl: string): string => {
  const field = pageUrl.startsWith('/') ? OTEL_PAGE_PATH : OTEL_PAGE_URL;
  return `${field}: ${kqlQuote(pageUrl)}`;
};

const scopeClauses = (scope: RumBudgetScope, filters: RumBudgetFilters): string[] => {
  const clauses: string[] = [];
  if (filters.serviceName) {
    clauses.push(`${OTEL_SERVICE_NAME}: ${kqlQuote(filters.serviceName)}`);
  }
  if (scope === 'page' && filters.pageUrl) {
    clauses.push(pageClause(filters.pageUrl));
  }
  return clauses;
};

export const rumBudgetTags = (templateId: RumBudgetTemplateId): string[] => [
  RUM_BUDGET_TAG,
  `${RUM_BUDGET_TEMPLATE_TAG_PREFIX}${templateId}`,
];

export const parseRumBudgetTemplate = (tags: string[]): RumBudgetTemplateId | null => {
  const tagged = tags.find((tag) => tag.startsWith(RUM_BUDGET_TEMPLATE_TAG_PREFIX));
  if (!tagged) {
    return null;
  }
  const id = tagged.slice(RUM_BUDGET_TEMPLATE_TAG_PREFIX.length);
  return isRumBudgetTemplateId(id) ? id : null;
};

export const parseRumBudgetThreshold = (
  good: string,
  templateId?: RumBudgetTemplateId | null
): number | null => {
  const match = good.match(/<=\s*([0-9]*\.?[0-9]+)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }
  if (templateId === 'page_load') {
    if (value >= 1e7) {
      return value / 1e6;
    }
    if (value >= 1e5) {
      return value / 1e3;
    }
  }
  return value;
};

export const rumBudgetPageFromFilter = (filter: string): string | undefined => {
  const match = filter.match(
    /attributes\.(?:page\.url(?:\.path)?|url\.path):\s*"((?:\\.|[^"\\])*)"/
  );
  return match ? match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : undefined;
};

export const rumBudgetGroupedPath = (
  groupings: Record<string, string | number> | undefined
): string | undefined => {
  if (!groupings) {
    return undefined;
  }
  const value =
    groupings[OTEL_PAGE_PATH] ??
    groupings['page.url.path'] ??
    groupings['attributes.url.path'] ??
    groupings['url.path'];
  return value == null ? undefined : String(value);
};

const kqlFromParam = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'kqlQuery' in value) {
    const query = (value as { kqlQuery?: unknown }).kqlQuery;
    return typeof query === 'string' ? query : '';
  }
  return '';
};

const indicatorKql = (indicator: {
  type: string;
  params?: unknown;
}): { filter: string; good: string } => {
  if (
    indicator.type !== 'sli.kql.custom' ||
    !indicator.params ||
    typeof indicator.params !== 'object'
  ) {
    return { filter: '', good: '' };
  }
  const params = indicator.params as { filter?: unknown; good?: unknown };
  return { filter: kqlFromParam(params.filter), good: kqlFromParam(params.good) };
};

const asBudgetStatus = (status: string): RumBudgetStatus => {
  if (
    status === 'HEALTHY' ||
    status === 'DEGRADING' ||
    status === 'VIOLATED' ||
    status === 'NO_DATA'
  ) {
    return status;
  }
  return 'NO_DATA';
};

export const toRumBudgetItem = (slo: RumBudgetSloSource): RumBudgetItem => {
  const { filter, good } = indicatorKql(slo.indicator);
  const pagePath = rumBudgetGroupedPath(slo.groupings) ?? rumBudgetPageFromFilter(filter);
  return {
    id: slo.id,
    instanceId: slo.instanceId,
    name: slo.name,
    description: slo.description,
    templateId: parseRumBudgetTemplate(slo.tags),
    status: asBudgetStatus(slo.summary.status),
    sliValue: slo.summary.sliValue,
    errorBudgetRemaining: slo.summary.errorBudget.remaining,
    errorBudgetConsumed: slo.summary.errorBudget.consumed,
    fiveMinuteBurnRate: slo.summary.fiveMinuteBurnRate,
    oneHourBurnRate: slo.summary.oneHourBurnRate,
    oneDayBurnRate: slo.summary.oneDayBurnRate,
    target: slo.objective.target,
    timeWindow: slo.timeWindow.duration,
    tags: slo.tags,
    groupings: slo.groupings ?? {},
    filter,
    good,
    threshold: parseRumBudgetThreshold(good, parseRumBudgetTemplate(slo.tags)),
    pagePath,
  };
};

export const defaultBudgetName = (params: RumBudgetParams): string => {
  if (isRumBudgetAiTemplate(params.templateId) && params.prompt?.trim()) {
    return params.prompt.trim().slice(0, 80);
  }
  const label = rumBudgetTemplateLabel(params.templateId);
  if (params.scope === 'page' && params.filters.pageUrl) {
    return `${label} — ${params.filters.pageUrl}`;
  }
  if (params.filters.serviceName) {
    return `${label} — ${params.filters.serviceName}`;
  }
  return label;
};

const frustrationOr = (): string =>
  FRUSTRATION_EVENT_VALUES.map((value) => kqlQuote(value)).join(' or ');

const pageLoadGoodKql = (thresholdMs: number): string => {
  const us = Math.round(thresholdMs * 1000);
  const ns = Math.round(thresholdMs * 1e6);
  return `(duration <= ${ns} or ${OTEL_TRANSACTION_DURATION_US} <= ${us})`;
};

const pageLoadBreachKql = (thresholdMs: number): string => {
  const us = Math.round(thresholdMs * 1000);
  const ns = Math.round(thresholdMs * 1e6);
  return `(duration > ${ns} or ${OTEL_TRANSACTION_DURATION_US} > ${us})`;
};

const rumBudgetIndex = (params: RumBudgetParams): string => {
  if (isRumBudgetAiTemplate(params.templateId) && params.index?.trim()) {
    return params.index.trim();
  }
  if (params.templateId === 'page_load') {
    return RUM_BUDGET_TRACES_INDEX;
  }
  if (params.templateId === 'error_rate' || params.templateId === 'frustration') {
    return RUM_BUDGET_COMBINED_INDEX;
  }
  return RUM_BUDGET_INDEX;
};

const rumBudgetSloDescription = (
  params: RumBudgetParams,
  threshold: number,
  target: number
): string => {
  const percent = Math.round(target * 100);
  if (isRumBudgetVitalTemplate(params.templateId)) {
    return i18n.translate('xpack.ux.budgets.slo.vitalDescription', {
      defaultMessage: '{percent}% of {vital} samples ≤ {threshold} over 30 days.',
      values: {
        percent,
        vital: params.templateId.toUpperCase(),
        threshold,
      },
    });
  }
  if (params.templateId === 'page_load') {
    return i18n.translate('xpack.ux.budgets.slo.pageLoadDescription', {
      defaultMessage: '{percent}% of page loads finish in {threshold}ms or less over 30 days.',
      values: { percent, threshold },
    });
  }
  if (params.templateId === 'frustration') {
    return i18n.translate('xpack.ux.budgets.slo.frustrationDescription', {
      defaultMessage: '{percent}% of page views have no rage, dead, or error click over 30 days.',
      values: { percent },
    });
  }
  if (params.templateId === 'ai') {
    return (
      params.prompt?.trim().slice(0, 300) ||
      i18n.translate('xpack.ux.budgets.slo.aiDescription', {
        defaultMessage: 'Natural-language RUM budget over 30 days.',
      })
    );
  }
  return i18n.translate('xpack.ux.budgets.slo.errorRateDescription', {
    defaultMessage: '{percent}% of page views have no JS exception over 30 days.',
    values: { percent },
  });
};

export const buildRumBudgetSlo = (params: RumBudgetParams): RumBudgetBuild => {
  const defaults = rumBudgetDefaults(params.templateId);
  const threshold = Number.isFinite(params.threshold) ? params.threshold : defaults.threshold;
  const target =
    Number.isFinite(params.target) && params.target > 0 && params.target < 1
      ? params.target
      : defaults.target;
  const tags = rumBudgetTags(params.templateId);
  const extras = scopeClauses(params.scope, params.filters);
  const groupBy = params.scope === 'groupByPage' ? [RUM_BUDGET_GROUP_BY_PATH] : undefined;

  let filter: string;
  let good: string;
  if (isRumBudgetVitalTemplate(params.templateId)) {
    filter = andJoin([
      `${OTEL_EVENT_NAME}: ${kqlQuote(OTEL_EVENT_BROWSER_WEB_VITAL)}`,
      `${OTEL_WEB_VITAL_NAME}: ${kqlQuote(params.templateId)}`,
      ...extras,
    ]);
    good = `${OTEL_WEB_VITAL_VALUE} <= ${threshold}`;
  } else if (params.templateId === 'page_load') {
    filter = andJoin([`${OTEL_SPAN_NAME}: ${kqlQuote(OTEL_DOCUMENT_LOAD)}`, ...extras]);
    good = pageLoadGoodKql(threshold);
  } else if (params.templateId === 'frustration') {
    const events = frustrationOr();
    filter = andJoin([
      `(${OTEL_EVENT_NAME}: (${events}) or ${OTEL_EVENT_NAME}: ${kqlQuote(
        OTEL_EVENT_NAVIGATION
      )} or ${OTEL_SPAN_NAME}: ${kqlQuote(OTEL_DOCUMENT_LOAD)})`,
      ...extras,
    ]);
    good = `not ${OTEL_EVENT_NAME}: (${events})`;
  } else if (isRumBudgetAiTemplate(params.templateId)) {
    filter = andJoin([
      params.filter?.trim() || `${OTEL_EVENT_NAME}: ${kqlQuote(OTEL_EVENT_BROWSER_WEB_VITAL)}`,
      ...extras,
    ]);
    good = params.good?.trim() || RUM_BUDGET_AI_PLACEHOLDER_GOOD;
  } else {
    filter = andJoin([
      `(${OTEL_EVENT_NAME}: ${kqlQuote(OTEL_EVENT_EXCEPTION)} or ${OTEL_SPAN_NAME}: ${kqlQuote(
        OTEL_DOCUMENT_LOAD
      )})`,
      ...extras,
    ]);
    good = `not ${OTEL_EVENT_NAME}: ${kqlQuote(OTEL_EVENT_EXCEPTION)}`;
  }

  const name = (params.name?.trim() || defaultBudgetName(params)).slice(0, 200);
  const description = rumBudgetSloDescription(params, threshold, target);
  const index = rumBudgetIndex(params);

  return {
    slo: {
      name,
      description,
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index,
          timestampField: RUM_BUDGET_TIMESTAMP_FIELD,
          filter,
          good,
          total: '',
        },
      },
      budgetingMethod: 'occurrences',
      objective: { target },
      timeWindow: { duration: '30d', type: 'rolling' },
      tags,
      ...(groupBy ? { groupBy } : {}),
    },
    tags,
    filter,
    good,
    threshold,
    target,
  };
};

export const rumBudgetBurnRateWindows = (): RumBudgetBurnRateWindow[] => [
  {
    id: 'critical',
    burnRateThreshold: 14.4,
    maxBurnRateThreshold: 720,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
    actionGroup: 'slo.burnRate.alert',
  },
  {
    id: 'high',
    burnRateThreshold: 6,
    maxBurnRateThreshold: 120,
    longWindow: { value: 6, unit: 'h' },
    shortWindow: { value: 30, unit: 'm' },
    actionGroup: 'slo.burnRate.high',
  },
  {
    id: 'medium',
    burnRateThreshold: 3,
    maxBurnRateThreshold: 30,
    longWindow: { value: 24, unit: 'h' },
    shortWindow: { value: 120, unit: 'm' },
    actionGroup: 'slo.burnRate.medium',
  },
  {
    id: 'low',
    burnRateThreshold: 1,
    maxBurnRateThreshold: 10,
    longWindow: { value: 72, unit: 'h' },
    shortWindow: { value: 360, unit: 'm' },
    actionGroup: 'slo.burnRate.low',
  },
];

export const rumBudgetBreachKuery = (
  item: Pick<RumBudgetItem, 'templateId' | 'threshold'> &
    Partial<Pick<RumBudgetItem, 'filter' | 'good'>>
): string => {
  if (item.templateId === 'ai') {
    return andJoin([item.filter ?? '', item.good ? `not (${item.good})` : '']);
  }
  if (item.templateId === 'error_rate' || item.templateId == null) {
    return `${OTEL_EVENT_NAME}: ${kqlQuote(OTEL_EVENT_EXCEPTION)}`;
  }
  if (item.templateId === 'frustration') {
    return `${OTEL_EVENT_NAME}: (${frustrationOr()})`;
  }
  if (item.templateId === 'page_load') {
    const threshold = item.threshold ?? rumBudgetDefaults('page_load').threshold;
    return andJoin([
      `${OTEL_SPAN_NAME}: ${kqlQuote(OTEL_DOCUMENT_LOAD)}`,
      pageLoadBreachKql(threshold),
    ]);
  }
  const threshold = item.threshold ?? rumBudgetDefaults(item.templateId).threshold;
  return andJoin([
    `${OTEL_EVENT_NAME}: ${kqlQuote(OTEL_EVENT_BROWSER_WEB_VITAL)}`,
    `${OTEL_WEB_VITAL_NAME}: ${kqlQuote(item.templateId)}`,
    `${OTEL_WEB_VITAL_VALUE} > ${threshold}`,
  ]);
};

export const budgetAppliesToPage = (
  item: RumBudgetItem,
  pagePath?: string,
  options?: { includeAppWide?: boolean }
): boolean => {
  const includeAppWide = options?.includeAppWide ?? true;
  if (!item.pagePath) {
    return includeAppWide;
  }
  if (!pagePath) {
    return false;
  }
  return (
    pagePath === item.pagePath ||
    pagePath.includes(item.pagePath) ||
    item.pagePath.includes(pagePath)
  );
};

export const budgetAppliesToMetric = (
  item: RumBudgetItem,
  templateId: RumBudgetTemplateId
): boolean => item.templateId === templateId;
