/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { createContext } from 'react';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { UseProcessingSimulatorReturn } from './hooks/use_processing_simulator';

export const context = createContext<SimulatorContextValue | undefined>(undefined);

export interface SimulatorContextValue extends UseProcessingSimulatorReturn {
  definition: IngestStreamGetResponse;
}

export function SimulatorContextProvider({
  processingSimulator,
  definition,

  children,
}: {
  processingSimulator: UseProcessingSimulatorReturn;
  definition: IngestStreamGetResponse;
  children: React.ReactNode;
}) {
  const contextValue = useMemo(() => {
    return {
      definition,
      ...processingSimulator,
    };
  }, [definition, processingSimulator]);
  return <context.Provider value={contextValue}>{children}</context.Provider>;
}

export function useSimulatorContext() {
  const ctx = React.useContext(context);
  if (!ctx) {
    throw new Error(
      'useStreamsEnrichmentContext must be used within a StreamsEnrichmentContextProvider'
    );
  }
  return ctx;
}
