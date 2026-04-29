/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { logEntryCategoriesJobType } from '../../../../../../common/log_analysis';
import { useLogEntryCategoryExamples } from '../../use_log_entry_category_examples';
import { LogEntryExampleMessages } from '../../../../../components/logging/log_entry_examples/log_entry_examples';
import type { TimeRange } from '../../../../../../common/time/time_range';
import { CategoryExampleMessageTable } from './category_example_message';
import { useLogMlJobIdFormatsShimContext } from '../../../shared/use_log_ml_job_id_formats_shim';

const exampleCount = 5;

export const CategoryDetailsRow: React.FunctionComponent<{
  categoryId: number;
  timeRange: TimeRange;
  logViewReference: PersistedLogViewReference;
}> = ({ categoryId, timeRange, logViewReference }) => {
  const { idFormats } = useLogMlJobIdFormatsShimContext();

  const {
    getLogEntryCategoryExamples,
    hasFailedLoadingLogEntryCategoryExamples,
    isLoadingLogEntryCategoryExamples,
    logEntryCategoryExamples,
  } = useLogEntryCategoryExamples({
    categoryId,
    endTime: timeRange.endTime,
    exampleCount,
    logViewReference,
    idFormat: idFormats?.[logEntryCategoriesJobType],
    startTime: timeRange.startTime,
  });

  useEffect(() => {
    getLogEntryCategoryExamples();
  }, [getLogEntryCategoryExamples]);

  const formattedExamples = logEntryCategoryExamples.map((example) => ({
    id: example.id,
    dataset: example.dataset,
    message: example.message,
    timestamp: example.timestamp,
    tiebreaker: example.tiebreaker,
    context: example.context,
  }));

  return (
    <LogEntryExampleMessages
      isLoading={isLoadingLogEntryCategoryExamples}
      hasFailedLoading={hasFailedLoadingLogEntryCategoryExamples}
      hasResults={logEntryCategoryExamples.length > 0}
      exampleCount={exampleCount}
      onReload={getLogEntryCategoryExamples}
    >
      <CategoryExampleMessageTable
        key={categoryId}
        examples={formattedExamples}
        timeRange={timeRange}
      />
    </LogEntryExampleMessages>
  );
};
