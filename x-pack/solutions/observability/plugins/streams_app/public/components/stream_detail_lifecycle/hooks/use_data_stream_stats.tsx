/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useMemo } from 'react';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';

export const useDataStreamStats = ({ definition }: { definition?: IngestStreamGetResponse }) => {
  const {
    services: { dataStreamsClient },
  } = useKibana();

  const result = useStreamsAppFetch(() => {
    if (!definition) {
      return;
    }

    return dataStreamsClient.then((client) =>
      client.getDataStreamsStats({ types: [], datasetQuery: definition.stream.name })
    );
  }, [dataStreamsClient, definition]);

  const stats = useMemo(() => {
    const stats = result.value?.dataStreamsStats[0];
    if (!stats || !stats.creationDate || !stats.sizeBytes) {
      return undefined;
    }
    const daysSinceCreation = Math.max(
      1,
      Math.ceil(moment.duration(moment().diff(moment(stats.creationDate))).asDays())
    );

    return {
      ...result.value?.dataStreamsStats[0],
      bytesPerDay: stats.sizeBytes / daysSinceCreation,
      bytesPerDoc: stats.totalDocs ? stats.sizeBytes / stats.totalDocs : 0,
    };
  }, [result.value]);

  return {
    stats,
    isLoading: result.loading,
  };
};
