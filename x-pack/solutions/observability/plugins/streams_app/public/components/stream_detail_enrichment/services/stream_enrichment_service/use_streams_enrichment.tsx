/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { createActorContext } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import {
  streamEnrichmentActor,
  createStreamEnrichmentActorImplementations,
} from './stream_enrichment_state_machine';
import {
  StreamEnrichmentEventParams,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';

const consoleInspector = createConsoleInspector();

const StreamEnrichmentContext = createActorContext(streamEnrichmentActor);

export const useStreamsEnrichmentSelector = StreamEnrichmentContext.useSelector;

export type StreamEnrichmentEvents = ReturnType<typeof useStreamEnrichmentEvents>;

export const useStreamEnrichmentEvents = () => {
  const service = StreamEnrichmentContext.useActorRef();

  return useMemo(
    () => ({
      addProcessor: (params: StreamEnrichmentEventParams<'processors.add'>) => {
        service.send({ type: 'processors.add', ...params });
      },
      reorderProcessors: (params: StreamEnrichmentEventParams<'processors.reorder'>) => {
        service.send({ type: 'processors.reorder', ...params });
      },
      resetChanges: () => {
        service.send({ type: 'stream.reset' });
      },
      saveChanges: () => {
        service.send({ type: 'stream.update' });
      },
    }),
    [service]
  );
};

export const StreamEnrichmentContextProvider = ({
  children,
  definition,
  ...deps
}: React.PropsWithChildren<StreamEnrichmentServiceDependencies & StreamEnrichmentInput>) => {
  return (
    <StreamEnrichmentContext.Provider
      logic={streamEnrichmentActor.provide(createStreamEnrichmentActorImplementations(deps))}
      options={{
        inspect: consoleInspector,
        input: {
          definition,
        },
      }}
    >
      <ListenForDefinitionChanges definition={definition}>{children}</ListenForDefinitionChanges>
    </StreamEnrichmentContext.Provider>
  );
};

const ListenForDefinitionChanges = ({
  children,
  definition,
}: React.PropsWithChildren<StreamEnrichmentInput>) => {
  const service = StreamEnrichmentContext.useActorRef();

  useEffect(() => {
    service.send({ type: 'stream.received', definition });
  }, [definition, service]);

  return children;
};
