/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppUpdater, PluginInitializerContext } from '@kbn/core/public';
import { catchError, from, map, of } from 'rxjs';
import type { BehaviorSubject, Subscription } from 'rxjs';
import type { NightshiftStartDependencies } from './types';

/** Registers optional attachments and updates app visibility from the detection availability API. */
export const startNightshiftServices = ({
  pluginsStart,
  appUpdater$,
  context,
}: {
  pluginsStart: NightshiftStartDependencies;
  appUpdater$: BehaviorSubject<AppUpdater>;
  context: PluginInitializerContext;
}): Subscription => {
  const { agentBuilder } = pluginsStart;
  if (agentBuilder) {
    void import('./chat/agent_builder/significant_event_attachments')
      .then(({ registerNightshiftAgentBuilderAttachments }) => {
        registerNightshiftAgentBuilderAttachments({ agentBuilder });
      })
      .catch((error) => {
        context.logger
          .get('nightshiftAgentBuilderAttachments')
          .error(`Failed to register agent builder attachments: ${error}`);
      });
  }

  // Single source of truth: aggregates rollout flag, project type, pricing tier, license and
  // required plugins. The flag alone would surface the app where the feature cannot run.
  return from(
    pluginsStart.significantEvents.significantEventsRepositoryClient.fetch(
      'GET /internal/significant_events/availability',
      { signal: null }
    )
  )
    .pipe(
      map(({ available }) => available),
      catchError((error) => {
        context.logger
          .get('nightshiftAvailability')
          .error(`Failed to fetch Significant Events availability: ${error}`);
        return of(false);
      }),
      map(
        (isAvailable): AppUpdater =>
          (app) => ({
            visibleIn: isAvailable ? ['globalSearch', 'projectSideNav'] : [],
            deepLinks: (app.deepLinks ?? []).map((link) => ({
              ...link,
              visibleIn: isAvailable ? ['globalSearch'] : [],
            })),
          })
      )
    )
    .subscribe(appUpdater$);
};
