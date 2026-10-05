/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { useKibana } from '../../../common/lib/kibana';
import { composeEsqlQuery, TIME_RANGE_ESQL_FILTER } from '../compose_esql_query';

/** Top-level mapped fields on a rule event / episode, usable as group-by keys. */
export const TOP_LEVEL_FIELDS = ['rule.id', 'severity', 'episode.status'];

const TOP_LEVEL_FIELD_EXPR: Record<string, string> = {
  'rule.id': '`rule.id`',
  severity: 'severity',
  'episode.status': '`episode.status`',
};

/**
 * Maps a group-by field to its ES|QL expression: top-level mapped fields are
 * referenced directly (backticked when dotted); everything else is treated as a
 * flat, dotted key inside the flattened `data` blob and extracted with
 * `JSON_EXTRACT(data::keyword, "$['…']")`.
 */
export const fieldToEsqlExpr = (field: string): string =>
  TOP_LEVEL_FIELD_EXPR[field] ?? `JSON_EXTRACT(data::keyword, "$['${field}']")`;

const SAMPLE_SIZE = 100;
/** Keys inside `data` that aren't useful group-by dimensions. */
const IGNORED_DATA_KEYS = new Set(['_id', '_index', '@timestamp']);

export interface UseEpisodeFieldsResult {
  /** Group-by options: the top-level fields plus every key discovered in `data`. */
  fields: string[];
  isLoading: boolean;
}

/**
 * Discovers the group-by fields available on the page's episodes. v2 has no field
 * catalog for the flattened `data` (unlike v1's data-view browser fields), so we
 * sample recent episodes, parse each `data` JSON, and union the keys — giving the
 * dropdowns v1-like breadth derived from the actual payloads.
 */
export const useEpisodeFields = (
  query: AggregateQuery,
  timeRange: TimeRange
): UseEpisodeFieldsResult => {
  const {
    services: { data },
  } = useKibana();

  const [fields, setFields] = useState<string[]>(TOP_LEVEL_FIELDS);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    const esqlQuery = composeEsqlQuery(
      query.esql,
      [TIME_RANGE_ESQL_FILTER],
      ['KEEP data', `LIMIT ${SAMPLE_SIZE}`]
    );

    getESQLResults({ esqlQuery, search: data.search.search, signal: controller.signal, timeRange })
      .then(({ response }) => {
        if (controller.signal.aborted) {
          return;
        }
        const dataIndex = response.columns.findIndex((column) => column.name === 'data');
        const keys = new Set<string>();
        if (dataIndex >= 0) {
          response.values.forEach((row) => {
            const raw = row[dataIndex];
            let parsed: Record<string, unknown> | null = null;
            if (typeof raw === 'string') {
              try {
                parsed = JSON.parse(raw);
              } catch {
                parsed = null;
              }
            } else if (raw && typeof raw === 'object') {
              parsed = raw as Record<string, unknown>;
            }
            if (parsed) {
              Object.keys(parsed).forEach((key) => {
                if (!IGNORED_DATA_KEYS.has(key)) {
                  keys.add(key);
                }
              });
            }
          });
        }
        const dataKeys = Array.from(keys)
          .filter((key) => !TOP_LEVEL_FIELDS.includes(key))
          .sort();
        setFields([...TOP_LEVEL_FIELDS, ...dataKeys]);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setFields(TOP_LEVEL_FIELDS);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [data, query, timeRange]);

  return { fields, isLoading };
};
