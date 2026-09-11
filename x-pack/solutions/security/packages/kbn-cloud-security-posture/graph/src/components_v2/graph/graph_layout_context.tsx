/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

interface GraphLayoutContextValue {
  /**
   * When true, outgoing stepped edges share one vertical riser next to the source
   * so sibling connections coincide. Disabled after the user drags nodes.
   */
  useBundledEdgeRouting: boolean;
}

const GraphLayoutContext = createContext<GraphLayoutContextValue>({
  useBundledEdgeRouting: true,
});

export const GraphLayoutProvider = GraphLayoutContext.Provider;

export const useGraphLayoutContext = (): GraphLayoutContextValue => useContext(GraphLayoutContext);
