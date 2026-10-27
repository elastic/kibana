/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppUpdater, ChromeStart, PluginInitializerContext } from '@kbn/core/public';
import { catchError, from, map, of, Subscription, type BehaviorSubject } from 'rxjs';
import type { FocusedSignificantEventService } from './chat/focused_significant_event_service';
import type { NightshiftStartDependencies } from './types';

/** Starts focused-event auto-attach and updates app visibility from the detection availability API. */
export const startNightshiftServices = ({
  pluginsStart,
  appUpdater$,
  context,
  chrome,
  focusedSignificantEventService,
}: {
  pluginsStart: NightshiftStartDependencies;
  appUpdater$: BehaviorSubject<AppUpdater>;
  context: PluginInitializerContext;
  chrome: ChromeStart;
  focusedSignificantEventService: FocusedSignificantEventService;
}): Subscription => {
  const subscription = new Subscription();

  // Single source of truth: aggregates rollout flag, project type, pricing tier, license and
  // required plugins. The flag alone would surface the app where the feature cannot run.
  subscription.add(
    from(
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
      .subscribe(appUpdater$)
  );

  const { agentBuilder } = pluginsStart;
  if (agentBuilder) {
    const logger = context.logger.get('nightshiftAgentBuilderAttachments');
    void import('./chat/agent_builder/significant_event_attachments')
      .then(({ registerNightshiftAgentBuilderAttachments }) => {
        const cleanup = registerNightshiftAgentBuilderAttachments({
          agentBuilder,
          chrome,
          share: pluginsStart.share,
          focusedSignificantEventService,
          logger,
        });
        subscription.add(cleanup);
      })
      .catch((error) => {
        logger.error(`Failed to register agent builder attachments: ${error}`);
      });
  }

  return subscription;
};
