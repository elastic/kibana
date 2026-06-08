/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { Assignees as AssigneesV2 } from '../../../flyout_v2/attack/main/components/assignees';
import { useAttackDetailsContext } from '../context';

/**
 * Context bridge: wraps the v2 Assignees component for the legacy attack details flyout.
 * Reads searchHit and refetch from context, builds a DataTableRecord, then delegates to v2.
 */
export const Assignees = memo(() => {
  const { searchHit, refetch } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  return <AssigneesV2 hit={hit} onAttackUpdated={refetch} />;
});

Assignees.displayName = 'Assignees';
