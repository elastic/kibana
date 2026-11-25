/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy, sumBy } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type {
  ApplicationSource,
  ApplicationType,
  HistogramBuckets,
} from '../../../../common/types/applications';
import type {
  ApplicationIngest,
  ApplicationsIngestResponse,
  IngestPoint,
  IngestSeries,
} from '../../../../common/types/applications_ingest';
import { describeError } from '../../../lib/helpers/errors';
import type { IndexCount } from './estimate';
import { averageDocumentSizes, estimateBytes } from './estimate';
import type { IndexSizes } from './get_index_sizes';

/** The applications the chart stacks per source; the rest are one series. */
export const TOP_APPLICATIONS = 10;

/** An application's documents per index. */
export interface ApplicationCounts {
  serviceName: string;
  indices: IndexCount[];
}

/** One bucket's documents per index: of every application, and of the top ones. */
export interface OverTimeBucket {
  timestamp: number;
  indices: IndexCount[];
  applications: ApplicationCounts[];
}

export interface IngestSource {
  source: ApplicationSource;
  applicationType: ApplicationType;
  /** Each application's documents per index in the time range. */
  getCounts: () => Promise<ApplicationCounts[]>;
  /** Web sources only, for the chart: each bucket's documents, and of these applications. */
  getOverTime?: (serviceNames: string[]) => Promise<OverTimeBucket[]>;
}

const sourceName = ({ applicationType, source }: IngestSource) =>
  applicationType === 'mobile' ? 'mobile' : source;

const toSeries = (
  serviceName: string,
  source: ApplicationSource,
  buckets: OverTimeBucket[],
  averages: ReadonlyMap<string, number>
): IngestSeries => ({
  serviceName,
  source,
  points: buckets.map(({ timestamp, applications }) => {
    const counts = applications.find((application) => application.serviceName === serviceName);
    const bytes = counts ? estimateBytes(counts.indices, averages) ?? 0 : 0;
    return { timestamp, bytes: Math.round(bytes) };
  }),
});

/**
 * Each bucket's ingest of the source's applications other than its top ones, which are the
 * bucket's `applications`; from unrounded estimates, so it is 0, not a few bytes, without others.
 */
const toOther = (buckets: OverTimeBucket[], averages: ReadonlyMap<string, number>): IngestPoint[] =>
  buckets.map(({ timestamp, indices, applications }) => {
    const top = sumBy(applications, (counts) => estimateBytes(counts.indices, averages) ?? 0);
    const all = estimateBytes(indices, averages) ?? 0;
    return { timestamp, bytes: Math.max(Math.round(all - top), 0) };
  });

/**
 * The estimated ingest of every application and, for the web ones, over time: each source's
 * documents per application and index, times the average stored size of a document of each data
 * stream. Three steps, each after the other: the counts of every source at once, the sizes of the
 * indices they are in, then the buckets of each web source's top applications. A source whose
 * search fails is left out, unless every one fails.
 */
export const getApplicationsIngest = async ({
  sources,
  getIndexSizes,
  histogram,
  logger,
}: {
  sources: IngestSource[];
  getIndexSizes: (indices: Iterable<string>) => Promise<IndexSizes>;
  histogram: HistogramBuckets;
  logger: Logger;
}): Promise<ApplicationsIngestResponse> => {
  let hasFailures = false;
  const warn = (source: IngestSource, error: unknown) => {
    hasFailures = true;
    logger.warn(
      `Could not estimate the ingest of the ${sourceName(source)} applications: ${describeError(
        error
      )}`
    );
  };

  const settled = await Promise.allSettled(sources.map(({ getCounts }) => getCounts()));
  const rejected = settled.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (sources.length > 0 && rejected.length === sources.length) {
    throw rejected[0].reason;
  }
  const counted = sources.flatMap((source, index) => {
    const result = settled[index];
    if (result.status === 'rejected') {
      warn(source, result.reason);
      return [];
    }
    return [{ source, counts: result.value }];
  });

  const { sizes, missingPrivileges } = await getIndexSizes(
    counted.flatMap(({ counts }) =>
      counts.flatMap(({ indices }) => indices.map(({ index }) => index))
    )
  );
  const averages = averageDocumentSizes(sizes);

  const estimated = counted.map(({ source, counts }) => ({
    source,
    applications: counts.flatMap(({ serviceName, indices }): ApplicationIngest[] => {
      const bytes = estimateBytes(indices, averages);
      return bytes === null
        ? []
        : [
            {
              serviceName,
              applicationType: source.applicationType,
              source: source.source,
              bytes: Math.round(bytes),
            },
          ];
    }),
  }));

  const other: Record<ApplicationSource, IngestPoint[]> = { otel: [], classic: [] };
  const series = await Promise.all(
    estimated.map(async ({ source, applications }): Promise<IngestSeries[]> => {
      if (!source.getOverTime || applications.length === 0) {
        return [];
      }
      const top = orderBy(applications, ['bytes', 'serviceName'], ['desc', 'asc'])
        .slice(0, TOP_APPLICATIONS)
        .map(({ serviceName }) => serviceName);
      try {
        const buckets = await source.getOverTime(top);
        const sourceSeries = top.map((serviceName) =>
          toSeries(serviceName, source.source, buckets, averages)
        );
        other[source.source] = toOther(buckets, averages);
        return sourceSeries;
      } catch (error) {
        warn(source, error);
        return [];
      }
    })
  );

  return {
    applications: estimated.flatMap(({ applications }) => applications),
    overTime: { histogram, series: series.flat(), other },
    missingPrivileges,
    hasFailures,
  };
};
