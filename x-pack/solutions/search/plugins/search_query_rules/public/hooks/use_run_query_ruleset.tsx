/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import dedent from 'dedent';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiButtonColor } from '@elastic/eui';
import { useFetchQueryRuleset } from './use_fetch_query_ruleset';
import { useKibana } from './use_kibana';
export interface UseRunQueryRulesetProps {
  rulesetId: string;
  type?: 'link' | 'button' | 'emptyButton' | 'contextMenuItem';
  content?: string;
  color?: EuiButtonColor;
  onClick?: () => void;
  disabled?: boolean;
}

export const UseRunQueryRuleset = ({
  rulesetId,
  type = 'emptyButton',
  content,
  color,
  onClick,
  disabled = false,
}: UseRunQueryRulesetProps) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const { data: queryRulesetData } = useFetchQueryRuleset(rulesetId, !disabled);

  // Loop through all actions children to gather unique _index values
  const { indices, matchCriteria } = useMemo((): { indices: string; matchCriteria: string } => {
    const indicesSet = new Set<string>();
    const criteriaData = [];

    for (const rule of queryRulesetData?.rules ?? []) {
      // Collect indices
      rule.actions?.docs?.forEach((doc) => {
        if (doc._index) indicesSet.add(doc._index);
      });

      // Collect criteria
      const criteriaArray = Array.isArray(rule.criteria)
        ? rule.criteria
        : rule.criteria
        ? [rule.criteria]
        : [];

      for (const criterion of criteriaArray) {
        if (
          criterion.values &&
          typeof criterion.values === 'object' &&
          !Array.isArray(criterion.values)
        ) {
          Object.entries(criterion.values).forEach(([key, value]) => {
            criteriaData.push({ metadata: key, values: value });
          });
        } else {
          criteriaData.push({
            metadata: criterion.metadata || null,
            values: criterion.values || null,
          });
        }
      }
    }

    const reducedCriteria = criteriaData.reduce<Record<string, any>>(
      (acc, { metadata, values }) => {
        if (metadata && values !== undefined) acc[metadata] = values ? values[0] : '';
        return acc;
      },
      {}
    );

    return {
      indices: indicesSet.size > 0 ? Array.from(indicesSet).join(',') : 'my_index',
      matchCriteria:
        Object.keys(reducedCriteria).length > 0
          ? JSON.stringify(reducedCriteria, null, 2).split('\n').join('\n         ')
          : `{\n         "user_query": "pugs"\n    }`,
    };
  }, [queryRulesetData]);
  // Example based on https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-rule-query#_example_request_2
  const TEST_QUERY_RULESET_API_SNIPPET = dedent`
    # Get Query Ruleset
    GET _query_rules/${rulesetId}


    # Query Rules Retriever Example
    # https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers#rule-retriever
    GET ${indices}/_search
    {
      "retriever": {
        "rule": {
          // Update your criteria to test different results
          "match_criteria": ${matchCriteria},
          "ruleset_ids": [
            "${rulesetId}" // An array of one or more unique query ruleset IDs
          ],
          "retriever": {
            "standard": {
              "query": {
                "match_all": {} // replace with your query
              }
            }
          }
        }
      }
    }
  `;

  return (
    <TryInConsoleButton
      disabled={disabled}
      application={application}
      sharePlugin={share ?? undefined}
      consolePlugin={consolePlugin ?? undefined}
      request={TEST_QUERY_RULESET_API_SNIPPET}
      type={type}
      content={content}
      color={color}
      showIcon
      onClick={onClick}
    />
  );
};
