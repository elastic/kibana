/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  EngineComponentStatus,
  EngineStatus,
  GetEntityStoreStatusResponse,
} from '@kbn/entity-store/common';
import { formatTaskName } from './format';

export const isEngineLoading = (status: EngineStatus | undefined) =>
  status === 'updating' || status === 'installing';

/**
 * Entity Store v2 task components report `status` and `lastError` instead of `health` and
 * `errors`. Maps them to the fields the components table reads.
 */
export const toTableComponent = (component: EngineComponentStatus): EngineComponentStatus => {
  if (component.resource !== 'task' || component.health !== undefined) {
    return component;
  }
  const hasError = component.status === 'error' || Boolean(component.lastError);
  return {
    ...component,
    health: hasError ? 'red' : 'green',
    ...(component.lastError
      ? { errors: [{ title: component.status ?? 'error', message: component.lastError }] }
      : {}),
  };
};

type Engine = GetEntityStoreStatusResponse['engines'][number];

export interface EngineProblem {
  entityType: Engine['type'];
  /** What has the problem: a task name, a resource id, or the engine. */
  source: string;
  message: string;
}

export type OverallHealth = 'healthy' | 'problems' | 'in_progress' | 'stopped';

const sourceOf = ({ resource, id }: EngineComponentStatus) =>
  resource === 'task' ? formatTaskName(id) : id;

/** The reasons an engine needs attention: its own error, failing tasks, and missing resources. */
export const getEngineProblems = (engine: Engine): EngineProblem[] => {
  const entityType = engine.type;
  const engineError = engine.error?.message
    ? [
        {
          entityType,
          source: i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.settings.problems.engineSource',
            { defaultMessage: 'Engine' }
          ),
          message: engine.error.message,
        },
      ]
    : [];

  const componentProblems = (engine.components ?? []).flatMap((component) => {
    if (!component.installed) {
      return [
        {
          entityType,
          source: sourceOf(component),
          message: i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.settings.problems.notInstalled',
            { defaultMessage: 'Not installed' }
          ),
        },
      ];
    }
    const { health, errors } = toTableComponent(component);
    if (health !== 'red' && health !== 'unavailable') {
      return [];
    }
    return [
      {
        entityType,
        source: sourceOf(component),
        message:
          errors?.map(({ message }) => message).find(Boolean) ??
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityStore.settings.problems.unhealthy',
            { defaultMessage: 'Unhealthy' }
          ),
      },
    ];
  });

  return [...engineError, ...componentProblems];
};

/** One answer to "is the Entity Store working?" from every engine's status and components. */
export const getOverallHealth = (
  engines: Engine[]
): { health: OverallHealth; problems: EngineProblem[] } => {
  const problems = engines.flatMap(getEngineProblems);
  const statuses = engines.map(({ status }) => status);
  if (problems.length > 0 || statuses.includes('error')) {
    return { health: 'problems', problems };
  }
  if (statuses.some(isEngineLoading)) {
    return { health: 'in_progress', problems };
  }
  if (statuses.length > 0 && statuses.every((status) => status === 'stopped')) {
    return { health: 'stopped', problems };
  }
  return { health: 'healthy', problems };
};
