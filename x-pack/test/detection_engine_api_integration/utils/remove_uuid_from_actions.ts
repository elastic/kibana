/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionArray } from '@kbn/securitysolution-io-ts-alerting-types';

export const removeUUIDFromActions = (actions: RuleActionArray): RuleActionArray => {
  return actions.map(({ uuid, ...restOfAction }) => ({
    ...restOfAction,
  }));
};
