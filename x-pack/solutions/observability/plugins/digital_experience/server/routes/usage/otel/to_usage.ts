/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toPagePath } from '../../../../common/sessions';
import {
  EVENT_DEAD_CLICK,
  EVENT_ERROR_CLICK,
  EVENT_RAGE_CLICK,
} from '../../../../common/otel_data';
import type { FrustrationCounts } from '../../../../common/frustration';
import { emptyFrustration } from '../../../../common/frustration';
import { TOP_ROWS } from '../../../../common/top_rows';
import type {
  ApplicationUsageResponse,
  Breakdowns,
  FrustratedElement,
  FrustratedPage,
} from '../../../../common/types/usage';
import { firstBucketKey, getP75 } from '../../../lib/helpers/aggregations';
import type { UsageAggregations } from './search_response';

type Frustration = UsageAggregations['inEnvironment']['frustration'];

const toBreakdowns = (logs?: UsageAggregations): Breakdowns => {
  const pageLoads = logs?.inEnvironment.pageLoads;
  const toItems = (buckets: Array<{ key: string | number; doc_count: number }> = []) => {
    return buckets.map(({ key, doc_count: count }) => {
      return { name: String(key), pageLoads: count };
    });
  };

  return {
    pageLoads: pageLoads?.doc_count ?? 0,
    browsers: toItems(pageLoads?.browsers.buckets),
    operatingSystems: toItems(pageLoads?.operatingSystems.buckets),
    devices: toItems(pageLoads?.devices.buckets),
  };
};

interface TypeBuckets {
  buckets: Array<{ key: string | number; doc_count: number }>;
}

const countsOf = (byType: TypeBuckets | undefined, total: number): FrustrationCounts => {
  const countOf = (name: string) => {
    return byType?.buckets.find(({ key }) => key === name)?.doc_count ?? 0;
  };
  return {
    rageClicks: countOf(EVENT_RAGE_CLICK),
    deadClicks: countOf(EVENT_DEAD_CLICK),
    errorClicks: countOf(EVENT_ERROR_CLICK),
    total,
  };
};

const toFrustratedElements = (frustration?: Frustration): FrustratedElement[] => {
  return (frustration?.elements.buckets ?? []).map(
    ({ key, doc_count: total, byType, sessions, tagName, topPage }) => {
      return {
        cssSelector: String(key),
        tagName: firstBucketKey(tagName),
        ...countsOf(byType, total),
        sessions: sessions.value,
        topPage: toPagePath(firstBucketKey(topPage)),
      };
    }
  );
};

/** Folds the URL buckets into paths; a path's sessions are the largest of its URLs. */
const toFrustratedPages = (frustration?: Frustration): FrustratedPage[] => {
  const pages = new Map<string, FrustratedPage>();
  for (const { key, doc_count: total, byType, sessions } of frustration?.pages.buckets ?? []) {
    const page = toPagePath(String(key));
    if (page === null) {
      continue;
    }
    const counts = countsOf(byType, total);
    const known = pages.get(page);
    pages.set(page, {
      page,
      rageClicks: (known?.rageClicks ?? 0) + counts.rageClicks,
      deadClicks: (known?.deadClicks ?? 0) + counts.deadClicks,
      errorClicks: (known?.errorClicks ?? 0) + counts.errorClicks,
      total: (known?.total ?? 0) + counts.total,
      sessions: Math.max(known?.sessions ?? 0, sessions.value),
    });
  }
  return [...pages.values()].sort((a, b) => b.total - a.total).slice(0, TOP_ROWS);
};

/**
 * What users load and do; missing aggregations (indices that do not exist) map to empty lists and
 * `null` percentiles.
 */
export const toUsage = (logs?: UsageAggregations): ApplicationUsageResponse => {
  const metrics = logs?.inEnvironment;
  return {
    topPages: (metrics?.pageLoads.topPages.buckets ?? []).map(
      ({ key, doc_count: pageLoads, loadTime }) => {
        return {
          url: String(key),
          pageLoads,
          loadTimeP75Ms: getP75(loadTime),
        };
      }
    ),
    breakdowns: toBreakdowns(logs),
    topClicks: (metrics?.clicks.selectors.buckets ?? []).map(
      ({ key, doc_count: count, tagName }) => {
        return {
          cssSelector: String(key),
          tagName: firstBucketKey(tagName),
          count,
        };
      }
    ),
    totalClicks: metrics?.clicks.doc_count ?? 0,
    frustration: metrics
      ? {
          ...countsOf(metrics.frustration.byType, metrics.frustration.doc_count),
          sessions: metrics.frustration.sessions.value,
        }
      : { ...emptyFrustration(), sessions: 0 },
    frustratedElements: toFrustratedElements(metrics?.frustration),
    frustratedPages: toFrustratedPages(metrics?.frustration),
  };
};
