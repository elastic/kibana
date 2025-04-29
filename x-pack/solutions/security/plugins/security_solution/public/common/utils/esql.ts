/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, mutate, BasicPrettyPrinter, synth } from '@kbn/esql-ast';
import { isString } from 'lodash/fp';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { escapeKQLStringParam } from '../../../common/utils/kql';

/**
 * This function is used to add a KQL query to an ESQL query.
 */
export const buildESQLWithKQLQuery = (esql: string, kqlQuery: string | undefined) => {
  const { errors, root } = parse(esql);
  if (errors.length > 0) {
    return esql;
  }

  if (isString(kqlQuery) && kqlQuery !== '') {
    const kqlWhere = synth.cmd`WHERE KQL("${escapeKQLStringParam(kqlQuery)}")`;
    const index = root.commands.findIndex((cmd) => cmd.name === 'from');
    mutate.generic.commands.insert(root, kqlWhere, index + 1); // add 'where'command after the 'from' command
    return BasicPrettyPrinter.print(root);
  }
  return esql;
};

// Function copied from elasticsearch-8.x/lib/helpers
export function esqlResponseToRecords<TDocument extends Record<string, unknown>>(
  response: ESQLSearchResponse | undefined
): TDocument[] {
  if (!response) return [];
  const { columns, values } = response;
  return values.map<TDocument>((row) => {
    const doc: Record<string, unknown> = {};
    row.forEach((cell, index) => {
      const { name } = columns[index];
      doc[name] = cell;
    });
    return doc as TDocument;
  });
}
