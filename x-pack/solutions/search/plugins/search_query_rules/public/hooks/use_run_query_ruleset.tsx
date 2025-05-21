/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import dedent from 'dedent';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { i18n } from '@kbn/i18n';
import { useFetchQueryRuleset } from './use_fetch_query_ruleset';
import { useKibana } from './use_kibana';

export const useRunQueryRuleset = (rulesetId: string) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const { data: queryRulesetData } = useFetchQueryRuleset(rulesetId);
  const indecesRuleset = queryRulesetData?.rules?.[0]?.actions?.docs?.[0]?._index;
  const TEST_QUERY_RULESET_API_SNIPPET = dedent`
# Test your query ruleset
GET ${indecesRuleset}/_search
{
  "retriever": {
    "rule": {
      "retriever": {
        "standard": {
          "query": {
            "query_string": {
              "query": "puggles" # The query to test
            }
          }
        }
      },
      "match_criteria": {
         "query_string": "puggles", # Your custom match criteria 1
         "user_country": "us" # Your custom match criteria 2 ...
      },
      "ruleset_ids": [ "${rulesetId}" ] # Your ruleset ID
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
      type="contextMenuItem"
      content={i18n.translate('xpack.queryRules.RunInConsoleLabel', {
        defaultMessage: 'Test in Console',
      })}
      showIcon
    />
  );
};
