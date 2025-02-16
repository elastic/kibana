/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@elastic/elasticsearch';
import { MappingProperty, PropertyName } from '@elastic/elasticsearch/lib/api/types';
import { EntitySourceDefinition } from '@kbn/entityManager-plugin/server/lib/v2/types';

export async function createIndexWithDocuments(
  client: Client,
  options: {
    index: string;
    properties: Record<PropertyName, MappingProperty>;
    documents: Array<Record<string, any>>;
  }
) {
  await client.indices.create({
    index: options.index,
    mappings: {
      dynamic: false,
      properties: options.properties,
    },
  });

  const operations = options.documents.flatMap((doc) => {
    return [{ create: { _index: options.index } }, doc];
  });

  await client.bulk({
    operations,
    refresh: 'wait_for',
  });

  return () => client.indices.delete({ index: options.index });
}

export async function createIndexWithEntities(
  client: Client,
  options: {
    index: string;
    source: EntitySourceDefinition;
    count: number;
  }
) {
  const { source, index, count } = options;
  const documents = new Array(count).fill(null).map(() => {
    return {
      ...(source.timestamp_field ? { [source.timestamp_field]: moment().toISOString() } : {}),
      ...source.identity_fields.concat(source.metadata_fields).reduce((fields, field) => {
        fields[field] = uuidv4();
        return fields;
      }, {} as Record<string, string>),
    };
  });

  return createIndexWithDocuments(client, {
    index,
    documents,
    properties: {
      ...(source.timestamp_field ? { [source.timestamp_field]: { type: 'date' } } : {}),
      ...source.identity_fields.concat(source.metadata_fields).reduce((fields, field) => {
        fields[field] = { type: 'keyword' };
        return fields;
      }, {} as Record<PropertyName, MappingProperty>),
    },
  });
}
