/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext, type RefObject } from 'react';

export interface GraphFullscreenContextValue {
  isFullscreen: boolean;
  overlayContainerRef: RefObject<HTMLDivElement | null>;
}

export const GraphFullscreenContext = createContext<GraphFullscreenContextValue | null>(null);

export const useGraphFullscreenContext = (): GraphFullscreenContextValue | null =>
  useContext(GraphFullscreenContext);
