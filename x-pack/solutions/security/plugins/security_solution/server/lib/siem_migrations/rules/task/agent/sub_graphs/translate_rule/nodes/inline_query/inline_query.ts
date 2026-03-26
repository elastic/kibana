/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getInlineSplQuery,
  type GetInlineSplQueryParams,
} from '../../../../../../../common/task/agent/helpers/inline_spl_query';
import { OriginalRuleVendorEnum } from '../../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { GraphNode } from '../../types';

export const getInlineQueryNode = (params: GetInlineSplQueryParams): GraphNode => {
  const inlineSplQuery = getInlineSplQuery(params);
  return async (state) => {
    if (state.original_rule.vendor !== OriginalRuleVendorEnum.splunk) {
      // We only support inlining SPL queries, if the original rule is not a Splunk rule, we return the original query without inlining and add a comment about it.
      return {
        inline_query: undefined,
      };
    }
    const { inlineQuery, isUnsupported, comments } = await inlineSplQuery({
      query: state.original_rule.query,
      resources: state.resources,
    });
    if (isUnsupported) {
      // Graph conditional edge detects undefined inline_query as unsupported query
      return { inline_query: undefined, comments };
    }
    return {
      inline_query: inlineQuery ?? state.original_rule.query,
      comments,
    };
  };
};
