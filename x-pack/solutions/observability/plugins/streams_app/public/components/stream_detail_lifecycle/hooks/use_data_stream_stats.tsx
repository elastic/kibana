/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useMemo } from 'react';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';

export type DataStreamStats = DataStreamStatServiceResponse['dataStreamsStats'][number] & {
  bytesPerDoc: number;
  bytesPerDay: number;
};

export const useDataStreamStats = ({ definition }: { definition?: IngestStreamGetResponse }) => {
  const {
    services: { dataStreamsClient },
  } = useKibana();

  const statsFetch = useStreamsAppFetch(async () => {
    if (!definition) {
      return;
    }

    const client = await dataStreamsClient;
    return client.getDataStreamsStats({
      datasetQuery: definition.stream.name,
      includeCreationDate: true,
    });
  }, [dataStreamsClient, definition]);

  const stats = useMemo<DataStreamStats | undefined>(() => {
    const dsStats = statsFetch.value?.dataStreamsStats[0];
    if (!dsStats || !dsStats.creationDate || !dsStats.sizeBytes) {
      return undefined;
    }
    const daysSinceCreation = Math.max(
      1,
      Math.round(moment().diff(moment(dsStats.creationDate), 'days'))
    );

    return {
      ...dsStats,
      bytesPerDay: dsStats.sizeBytes / daysSinceCreation,
      bytesPerDoc: dsStats.totalDocs ? dsStats.sizeBytes / dsStats.totalDocs : 0,
    };
  }, [statsFetch.value]);

  return {
    stats,
    isLoading: statsFetch.loading,
    refresh: statsFetch.refresh,
  };
};
