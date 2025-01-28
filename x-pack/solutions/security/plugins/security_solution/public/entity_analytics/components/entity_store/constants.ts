/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ItemsPerRow } from '../../../explore/components/paginated_table';

export const ENTITIES_LIST_TABLE_ID = 'EntitiesList-table';

export const rowItems: ItemsPerRow[] = [
  {
    text: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.entitiesList.rows', {
      values: { numRows: 5 },
      defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
    }),
    numberOfRow: 5,
  },
  {
    text: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.entitiesList.rows', {
      values: { numRows: 10 },
      defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
    }),
    numberOfRow: 10,
  },
];
