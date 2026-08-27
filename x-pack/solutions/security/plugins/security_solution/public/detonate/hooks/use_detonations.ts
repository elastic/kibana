/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';

import type {
  BreakdownCount,
  DetonationKpis,
  DetonationSummary,
  MalwareFamilyCount,
} from '../../../common/detonate';
import { DETONATE_TOP_FAMILIES_LIMIT } from '../../../common/detonate';
import type { DetonationQueryFilters } from '../queries';
import {
  getDetonationByIdQuery,
  getDetonationKpisQuery,
  getDetonationsQuery,
  getPlatformCountsQuery,
  getProtectionCountsQuery,
  getRuleNameCountsQuery,
  getSourceCountsQuery,
  isValidTaskId,
} from '../queries';
import type { DetonationFilters } from '../transforms';
import {
  toBreakdownCounts,
  toDetonationSummary,
  toFamilyCounts,
  toRuleNamesByFamily,
} from '../transforms';
import { useDetonateEsqlQuery } from './use_detonate_esql_query';

/**
 * What every query on the page needs: the resolved filters, and whether the rule names those
 * filters resolve through have arrived yet.
 */
export interface DetonationQueryArgs {
  timeRange: TimeRange;
  filters: DetonationQueryFilters;
  isPending: boolean;
}

/**
 * Turns the page's filter state into the filters the queries take, resolving the family and
 * "named threats only" selections into signature rule names along the way.
 *
 * Those two are the only filters that need resolving, because whether a rule name is a signature
 * is decided by the client-side parser. Until the rule names arrive the dependent queries are
 * held back rather than run against an empty set, which would flash an empty page on load.
 */
export const useDetonationQuery = ({
  timeRange,
  filters,
}: {
  timeRange: TimeRange;
  filters: DetonationFilters;
}): {
  queryArgs: DetonationQueryArgs;
  families: MalwareFamilyCount[];
  familyNames: string[];
  isLoadingFamilies: boolean;
} => {
  const { onlyWithAlerts, onlyNamedThreats, hash, families: selectedFamilies } = filters;

  const withoutFamily = useMemo<DetonationQueryFilters>(
    () => ({
      onlyWithAlerts,
      hash,
      protections: filters.protections,
      platforms: filters.platforms,
      sources: filters.sources,
      familyRuleNames: null,
    }),
    [onlyWithAlerts, hash, filters.protections, filters.platforms, filters.sources]
  );

  const { families, familyNames, ruleNamesByFamily, isLoading } = useMalwareFamilies({
    timeRange,
    filters: withoutFamily,
    selectedFamilies,
  });

  const familyRuleNames = useMemo(() => {
    if (selectedFamilies.length > 0) {
      return selectedFamilies.flatMap((family) => ruleNamesByFamily.get(family) ?? []);
    }
    // Every rule name that names a family is exactly the set of named threats.
    return onlyNamedThreats ? [...ruleNamesByFamily.values()].flat() : null;
  }, [selectedFamilies, onlyNamedThreats, ruleNamesByFamily]);

  const queryArgs = useMemo<DetonationQueryArgs>(
    () => ({
      timeRange,
      filters: { ...withoutFamily, familyRuleNames },
      isPending: familyRuleNames !== null && isLoading,
    }),
    [timeRange, withoutFamily, familyRuleNames, isLoading]
  );

  return { queryArgs, families, familyNames, isLoadingFamilies: isLoading };
};

/**
 * Rows for the detonations table.
 *
 * Every filter is pushed into ES|QL, so the row cap applies to matching detonations across the
 * whole range rather than to the most recent ones.
 */
