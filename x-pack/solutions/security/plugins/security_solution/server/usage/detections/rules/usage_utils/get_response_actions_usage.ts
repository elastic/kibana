/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSearchResult } from '../../../types';

export const getResponseActionsUsage = (
  ruleAttributes: RuleSearchResult
): {
  hasResponseActions: boolean;
  hasResponseActionsEndpoint: boolean;
  hasResponseActionsOsquery: boolean;
} => {
  if (
    ruleAttributes.params.responseActions == null ||
    ruleAttributes.params.responseActions.length === 0
  ) {
    return {
      hasResponseActions: false,
      hasResponseActionsEndpoint: false,
      hasResponseActionsOsquery: false,
    };
  }

  switch (ruleAttributes.params.type) {
    case 'threshold':
    case 'query':
    case 'saved_query':
    case 'new_terms':
    case 'threat_match':
    case 'machine_learning':
    case 'esql':
    case 'eql':
      return {
        hasResponseActions: !!ruleAttributes.params.responseActions,
        hasResponseActionsEndpoint: !!ruleAttributes.params.responseActions?.some(
          (action) => action.actionTypeId === '.endpoint'
        ),
        hasResponseActionsOsquery: !!ruleAttributes.params.responseActions?.some(
          (action) => action.actionTypeId === '.osquery'
        ),
      };
    default:
      return {
        hasResponseActions: false,
        hasResponseActionsEndpoint: false,
        hasResponseActionsOsquery: false,
      };
  }
};
