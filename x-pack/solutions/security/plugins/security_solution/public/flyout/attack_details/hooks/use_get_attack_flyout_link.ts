/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { buildAttackDetailPath } from '../../../../common/utils/attack_detail_path';
import { useAppUrl } from '../../../common/lib/kibana/hooks';

export interface UseGetAttackFlyoutLinkProps {
  attackId: string;
  indexName: string;
  timestamp: string | undefined;
}

/**
 * Hook to get the absolute URL for the attack details redirect (Attacks page + flyout).
 */
export const useGetAttackFlyoutLink = ({
  attackId,
  indexName,
  timestamp,
}: UseGetAttackFlyoutLinkProps): string | null => {
  const { getAppUrl } = useAppUrl();

  const attackDetailsLink = useMemo(() => {
    if (!timestamp) {
      return null;
    }
    const path = buildAttackDetailPath({
      attackId,
      index: indexName,
      timestamp,
    });
    const url = getAppUrl({ path });
    return `${window.location.origin}${url}`;
  }, [attackId, getAppUrl, indexName, timestamp]);

  return attackDetailsLink;
};
