/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import dedent from 'dedent';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { useFetchQueryRuleset } from './use_fetch_query_ruleset';
import { useKibana } from './use_kibana';
export interface UseRunQueryRulesetProps {
  rulesetId: string;
  type?: 'link' | 'button' | 'emptyButton' | 'contextMenuItem';
  content?: string;
}

export const UseRunQueryRuleset = ({
  rulesetId,
  type = 'emptyButton',
  content,
}: UseRunQueryRulesetProps) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const { data: queryRulesetData } = useFetchQueryRuleset(rulesetId);

  // Loop through all actions children to gather unique _index values
  const indices: Set<string> = new Set();
  if (queryRulesetData?.rules) {
    for (const rule of queryRulesetData.rules) {
      if (rule.actions?.docs) {
        for (const doc of rule.actions.docs) {
          if (doc._index) {
            indices.add(doc._index);
          }
        }
      }
    }
  }

  // Use the found indices or default to 'my_index'
  const indecesRuleset = indices.size > 0 ? Array.from(indices).join(',') : 'my_index';

  // Extract match criteria metadata and values from the ruleset
  const criteriaData = [];
  if (queryRulesetData?.rules) {
    for (const rule of queryRulesetData.rules) {
      if (rule.criteria) {
        // Handle both single criterion and array of criteria
        const criteriaArray = Array.isArray(rule.criteria) ? rule.criteria : [rule.criteria];
        for (const criterion of criteriaArray) {
          if (
            criterion.values &&
            typeof criterion.values === 'object' &&
            !Array.isArray(criterion.values)
          ) {
            // Handle nested values inside criterion.values
            Object.entries(criterion.values).forEach(([key, value]) => {
              criteriaData.push({
                metadata: key,
                values: value,
              });
            });
          } else {
            criteriaData.push({
              metadata: criterion.metadata || null,
              values: criterion.values || null,
            });
          }
        }
      }
    }
  }

  // Example based on https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-rule-query#_example_request_2
  const TEST_QUERY_RULESET_API_SNIPPET = dedent`
  # Test your query ruleset
  # ℹ️ https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-rule-query
  GET ${indecesRuleset}/_search
  {
    "query": {
      "rule": {
        "match_criteria": // Defines the match criteria to apply to rules in the given query ruleset ${
          criteriaData.length > 0
            ? (() => {
                const matchCriteria = criteriaData.reduce<Record<string, any>>((acc, criterion) => {
                  if (criterion.metadata && criterion.values) {
                    acc[criterion.metadata] = criterion.values;
                  }
                  return acc;
                }, {});
                // Format with proper indentation (6 spaces to align with the property)
                return JSON.stringify(matchCriteria, null, 2).split('\n').join('\n         ');
              })()
            : '{\n         "user_query": "pugs"\n    }'
        },
        "ruleset_ids": ["${rulesetId}"], // An array of one or more unique query ruleset IDs
        "organic": {
          "match": { // Any choice of query used to return results
            "description": "puggles"
          }
        }
      }
    }
  }
  `;

  return (
    <TryInConsoleButton
      application={application}
      sharePlugin={share ?? undefined}
      consolePlugin={consolePlugin ?? undefined}
      request={TEST_QUERY_RULESET_API_SNIPPET}
      type={type}
      content={content}
      showIcon
    />
  );
};
