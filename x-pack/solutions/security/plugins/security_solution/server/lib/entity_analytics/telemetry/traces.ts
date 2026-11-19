/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWithActiveSpan } from '@kbn/tracing-utils';
import { trace } from '@opentelemetry/api';

const withEntityAnalyticsSpan = createWithActiveSpan({
  tracer: trace.getTracer('entity_analytics'),
  attributes: { 'plugin.id': 'securitySolution' },
});

type SpanAttributeValue = string | number | boolean;

interface RunWithSpanParams<T> {
  name: string;
  namespace: string;
  attributes?: Record<string, SpanAttributeValue>;
  cb: () => T;
}

interface WrapTaskRunParams<T> {
  spanName: string;
  namespace: string;
  attributes?: Record<string, SpanAttributeValue>;
  run: () => Promise<T>;
}

export const ENTITY_ANALYTICS_SPAN_NAMES = {
  maintainerRun: 'entity_analytics.task.risk_score_maintainer.run',
  phase0LookupBuild: 'entity_analytics.task.risk_score_maintainer.phase0.lookup_build',
  entityTypeRun: 'entity_analytics.task.risk_score_maintainer.entity_type.run',
  stageBase: 'entity_analytics.task.risk_score_maintainer.stage.base',
  stageResolution: 'entity_analytics.task.risk_score_maintainer.stage.resolution',
  stageResetToZero: 'entity_analytics.task.risk_score_maintainer.stage.reset_to_zero',
  riskScoreOndemandCalculate: 'entity_analytics.risk_score.on_demand.calculate',
  watchlistTaskRun: 'entity_analytics.task.watchlist.run',
} as const;

export const runWithSpan = <T>({ name, namespace, attributes = {}, cb }: RunWithSpanParams<T>): T =>
  withEntityAnalyticsSpan(
    name,
    {
      attributes: {
        'entity_analytics.namespace': namespace,
        ...attributes,
      },
    },
    cb
  );

export const wrapTaskRun = <T>({
  spanName,
  namespace,
  attributes = {},
  run,
}: WrapTaskRunParams<T>): Promise<T> =>
  runWithSpan({
    name: spanName,
    namespace,
    attributes,
    cb: run,
  });
