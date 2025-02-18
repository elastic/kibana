/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { createActorContext } from '@xstate5/react';
import {
  streamEnrichmentService,
  createCategorizeLogsServiceImplementations,
} from './stream_enrichment_state_machine';
import { StreamEnrichmentEventParams, StreamEnrichmentServiceDependencies } from './types';

const StreamEnrichmentContext = createActorContext(streamEnrichmentService);

export const StreamEnrichmentContextProvider = ({
  children,
  ...deps
}: React.PropsWithChildren<StreamEnrichmentServiceDependencies>) => {
  return (
    <StreamEnrichmentContext.Provider
      logic={streamEnrichmentService.provide(createCategorizeLogsServiceImplementations(deps))}
    >
      {children}
    </StreamEnrichmentContext.Provider>
  );
};

export const useStreamsEnrichmentEvents = () => {
  const service = StreamEnrichmentContext.useActorRef();

  return useMemo(
    () => ({
      addProcessor: (params: StreamEnrichmentEventParams<'processors.add'>) => {
        service.send({ type: 'processors.add', ...params });
      },
      updateProcessor: (params: StreamEnrichmentEventParams<'processors.update'>) => {
        service.send({ type: 'processors.update', ...params });
      },
      deleteProcessor: (params: StreamEnrichmentEventParams<'processors.delete'>) => {
        service.send({ type: 'processors.delete', ...params });
      },
      reorderProcessors: (params: StreamEnrichmentEventParams<'processors.reorder'>) => {
        service.send({ type: 'processors.reorder', ...params });
      },
      saveChanges: () => {
        service.send({ type: 'stream.update' });
      },
    }),
    [service]
  );
};
