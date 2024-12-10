/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { v5 } from 'uuid';
import { IdFormat, JobType } from '../http_api/latest';

export const bucketSpan = 900000;

export const categoriesMessageField = 'message';

export const partitionField = 'event.dataset';

const ID_NAMESPACE = 'f91b78c0-fdd3-425d-a4ba-4c028fe57e0f';

export const getJobIdPrefix = (spaceId: string, sourceId: string, idFormat: IdFormat) => {
  if (idFormat === 'legacy') {
    return `kibana-logs-ui-${spaceId}-${sourceId}-`;
  } else {
    // A UUID is 36 characters but based on the ML job names for logs, our limit is 32 characters
    // Thus we remove the 4 dashes
    const uuid = v5(`${spaceId}-${sourceId}`, ID_NAMESPACE).replaceAll('-', '');
    return `logs-${uuid}-`;
  }
};

export const getJobId = (
  spaceId: string,
  logViewId: string,
  idFormat: IdFormat,
  jobType: JobType
) => `${getJobIdPrefix(spaceId, logViewId, idFormat)}${jobType}`;

export const getDatafeedId = (
  spaceId: string,
  logViewId: string,
  idFormat: IdFormat,
  jobType: JobType
) => `datafeed-${getJobId(spaceId, logViewId, idFormat, jobType)}`;

export const datasetFilterRT = rt.union([
  rt.strict({
    type: rt.literal('includeAll'),
  }),
  rt.strict({
    type: rt.literal('includeSome'),
    datasets: rt.array(rt.string),
  }),
]);

export type DatasetFilter = rt.TypeOf<typeof datasetFilterRT>;

export const jobSourceConfigurationRT = rt.partial({
  indexPattern: rt.string,
  timestampField: rt.string,
  bucketSpan: rt.number,
  datasetFilter: datasetFilterRT,
});

export type JobSourceConfiguration = rt.TypeOf<typeof jobSourceConfigurationRT>;

export const jobCustomSettingsRT = rt.partial({
  job_revision: rt.number,
  logs_source_config: jobSourceConfigurationRT,
});

export type JobCustomSettings = rt.TypeOf<typeof jobCustomSettingsRT>;

export const combineDatasetFilters = (
  firstFilter: DatasetFilter,
  secondFilter: DatasetFilter
): DatasetFilter => {
  if (firstFilter.type === 'includeAll' && secondFilter.type === 'includeAll') {
    return {
      type: 'includeAll',
    };
  }

  const includedDatasets = new Set([
    ...(firstFilter.type === 'includeSome' ? firstFilter.datasets : []),
    ...(secondFilter.type === 'includeSome' ? secondFilter.datasets : []),
  ]);

  return {
    type: 'includeSome',
    datasets: [...includedDatasets],
  };
};

export const filterDatasetFilter = (
  datasetFilter: DatasetFilter,
  predicate: (dataset: string) => boolean
): DatasetFilter => {
  if (datasetFilter.type === 'includeAll') {
    return datasetFilter;
  } else {
    const newDatasets = datasetFilter.datasets.filter(predicate);

    if (newDatasets.length > 0) {
      return {
        type: 'includeSome',
        datasets: newDatasets,
      };
    } else {
      return {
        type: 'includeAll',
      };
    }
  }
};
