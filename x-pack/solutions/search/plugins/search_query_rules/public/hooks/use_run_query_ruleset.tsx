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
  const indecesRuleset = queryRulesetData?.rules?.[0]?.actions?.docs?.[0]?._index || 'my_index';
  // Example based on https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-rule-query#_example_request_2
  const TEST_QUERY_RULESET_API_SNIPPET = dedent`
# Test your query ruleset
GET ${indecesRuleset}/_search
{
  "query": {
    "rule": {
      // Defines the match criteria to apply to rules in the given query ruleset
      "match_criteria": { 
        "user_query": "pugs"
      },
      // An array of one or more unique query ruleset ID with query-based rules to match and apply as applicable
      "ruleset_ids": ["${rulesetId}"], 
      // Any choice of query used to return results, that may be modified by matching query rules
      "organic": { 
        "match": {
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
