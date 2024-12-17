/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';

export const createUpdatedColumn = (): TableColumn => {
  return {
    field: 'updated_at',
    name: i18n.COLUMN_UPDATED,
    render: (value: RuleMigration['updated_at']) => (
      <FormattedRelativePreferenceDate value={value} dateFormat="M/D/YY" />
    ),
    sortable: true,
    truncateText: false,
    align: 'center',
    width: '10%',
  };
};
