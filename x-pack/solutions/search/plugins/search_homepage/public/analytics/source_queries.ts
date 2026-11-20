/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AnalyticsDimensionField, AnalyticsSourceField } from '../../common/analytics';
import { SAMPLE_DATASET_INDEX } from './constants';
import { quoteEsqlColumn, quoteEsqlSource } from './esql_identifiers';
import type { ActorNoun, SourceGeneratorInput, SourceRoles } from './source_field_roles';
import { getActorNoun, resolveSourceRoles } from './source_field_roles';
import type {
  AnalyticsEventSource,
  AnalyticsStarterQuery,
  AnalyticsUseCase,
  AnalyticsUseCaseId,
} from './types';
import { getAnalyticsUseCases } from './use_cases';

const MAX_STARTER_QUERIES = 5;
/** Queries that need no detected field fill the list up to this many. */
const MIN_STARTER_QUERIES = 3;

export type SourceStarterQueryGenerator = (
  input: SourceGeneratorInput
) => readonly AnalyticsStarterQuery[];

/** The use case whose sample data set the source is, when it is one. */
export const getSampleUseCase = ({
  name,
  isSampleData,
}: AnalyticsEventSource): AnalyticsUseCase | undefined =>
  isSampleData
    ? getAnalyticsUseCases().find(
        ({ sampleDataset }) =>
          sampleDataset !== undefined && SAMPLE_DATASET_INDEX[sampleDataset] === name
      )
    : undefined;

/** Whether a measure's own name already says it is a total, as `order total` does. */
export const isNamedTotal = ({ label }: AnalyticsSourceField): boolean => /\btotal\b/.test(label);

/** A measure's label as the end of an ES|QL column name, such as `total_amount`. */
export const getMeasureColumnSuffix = ({ label }: AnalyticsSourceField): string => {
  const suffix = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  return /^[a-z][a-z0-9_]*$/.test(suffix) ? suffix : 'value';
};

interface QueryContext {
  from: string;
  /** Quoted for ES|QL; null when the source has none. */
  timeField: string | null;
  roles: SourceRoles;
  actor?: { field: string; noun: ActorNoun };
  /** The breakdown field this query may use, which differs between queries where it can. */
  dimension?: AnalyticsDimensionField;
}

type QueryTemplate = (context: QueryContext) => AnalyticsStarterQuery | undefined;

type QueryTemplateId =
  | 'funnel'
  | 'activeActors'
  | 'topActions'
  | 'measureByDimension'
  | 'measureOverTime'
  | 'statusShare'
  | 'eventsByDimension'
  | 'mostActiveActors'
  | 'eventsPerActor';

const toEsql = (...commands: string[]): string => commands.join('\n| ');

const hasFunnel = ({ roles: { action, session }, actor }: QueryContext): boolean =>
  action !== undefined && (session !== undefined || actor !== undefined);

const funnel: QueryTemplate = (context) => {
  const {
    from,
    roles: { action, session },
    actor,
  } = context;
  if (action === undefined || !hasFunnel(context)) {
    return undefined;
  }

  const counts = [
    ...(session ? [`sessions = COUNT_DISTINCT(${quoteEsqlColumn(session.name)})`] : []),
    ...(actor ? [`${actor.noun.column} = COUNT_DISTINCT(${actor.field})`] : []),
    'events = COUNT(*)',
  ];
  const reach = session ? 'sessions' : actor?.noun.column ?? 'events';
  const esql = toEsql(
    from,
    `STATS ${counts.join(', ')} BY ${quoteEsqlColumn(action.name)}`,
    `SORT ${reach} DESC`,
    'LIMIT 20'
  );

  if (actor === undefined) {
    return {
      id: 'source_funnel',
      question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.sessionFunnel', {
        defaultMessage: 'How many sessions reach each event?',
      }),
      esql,
    };
  }
  return {
    id: 'source_funnel',
    question: session
      ? i18n.translate('xpack.searchHomepage.analytics.sourceQueries.sessionAndActorFunnel', {
          defaultMessage: 'How many sessions and {actors} reach each event?',
          values: { actors: actor.noun.plural },
        })
      : i18n.translate('xpack.searchHomepage.analytics.sourceQueries.actorFunnel', {
          defaultMessage: 'How many {actors} reach each event?',
          values: { actors: actor.noun.plural },
        }),
    esql,
  };
};

