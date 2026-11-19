/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AnalyticsActorField,
  AnalyticsActorKind,
  AnalyticsDimensionField,
  AnalyticsDimensionKind,
  AnalyticsMeasureField,
  AnalyticsMeasureKind,
  AnalyticsSourceField,
  AnalyticsSourceFields,
} from '../../common/analytics';
import type { AnalyticsEventSource, AnalyticsUseCaseId } from './types';

/** What a generator needs to know to write queries or panels for one of the user's event sources. */
export interface SourceGeneratorInput {
  source: AnalyticsEventSource;
  /** The use case picked in this browser, when one was. */
  selectedUseCaseId?: AnalyticsUseCaseId;
}

interface UseCaseProfile {
  /** How much each detected part says that a source holds this kind of events. */
  signals: {
    session?: number;
    actors?: Partial<Record<AnalyticsActorKind, number>>;
    measures?: Partial<Record<AnalyticsMeasureKind, number>>;
    dimensions?: Partial<Record<AnalyticsDimensionKind, number>>;
  };
  /** Which candidate to prefer when a source offers several, best first. */
  actorKinds: readonly AnalyticsActorKind[];
  measureKinds: readonly AnalyticsMeasureKind[];
  dimensionKinds: readonly AnalyticsDimensionKind[];
  /** What the use case calls an actor the field names only call a user. */
  userNoun?: AnalyticsActorKind;
}

const USE_CASE_PROFILES: Record<AnalyticsUseCaseId, UseCaseProfile> = {
  clickstream: {
    signals: {
      session: 2,
      actors: { user: 1 },
      dimensions: { campaign: 2, device: 1, product: 1 },
    },
    actorKinds: ['user', 'customer', 'account'],
    measureKinds: ['money', 'duration', 'generic'],
    dimensionKinds: ['campaign', 'device', 'geo', 'product'],
  },
  gaming: {
    signals: { actors: { player: 3 }, dimensions: { game: 3 } },
    actorKinds: ['player', 'user', 'account'],
    measureKinds: ['money', 'generic', 'duration'],
    dimensionKinds: ['game', 'device', 'geo'],
    userNoun: 'player',
  },
  transactions: {
    signals: {
      actors: { customer: 1, account: 1 },
      measures: { money: 1 },
      dimensions: { currency: 2, merchant: 2, paymentMethod: 2, asset: 2, status: 1 },
    },
    actorKinds: ['customer', 'account', 'user'],
    measureKinds: ['money', 'generic', 'duration'],
    dimensionKinds: ['merchant', 'paymentMethod', 'asset', 'geo', 'currency'],
    userNoun: 'customer',
  },
  adtech: {
    signals: { dimensions: { ad: 5, campaign: 1 } },
    actorKinds: ['user', 'device'],
    measureKinds: ['money', 'generic', 'duration'],
    dimensionKinds: ['campaign', 'ad', 'geo', 'device'],
  },
  iot: {
    signals: { actors: { device: 2 }, measures: { generic: 1 }, dimensions: { site: 3 } },
    actorKinds: ['device'],
    measureKinds: ['generic', 'duration', 'money'],
    dimensionKinds: ['site', 'device', 'geo'],
  },
  customerFacing: {
    signals: { dimensions: { tenant: 4 } },
    actorKinds: ['user', 'customer', 'account'],
    measureKinds: ['money', 'duration', 'generic'],
    dimensionKinds: ['tenant', 'segment', 'product'],
  },
};

const USE_CASE_IDS: readonly AnalyticsUseCaseId[] = [
  'clickstream',
  'gaming',
  'transactions',
  'adtech',
  'iot',
  'customerFacing',
];

/** Below this, the detected parts say too little to name a use case. */
const MIN_USE_CASE_SCORE = 3;

const sum = (values: ReadonlyArray<number | undefined>): number =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

const scoreUseCase = (
  { signals }: UseCaseProfile,
  { actors, session, measures, dimensions }: AnalyticsSourceFields
): number => {
  const [actor] = actors;
  const measureKinds = [...new Set(measures.map(({ kind }) => kind))];
  const dimensionKinds = [...new Set(dimensions.map(({ kind }) => kind))];

  return sum([
    session && signals.session,
    actor && signals.actors?.[actor.kind],
    ...measureKinds.map((kind) => signals.measures?.[kind]),
    ...dimensionKinds.map((kind) => signals.dimensions?.[kind]),
  ]);
};

/**
 * The use case a source's fields point to, or undefined when they point nowhere in particular or
 * equally to two.
 */
export const inferSourceUseCase = (
  fields: AnalyticsSourceFields | undefined
): AnalyticsUseCaseId | undefined => {
  if (fields === undefined) {
    return undefined;
  }

  const [best, runnerUp] = USE_CASE_IDS.map((id) => ({
    id,
    score: scoreUseCase(USE_CASE_PROFILES[id], fields),
  })).sort((a, b) => b.score - a.score);

  return best.score < MIN_USE_CASE_SCORE || best.score === runnerUp.score ? undefined : best.id;
};

