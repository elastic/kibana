/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { AnalyticsDashboardGrid, AnalyticsDimensionField } from '../../common/analytics';
import {
  TIME_BUCKETS,
  TIME_BUCKETS_AS_LABELS,
  TIME_BUCKET_COLUMN,
  layOutDashboardGrids,
} from '../../common/analytics_dashboard_layout';
import { quoteEsqlColumn, quoteEsqlSource } from './esql_identifiers';
import type { ActorNoun, SourceGeneratorInput, SourceRoles } from './source_field_roles';
import { getActorNoun, resolveSourceRoles } from './source_field_roles';
import { getMeasureColumnSuffix, isNamedTotal } from './source_queries';
import type { AnalyticsUseCaseId } from './types';

type DashboardPanels = NonNullable<DashboardLocatorParams['panels']>;
type DashboardPanel = DashboardPanels[number];

/** A panel that still has to be given its place on the dashboard. */
type PanelBuilder = (grid: AnalyticsDashboardGrid) => DashboardPanel;

const MAX_PANELS = 6;
const MAX_METRICS = 3;
const TIME_COLUMN = TIME_BUCKET_COLUMN;

export { TIME_BUCKETS_AS_LABELS };
const TOP_VALUES = 10;

interface PanelContext {
  /** The source's events within the dashboard time range, where the source has a time field. */
  events: string;
  /** Quoted for ES|QL; null when the source has none. */
  timeField: string | null;
  roles: SourceRoles;
  actor?: { name: string; field: string; noun: ActorNoun; column: string };
  /** The breakdown field this panel may use, which differs between panels where it can. */
  dimension?: AnalyticsDimensionField;
}

type PanelTemplate = (context: PanelContext) => PanelBuilder | undefined;

interface ChartSeries {
  column: string;
  label: string;
}

const metricPanel =
  (title: string, query: string, column: string, label: string): PanelBuilder =>
  (grid) => ({
    type: 'vis',
    grid,
    config: {
      type: 'metric',
      title,
      data_source: { type: 'esql', query },
      metrics: [{ type: 'primary', column, label }],
    },
  });

const chartPanel =
  ({
    title,
    type,
    query,
    x,
    y,
    breakdown,
  }: {
    title: string;
    type: 'bar' | 'bar_stacked' | 'bar_horizontal';
    query: string;
    x: string;
    y: ChartSeries[];
    breakdown?: string;
  }): PanelBuilder =>
  (grid) => ({
    type: 'vis',
    grid,
    config: {
      type: 'xy',
      title,
      layers: [
        {
          type,
          data_source: {
            type: 'esql',
            query: x === TIME_COLUMN ? `${query} | ${TIME_BUCKETS_AS_LABELS}` : query,
          },
          x: { column: x },
          y,
          ...(breakdown !== undefined && { breakdown_by: { column: breakdown } }),
        },
      ],
      ...(breakdown !== undefined && { legend: { visibility: 'visible', position: 'right' } }),
    },
  });

const getEventsLabel = (): string =>
  i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.eventsAxis', {
    defaultMessage: 'Events',
  });

/** Says which field a count of distinct values was taken from. */
const getDistinctLabel = (field: string): string =>
  i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.distinctValues', {
    defaultMessage: 'Distinct values of {field}',
    values: { field },
  });

const notNull = (...fields: Array<string | undefined>): string =>
  `WHERE ${fields
    .filter((field) => field !== undefined)
    .map((field) => `${field} IS NOT NULL`)
    .join(' AND ')}`;

const bucket = (timeField: string, buckets: number): string =>
  `${TIME_COLUMN} = BUCKET(${timeField}, ${buckets}, ?_tstart, ?_tend)`;

type MetricTemplateId = 'events' | 'actors' | 'measure' | 'sessions' | 'actionCount';

