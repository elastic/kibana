/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import {
  MAX_INVESTIGATION_FIELD_CHARS,
  type InvestigationSeed,
  resolveInvestigationHosts,
} from '@kbn/investigation-seed';
import type {
  AnalyzerResultStatus,
  InvestigationLead,
  SignalAnalyzerComparison,
  SignalAnalyzerPivot,
} from '@kbn/signal-investigation-contract';
import { truncate } from 'lodash';

export type CoverageStatus = AnalyzerResultStatus | 'running';

export interface CoverageItemState {
  id: string;
  name: string;
  technique: string;
  status: CoverageStatus;
  foundCount: number;
  message?: string;
  comparison?: SignalAnalyzerComparison;
  toolLinkLabel: string;
  toolLinkHref?: string;
}

const MAX_DISPLAY_ENTITY_CHARS = 120;

/** Shortens a pivot label for display while keeping the underlying entity value intact. */
export const formatPivotEntityLabel = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_DISPLAY_ENTITY_CHARS) {
    return trimmed;
  }
  return `${truncate(trimmed, { length: MAX_DISPLAY_ENTITY_CHARS, omission: '' })}…`;
};

const toBoundedEntityValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INVESTIGATION_FIELD_CHARS) {
    return undefined;
  }
  return trimmed;
};

/** Returns a pivot when a lead points to a service or host that differs from the current seed. */
export const extractLeadEntityPivot = (
  lead: InvestigationLead,
  seed: InvestigationSeed
): SignalAnalyzerPivot | undefined => {
  const params = lead.locatorParams ?? {};

  if (lead.analyzerId === 'dependency_change_points') {
    const dependencyName = toBoundedEntityValue(params.dependencyName);
    if (dependencyName && dependencyName !== seed.entities['service.name']) {
      return { field: 'service.name', value: dependencyName };
    }
    return undefined;
  }

  if (lead.analyzerId === 'metric_change_points') {
    const hostName = toBoundedEntityValue(params.hostName);
    if (hostName && hostName !== seed.entities['host.name']) {
      return { field: 'host.name', value: hostName };
    }
    return undefined;
  }

  if (lead.analyzerId === 'log_rate_analysis') {
    const leadField = params.leadField;
    const leadValue = toBoundedEntityValue(params.leadValue);
    if (!leadValue) {
      return undefined;
    }
    if (leadField === 'service.name' && leadValue !== seed.entities['service.name']) {
      return { field: 'service.name', value: leadValue };
    }
    if (leadField === 'host.name' && leadValue !== seed.entities['host.name']) {
      return { field: 'host.name', value: leadValue };
    }
  }

  return undefined;
};

/** Applies a service or host pivot to a seed while clearing stale host scope from the prior step. */
export const applyEntityPivot = (
  seed: InvestigationSeed,
  pivot: SignalAnalyzerPivot
): InvestigationSeed => {
  const { hosts: _ignoredHosts, ...restSeed } = seed;
  if (pivot.field === 'service.name') {
    const { 'host.name': _ignoredHostEntity, ...restEntities } = seed.entities;
    return {
      ...restSeed,
      entities: {
        ...restEntities,
        'service.name': pivot.value,
      },
    };
  }
  return {
    ...restSeed,
    entities: {
      ...seed.entities,
      'host.name': pivot.value,
    },
  };
};

/** Returns true when the seed has neither a service name nor any resolved host names. */
export const canOfferWindowEntityPivot = (seed: InvestigationSeed): boolean =>
  !seed.entities['service.name'] && resolveInvestigationHosts(seed).length === 0;

/** Formats a short label for a previous step in the flyout's back breadcrumb. */
export const formatSeedStepLabel = (seed: InvestigationSeed): string => {
  const entity =
    seed.entities['host.name'] ??
    seed.entities['service.name'] ??
    (seed.origin.app === 'dashboard' ? seed.origin.panelTitle : undefined);
  if (entity) {
    return formatPivotEntityLabel(entity);
  }
  return i18n.translate('xpack.signalInvestigation.flyout.initialScopeLabel', {
    defaultMessage: 'initial scope',
  });
};

export type EmptyLeadsKind =
  | 'catalog_error'
  | 'no_analyzers'
  | 'no_entity'
  | 'no_strong_changes'
  | 'partial_checked'
  | undefined;

export const selectEmptyLeadsKind = ({
  catalogError,
  analyzerCount,
  finished,
  leadCount,
  coverage,
}: {
  catalogError: boolean;
  analyzerCount: number;
  finished: boolean;
  leadCount: number;
  coverage: readonly Pick<CoverageItemState, 'status'>[];
}): EmptyLeadsKind => {
  if (catalogError) {
    return 'catalog_error';
  }
  if (analyzerCount === 0) {
    return 'no_analyzers';
  }
  if (!finished || leadCount > 0) {
    return undefined;
  }

  const applicable = coverage.filter((item) => item.status !== 'not_applicable');
  if (applicable.length === 0) {
    return 'no_entity';
  }

  const allNoChange = applicable.every((item) => item.status === 'no_change');
  return allNoChange ? 'no_strong_changes' : 'partial_checked';
};

