/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { AttacksDetailsItem } from './table_tab_columns';

export type ItemsProvider = ({ attack }: { attack: AttackDiscoveryAlert }) => AttacksDetailsItem[];

/**
 * Returns the items for the table tab
 */
export const getTableTabItems: ItemsProvider = ({ attack }) => {
  const HIDDEN_FIELDS: (keyof AttackDiscoveryAlert)[] = [
    'replacements',
    'users',
    'entitySummaryMarkdown',
    'detailsMarkdown',
  ];

  const items: AttacksDetailsItem[] = Object.entries(attack)
    // remove hidden fields
    .filter(([field]) => !HIDDEN_FIELDS.includes(field as keyof AttackDiscoveryAlert))

    // remove undefined / null values
    .filter(([_, value]) => value !== undefined && value !== null)

    // format to AttacksDetailsItem[]
    .map(([field, value]) => ({
      field,
      values: (Array.isArray(value) ? value : String(value)) as AttacksDetailsItem['values'],
    }));

  return items;
};
