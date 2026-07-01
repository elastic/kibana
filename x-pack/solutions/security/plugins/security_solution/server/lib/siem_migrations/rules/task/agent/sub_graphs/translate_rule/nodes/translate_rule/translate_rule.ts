/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationComments } from '../../../../../../../../../../common/siem_migrations/model/common.gen';
import { getNLToESQLQuery } from '../../../../../../../common/task/agent/helpers/translate_nl_to_esql/translate_nl_to_esql';
import {
  getTranslateSplToEsql,
  TASK_DESCRIPTION,
  type GetTranslateSplToEsqlParams,
} from '../../../../../../../common/task/agent/helpers/translate_spl_to_esql';
import type { GraphNode } from '../../types';
import {
  getElasticRiskScoreFromOriginalRule,
  getElasticSeverityFromOriginalRule,
} from './severity';
import type { EnrichedLookupResource } from '../../../../../../../common/task/util/enrich_lookup_resources';

export const getTranslateRuleNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const nlToESQLQuery = getNLToESQLQuery(params);
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    const vendor = state.original_rule.vendor;

    const indexPatterns =
      state.integration?.data_streams?.map((dataStream) => dataStream.index_pattern).join(',') ||
      'logs-*';

    const lookupResourcesContext = formatLookupResourcesContext(state.resources.lookup ?? []);
    const knowledgeBase = [state.integration?.knowledge_base ?? '', lookupResourcesContext]
      .filter((value) => value.trim() !== '')
      .join('\n\n');

    let esqlQuery: string | undefined;
    let comments: MigrationComments = [];

    if (vendor === 'qradar' || vendor === 'microsoft-sentinel') {
      params.logger.debug(
        `Translating rule "${state.original_rule.title}" using NL to ESQL for vendor: ${vendor}`
      );
      ({ esqlQuery, comments } = await nlToESQLQuery({
        query: state.nl_query,
        indexPattern: indexPatterns,
        knowledgeBase,
      }));
    } else {
      params.logger.debug(
        `Translating rule "${state.original_rule.title}" using SPL to ESQL for vendor: ${vendor}`
      );
      ({ esqlQuery, comments } = await translateSplToEsql({
        title: state.original_rule.title,
        taskDescription: TASK_DESCRIPTION.migrate_rule,
        description: state.original_rule.description,
        inlineQuery: state.inline_query,
        indexPattern: indexPatterns,
        knowledgeBase,
      }));
    }

    if (!esqlQuery) {
      return { comments };
    }

    return {
      elastic_rule: {
        query: esqlQuery,
        query_language: 'esql',
        risk_score: await getElasticRiskScoreFromOriginalRule(state.original_rule),
        severity: await getElasticSeverityFromOriginalRule(state.original_rule),
        ...(state.integration?.id && { integration_ids: [state.integration.id] }),
      },
      comments,
    };
  };
};

const formatLookupResourcesContext = (lookups: EnrichedLookupResource[]): string => {
  const resourceBlocks = lookups
    .filter((lookup) => lookup.content && lookup.fields?.length)
    .map((lookup) => {
      const fields = (lookup.fields ?? [])
        .map(
          (field) =>
            `<field name="${escapeXmlAttribute(field.path)}" type="${escapeXmlAttribute(
              field.type
            )}" />`
        )
        .join('\n');

      return `<lookup_resource source_name="${escapeXmlAttribute(
        lookup.name
      )}" index="${escapeXmlAttribute(lookup.content)}">
<fields>
${fields}
</fields>
</lookup_resource>`;
    });

  if (!resourceBlocks.length) {
    return '';
  }

  return `<lookup_join_rules>
<rule>Use LOOKUP JOIN for lookup indices. Do not use ENRICH.</rule>
<rule>Lookup fields are declared as field elements; field @name is the lookup-side ES|QL field name and field @type is its datatype.</rule>
<rule>When source and lookup field names differ, use LOOKUP JOIN lookup_index ON source_field == lookup_field.</rule>
<rule>When source and lookup field names are the same, use LOOKUP JOIN lookup_index ON field_name.</rule>
<rule>If source and lookup field types differ, create a source-side EVAL field with the matching type before LOOKUP JOIN.</rule>
</lookup_join_rules>

<lookup_resources>
${resourceBlocks.join('\n')}
</lookup_resources>`;
};

const escapeXmlAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