const METRIC_TEMPLATES: Record<MetricTemplateId, PanelTemplate> = {
  events: ({ events }) =>
    metricPanel(
      i18n.translate('xpack.searchHomepage.analytics.starterDashboard.eventCountTitle', {
        defaultMessage: 'Events',
      }),
      `${events} | STATS events = COUNT(*)`,
      'events',
      i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.allEvents', {
        defaultMessage: 'All events',
      })
    ),
  actors: ({ events, actor }) =>
    actor &&
    metricPanel(
      i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.activeActors', {
        defaultMessage: 'Active {actors}',
        values: { actors: actor.noun.plural },
      }),
      `${events} | STATS active_${actor.noun.column} = COUNT_DISTINCT(${actor.field})`,
      `active_${actor.noun.column}`,
      getDistinctLabel(actor.name)
    ),
  measure: ({ events, roles: { measure, currency } }) => {
    // A total over several currencies would add up unlike amounts.
    if (measure === undefined || (measure.kind === 'money' && currency !== undefined)) {
      return undefined;
    }
    const field = quoteEsqlColumn(measure.name);
    const suffix = getMeasureColumnSuffix(measure);

    if (measure.kind === 'money') {
      return metricPanel(
        isNamedTotal(measure)
          ? i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.namedTotal', {
              defaultMessage: 'Sum of {measure}',
              values: { measure: measure.label },
            })
          : i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.totalMeasure', {
              defaultMessage: 'Total {measure}',
              values: { measure: measure.label },
            }),
        `${events} | STATS total_${suffix} = ROUND(SUM(${field}), 2)`,
        `total_${suffix}`,
        measure.name
      );
    }
    if (measure.kind === 'duration') {
      return metricPanel(
        i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.medianMeasure', {
          defaultMessage: 'Median {measure}',
          values: { measure: measure.label },
        }),
        `${events} | STATS median_${suffix} = MEDIAN(${field})`,
        `median_${suffix}`,
        measure.name
      );
    }
    return metricPanel(
      i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.averageMeasure', {
        defaultMessage: 'Average {measure}',
        values: { measure: measure.label },
      }),
      `${events} | STATS average_${suffix} = ROUND(AVG(${field}), 2)`,
      `average_${suffix}`,
      measure.name
    );
  },
  sessions: ({ events, roles: { session } }) =>
    session &&
    metricPanel(
      i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.sessions', {
        defaultMessage: 'Sessions',
      }),
      `${events} | STATS sessions = COUNT_DISTINCT(${quoteEsqlColumn(session.name)})`,
      'sessions',
      getDistinctLabel(session.name)
    ),
  actionCount: ({ events, roles: { action } }) =>
    action &&
    metricPanel(
      i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.actionCount', {
        defaultMessage: 'Different events',
      }),
      `${events} | STATS different_events = COUNT_DISTINCT(${quoteEsqlColumn(action.name)})`,
      'different_events',
      getDistinctLabel(action.name)
    ),
};

const METRIC_ORDER: readonly MetricTemplateId[] = [
  'events',
  'actors',
  'measure',
  'sessions',
  'actionCount',
];

type ChartTemplateId =
  | 'eventsOverTime'
  | 'actions'
  | 'measureOverTime'
  | 'measureByDimension'
  | 'eventsByDimension'
  | 'status'
  | 'actorsOverTime'
  | 'mostActiveActors';

const eventsOverTime: PanelTemplate = ({ events, timeField, roles: { action } }) => {
  if (timeField === null) {
    return undefined;
  }
  if (action === undefined) {
    return chartPanel({
      title: i18n.translate('xpack.searchHomepage.analytics.starterDashboard.eventsOverTimeTitle', {
        defaultMessage: 'Events over time',
      }),
      type: 'bar',
      query: `${events} | STATS events = COUNT(*) BY ${bucket(timeField, TIME_BUCKETS)}`,
      x: TIME_COLUMN,
      y: [{ column: 'events', label: getEventsLabel() }],
    });
  }

  const field = quoteEsqlColumn(action.name);

  return chartPanel({
    title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.eventsOverTimeByAction', {
      defaultMessage: 'Events over time by {action}',
      values: { action: action.label },
    }),
    type: 'bar_stacked',
    query: `${events} | WHERE ${field} IS NOT NULL | STATS events = COUNT(*) BY ${bucket(
      timeField,
      TIME_BUCKETS
    )}, ${field}`,
    x: TIME_COLUMN,
    y: [{ column: 'events', label: getEventsLabel() }],
    breakdown: action.name,
  });
};