const activeActors: QueryTemplate = ({ from, timeField, roles: { session }, actor }) => {
  if (actor === undefined || timeField === null) {
    return undefined;
  }

  const counts = [
    `active_${actor.noun.column} = COUNT_DISTINCT(${actor.field})`,
    ...(session ? [`sessions = COUNT_DISTINCT(${quoteEsqlColumn(session.name)})`] : []),
    'events = COUNT(*)',
  ];

  return {
    id: 'source_active_actors',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.activeActors', {
      defaultMessage: 'How many {actors} are active each day?',
      values: { actors: actor.noun.plural },
    }),
    esql: toEsql(
      from,
      `STATS ${counts.join(', ')} BY day = BUCKET(${timeField}, 1 day)`,
      'SORT day'
    ),
  };
};

const topActions: QueryTemplate = (context) => {
  const {
    from,
    roles: { action },
  } = context;
  // The funnel already ranks the events, with more to say about each.
  if (action === undefined || hasFunnel(context)) {
    return undefined;
  }

  return {
    id: 'source_top_actions',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.topActions', {
      defaultMessage: 'Which events happen most often?',
    }),
    esql: toEsql(
      from,
      `STATS events = COUNT(*) BY ${quoteEsqlColumn(action.name)}`,
      'SORT events DESC',
      'LIMIT 10'
    ),
  };
};

/** Amounts in different currencies cannot be added up, so the currency joins the grouping. */
const withCurrency = (groups: readonly string[], { measure, currency }: SourceRoles): string => {
  const currencyGroup = currency && quoteEsqlColumn(currency.name);

  return measure?.kind === 'money' && currencyGroup && !groups.includes(currencyGroup)
    ? [...groups, currencyGroup].join(', ')
    : groups.join(', ');
};

const measureByDimension: QueryTemplate = ({ from, roles, dimension }) => {
  const { measure, action } = roles;
  const group = dimension ?? action;
  if (measure === undefined || group === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(measure.name);
  const groupField = quoteEsqlColumn(group.name);
  const suffix = getMeasureColumnSuffix(measure);
  const build = (stats: string, sortColumn: string): string =>
    toEsql(
      from,
      // A descending sort puts nulls first, so groups without a value would lead the ranking.
      `WHERE ${groupField} IS NOT NULL AND ${field} IS NOT NULL`,
      `STATS ${stats} BY ${withCurrency([groupField], roles)}`,
      `SORT ${sortColumn} DESC`,
      'LIMIT 10'
    );

  if (measure.kind === 'money') {
    return {
      id: 'source_measure_by_dimension',
      question: isNamedTotal(measure)
        ? i18n.translate('xpack.searchHomepage.analytics.sourceQueries.namedTotalByDimension', {
            defaultMessage: 'Which {dimension} has the highest {measure}?',
            values: { dimension: group.label, measure: measure.label },
          })
        : i18n.translate('xpack.searchHomepage.analytics.sourceQueries.moneyByDimension', {
            defaultMessage: 'Which {dimension} has the highest total {measure}?',
            values: { dimension: group.label, measure: measure.label },
          }),
      esql: build(
        `total_${suffix} = ROUND(SUM(${field}), 2), average_${suffix} = ROUND(AVG(${field}), 2), events = COUNT(${field})`,
        `total_${suffix}`
      ),
    };
  }
  if (measure.kind === 'duration') {
    return {
      id: 'source_measure_by_dimension',
      question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.durationByDimension', {
        defaultMessage: 'Which {dimension} has the longest {measure}?',
        values: { dimension: group.label, measure: measure.label },
      }),
      esql: build(
        `median_${suffix} = MEDIAN(${field}), p95_${suffix} = PERCENTILE(${field}, 95), events = COUNT(${field})`,
        `p95_${suffix}`
      ),
    };
  }
  return {
    id: 'source_measure_by_dimension',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.valueByDimension', {
      defaultMessage: 'Which {dimension} has the highest average {measure}?',
      values: { dimension: group.label, measure: measure.label },
    }),
    esql: build(
      `average_${suffix} = ROUND(AVG(${field}), 2), lowest_${suffix} = MIN(${field}), highest_${suffix} = MAX(${field})`,
      `average_${suffix}`
    ),
  };
};

