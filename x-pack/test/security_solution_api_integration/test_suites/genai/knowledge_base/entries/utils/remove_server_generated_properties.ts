/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, pickBy } from 'lodash';
import { KnowledgeBaseEntryCreateProps } from '@kbn/elastic-assistant-common';

const serverGeneratedProperties = [
  'id',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'vector',
] as const;

type ServerGeneratedProperties = (typeof serverGeneratedProperties)[number];
export type EntryWithoutServerGeneratedProperties = Omit<
  KnowledgeBaseEntryCreateProps,
  ServerGeneratedProperties
>;

/**
 * This will remove server generated properties such as date times, etc...
 * @param entry KnowledgeBaseEntryCreateProps to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  entry: KnowledgeBaseEntryCreateProps
): EntryWithoutServerGeneratedProperties => {
  const removedProperties = omit(entry, serverGeneratedProperties);

  // We're only removing undefined values, so this cast correctly narrows the type
  return pickBy(removedProperties, (value) => value !== undefined) as KnowledgeBaseEntryCreateProps;
};