export type DateFormatter = (value: string) => string;

/** Formats ISO or date-math values with the user's date format, falling back to the raw value. */
export const createDateFormatter =
  (dateFormat: string): DateFormatter =>
  (value) => {
    const parsed = datemath.parse(value);
    return parsed?.isValid() ? parsed.format(dateFormat) : value;
  };

export const formatAnchorDescription = (
  seed: InvestigationSeed,
  formatDate: DateFormatter
): string => {
  const entity =
    seed.entities['service.name'] ??
    seed.entities['host.name'] ??
    (seed.origin.app === 'dashboard' ? seed.origin.panelTitle : undefined);
  const from = formatDate(seed.timeRange.from);
  const to = formatDate(seed.timeRange.to);

  if (entity) {
    return i18n.translate('xpack.signalInvestigation.flyout.anchorWithEntity', {
      defaultMessage: '{entity} · {from} to {to}',
      values: { entity, from, to },
    });
  }
  return i18n.translate('xpack.signalInvestigation.flyout.anchorRangeOnly', {
    defaultMessage: '{from} to {to}',
    values: { from, to },
  });
};

export const formatComparisonWindows = (
  comparison: SignalAnalyzerComparison,
  formatDate: DateFormatter
): string =>
  i18n.translate('xpack.signalInvestigation.flyout.comparisonWindows', {
    defaultMessage: '{deviationFrom} to {deviationTo} compared with {baselineFrom} to {baselineTo}',
    values: {
      deviationFrom: formatDate(comparison.deviation.from),
      deviationTo: formatDate(comparison.deviation.to),
      baselineFrom: formatDate(comparison.baseline.from),
      baselineTo: formatDate(comparison.baseline.to),
    },
  });

export const formatCoverageLineText = (
  item: CoverageItemState,
  seed: InvestigationSeed,
  formatDate?: DateFormatter
): string => {
  const subject =
    seed.entities['service.name'] ??
    seed.entities['host.name'] ??
    i18n.translate('xpack.signalInvestigation.flyout.coverageSubjectFallback', {
      defaultMessage: 'current scope',
    });

  const prefix = i18n.translate('xpack.signalInvestigation.flyout.coveragePrefix', {
    defaultMessage: '{technique} ({name} for {subject})',
    values: { technique: item.technique, name: item.name, subject },
  });

  const statusText = (() => {
    switch (item.status) {
      case 'running':
        return i18n.translate('xpack.signalInvestigation.flyout.status.running', {
          defaultMessage: 'Running',
        });
      case 'found':
        return i18n.translate('xpack.signalInvestigation.flyout.status.foundCount', {
          defaultMessage: '{count, plural, one {# change found} other {# changes found}}',
          values: { count: item.foundCount },
        });
      case 'no_change':
        return i18n.translate('xpack.signalInvestigation.flyout.status.noChange', {
          defaultMessage: 'no significant change',
        });
      case 'indeterminable':
        return i18n.translate('xpack.signalInvestigation.flyout.status.indeterminable', {
          defaultMessage: 'couldn’t decide',
        });
      case 'not_applicable':
        return i18n.translate('xpack.signalInvestigation.flyout.status.notApplicable', {
          defaultMessage: 'Not applicable',
        });
      case 'not_set_up':
        return i18n.translate('xpack.signalInvestigation.flyout.status.notSetUp', {
          defaultMessage: 'Not set up',
        });
      case 'no_access':
        return i18n.translate('xpack.signalInvestigation.flyout.status.noAccess', {
          defaultMessage: 'Skipped: no access',
        });
      case 'skipped':
        return i18n.translate('xpack.signalInvestigation.flyout.status.skipped', {
          defaultMessage: 'Couldn’t run',
        });
    }
  })();

  const baseLine = item.message
    ? i18n.translate('xpack.signalInvestigation.flyout.coverageLineWithMessage', {
        defaultMessage: '{prefix}: {statusText}. {message}',
        values: { prefix, statusText, message: item.message },
      })
    : i18n.translate('xpack.signalInvestigation.flyout.coverageLine', {
        defaultMessage: '{prefix}: {statusText}',
        values: { prefix, statusText },
      });

  if (item.comparison && formatDate) {
    return i18n.translate('xpack.signalInvestigation.flyout.coverageLineWithComparison', {
      defaultMessage: '{line} ({comparison})',
      values: {
        line: baseLine,
        comparison: formatComparisonWindows(item.comparison, formatDate),
      },
    });
  }

  return baseLine;
};
