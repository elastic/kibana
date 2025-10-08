/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject } from 'lodash';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InfraMetadata } from '../../../../../common/http_api';

export interface Field {
  name: string;
  value?: string | string[];
}
interface FieldsByCategory {
  [key: string]: string | boolean | string[] | { [key: string]: string };
}

type FieldCategory =
  | 'cloud'
  | 'host'
  | 'agent'
  | 'container'
  | 'resource.attributes.os'
  | 'resource.attributes.host'
  | 'resource.attributes.agent'
  | 'resource.attributes.cloud';

export const getAllFields = (
  metadata: InfraMetadata | undefined,
  schema: DataSchemaFormat | null
) => {
  if (!metadata?.info) return [];

  const mapNestedProperties = (category: FieldCategory, property: string) => {
    const fieldsByCategory: FieldsByCategory = get(metadata?.info, category) ?? {};
    if (Object.hasOwn(fieldsByCategory, property)) {
      const value = fieldsByCategory[property];

      if (typeof value === 'boolean') {
        return {
          name: `${category}.${property}`,
          value: String(value),
        };
      }

      if (typeof value === 'string' || Array.isArray(value)) {
        return {
          name: `${category}.${property}`,
          value,
        };
      } else {
        return Object.entries(value ?? {})
          .map(([prop, subProp]) => {
            if (!Array.isArray(subProp) && isPlainObject(subProp)) {
              return { name: '', value: '' };
            }
            return {
              name: `${category}.${property}.${prop}`,
              value: subProp,
            };
          })
          .filter(({ name }) => name);
      }
    }
    return [];
  };

  const additionalCategories = [];
  if (schema === 'semconv') {
    const osResourceAttributes = Object.keys(
      metadata?.info?.resource?.attributes?.os ?? {}
    ).flatMap((prop) => mapNestedProperties('resource.attributes.os', prop));

    const hostResourceAttributes = Object.keys(
      metadata?.info?.resource?.attributes?.host ?? {}
    ).flatMap((prop) => mapNestedProperties('resource.attributes.host', prop));

    const agentResourceAttributes = Object.keys(
      metadata?.info?.resource?.attributes?.agent ?? {}
    ).flatMap((prop) => mapNestedProperties('resource.attributes.agent', prop));

    const cloudResourceAttributes = Object.keys(
      metadata?.info?.resource?.attributes?.cloud ?? {}
    ).flatMap((prop) => mapNestedProperties('resource.attributes.cloud', prop));

    additionalCategories.push(
      ...osResourceAttributes,
      ...hostResourceAttributes,
      ...agentResourceAttributes,
      ...cloudResourceAttributes
    );
  }
  const agent = Object.keys(metadata.info.agent ?? {}).flatMap((prop) =>
    mapNestedProperties('agent', prop)
  );
  const cloud = Object.keys(metadata.info.cloud ?? {}).flatMap((prop) =>
    mapNestedProperties('cloud', prop)
  );
  const host = Object.keys(metadata?.info?.host ?? {}).flatMap((prop) =>
    mapNestedProperties('host', prop)
  );
  const container = Object.keys(metadata?.info?.container ?? {}).flatMap((prop) =>
    mapNestedProperties('container', prop)
  );

  return prune([...host, ...container, ...agent, ...cloud, ...additionalCategories]);
};

const prune = (fields: Field[]) => fields.filter((f) => !!f?.value);

export const getRowsWithPins = (rows: Field[], pinnedItems: Array<Field['name']>) => {
  if (pinnedItems.length > 0) {
    const { pinned, other } = rows.reduce(
      (acc, row) => {
        (pinnedItems.includes(row.name) ? acc.pinned : acc.other).push(row);
        return acc;
      },
      { pinned: [] as Field[], other: [] as Field[] }
    );
    return [...pinned, ...other];
  }
};
