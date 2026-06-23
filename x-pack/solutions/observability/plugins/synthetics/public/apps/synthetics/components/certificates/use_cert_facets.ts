/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { CertFacets } from '../../../../../common/runtime_types';
import { getCertFacets } from '../../state/certs/api';
import { SyntheticsRefreshContext } from '../../contexts';

/**
 * Fetches global distinct-cert counts per quick-filter value. These are independent
 * of the active quick-filter selection (so sibling values keep their counts), and
 * refresh alongside the certificates list via the shared refresh context.
 *
 * `remoteNames` scopes facet counts to the selected remote clusters, so the
 * counts stay consistent with what the certificates list is showing under the
 * same Cluster filter. Local certs are always included.
 */
export const useCertFacets = (remoteNames?: string[]): CertFacets | undefined => {
  const { lastRefresh } = useContext(SyntheticsRefreshContext);

  const remoteNamesKey = remoteNames?.join(',') ?? '';

  const { data } = useFetcher(
    () => getCertFacets(remoteNames),
    // useFetcher does not support dynamic deps, so we serialize the cluster
    // selection into a stable string key.
    [lastRefresh, remoteNamesKey]
  );

  return data;
};
