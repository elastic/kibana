/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import type { EcsSecurityExtension as Ecs, CodeSignature } from '@kbn/securitysolution-ecs';

export interface ExceptionListItemIdentifiers {
  id: string;
  name: string;
  namespaceType: NamespaceType;
}

export interface ExceptionsPagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
}

export interface FlattenedCodeSignature {
  subject_name: string;
  trusted: string;
}

export type Flattened<T> = {
  [K in keyof T]: T[K] extends infer AliasType
    ? AliasType extends CodeSignature[]
      ? FlattenedCodeSignature[]
      : AliasType extends Array<infer rawType>
      ? rawType
      : AliasType extends object
      ? Flattened<AliasType>
      : AliasType
    : never;
};

export type AlertData = {
  '@timestamp': string;
} & Flattened<Ecs>;

export interface EcsHit {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
  } & Omit<Flattened<Ecs>, '_id' | '_index'>;
}