export const useDetonations = ({
  timeRange,
  filters,
  isPending,
}: DetonationQueryArgs): {
  detonations: DetonationSummary[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} => {
  const query = useMemo(
    () => (isPending ? null : getDetonationsQuery(filters)),
    [filters, isPending]
  );

  const { records, isLoading, isError, error, refetch } = useDetonateEsqlQuery({
    query,
    timeRange,
    queryKey: 'detonations',
  });

  return {
    detonations: useMemo(() => records.map(toDetonationSummary), [records]),
    isLoading: isLoading || isPending,
    isError,
    error,
    refetch,
  };
};

/**
 * Shared plumbing for the breakdowns, which differ only in the query they build and the field
 * they group by. Each is held back until the rule names its filters resolve through have arrived,
 * so a chart never briefly draws bars for detonations the table has already excluded.
 */
const useBreakdown = (
  { timeRange, filters, isPending }: DetonationQueryArgs,
  queryKey: string,
  buildQuery: (filters: DetonationQueryFilters) => string,
  keyField: string
): { counts: BreakdownCount[]; isLoading: boolean } => {
  const query = useMemo(
    () => (isPending ? null : buildQuery(filters)),
    [buildQuery, filters, isPending]
  );

  const { records, isLoading } = useDetonateEsqlQuery({ query, timeRange, queryKey });

  return {
    counts: useMemo(() => toBreakdownCounts(records, keyField), [records, keyField]),
    isLoading: isLoading || isPending,
  };
};

/**
 * Detonations per protection.
 *
 * Several protections usually fire on the same sample, so these counts overlap and do not sum to
 * the detonation total. That is why this is a bar chart and not a pie.
 */
export const useProtectionBreakdown = (
  args: DetonationQueryArgs
): { protections: BreakdownCount[]; isLoading: boolean } => {
  const { counts, isLoading } = useBreakdown(
    args,
    'protectionCounts',
    getProtectionCountsQuery,
    'eventCode'
  );

  return { protections: counts, isLoading };
};

/** Detonations per operating system. */
export const usePlatformBreakdown = (
  args: DetonationQueryArgs
): { platforms: BreakdownCount[]; isLoading: boolean } => {
  const { counts, isLoading } = useBreakdown(
    args,
    'platformCounts',
    getPlatformCountsQuery,
    'osFamily'
  );

  return { platforms: counts, isLoading };
};

/** Filters that narrow nothing, for the header figures that describe the whole range. */
const UNFILTERED: DetonationQueryFilters = {
  onlyWithAlerts: true,
  hash: '',
  protections: [],
  platforms: [],
  sources: [],
  familyRuleNames: null,
};

/**
 * Header figures across the whole selected range.
 *
 * Deliberately ignores the filters, unlike everything below them: these state the reach of the
 * detonation programme itself rather than of whatever the user is currently looking at.
 */
export const useDetonationKpis = ({
  timeRange,
}: {
  timeRange: TimeRange;
}): { kpis: DetonationKpis; isLoading: boolean; isError: boolean } => {
  const query = useMemo(() => getDetonationKpisQuery(), []);

  const { records, isLoading, isError } = useDetonateEsqlQuery<{
    totalDetonations: number;
    endpointAlerts: number;
    detectionAlerts: number;
  }>({ query, timeRange, queryKey: 'detonationKpis' });

  // Families are named by signatures the client-side parser reads, so this count cannot come from
  // the STATS above. It runs unfiltered, separately from the chart's own narrowed rule names.
  const familyQuery = useMemo(() => getRuleNameCountsQuery(UNFILTERED), []);
  const { records: ruleNames } = useDetonateEsqlQuery({
    query: familyQuery,
    timeRange,
    queryKey: 'allRuleNameCounts',
  });

  const namedFamilies = useMemo(
    () => toFamilyCounts(ruleNames, Number.MAX_SAFE_INTEGER).length,
    [ruleNames]
  );

  const kpis = useMemo<DetonationKpis>(() => {
    const row = records[0];
    return {
      totalDetonations: row?.totalDetonations ?? 0,
      endpointAlerts: row?.endpointAlerts ?? 0,
      detectionAlerts: row?.detectionAlerts ?? 0,
      namedFamilies,
    };
  }, [records, namedFamilies]);

  return { kpis, isLoading, isError };
};

/** Detonations per ingest source, which populates the source picker. */
export const useSourceBreakdown = (args: DetonationQueryArgs): { sources: BreakdownCount[] } => {
  const { counts } = useBreakdown(args, 'sourceCounts', getSourceCountsQuery, 'source');

  return { sources: counts };
};

/**
 * Malware families, and the rule names the family filters resolve through.
 *
 * This runs before the other queries because they depend on it: the family filter and "named
 * threats only" both come down to a set of signature rule names, and only the client-side parser
 * can say which rule names those are. It is therefore the one query that cannot itself be
 * narrowed by them, which is also what lets its chart keep offering the families not selected.
 */
export const useMalwareFamilies = ({
  timeRange,
  filters,
  selectedFamilies,
}: {
  timeRange: TimeRange;
  filters: DetonationQueryFilters;
  selectedFamilies: string[];
}): {
  families: MalwareFamilyCount[];
  familyNames: string[];
  ruleNamesByFamily: Map<string, string[]>;
  isLoading: boolean;
  isError: boolean;
} => {
  const query = useMemo(() => getRuleNameCountsQuery(filters), [filters]);

  const { records, isLoading, isError } = useDetonateEsqlQuery({
    query,
    timeRange,
    queryKey: 'ruleNameCounts',
  });

  const allFamilies = useMemo(() => toFamilyCounts(records, Number.MAX_SAFE_INTEGER), [records]);
  const ruleNamesByFamily = useMemo(() => toRuleNamesByFamily(records), [records]);

  const familyNames = useMemo(
    () => [...ruleNamesByFamily.keys()].sort((a, b) => a.localeCompare(b)),
    [ruleNamesByFamily]
  );

  // A family picked from the dropdown is charted even when it is too rare for the top slice, so
  // that the selection always has a highlighted bar to see and to click off again.
  const families = useMemo(() => {
    const top = allFamilies.slice(0, DETONATE_TOP_FAMILIES_LIMIT);
    const charted = new Set(top.map(({ family }) => family));
    const selectedButUncharted = allFamilies.filter(
      ({ family }) => selectedFamilies.includes(family) && !charted.has(family)
    );

    return [...top, ...selectedButUncharted].sort((a, b) => b.count - a.count);
  }, [allFamilies, selectedFamilies]);

  return { families, familyNames, ruleNamesByFamily, isLoading, isError };
};

/** A single detonation, looked up by task id for the detail page. */
export const useDetonation = (
  taskId: string
): {
  detonation: DetonationSummary | null;
  detectionRuleNames: string[];
  workerStatus: string | null;
  isValidId: boolean;
  isLoading: boolean;
  isError: boolean;
} => {
  const isValidId = isValidTaskId(taskId);

  const query = useMemo(
    () => (isValidId ? getDetonationByIdQuery(taskId) : null),
    [taskId, isValidId]
  );

  const { records, isLoading, isError } = useDetonateEsqlQuery({
    query,
    queryKey: `detonation-${taskId}`,
  });

  const record = records[0];

  return {
    detonation: record ? toDetonationSummary(record) : null,
    detectionRuleNames: record
      ? [record.detectionRuleNames]
          .flat()
          .filter((name): name is string => typeof name === 'string')
      : [],
    workerStatus: typeof record?.workerStatus === 'string' ? record.workerStatus : null,
    isValidId,
    isLoading,
    isError,
  };
};
