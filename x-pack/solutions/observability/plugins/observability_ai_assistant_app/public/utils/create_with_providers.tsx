/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ObservabilityAIAssistantService } from '@kbn/observability-ai-assistant-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { SharedProviders } from './shared_providers';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';

export type WithProviders = <P extends {}, R = {}>(
  Component: React.ComponentType<P>
) => React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>;

export function createWithProviders({
  coreStart,
  pluginsStart,
  service,
}: {
  coreStart: CoreStart;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
  service: ObservabilityAIAssistantService;
}): WithProviders {
  const withProviders = <P extends {}, R = {}>(Component: React.ComponentType<P>) =>
    React.forwardRef((props: P, ref: React.Ref<R>) => (
      <SharedProviders
        coreStart={coreStart}
        pluginsStart={pluginsStart}
        service={service}
        theme$={coreStart.theme.theme$}
      >
        <Component {...props} ref={ref} />
      </SharedProviders>
    ));

  return withProviders;
}
