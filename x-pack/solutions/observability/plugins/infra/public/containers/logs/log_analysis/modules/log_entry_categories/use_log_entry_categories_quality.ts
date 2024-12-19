/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
import {
  CategoryQualityWarningReason,
  QualityWarning,
} from '../../../../../../common/log_analysis';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../../../hooks/use_tracked_promise';
import {
  callGetLatestCategoriesDatasetsStatsAPI,
  LogEntryCategoriesDatasetStats,
} from '../../api/get_latest_categories_datasets_stats';
import { JobModelSizeStats, JobSummary } from '../../log_analysis_module_types';

export const useLogEntryCategoriesQuality = ({ jobSummaries }: { jobSummaries: JobSummary[] }) => {
  const {
    services: {
      http: { fetch },
    },
  } = useKibanaContextForPlugin();

  const [lastestWarnedDatasetsStats, setLatestWarnedDatasetsStats] = useState<
    LogEntryCategoriesDatasetStats[]
  >([]);

  const jobSummariesWithCategoryWarnings = useMemo(
    () => jobSummaries.filter(isJobWithCategoryWarnings),
    [jobSummaries]
  );

  const jobSummariesWithPartitionedCategoryWarnings = useMemo(
    () => jobSummariesWithCategoryWarnings.filter(isJobWithPartitionedCategories),
    [jobSummariesWithCategoryWarnings]
  );

  const [fetchLatestWarnedDatasetsStatsRequest, fetchLatestWarnedDatasetsStats] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: (
        statsIntervals: Array<{ jobId: string; startTime: number; endTime: number }>
      ) =>
        Promise.all(
          statsIntervals.map(({ jobId, startTime, endTime }) =>
            callGetLatestCategoriesDatasetsStatsAPI(
              { jobIds: [jobId], startTime, endTime, includeCategorizerStatuses: ['warn'] },
              fetch
            )
          )
        ),
      onResolve: (results) => {
        setLatestWarnedDatasetsStats(results.flatMap(({ data: { datasetStats } }) => datasetStats));
      },
    },
    []
  );

  useDeepCompareEffect(() => {
    fetchLatestWarnedDatasetsStats(
      jobSummariesWithPartitionedCategoryWarnings.map((jobSummary) => ({
        jobId: jobSummary.id,
        startTime: jobSummary.fullJob?.create_time ?? 0,
        endTime: jobSummary.fullJob?.model_size_stats?.log_time ?? Date.now(),
      }))
    );
  }, [jobSummariesWithPartitionedCategoryWarnings]);

  const categoryQualityWarnings: QualityWarning[] = useMemo(
    () => [
      ...jobSummariesWithCategoryWarnings
        .filter((jobSummary) => !isJobWithPartitionedCategories(jobSummary))
        .map((jobSummary) => ({
          type: 'categoryQualityWarning' as const,
          jobId: jobSummary.id,
          dataset: '',
          reasons: jobSummary.fullJob?.model_size_stats
            ? getCategoryQualityWarningReasons(jobSummary.fullJob.model_size_stats)
            : [],
        })),
      ...lastestWarnedDatasetsStats.map((datasetStats) => ({
        type: 'categoryQualityWarning' as const,
        jobId: datasetStats.job_id,
        dataset: datasetStats.dataset,
        reasons: getCategoryQualityWarningReasons(datasetStats),
      })),
    ],
    [jobSummariesWithCategoryWarnings, lastestWarnedDatasetsStats]
  );

  return {
    categoryQualityWarnings,
    lastLatestWarnedDatasetsStatsRequestErrors:
      fetchLatestWarnedDatasetsStatsRequest.state === 'rejected'
        ? fetchLatestWarnedDatasetsStatsRequest.value
        : null,
    isLoadingCategoryQualityWarnings: fetchLatestWarnedDatasetsStatsRequest.state === 'pending',
  };
};

const isJobWithCategoryWarnings = (jobSummary: JobSummary) =>
  jobSummary.fullJob?.model_size_stats?.categorization_status === 'warn';

const isJobWithPartitionedCategories = (jobSummary: JobSummary) =>
  jobSummary.fullJob?.analysis_config?.per_partition_categorization ?? false;

const getCategoryQualityWarningReasons = ({
  categorized_doc_count: categorizedDocCount,
  dead_category_count: deadCategoryCount,
  frequent_category_count: frequentCategoryCount,
  rare_category_count: rareCategoryCount,
  total_category_count: totalCategoryCount,
}: Pick<
  JobModelSizeStats,
  | 'categorized_doc_count'
  | 'dead_category_count'
  | 'frequent_category_count'
  | 'rare_category_count'
  | 'total_category_count'
>): CategoryQualityWarningReason[] => {
  const rareCategoriesRatio = rareCategoryCount / totalCategoryCount;
  const categoriesDocumentRatio = totalCategoryCount / categorizedDocCount;
  const deadCategoriesRatio = deadCategoryCount / totalCategoryCount;

  return [
    ...(totalCategoryCount === 1
      ? [
          {
            type: 'singleCategory' as const,
          },
        ]
      : []),
    ...(rareCategoriesRatio >= 0.9
      ? [
          {
            type: 'manyRareCategories' as const,
            rareCategoriesRatio,
          },
        ]
      : []),
    ...(categorizedDocCount > 100 && categoriesDocumentRatio >= 0.5
      ? [
          {
            type: 'manyCategories' as const,
            categoriesDocumentRatio,
          },
        ]
      : []),
    ...(frequentCategoryCount === 0
      ? [
          {
            type: 'noFrequentCategories' as const,
          },
        ]
      : []),
    ...(deadCategoriesRatio >= 0.5
      ? [
          {
            type: 'manyDeadCategories' as const,
            deadCategoriesRatio,
          },
        ]
      : []),
  ];
};