const measureOverTime: QueryTemplate = ({ from, timeField, roles }) => {
  const { measure } = roles;
  if (measure === undefined || timeField === null) {
    return undefined;
  }

  const field = quoteEsqlColumn(measure.name);
  const suffix = getMeasureColumnSuffix(measure);

  if (measure.kind === 'money') {
    return {
      id: 'source_measure_over_time',
      question: isNamedTotal(measure)
        ? i18n.translate('xpack.searchHomepage.analytics.sourceQueries.namedTotalOverTime', {
            defaultMessage: 'How does the {measure} change from day to day?',
            values: { measure: measure.label },
          })
        : i18n.translate('xpack.searchHomepage.analytics.sourceQueries.moneyOverTime', {
            defaultMessage: 'How does the total {measure} change from day to day?',
            values: { measure: measure.label },
          }),
      esql: toEsql(
        from,
        `STATS total_${suffix} = ROUND(SUM(${field}), 2), events = COUNT(${field}) BY ${withCurrency(
          [`day = BUCKET(${timeField}, 1 day)`],
          roles
        )}`,
        'SORT day'
      ),
    };
  }
  if (measure.kind === 'duration') {
    return {
      id: 'source_measure_over_time',
      question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.durationOverTime', {
        defaultMessage: 'How does the {measure} change from hour to hour?',
        values: { measure: measure.label },
      }),
      esql: toEsql(
        from,
        `STATS median_${suffix} = MEDIAN(${field}), p95_${suffix} = PERCENTILE(${field}, 95) BY hour = BUCKET(${timeField}, 1 hour)`,
        'SORT hour'
      ),
    };
  }
  return {
    id: 'source_measure_over_time',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.valueOverTime', {
      defaultMessage: 'How does the average {measure} change from hour to hour?',
      values: { measure: measure.label },
    }),
    esql: toEsql(
      from,
      `STATS average_${suffix} = ROUND(AVG(${field}), 2), lowest_${suffix} = MIN(${field}), highest_${suffix} = MAX(${field}) BY hour = BUCKET(${timeField}, 1 hour)`,
      'SORT hour'
    ),
  };
};

const statusShare: QueryTemplate = ({ from, roles: { status } }) => {
  if (status === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(status.name);

  return {
    id: 'source_status_share',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.statusShare', {
      defaultMessage: 'How are events split by {status}?',
      values: { status: status.label },
    }),
    esql: toEsql(
      from,
      `WHERE ${field} IS NOT NULL`,
      `STATS events = COUNT(*) BY ${field}`,
      'INLINE STATS total_events = SUM(events)',
      'EVAL share_pct = ROUND(events * 100.0 / total_events, 1)',
      `KEEP ${field}, events, share_pct`,
      'SORT events DESC',
      'LIMIT 20'
    ),
  };
};

