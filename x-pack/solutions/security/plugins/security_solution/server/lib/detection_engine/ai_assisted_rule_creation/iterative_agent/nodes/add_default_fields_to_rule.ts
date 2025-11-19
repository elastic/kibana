/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { RuleCreationState } from '../state';

export const addDefaultFieldsToRulesNode = ({ model }: { model: InferenceChatModel }) => {
  return async (state: RuleCreationState) => {
    return {
      ...state,
      rule: {
        ...state.rule,
        references: [],
        severity_mapping: [],
        risk_score_mapping: [],
        related_integrations: [],
        required_fields: [],
        actions: [],
        exceptions_list: [],
        false_positives: [],
        threat: [],
        author: [],
        setup: '',
        max_signals: 100,
        risk_score: 21,
        severity: 'low',
      },
    };
  };
};
