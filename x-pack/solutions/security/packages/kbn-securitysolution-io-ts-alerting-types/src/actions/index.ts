/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

import * as t from 'io-ts';
import { saved_object_attributes } from '../saved_object_attributes';
import { RuleActionFrequency } from '../frequency';

export type RuleActionGroup = t.TypeOf<typeof RuleActionGroup>;
export const RuleActionGroup = t.string;

export type RuleActionId = t.TypeOf<typeof RuleActionId>;
export const RuleActionId = t.string;

export type RuleActionTypeId = t.TypeOf<typeof RuleActionTypeId>;
export const RuleActionTypeId = t.string;

export type RuleActionUuid = t.TypeOf<typeof RuleActionUuid>;
export const RuleActionUuid = NonEmptyString;

/**
 * Params is an "object", since it is a type of RuleActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/rule.ts
 */
export type RuleActionParams = t.TypeOf<typeof RuleActionParams>;
export const RuleActionParams = saved_object_attributes;

export const RuleActionAlertsFilter = t.partial({
  query: t.union([
    t.undefined,
    t.intersection([
      t.strict({
        kql: t.string,
        filters: t.array(
          t.intersection([
            t.type({
              meta: t.partial({
                alias: t.union([t.string, t.null]),
                disabled: t.boolean,
                negate: t.boolean,
                controlledBy: t.string,
                group: t.string,
                index: t.string,
                isMultiIndex: t.boolean,
                type: t.string,
                key: t.string,
                params: t.any,
                value: t.string,
              }),
            }),
            t.partial({
              $state: t.type({ store: t.any }),
              query: t.record(t.string, t.any),
            }),
          ])
        ),
      }),
      t.partial({ dsl: t.string }),
    ]),
  ]),
  timeframe: t.union([
    t.undefined,
    t.strict({
      timezone: t.string,
      days: t.array(
        t.union([
          t.literal(1),
          t.literal(2),
          t.literal(3),
          t.literal(4),
          t.literal(5),
          t.literal(6),
          t.literal(7),
        ])
      ),
      hours: t.strict({
        start: t.string,
        end: t.string,
      }),
    }),
  ]),
});

export type RuleAction = t.TypeOf<typeof RuleAction>;
export const RuleAction = t.exact(
  t.intersection([
    t.type({
      group: RuleActionGroup,
      id: RuleActionId,
      action_type_id: RuleActionTypeId,
      params: RuleActionParams,
    }),
    t.partial({
      uuid: RuleActionUuid,
      alerts_filter: RuleActionAlertsFilter,
      frequency: RuleActionFrequency,
    }),
  ])
);

export type RuleActionArray = t.TypeOf<typeof RuleActionArray>;
export const RuleActionArray = t.array(RuleAction);

export type RuleActionCamel = t.TypeOf<typeof RuleActionCamel>;
export const RuleActionCamel = t.exact(
  t.intersection([
    t.type({
      group: RuleActionGroup,
      id: RuleActionId,
      actionTypeId: RuleActionTypeId,
      params: RuleActionParams,
    }),
    t.partial({
      uuid: RuleActionUuid,
      alertsFilter: RuleActionAlertsFilter,
      frequency: RuleActionFrequency,
    }),
  ])
);

export type RuleActionArrayCamel = t.TypeOf<typeof RuleActionArrayCamel>;
export const RuleActionArrayCamel = t.array(RuleActionCamel);