const eventsByDimension: QueryTemplate = ({ from, actor, dimension }) => {
  if (dimension === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(dimension.name);
  const counts = [
    'events = COUNT(*)',
    ...(actor ? [`${actor.noun.column} = COUNT_DISTINCT(${actor.field})`] : []),
  ];

  return {
    id: 'source_events_by_dimension',
    question: actor
      ? i18n.translate('xpack.searchHomepage.analytics.sourceQueries.eventsAndActorsByDimension', {
          defaultMessage: 'Which {dimension} has the most events and {actors}?',
          values: { dimension: dimension.label, actors: actor.noun.plural },
        })
      : i18n.translate('xpack.searchHomepage.analytics.sourceQueries.eventsByDimension', {
          defaultMessage: 'Which {dimension} has the most events?',
          values: { dimension: dimension.label },
        }),
    esql: toEsql(
      from,
      `WHERE ${field} IS NOT NULL`,
      `STATS ${counts.join(', ')} BY ${field}`,
      'SORT events DESC',
      'LIMIT 10'
    ),
  };
};

const mostActiveActors: QueryTemplate = ({ from, timeField, roles: { session }, actor }) => {
  if (actor === undefined) {
    return undefined;
  }

  const counts = [
    'events = COUNT(*)',
    ...(session ? [`sessions = COUNT_DISTINCT(${quoteEsqlColumn(session.name)})`] : []),
    ...(timeField === null ? [] : [`last_seen = MAX(${timeField})`]),
  ];

  return {
    id: 'source_most_active_actors',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.mostActiveActors', {
      defaultMessage: 'Which {actors} generate the most events?',
      values: { actors: actor.noun.plural },
    }),
    esql: toEsql(
      from,
      `STATS ${counts.join(', ')} BY ${actor.field}`,
      'SORT events DESC',
      'LIMIT 10'
    ),
  };
};

const eventsPerActor: QueryTemplate = ({ from, actor }) => {
  if (actor === undefined) {
    return undefined;
  }

  return {
    id: 'source_events_per_actor',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.eventsPerActor', {
      defaultMessage: 'How many events does a typical {actor} generate?',
      values: { actor: actor.noun.singular },
    }),
    esql: toEsql(
      from,
      `STATS events = COUNT(*) BY ${actor.field}`,
      `STATS ${actor.noun.column} = COUNT(*), median_events = MEDIAN(events), p95_events = PERCENTILE(events, 95), most_events = MAX(events)`
    ),
  };
};

const QUERY_TEMPLATES: Record<QueryTemplateId, QueryTemplate> = {
  funnel,
  activeActors,
  topActions,
  measureByDimension,
  measureOverTime,
  statusShare,
  eventsByDimension,
  mostActiveActors,
  eventsPerActor,
};

/** Templates that take the next unused breakdown field. */
const DIMENSION_TEMPLATES: readonly QueryTemplateId[] = ['measureByDimension', 'eventsByDimension'];

const DEFAULT_QUERY_ORDER: readonly QueryTemplateId[] = [
  'funnel',
  'activeActors',
  'topActions',
  'measureByDimension',
  'statusShare',
  'eventsByDimension',
  'measureOverTime',
  'mostActiveActors',
  'eventsPerActor',
];

/** Most insightful first for each use case; a template the fields cannot support is passed over. */
const QUERY_ORDER: Record<AnalyticsUseCaseId, readonly QueryTemplateId[]> = {
  clickstream: DEFAULT_QUERY_ORDER,
  gaming: [
    'activeActors',
    'funnel',
    'eventsByDimension',
    'mostActiveActors',
    'measureByDimension',
    'topActions',
    'eventsPerActor',
    'measureOverTime',
    'statusShare',
  ],
  transactions: [
    'measureByDimension',
    'statusShare',
    'measureOverTime',
    'mostActiveActors',
    'eventsByDimension',
    'funnel',
    'activeActors',
    'topActions',
    'eventsPerActor',
  ],
  adtech: [
    'eventsByDimension',
    'measureByDimension',
    'funnel',
    'topActions',
    'measureOverTime',
    'activeActors',
    'statusShare',
    'mostActiveActors',
    'eventsPerActor',
  ],
  iot: [
    'measureOverTime',
    'measureByDimension',
    'mostActiveActors',
    'statusShare',
    'eventsByDimension',
    'topActions',
    'activeActors',
    'funnel',
    'eventsPerActor',
  ],
  customerFacing: [
    'eventsByDimension',
    'activeActors',
    'funnel',
    'measureByDimension',
    'mostActiveActors',
    'topActions',
    'statusShare',
    'measureOverTime',
    'eventsPerActor',
  ],
};