const actions: PanelTemplate = ({ events, roles: { action, session }, actor }) => {
  if (action === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(action.name);
  const build = (title: string, column: string, count: string, label: string): PanelBuilder =>
    chartPanel({
      title,
      type: 'bar_horizontal',
      query: `${events} | WHERE ${field} IS NOT NULL | STATS ${column} = ${count} BY ${field} | SORT ${column} DESC | LIMIT ${TOP_VALUES}`,
      x: action.name,
      y: [{ column, label }],
    });

  if (session) {
    const title = i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.sessionFunnel', {
      defaultMessage: 'Sessions reaching each event',
    });
    const label = i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.sessions', {
      defaultMessage: 'Sessions',
    });
    return build(title, 'sessions', `COUNT_DISTINCT(${quoteEsqlColumn(session.name)})`, label);
  }
  if (actor) {
    const title = i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.actorFunnel', {
      defaultMessage: 'How many {actors} reach each event',
      values: { actors: actor.noun.plural },
    });
    return build(title, actor.noun.column, `COUNT_DISTINCT(${actor.field})`, actor.noun.plural);
  }
  return build(
    i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.topActions', {
      defaultMessage: 'Most common events',
    }),
    'events',
    'COUNT(*)',
    getEventsLabel()
  );
};

/** The currency to keep amounts apart by, unless the panel already groups on it. */
const getCurrencySplit = (
  { measure, currency }: SourceRoles,
  group?: AnalyticsDimensionField
): string | undefined =>
  measure?.kind === 'money' && currency !== undefined && currency.name !== group?.name
    ? currency.name
    : undefined;

const measureOverTime: PanelTemplate = ({ events, timeField, roles }) => {
  const { measure } = roles;
  if (measure === undefined || timeField === null) {
    return undefined;
  }

  const field = quoteEsqlColumn(measure.name);
  const suffix = getMeasureColumnSuffix(measure);

  if (measure.kind === 'money') {
    const currency = getCurrencySplit(roles);
    const currencyField = currency === undefined ? undefined : quoteEsqlColumn(currency);
    const groups = [
      bucket(timeField, TIME_BUCKETS),
      ...(currencyField === undefined ? [] : [currencyField]),
    ];
    const title = isNamedTotal(measure)
      ? i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.namedTotalOverTime', {
          defaultMessage: 'Sum of {measure} over time',
          values: { measure: measure.label },
        })
      : i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.moneyOverTime', {
          defaultMessage: 'Total {measure} over time',
          values: { measure: measure.label },
        });

    return chartPanel({
      title,
      type: 'bar_stacked',
      query: `${events} | ${notNull(
        field,
        currencyField
      )} | STATS total_${suffix} = ROUND(SUM(${field}), 2) BY ${groups.join(', ')}`,
      x: TIME_COLUMN,
      y: [{ column: `total_${suffix}`, label: title }],
      breakdown: currency,
    });
  }
  if (measure.kind === 'duration') {
    return chartPanel({
      title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.durationOverTime', {
        defaultMessage: 'Median and 95th percentile {measure} over time',
        values: { measure: measure.label },
      }),
      type: 'bar',
      query: `${events} | ${notNull(
        field
      )} | STATS median_${suffix} = MEDIAN(${field}), p95_${suffix} = PERCENTILE(${field}, 95) BY ${bucket(
        timeField,
        TIME_BUCKETS
      )}`,
      x: TIME_COLUMN,
      y: [
        {
          column: `median_${suffix}`,
          label: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.median', {
            defaultMessage: 'Median',
          }),
        },
        {
          column: `p95_${suffix}`,
          label: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.p95', {
            defaultMessage: '95th percentile',
          }),
        },
      ],
    });
  }

  const title = i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.valueOverTime', {
    defaultMessage: 'Average {measure} over time',
    values: { measure: measure.label },
  });

  return chartPanel({
    title,
    type: 'bar',
    query: `${events} | ${notNull(
      field
    )} | STATS average_${suffix} = ROUND(AVG(${field}), 2) BY ${bucket(timeField, TIME_BUCKETS)}`,
    x: TIME_COLUMN,
    y: [{ column: `average_${suffix}`, label: title }],
  });
};

