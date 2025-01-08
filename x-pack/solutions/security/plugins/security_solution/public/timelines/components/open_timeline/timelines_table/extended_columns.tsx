/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiTableDataType } from '@elastic/eui';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';

import * as i18n from '../translations';
import type { OpenTimelineResult } from '../types';

/**
 * Returns the extended columns that are specific to the `All Timelines` view
 * of the `Timelines` page
 */
export const getExtendedColumns = (showExtendedColumns: boolean) => {
  if (!showExtendedColumns) return [];

  return [
    {
      dataType: 'string' as EuiTableDataType,
      field: 'updatedBy',
      name: i18n.MODIFIED_BY,
      render: (updatedBy: OpenTimelineResult['updatedBy']) => (
        <div data-test-subj="username">{defaultToEmptyTag(updatedBy)}</div>
      ),
      sortable: false,
    },
  ];
};
