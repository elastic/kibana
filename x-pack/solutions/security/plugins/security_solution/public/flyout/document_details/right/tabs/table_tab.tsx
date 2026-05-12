/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { TableTab as SharedTableTab } from '../../../../flyout_v2/shared/tabs/table_tab';
import { cellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { useDocumentDetailsContext } from '../../shared/context';

/**
 * Table tab for the document details flyout right panel.
 * Bridges the v1 DocumentDetailsContext to the shared v2 TableTab component.
 */
export const TableTab = memo(() => {
  const { searchHit, scopeId } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  return <SharedTableTab hit={hit} renderCellActions={cellActionRenderer} scopeId={scopeId} />;
});

TableTab.displayName = 'TableTab';
