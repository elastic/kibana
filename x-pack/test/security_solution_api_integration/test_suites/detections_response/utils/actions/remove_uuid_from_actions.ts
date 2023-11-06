/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction } from '@kbn/security-solution-plugin/common/api/detection_engine';

export const removeUUIDFromActions = (actions: RuleAction[]): RuleAction[] => {
  return actions.map(({ uuid, ...restOfAction }) => ({
    ...restOfAction,
  }));
};
