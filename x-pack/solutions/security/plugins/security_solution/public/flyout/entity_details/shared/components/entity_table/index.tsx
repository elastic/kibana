/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { BasicTable } from '../../../../../common/components/ml/tables/basic_table';
import { getEntityTableColumns } from './columns';
import type { BasicEntityData, EntityTableRows } from './types';

interface EntityTableProps<T extends BasicEntityData> {
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
  data: T;
  entityFields: EntityTableRows<T>;
}

export const EntityTable = <T extends BasicEntityData>({
  contextID,
  scopeId,
  isDraggable,
  data,
  entityFields,
}: EntityTableProps<T>) => {
  const items = useMemo(
    () => entityFields.filter(({ isVisible }) => (isVisible ? isVisible(data) : true)),
    [data, entityFields]
  );

  const entityTableColumns = useMemo(
    () => getEntityTableColumns<T>(contextID, scopeId, isDraggable, data),
    [contextID, scopeId, isDraggable, data]
  );
  return (
    <BasicTable
      loading={data.isLoading}
      data-test-subj="entity-table"
      columns={entityTableColumns}
      items={items}
    />
  );
};
