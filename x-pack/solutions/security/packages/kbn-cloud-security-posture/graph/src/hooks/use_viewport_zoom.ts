/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStore } from '@xyflow/react';

/** Current React Flow viewport zoom level (1 = 100%). */
export const useViewportZoom = (): number => useStore((state) => state.transform[2] ?? 1);
