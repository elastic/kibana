/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { GraphNode, MigrateRuleState } from '../../types';
import { CREATE_SEMANTIC_QUERY_PROMPT } from './prompts';
import type { RuleSummaryResponse } from './types';
import { processThreatInfo } from './process_threat_info';

interface GetCreateRuleSummaryNodeParams {
  model: ChatModel;
}

export const getCreateRuleSummaryNode = ({ model }: GetCreateRuleSummaryNodeParams): GraphNode => {
  const jsonParser = new JsonOutputParser();
  const ruleSummaryChain = CREATE_SEMANTIC_QUERY_PROMPT.pipe(model).pipe(jsonParser);
  return async (state) => {
    const query = state.original_rule.query;
    const integrationQuery = (await ruleSummaryChain.invoke({
      title: state.original_rule.title,
      description: state.original_rule.description,
      query,
      mitre_attack_techniques: state.original_rule.annotations?.mitre_attack?.join(',') || '',
    })) as RuleSummaryResponse;

    const updatedState: Partial<MigrateRuleState> = {};
    if (integrationQuery?.keywords) {
      updatedState.keywords = integrationQuery.keywords;
    }

    if (integrationQuery?.mitre_attack) {
      const threat = processThreatInfo(integrationQuery.mitre_attack);
      if (threat) {
        updatedState.elastic_rule = {
          ...updatedState.elastic_rule,
          threat,
        };
      }
    }

    return updatedState;
  };
};
