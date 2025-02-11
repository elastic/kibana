/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { FilteringRule, FilteringRules } from '@kbn/search-connectors';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface PutConnectorFilteringDraftArgs {
  advancedSnippet: string;
  connectorId: string;
  filteringRules: FilteringRule[];
}

export type PutConnectorFilteringDraftResponse = FilteringRules;

export const putConnectorFilteringDraft = async ({
  advancedSnippet,
  connectorId,
  filteringRules,
}: PutConnectorFilteringDraftArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/filtering/draft`;

  return await HttpLogic.values.http.put(route, {
    body: JSON.stringify({
      advanced_snippet: advancedSnippet,
      filtering_rules: filteringRules,
    }),
  });
};

export const ConnectorFilteringDraftApiLogic = createApiLogic(
  ['content', 'connector_filtering_draft_api_logic'],
  putConnectorFilteringDraft,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.content.index.connector.syncRules.successToastDraft.title',
        { defaultMessage: 'Draft rules saved' }
      ),
  }
);