const measureByDimension: PanelTemplate = ({ events, roles, dimension }) => {
  const { measure, action } = roles;
  const group = dimension ?? action;
  if (measure === undefined || group === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(measure.name);
  const groupField = quoteEsqlColumn(group.name);
  const suffix = getMeasureColumnSuffix(measure);
  const currency = getCurrencySplit(roles, dimension);
  const currencyField = currency === undefined ? undefined : quoteEsqlColumn(currency);
  const groups = [groupField, ...(currencyField === undefined ? [] : [currencyField])];
  const build = (title: string, column: string, aggregation: string): PanelBuilder =>
    chartPanel({
      title,
      type: 'bar_horizontal',
      query: `${events} | ${notNull(
        groupField,
        field,
        currencyField
      )} | STATS ${column} = ${aggregation} BY ${groups.join(
        ', '
      )} | SORT ${column} DESC | LIMIT ${TOP_VALUES}`,
      x: group.name,
      y: [{ column, label: title }],
      breakdown: currency,
    });

  if (measure.kind === 'money') {
    return build(
      isNamedTotal(measure)
        ? i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.namedTotalByDimension', {
            defaultMessage: 'Sum of {measure} by {dimension}',
            values: { measure: measure.label, dimension: group.label },
          })
        : i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.moneyByDimension', {
            defaultMessage: 'Total {measure} by {dimension}',
            values: { measure: measure.label, dimension: group.label },
          }),
      `total_${suffix}`,
      `ROUND(SUM(${field}), 2)`
    );
  }
  if (measure.kind === 'duration') {
    return build(
      i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.durationByDimension', {
        defaultMessage: '95th percentile {measure} by {dimension}',
        values: { measure: measure.label, dimension: group.label },
      }),
      `p95_${suffix}`,
      `PERCENTILE(${field}, 95)`
    );
  }
  return build(
    i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.valueByDimension', {
      defaultMessage: 'Average {measure} by {dimension}',
      values: { measure: measure.label, dimension: group.label },
    }),
    `average_${suffix}`,
    `ROUND(AVG(${field}), 2)`
  );
};

const eventsByDimension: PanelTemplate = ({ events, dimension }) => {
  if (dimension === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(dimension.name);

  return chartPanel({
    title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.eventsByDimension', {
      defaultMessage: 'Events by {dimension}',
      values: { dimension: dimension.label },
    }),
    type: 'bar_horizontal',
    query: `${events} | WHERE ${field} IS NOT NULL | STATS events = COUNT(*) BY ${field} | SORT events DESC | LIMIT ${TOP_VALUES}`,
    x: dimension.name,
    y: [{ column: 'events', label: getEventsLabel() }],
  });
};

const status: PanelTemplate = ({ events, timeField, roles }) => {
  if (roles.status === undefined) {
    return undefined;
  }

  const field = quoteEsqlColumn(roles.status.name);

  if (timeField === null) {
    return chartPanel({
      title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.eventsByStatus', {
        defaultMessage: 'Events by {status}',
        values: { status: roles.status.label },
      }),
      type: 'bar_horizontal',
      query: `${events} | WHERE ${field} IS NOT NULL | STATS events = COUNT(*) BY ${field} | SORT events DESC | LIMIT ${TOP_VALUES}`,
      x: roles.status.name,
      y: [{ column: 'events', label: getEventsLabel() }],
    });
  }
  return chartPanel({
    title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.statusOverTime', {
      defaultMessage: 'Events over time by {status}',
      values: { status: roles.status.label },
    }),
    type: 'bar_stacked',
    query: `${events} | WHERE ${field} IS NOT NULL | STATS events = COUNT(*) BY ${bucket(
      timeField,
      TIME_BUCKETS
    )}, ${field}`,
    x: TIME_COLUMN,
    y: [{ column: 'events', label: getEventsLabel() }],
    breakdown: roles.status.name,
  });
};

const actorsOverTime: PanelTemplate = ({ events, timeField, actor }) => {
  if (actor === undefined || timeField === null) {
    return undefined;
  }

  const title = i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.actorsOverTime', {
    defaultMessage: 'Active {actors} over time',
    values: { actors: actor.noun.plural },
  });

  return chartPanel({
    title,
    type: 'bar',
    query: `${events} | STATS active_${actor.noun.column} = COUNT_DISTINCT(${
      actor.field
    }) BY ${bucket(timeField, TIME_BUCKETS)}`,
    x: TIME_COLUMN,
    y: [{ column: `active_${actor.noun.column}`, label: title }],
  });
};

const mostActiveActors: PanelTemplate = ({ events, actor }) =>
  actor &&
  chartPanel({
    title: i18n.translate('xpack.searchHomepage.analytics.sourceDashboard.mostActiveActors', {
      defaultMessage: 'Most active {actors}',
      values: { actors: actor.noun.plural },
    }),
    type: 'bar_horizontal',
    // An identifier can be a number, which a bar chart would lay out as a scale.
    query: `${events} | STATS events = COUNT(*) BY ${actor.column} = TO_STRING(${actor.field}) | SORT events DESC | LIMIT ${TOP_VALUES}`,
    x: actor.column,
    y: [{ column: 'events', label: getEventsLabel() }],
  });

