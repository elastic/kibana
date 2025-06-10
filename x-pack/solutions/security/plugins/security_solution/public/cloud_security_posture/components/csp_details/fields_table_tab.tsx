/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { FieldsTableProps } from '../../../flyout/entity_details/generic_right/components/fields_table';
import { FieldsTable } from '../../../flyout/entity_details/generic_right/components/fields_table';

export const FieldsTableTab = memo(({ document, tableStorageKey }: FieldsTableProps) => {
  return <FieldsTable document={document} tableStorageKey={tableStorageKey} />;
});

FieldsTableTab.displayName = 'FieldsTableTab';