/** Queries that rely only on the source's name and time field, so they run against any mapping. */
const getGenericQueries = (from: string, timeField: string | null): AnalyticsStarterQuery[] => {
  const eventCount: AnalyticsStarterQuery = {
    id: 'source_event_count',
    question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.eventCount', {
      defaultMessage: 'How many events are there?',
    }),
    esql: toEsql(from, 'STATS events = COUNT(*)'),
  };
  const latestEventsQuestion = i18n.translate(
    'xpack.searchHomepage.analytics.sourceQueries.latestEvents',
    { defaultMessage: 'What do the latest events look like?' }
  );

  if (timeField === null) {
    return [
      {
        id: 'source_latest_events',
        question: latestEventsQuestion,
        esql: toEsql(from, 'LIMIT 100'),
      },
      eventCount,
    ];
  }
  return [
    {
      id: 'source_latest_events',
      question: latestEventsQuestion,
      esql: toEsql(from, `SORT ${timeField} DESC`, 'LIMIT 100'),
    },
    {
      id: 'source_events_over_time',
      question: i18n.translate('xpack.searchHomepage.analytics.sourceQueries.eventsOverTime', {
        defaultMessage: 'How many events arrive over time?',
      }),
      esql: toEsql(
        from,
        `STATS events = COUNT(*) BY hour = BUCKET(${timeField}, 1 hour)`,
        'SORT hour'
      ),
    },
    eventCount,
  ];
};

/**
 * Starter queries written from the parts the source's fields play, most insightful first, with the
 * use case deciding the order and breaking ties between candidate fields.
 */
export const generateSourceStarterQueries: SourceStarterQueryGenerator = (input) => {
  const { source } = input;
  const roles = resolveSourceRoles(input);
  const { actor, actorNoun = 'user', dimensions } = roles;
  const from = `FROM ${quoteEsqlSource(source.name)}`;
  const timeField = source.timeField === null ? null : quoteEsqlColumn(source.timeField);
  const context: QueryContext = {
    from,
    timeField,
    roles,
    actor: actor && { field: quoteEsqlColumn(actor.name), noun: getActorNoun(actorNoun) },
  };
  const order = roles.useCaseId === undefined ? DEFAULT_QUERY_ORDER : QUERY_ORDER[roles.useCaseId];

  const { queries } = order.reduce<{ queries: AnalyticsStarterQuery[]; usedDimensions: number }>(
    (result, id) => {
      const takesDimension = DIMENSION_TEMPLATES.includes(id);
      const dimension = takesDimension
        ? dimensions[result.usedDimensions] ?? dimensions[0]
        : undefined;
      const query = QUERY_TEMPLATES[id]({ ...context, dimension });

      return query === undefined
        ? result
        : {
            queries: [...result.queries, query],
            usedDimensions: result.usedDimensions + (takesDimension ? 1 : 0),
          };
    },
    { queries: [], usedDimensions: 0 }
  );
  const fieldQueries = queries.slice(0, MAX_STARTER_QUERIES);
  const genericQueries = getGenericQueries(from, timeField);

  return [
    ...fieldQueries,
    ...genericQueries.slice(0, Math.max(0, MIN_STARTER_QUERIES - fieldQueries.length)),
  ];
};

/**
 * Starter ES|QL queries for one of the user's event sources; sample data gets its use case's
 * hand-written queries.
 */
export const getSourceStarterQueries = (
  source: AnalyticsEventSource,
  selectedUseCaseId?: AnalyticsUseCaseId
): readonly AnalyticsStarterQuery[] => {
  const sampleUseCase = getSampleUseCase(source);
  if (sampleUseCase) {
    return sampleUseCase.starterQueries;
  }

  // The seam for an LLM-backed generator, which would keep this deterministic one as its fallback.
  const generate: SourceStarterQueryGenerator = generateSourceStarterQueries;

  return generate({ source, selectedUseCaseId });
};
