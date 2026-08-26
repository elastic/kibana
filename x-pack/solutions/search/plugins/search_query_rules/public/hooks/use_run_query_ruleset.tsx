/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import dedent from 'dedent';
import { compressToEncodedURIComponent } from 'lz-string';
import { TryInConsoleButton } from '@kbn/try-in-console';
import type { EuiButtonColor } from '@elastic/eui';
import { useFetchQueryRuleset } from './use_fetch_query_ruleset';
import { useKibana } from './use_kibana';

const CONSOLE_APP_LOCATOR = 'CONSOLE_APP_LOCATOR';

/**
 * Builds the Console request snippet that tests a given ruleset. Shared by the
 * `UseRunQueryRuleset` button and the imperative `useRunQueryRulesetAction` handler.
 */
const useQueryRulesetConsoleRequest = (rulesetId: string, enabled: boolean): string => {
  const { data: queryRulesetData } = useFetchQueryRuleset(rulesetId, enabled);

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
  return useMemo(
    () => dedent`
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
  `,
    [rulesetId, indices, matchCriteria]
  );
};

export interface UseRunQueryRulesetProps {
  rulesetId: string;
  type?: 'link' | 'button' | 'emptyButton' | 'contextMenuItem' | 'tableActionItem';
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
  const request = useQueryRulesetConsoleRequest(rulesetId, !disabled);

  return (
    <TryInConsoleButton
      disabled={disabled}
      application={application}
      sharePlugin={share ?? undefined}
      consolePlugin={consolePlugin ?? undefined}
      request={request}
      type={type}
      content={content}
      color={color}
      showIcon
      onClick={onClick}
    />
  );
};

export interface UseRunQueryRulesetActionProps {
  rulesetId: string;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Imperative counterpart of `UseRunQueryRuleset` for contexts that render an action config
 * instead of a component (e.g. the `AppHeader` menu). Mirrors `TryInConsoleButton`'s behavior:
 * opens the embedded console when available, otherwise opens Console in a new tab. `isAvailable`
 * reflects whether the dev tools capability and share URL service are present.
 */
export const useRunQueryRulesetAction = ({
  rulesetId,
  disabled = false,
  onClick,
}: UseRunQueryRulesetActionProps): { run: () => void; isAvailable: boolean } => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const request = useQueryRulesetConsoleRequest(rulesetId, !disabled);

  const url = share?.url;
  const isAvailable = !!application?.capabilities?.dev_tools?.show && !!url;

  const run = useCallback(() => {
    if (!url) return;

    const embeddedConsoleAvailable =
      (consolePlugin?.openEmbeddedConsole !== undefined &&
        consolePlugin?.isEmbeddedConsoleAvailable?.()) ??
      false;

    if (embeddedConsoleAvailable) {
      consolePlugin!.openEmbeddedConsole!(request);
    } else {
      const devToolsDataUri = request ? compressToEncodedURIComponent(request) : null;
      const consolePreviewLink = url.locators
        .get(CONSOLE_APP_LOCATOR)
        ?.getRedirectUrl(devToolsDataUri ? { loadFrom: `data:text/plain,${devToolsDataUri}` } : {});
      if (consolePreviewLink) {
        window.open(consolePreviewLink, '_blank', 'noreferrer');
      }
    }

    onClick?.();
  }, [url, consolePlugin, request, onClick]);

  return { run, isAvailable };
};
