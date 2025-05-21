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
// import { useFetchQueryRuleset } from './use_fetch_query_ruleset';
import { useKibana } from './use_kibana';

export const useRunQueryRuleset = (rulesetId: string) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  //   const {
  //     data: queryRulesetData,
  //     isInitialLoading,
  //     isError,
  //     error,
  //   } = useFetchQueryRuleset(rulesetId);
  //   console.log('queryRulesetData', queryRulesetData);
  const TEST_QUERY_RULESET_API_SNIPPET = dedent`# Test your query ruleset
PUT /_query_rules/${rulesetId}/_test
{
  "rules": [
    {
      "rule_id": "rule1",
      "type": "pinned",
      "criteria": [
        {
          "type": "fuzzy",
          "metadata": "query_string",
          "values": [ "puggles", "pugs" ]
        },
        {
          "type": "exact",
          "metadata": "user_country",
          "values": [ "us" ]
        }
      ],
      "actions": {
        "docs": [
          {
            "_index": "my-index-000001",
            "_id": "id1"
          },
          {
            "_index": "my-index-000002",
            "_id": "id2"
          }
        ]
      }
    },
    {
      "rule_id": "rule2",
      "type": "exclude",
      "criteria": [
        {
          "type": "contains",
          "metadata": "query_string",
          "values": [ "beagles" ]
        }
      ],
      "actions": {
        "docs": [
          {
            "_index": "my-index-000001",
            "_id": "id3"
          },
          {
            "_index": "my-index-000002",
            "_id": "id4"
          }
        ]
      }
    }
  ]
}`;

  return (
    <TryInConsoleButton
      application={application}
      sharePlugin={share ?? undefined}
      consolePlugin={consolePlugin ?? undefined}
      request={TEST_QUERY_RULESET_API_SNIPPET}
      type="emptyButton"
      content={i18n.translate('xpack.queryRules.emptyPrompt.TryInConsoleLabel', {
        defaultMessage: 'Create in Console',
      })}
      showIcon
    />
  );
};
