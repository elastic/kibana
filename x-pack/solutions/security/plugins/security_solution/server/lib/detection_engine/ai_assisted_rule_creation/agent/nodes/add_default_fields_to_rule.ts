/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { RuleCreationState } from '../state';

export const addDefaultFieldsToRulesNode = ({
  model,
  events,
}: {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}) => {
  return async (state: RuleCreationState) => {
    events?.reportProgress('Adding default fields to rule...');

    const updatedState = {
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
        author: [],
        setup: '',
        max_signals: 100,
        risk_score: 21,
        severity: 'low',
      },
    };

    events?.reportProgress('Default fields added to rule');

    return updatedState;
  };
};
