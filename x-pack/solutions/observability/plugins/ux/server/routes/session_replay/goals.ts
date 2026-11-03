/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  CONVERSION_GOAL_CURRENCY_MAX,
  CONVERSION_GOAL_NAME_MAX,
  type ConversionGoal,
  type ConversionGoalAttributes,
  RUM_CONVERSION_GOAL_SO_TYPE,
  sanitizeConversionGoal,
} from '../../../common/conversion_goal';
import {
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_STEP_LABEL_MAX_LENGTH,
  FUNNEL_STEP_VALUE_MAX_LENGTH,
  type FunnelStepDef,
} from '../../../common/session_funnel';
import { createUxServerRoute } from '../create_ux_server_route';
import { boundedString } from '../rum/query';

const funnelStepCodec = t.intersection([
  t.type({
    type: t.union([t.literal('page'), t.literal('activity')]),
    value: boundedString(FUNNEL_STEP_VALUE_MAX_LENGTH),
  }),
  t.partial({
    label: boundedString(FUNNEL_STEP_LABEL_MAX_LENGTH),
  }),
]);

const funnelStepsCodec = new t.Type<FunnelStepDef[], FunnelStepDef[], unknown>(
  'ConversionGoalSteps',
  (u): u is FunnelStepDef[] => Array.isArray(u) && u.length <= FUNNEL_MAX_STEPS,
  (u, c) => {
    if (!Array.isArray(u) || u.length > FUNNEL_MAX_STEPS) {
      return t.failure(u, c);
    }
    return t.array(funnelStepCodec).validate(u, c);
  },
  t.identity
);

const goalBodyCodec = t.intersection([
  t.type({
    name: boundedString(CONVERSION_GOAL_NAME_MAX),
    steps: funnelStepsCodec,
  }),
  t.partial({
    value: t.number,
    currency: boundedString(CONVERSION_GOAL_CURRENCY_MAX),
  }),
]);

const toGoal = (id: string, attributes: ConversionGoalAttributes): ConversionGoal => {
  const draft = sanitizeConversionGoal(attributes);
  return {
    id,
    ...draft,
    createdAt: attributes.createdAt,
    updatedAt: attributes.updatedAt,
  };
};

const requireRunnableGoal = (input: {
  name?: unknown;
  steps?: unknown;
  value?: unknown;
  currency?: unknown;
}) => {
  const draft = sanitizeConversionGoal(input);
  if (draft.steps.length < FUNNEL_MIN_STEPS) {
    throw new Error(`A conversion goal needs at least ${FUNNEL_MIN_STEPS} steps`);
  }
  return draft;
};

export const listConversionGoalsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/conversion_goals',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<{ goals: ConversionGoal[] }> => {
    const { savedObjects } = await resources.context.core;
    const found = await savedObjects.client.find<ConversionGoalAttributes>({
      type: RUM_CONVERSION_GOAL_SO_TYPE,
      perPage: 50,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });
    return {
      goals: found.saved_objects.map((so) => toGoal(so.id, so.attributes)),
    };
  },
});

export const createConversionGoalRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/conversion_goals',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: goalBodyCodec }),
  handler: async (resources): Promise<ConversionGoal> => {
    const draft = requireRunnableGoal(resources.params.body);
    const now = new Date().toISOString();
    const attributes: ConversionGoalAttributes = {
      ...draft,
      createdAt: now,
      updatedAt: now,
    };
    const { savedObjects } = await resources.context.core;
    const created = await savedObjects.client.create<ConversionGoalAttributes>(
      RUM_CONVERSION_GOAL_SO_TYPE,
      attributes
    );
    return toGoal(created.id, created.attributes);
  },
});

export const updateConversionGoalRoute = createUxServerRoute({
  endpoint: 'PUT /internal/ux/rum/conversion_goals/{id}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ id: boundedString(128) }),
    body: goalBodyCodec,
  }),
  handler: async (resources): Promise<ConversionGoal> => {
    const { id } = resources.params.path;
    const draft = requireRunnableGoal(resources.params.body);
    const { savedObjects } = await resources.context.core;
    const existing = await savedObjects.client.get<ConversionGoalAttributes>(
      RUM_CONVERSION_GOAL_SO_TYPE,
      id
    );
    const attributes: ConversionGoalAttributes = {
      ...existing.attributes,
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    const updated = await savedObjects.client.update<ConversionGoalAttributes>(
      RUM_CONVERSION_GOAL_SO_TYPE,
      id,
      attributes
    );
    return toGoal(id, { ...attributes, ...updated.attributes });
  },
});

export const deleteConversionGoalRoute = createUxServerRoute({
  endpoint: 'DELETE /internal/ux/rum/conversion_goals/{id}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    path: t.type({ id: boundedString(128) }),
  }),
  handler: async (resources): Promise<{ ok: true }> => {
    const { savedObjects } = await resources.context.core;
    await savedObjects.client.delete(RUM_CONVERSION_GOAL_SO_TYPE, resources.params.path.id);
    return { ok: true };
  },
});
