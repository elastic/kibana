/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NBA, NBAAction } from './types';
import { Milestone } from './types';

export const TRIAL_COMPANION_NBA_URL = '/internal/security_solution/trial_companion/nba';
export const TRIAL_COMPANION_NBA_ACTION_URL =
  '/internal/security_solution/trial_companion/nba/action';

const SUFFIX_MESSAGE = 'message';
const SUFFIX_TITLE = 'title';
const SUFFIX_ACTION = 'action';

function translateNBA(milestone: Milestone, message: string, suffix: string) {
  return i18n.translate(`xpack.securitySolution.trialCompanion.nba.m${milestone}.${suffix}`, {
    defaultMessage: message,
  });
}

function toNBA(milestoneId: Milestone, message: string, title: string, actions?: NBAAction[]): NBA {
  const apps: NBAAction[] | undefined = actions?.map((a) => {
    return {
      app: a.app,
      text: translateNBA(milestoneId, a.text, SUFFIX_ACTION),
    } as NBAAction;
  });
  return {
    message: translateNBA(milestoneId, message, SUFFIX_MESSAGE),
    title: translateNBA(milestoneId, title, SUFFIX_TITLE),
    apps,
  } as NBA;
}

const NBA_M1: NBA = toNBA(
  Milestone.M1,
  'Start with quick, low-friction sources; we’ll confirm when data arrives.',
  'Add data from integrations',
  [
    {
      app: '/fleet/policies',
      text: 'Add data from integrations',
    },
  ]
);

const NBA_M2: NBA = toNBA(
  Milestone.M2,
  'Run a few queries and save the view so you can come back fast.',
  'Explore your data',
  [
    {
      app: '/discover#',
      text: 'Go to Discover',
    },
  ]
);

const NBA_M3: NBA = toNBA(
  Milestone.M3,
  'Preview low-noise rules matched to your dataset before enabling.',
  'Preview & enable rules',
  [
    {
      app: '/security/rules/management',
      text: 'View Detection Rules',
    },
  ]
);

const NBA_M4: NBA = toNBA(
  Milestone.M4,
  'Invite a teammate and collaborate on the investigations.',
  'Keep momentum — collaborate',
  [
    {
      app: '/management/security/users',
      text: 'Invite a teammate',
    },
  ]
);

const NBA_M5: NBA = toNBA(
  Milestone.M5,
  'Walk a guided triage with tools like AI Assistant and Attack Discovery.',
  'Investigate your first alert',
  [
    {
      app: '/security/attack_discovery',
      text: 'Try Attack Discovery',
    },
  ]
); // TODO: Try Attack Discovery - it is flayout

const NBA_M6: NBA = toNBA(
  Milestone.M6,
  'Capture findings and next steps to operationalize your trial. Connect ticketing (Jira/ServiceNow).',
  'Create Case',
  [
    {
      app: '/security/cases',
      text: 'Create Case',
    },
  ]
);

const NBA_M7: NBA = toNBA(
  Milestone.M7,
  'Congratulations! You’ve completed all the steps to get started with Security.',
  'You’re all set!'
);

export const ALL_NBA = new Map<Milestone, NBA>([
  [Milestone.M1, NBA_M1],
  [Milestone.M2, NBA_M2],
  [Milestone.M3, NBA_M3],
  [Milestone.M4, NBA_M4],
  [Milestone.M5, NBA_M5],
  [Milestone.M6, NBA_M6],
  [Milestone.M7, NBA_M7],
]);
