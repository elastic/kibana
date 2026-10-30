/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Elasticsearch metadata fields that cannot be added inside a document. An ES|QL result column
 * with one of these names (for example from `METADATA _source, _ignored`) would make the alert
 * document be rejected. `_id`, `_index` and `_version` are handled separately by the executor.
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
]);

/**
 * Removes the columns that cannot be stored in an alert from the ES|QL result documents.
 * Returns the cleaned documents and the unique names of the columns that were removed.
 */
export const removeReservedMetadataColumns = (
  documents: Array<Record<string, string>>
): { documents: Array<Record<string, string>>; removedColumns: string[] } => {
  const isReserved = (name: string): boolean => RESERVED_METADATA_FIELDS.has(name);

  const columnNames = documents.flatMap((document) => Object.keys(document));
  const removedColumns = [...new Set(columnNames.filter(isReserved))];

  const cleanedDocuments = documents.map((document) => {
    const keptEntries = Object.entries(document).filter(([name]) => !isReserved(name));
    return Object.fromEntries(keptEntries);
  });

  return { documents: cleanedDocuments, removedColumns };
};
