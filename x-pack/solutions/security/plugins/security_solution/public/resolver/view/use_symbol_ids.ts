/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

/**
 * Access the HTML IDs for this Resolver's reusable SVG symbols.
 * In the future these IDs may come from an outside provider (and may be shared by multiple Resolver instances.)
 */
export function useSymbolIDs({ id }: { id: string }) {
  return useMemo(() => {
    const prefix = `${id}-symbols`;
    return {
      processNodeLabel: `${prefix}-nodeSymbol`,
      runningProcessCube: `${prefix}-runningCube`,
      runningTriggerCube: `${prefix}-runningTriggerCube`,
      terminatedProcessCube: `${prefix}-terminatedCube`,
      terminatedTriggerCube: `${prefix}-terminatedTriggerCube`,
      processCubeActiveBacking: `${prefix}-activeBacking`,
      loadingCube: `${prefix}-loadingCube`,
      errorCube: `${prefix}-errorCube`,
    };
  }, [id]);
}