/** The fields a generator writes queries on, chosen among the detected candidates. */
export interface SourceRoles {
  /** The selected use case, else the one the fields point to. */
  useCaseId?: AnalyticsUseCaseId;
  isUseCaseInferred: boolean;
  action?: AnalyticsSourceField;
  actor?: AnalyticsActorField;
  /** What to call the actor, which a use case can make more specific than the field name does. */
  actorNoun?: AnalyticsActorKind;
  session?: AnalyticsSourceField;
  measure?: AnalyticsMeasureField;
  status?: AnalyticsDimensionField;
  currency?: AnalyticsDimensionField;
  /** Fields to break events down by, best first; the status field is kept apart. */
  dimensions: readonly AnalyticsDimensionField[];
}

const byPreferredKind = <TField extends { kind: string }>(
  fields: readonly TField[],
  preferredKinds: readonly string[] = []
): TField[] => {
  const getPosition = ({ kind }: TField): number =>
    preferredKinds.includes(kind) ? preferredKinds.indexOf(kind) : preferredKinds.length;

  // Array sort is stable, so candidates of equal preference keep the order they were detected in.
  return [...fields].sort((a, b) => getPosition(a) - getPosition(b));
};

/** Picks one field per part, letting the use case break ties between candidates. */
export const resolveSourceRoles = ({
  source: { fields },
  selectedUseCaseId,
}: SourceGeneratorInput): SourceRoles => {
  if (fields === undefined) {
    return { useCaseId: selectedUseCaseId, isUseCaseInferred: false, dimensions: [] };
  }

  const useCaseId = selectedUseCaseId ?? inferSourceUseCase(fields);
  const profile = useCaseId === undefined ? undefined : USE_CASE_PROFILES[useCaseId];
  const [actor] = byPreferredKind(fields.actors, profile?.actorKinds);
  const [measure] = byPreferredKind(fields.measures, profile?.measureKinds);
  const dimensions = byPreferredKind(fields.dimensions, profile?.dimensionKinds);

  return {
    useCaseId,
    isUseCaseInferred: selectedUseCaseId === undefined && useCaseId !== undefined,
    action: fields.action,
    actor,
    actorNoun: actor?.kind === 'user' ? profile?.userNoun ?? 'user' : actor?.kind,
    session: fields.session,
    measure,
    status: dimensions.find(({ kind }) => kind === 'status'),
    currency: dimensions.find(({ kind }) => kind === 'currency'),
    dimensions: dimensions.filter(({ kind }) => kind !== 'status'),
  };
};

export interface ActorNoun {
  singular: string;
  plural: string;
  /** The plural as an ES|QL column name, which is not translated. */
  column: string;
}

export const getActorNoun = (kind: AnalyticsActorKind): ActorNoun => {
  const nouns: Record<AnalyticsActorKind, ActorNoun> = {
    user: {
      singular: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.user', {
        defaultMessage: 'user',
      }),
      plural: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.users', {
        defaultMessage: 'users',
      }),
      column: 'users',
    },
    player: {
      singular: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.player', {
        defaultMessage: 'player',
      }),
      plural: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.players', {
        defaultMessage: 'players',
      }),
      column: 'players',
    },
    customer: {
      singular: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.customer', {
        defaultMessage: 'customer',
      }),
      plural: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.customers', {
        defaultMessage: 'customers',
      }),
      column: 'customers',
    },
    account: {
      singular: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.account', {
        defaultMessage: 'account',
      }),
      plural: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.accounts', {
        defaultMessage: 'accounts',
      }),
      column: 'accounts',
    },
    device: {
      singular: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.device', {
        defaultMessage: 'device',
      }),
      plural: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.devices', {
        defaultMessage: 'devices',
      }),
      column: 'devices',
    },
  };

  return nouns[kind];
};

/** One short line saying what kind of events a source looks like, for when the user chose none. */
export const getInferredUseCaseNote = (useCaseId: AnalyticsUseCaseId): string => {
  const notes: Record<AnalyticsUseCaseId, string> = {
    clickstream: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.looksLikeClickstream', {
      defaultMessage: 'These look like clickstream events, so the questions start there.',
    }),
    gaming: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.looksLikeGaming', {
      defaultMessage: 'These look like game events, so the questions start with players.',
    }),
    transactions: i18n.translate(
      'xpack.searchHomepage.analytics.sourceRoles.looksLikeTransactions',
      { defaultMessage: 'These look like payment events, so the questions start with amounts.' }
    ),
    adtech: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.looksLikeAdtech', {
      defaultMessage: 'These look like ad events, so the questions start with campaigns.',
    }),
    iot: i18n.translate('xpack.searchHomepage.analytics.sourceRoles.looksLikeIot', {
      defaultMessage: 'These look like device readings, so the questions start with measurements.',
    }),
    customerFacing: i18n.translate(
      'xpack.searchHomepage.analytics.sourceRoles.looksLikeCustomerFacing',
      {
        defaultMessage: 'These look like multi-tenant events, so the questions start with tenants.',
      }
    ),
  };

  return notes[useCaseId];
};
