/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { KubernetesPocPluginStartDeps } from '../types';

export interface PluginContextValue {
  core: CoreStart;
  plugins: KubernetesPocPluginStartDeps;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}

export const PluginContext = createContext<PluginContextValue | null>(null);
