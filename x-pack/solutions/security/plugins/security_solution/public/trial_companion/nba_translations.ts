/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features';
import { ProductFeatureKey } from '@kbn/security-solution-features/src/product_features_keys';
import { Milestone } from '../../common/trial_companion/types';

export interface NBAAction {
  app: string;
  text: string;
}

export interface NBA {
  message: string;
  title: string;
  apps: NBAAction[];
}

export interface NBATODOItem {
  milestoneId: Milestone;
  translate: NBA;
  features?: ProductFeatureKeyType[];
}
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
      app: '/integrations',
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
);

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

// keep consistent with createTrialCompanionMilestoneServiceDeps from x-pack/solutions/security/plugins/security_solution/server/lib/trial_companion/services/trial_companion_milestone_service.ts:49
export const NBA_TODO_LIST: NBATODOItem[] = [
  { milestoneId: Milestone.M1, translate: NBA_M1 },
  { milestoneId: Milestone.M2, translate: NBA_M2 },
  { milestoneId: Milestone.M3, translate: NBA_M3, features: [ProductFeatureKey.detections] },
  {
    milestoneId: Milestone.M5,
    translate: NBA_M5,
    features: [ProductFeatureKey.attackDiscovery, ProductFeatureKey.assistant],
  },
  { milestoneId: Milestone.M6, translate: NBA_M6 },
];
