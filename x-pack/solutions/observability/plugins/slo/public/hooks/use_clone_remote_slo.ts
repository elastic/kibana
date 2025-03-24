/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useCallback } from 'react';
import { createRemoteSloCloneUrl } from '../utils/slo/remote_slo_urls';
import { useSpace } from './use_space';

export function useCloneRemoteSlo() {
  const spaceId = useSpace();

  return useCallback(
    (slo: SLOWithSummaryResponse) => {
      window.open(createRemoteSloCloneUrl(slo, spaceId), '_blank');
    },
    [spaceId]
  );
}
