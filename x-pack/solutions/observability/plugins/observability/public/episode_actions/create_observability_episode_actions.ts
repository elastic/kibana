/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import type { AlertFormatter } from '@kbn/alerts-ui-shared';
import { createAddToCaseAction } from '@kbn/alerting-v2-episodes-ui/actions/add_to_case';
import type { EpisodeAction, EpisodeActionsDeps } from '@kbn/alerting-v2-episodes-ui/actions';
import { createInvestigateEpisodeAction } from './investigate_episode_action';
import { createViewInAppAction } from './view_in_app';

export interface ObservabilityEpisodeActionsCases {
  service: CasesPublicStart;
  kibanaServices: Record<string, unknown>;
}

export interface ObservabilityEpisodeActionsDeps {
  cases: ObservabilityEpisodeActionsCases | undefined;
  getAlertFormatter: (ruleTypeId: string) => AlertFormatter | undefined;
}

export const createObservabilityEpisodeActions = (
  { cases, getAlertFormatter }: ObservabilityEpisodeActionsDeps,
  { rendering, http, notifications }: EpisodeActionsDeps
): EpisodeAction[] => [
  createInvestigateEpisodeAction(),
  createViewInAppAction({ http, notifications, getAlertFormatter }),
  ...(cases
    ? [
        createAddToCaseAction({
          cases: cases.service,
          owner: OBSERVABILITY_OWNER,
          rendering,
          kibanaServices: cases.kibanaServices,
        }),
      ]
    : []),
];
