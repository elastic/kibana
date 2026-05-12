/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { getSLOPipelineId, SLI_DESTINATION_INDEX_NAME } from '../../common/constants';
import type { EsqlCustomIndicator, SLODefinition } from '../domain/models';

/**
 * Generates the Kibana Workflow YAML for an ESQL SLO.
 *
 * The workflow:
 * 1. Runs the user's ESQL query with a DSL time-range filter (not embedded in the ESQL string)
 * 2. Checks for empty results (early exit)
 * 3. Iterates over result rows, constructing SLI documents
 * 4. Indexes each document via PUT /_doc/{id}?pipeline={pipeline}
 *
 * Design decisions (from design.md):
 * - D3: DSL filter injection for time range
 * - D2: Deterministic _id via string concatenation: {timestamp}-{instanceId}
 * - D4: Column-name contract for result mapping
 * - D6: Per-document indexing via elasticsearch.request
 */
export const generateEsqlSloWorkflowYaml = (slo: SLODefinition, spaceId: string): string => {
  const indicator = slo.indicator as EsqlCustomIndicator;
  const frequencyMinutes = getFrequencyMinutes(slo);
  const syncDelayMinutes = getSyncDelayMinutes(slo);
  const lookbackMinutes = computeLookbackMinutes(slo);
  const pipelineId = getSLOPipelineId(slo.id, slo.revision);
  const sliIndex = SLI_DESTINATION_INDEX_NAME;
  const isTimeslices = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod);
  const timesliceTarget = slo.objective.timesliceTarget ?? 0.95;

  const groups = [slo.groupBy].flat().filter((g) => !!g && g !== ALL_VALUE);
  const hasGroupBy = groups.length > 0;

  // Build the instanceId Liquid expression
  // For ungrouped: instanceId = "*"
  // For grouped: instanceId = concatenation of grouping values separated by ","
  const instanceIdExpr = hasGroupBy
    ? groups.map((g) => `{{ item.${escapeField(g)} }}`).join(',')
    : '*';

  // Build groupings mapping for the SLI document
  const groupingsBlock = hasGroupBy
    ? groups
        .map((g) => `            "slo.groupings.${g}": "{{ item.${escapeField(g)} }}"`)
        .join(',\n')
    : '';

  // Build isGoodSlice computation
  // Use numerator >= denominator * target to avoid Liquid's integer division issue
  const isGoodSliceBlock = isTimeslices
    ? `
        - name: compute_is_good_slice
          type: transform
          with:
            operations:
              - operation: set
                field: isGoodSlice
                value: "{% if item.numerator != null and item.denominator != null and item.denominator > 0 %}{% assign threshold = item.denominator | times: ${timesliceTarget} %}{% if item.numerator >= threshold %}1{% else %}0{% endif %}{% else %}0{% endif %}"`
    : '';

  // Build the isGoodSlice field in the document body
  const isGoodSliceField = isTimeslices
    ? `,
            "slo.isGoodSlice": "{% if item.isGoodSlice != null %}{{ item.isGoodSlice }}{% else %}{{ steps.compute_is_good_slice.isGoodSlice }}{% endif %}"`
    : '';

  const timeoutSeconds = Math.max(frequencyMinutes * 60 - 5, 30);

  return `name: "SLO ESQL - ${slo.name}"
description: "Evaluates ESQL SLI for SLO: ${slo.name} [id: ${slo.id}, rev: ${slo.revision}]"

triggers:
  - type: scheduled
    with:
      every: "${frequencyMinutes}m"

settings:
  concurrency:
    key: "esql-sli-${slo.id}"
    strategy: drop
    max: 1
  timeout: "${timeoutSeconds}s"

consts:
  slo_id: "${slo.id}"
  slo_revision: ${slo.revision}
  space_id: "${spaceId}"
  pipeline_id: "${pipelineId}"
  sli_index: "${sliIndex}"
  lookback_minutes: ${lookbackMinutes}
  sync_delay_minutes: ${syncDelayMinutes}

steps:
  - name: execute_esql_query
    type: elasticsearch.esql.query
    with:
      query: |
        ${indent(indicator.params.esqlQuery, 8)}
      filter:
        range:
          "@timestamp":
            gte: "now-${lookbackMinutes}m"
            lt: "now-${syncDelayMinutes}m"
    on-failure:
      - type: noop
        name: esql_query_failed

  - name: check_empty_results
    type: condition
    if: "{{ steps.execute_esql_query.records | size }} == 0"
    then:
      - name: early_exit
        type: noop

  - name: index_sli_documents
    type: foreach
    foreach: "{{ steps.execute_esql_query.records }}"
    if: "{{ steps.execute_esql_query.records | size }} > 0"
    do:${isGoodSliceBlock}
      - name: index_sli_doc
        type: elasticsearch.request
        with:
          method: PUT
          path: "/${sliIndex}/_doc/{{ item.@timestamp }}-${instanceIdExpr}?pipeline=${pipelineId}"
          body: |
            {
              "@timestamp": "{{ item.@timestamp }}",
              "slo.numerator": {{ item.numerator }},
              "slo.denominator": {{ item.denominator }}${isGoodSliceField}${
    hasGroupBy ? `,\n${groupingsBlock}` : ''
  }
            }
        on-failure:
          - type: noop
            name: index_doc_failed
`;
};

/**
 * Compute lookback window in minutes.
 * lookback = bucketCount × bucketInterval + syncDelay
 * For ESQL SLOs, we use 5 × frequency + syncDelay to cover missed evaluations.
 */
const computeLookbackMinutes = (slo: SLODefinition): number => {
  const frequencyMin = getFrequencyMinutes(slo);
  const syncDelayMin = getSyncDelayMinutes(slo);
  // 5 evaluation cycles + sync delay provides recovery for missed evaluations
  return 5 * frequencyMin + syncDelayMin;
};

const getFrequencyMinutes = (slo: SLODefinition): number => {
  const freq = slo.settings.frequency;
  return durationToMinutes(freq);
};

const getSyncDelayMinutes = (slo: SLODefinition): number => {
  const sync = slo.settings.syncDelay;
  return durationToMinutes(sync);
};

const durationToMinutes = (duration: { value: number; unit: string }): number => {
  switch (duration.unit) {
    case 's':
      return Math.max(1, Math.ceil(duration.value / 60));
    case 'm':
      return duration.value;
    case 'h':
      return duration.value * 60;
    case 'd':
      return duration.value * 1440;
    default:
      return duration.value;
  }
};

const escapeField = (field: string): string => {
  // Liquid template field access — dots are handled via bracket notation
  if (field.includes('.')) {
    return `["${field}"]`;
  }
  return field;
};

const indent = (text: string, spaces: number): string => {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line, i) => (i === 0 ? line : `${pad}${line}`))
    .join('\n');
};
