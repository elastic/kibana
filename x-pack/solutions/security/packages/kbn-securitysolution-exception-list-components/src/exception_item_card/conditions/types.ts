/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntryExists,
  EntryList,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
  EntryNested,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ElementType } from 'react';

export type Entry =
  | EntryExists
  | EntryList
  | EntryMatch
  | EntryMatchAny
  | EntryMatchWildcard
  | EntryNested;

export type Entries = ExceptionListItemSchema['entries'];
export interface CriteriaConditionsProps {
  entries: Entries;
  dataTestSubj: string;
  os?: ExceptionListItemSchema['os_types'];
  showValueListModal: ElementType;
}
