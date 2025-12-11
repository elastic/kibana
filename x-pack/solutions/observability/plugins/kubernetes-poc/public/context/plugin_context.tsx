/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';

export interface PluginContextValue {
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}

export const PluginContext = createContext<PluginContextValue | null>(null);
