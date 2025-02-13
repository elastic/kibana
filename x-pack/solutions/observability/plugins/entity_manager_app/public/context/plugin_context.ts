/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { EntityClient } from '@kbn/entityManager-plugin/public';

export interface PluginContextValue {
  isDev?: boolean;
  isServerless?: boolean;
  appMountParameters?: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  entityClient: EntityClient;
}

export const PluginContext = createContext<PluginContextValue | null>(null);