const CHART_TEMPLATES: Record<ChartTemplateId, PanelTemplate> = {
  eventsOverTime,
  actions,
  measureOverTime,
  measureByDimension,
  eventsByDimension,
  status,
  actorsOverTime,
  mostActiveActors,
};

/** Templates that take the next unused breakdown field. */
const DIMENSION_TEMPLATES: readonly ChartTemplateId[] = ['measureByDimension', 'eventsByDimension'];

const DEFAULT_CHART_ORDER: readonly ChartTemplateId[] = [
  'eventsOverTime',
  'actions',
  'measureByDimension',
  'eventsByDimension',
  'measureOverTime',
  'status',
  'actorsOverTime',
  'mostActiveActors',
];

/** Most telling first for each use case; a template the fields cannot support is passed over. */
const CHART_ORDER: Record<AnalyticsUseCaseId, readonly ChartTemplateId[]> = {
  clickstream: DEFAULT_CHART_ORDER,
  gaming: [
    'actorsOverTime',
    'actions',
    'eventsByDimension',
    'eventsOverTime',
    'measureByDimension',
    'mostActiveActors',
    'measureOverTime',
    'status',
  ],
  transactions: [
    'measureOverTime',
    'status',
    'measureByDimension',
    'eventsByDimension',
    'eventsOverTime',
    'actions',
    'mostActiveActors',
    'actorsOverTime',
  ],
  adtech: [
    'eventsOverTime',
    'eventsByDimension',
    'measureByDimension',
    'actions',
    'measureOverTime',
    'status',
    'actorsOverTime',
    'mostActiveActors',
  ],
  iot: [
    'measureOverTime',
    'measureByDimension',
    'eventsOverTime',
    'mostActiveActors',
    'status',
    'eventsByDimension',
    'actions',
    'actorsOverTime',
  ],
  customerFacing: [
    'eventsByDimension',
    'eventsOverTime',
    'actorsOverTime',
    'actions',
    'measureByDimension',
    'mostActiveActors',
    'measureOverTime',
    'status',
  ],
};

const isBuilder = (builder: PanelBuilder | undefined): builder is PanelBuilder =>
  builder !== undefined;

const layOut = (
  metrics: readonly PanelBuilder[],
  charts: readonly PanelBuilder[]
): DashboardPanels => {
  const grids = layOutDashboardGrids(metrics.length, charts.length);

  return [
    ...metrics.map((build, index) => build(grids.metrics[index])),
    ...charts.map((build, index) => build(grids.charts[index])),
  ];
};

/**
 * ES|QL panels over one of the user's event sources, written from the parts its fields play: up to
 * three metrics and the charts the use case finds most telling. Every panel follows the time picker
 * when the source has a time field.
 */
export const buildSourceDashboardPanels = (input: SourceGeneratorInput): DashboardPanels => {
  const { source } = input;
  const roles = resolveSourceRoles(input);
  const { actor, actorNoun = 'user', dimensions } = roles;
  const timeField = source.timeField === null ? null : quoteEsqlColumn(source.timeField);
  const context: PanelContext = {
    events:
      timeField === null
        ? `FROM ${quoteEsqlSource(source.name)}`
        : `FROM ${quoteEsqlSource(
            source.name
          )} | WHERE ${timeField} >= ?_tstart AND ${timeField} <= ?_tend`,
    timeField,
    roles,
    actor: actor && {
      name: actor.name,
      field: quoteEsqlColumn(actor.name),
      noun: getActorNoun(actorNoun),
      column: actorNoun,
    },
  };

  const metrics = METRIC_ORDER.map((id) => METRIC_TEMPLATES[id](context))
    .filter(isBuilder)
    .slice(0, MAX_METRICS);
  const order = roles.useCaseId === undefined ? DEFAULT_CHART_ORDER : CHART_ORDER[roles.useCaseId];
  const { charts } = order.reduce<{ charts: PanelBuilder[]; usedDimensions: number }>(
    (result, id) => {
      const takesDimension = DIMENSION_TEMPLATES.includes(id);
      const dimension = takesDimension
        ? dimensions[result.usedDimensions] ?? dimensions[0]
        : undefined;
      const chart = CHART_TEMPLATES[id]({ ...context, dimension });

      return chart === undefined
        ? result
        : {
            charts: [...result.charts, chart],
            usedDimensions: result.usedDimensions + (takesDimension ? 1 : 0),
          };
    },
    { charts: [], usedDimensions: 0 }
  );

  return layOut(metrics, charts.slice(0, MAX_PANELS - metrics.length));
};
