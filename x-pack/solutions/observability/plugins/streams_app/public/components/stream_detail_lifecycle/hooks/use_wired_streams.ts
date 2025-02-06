/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import {
  StreamGetResponse,
  WiredStreamDefinition,
  isWiredStreamDefinition,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useKibana } from '../../../hooks/use_kibana';

export const useWiredStreams = ({ definition }: { definition: StreamGetResponse }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal } = useAbortController();
  const [wiredStreams, setWiredStreams] = useState<WiredStreamDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isWiredStreamGetResponse(definition)) {
      setIsLoading(false);
      return;
    }

    streamsRepositoryClient
      .fetch('GET /api/streams', { signal })
      .then((response) => setWiredStreams(response.streams.filter(isWiredStreamDefinition)))
      .finally(() => setIsLoading(false));
  }, [streamsRepositoryClient, definition, signal]);

  return {
    wiredStreams,
    isLoading,
  };
};
