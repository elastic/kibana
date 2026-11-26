/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalSource } from '../../types';

/**
 * Elasticsearch metadata fields that cannot be added inside a document. An ES|QL result column
 * with one of these names (for example from `METADATA _source, _ignored`) would make the alert
 * document be rejected. `_id`, `_index` and `_version` are handled separately by the executor.
 *
 * The list starts from the document metadata fields page and was completed by indexing a document
 * with each name as a top-level field. Elasticsearch rejects every name below with
 * "failed to parse field [<name>] of type [<name>]", including the ones the page does not list
 * (`_ignored_source`, `_index_mode`, `_nested_path`, `_seq_no`, `_data_stream_timestamp`, `_feature`).
 * https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/document-metadata-fields
 *
 * Names that only exist when an optional plugin adds the metadata mapper, such as `_size` from
 * `mapper-size`, are not included. Without the plugin Elasticsearch stores them like any other field.
 */
const RESERVED_METADATA_FIELDS: ReadonlySet<string> = new Set([
  '_source',
  '_ignored',
  '_ignored_source',
  '_index_mode',
  '_tier',
  '_routing',
  '_seq_no',
  '_field_names',
  '_nested_path',
  '_data_stream_timestamp',
  '_feature',
]);

const isReserved = (name: string): boolean => RESERVED_METADATA_FIELDS.has(name);

/**
 * Returns the unique names of the columns in the ES|QL result documents that cannot be stored in an alert.
 */
export const getReservedMetadataColumns = (documents: Array<Record<string, string>>): string[] => {
  const columnNames = documents.flatMap((document) => Object.keys(document));
  return [...new Set(columnNames.filter(isReserved))];
};

/**
 * Returns a copy of the event source without the fields that cannot be stored in an alert.
 * The values are still needed to generate the alert id and the suppression terms, so this must
 * only be applied to the document the alert is built from.
 */
export const omitReservedMetadataColumns = (
  source: SignalSource | undefined
): SignalSource | undefined => {
  if (!source) {
    return source;
  }

  const keptEntries = Object.entries(source).filter(([name]) => !isReserved(name));
  return Object.fromEntries(keptEntries);
};
