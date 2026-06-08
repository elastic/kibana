/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { Status as V2Status } from '../../../flyout_v2/attack/main/components/status';
import { useAttackDetailsContext } from '../context';

/**
 * Context bridge: wraps the v2 Status component for the legacy attack details flyout.
 * Reads searchHit and refetch from context, builds a DataTableRecord, then delegates to v2.
 */
export const Status = memo(() => {
  const { searchHit, refetch } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  return <V2Status hit={hit} onAttackUpdated={refetch} />;
});

Status.displayName = 'Status';
