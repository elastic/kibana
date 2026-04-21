/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DEFAULT_PREVIEW_INDEX } from '../../../../common/constants';

import { buildAttackDetailPath } from '../../../../common/utils/attack_detail_path';
import { useAppUrl } from '../../../common/lib/kibana/hooks';

export interface UseGetAttackFlyoutLinkProps {
  attackId: string;
  indexName: string;
  timestamp: string | undefined;
  isPreviewMode: boolean;
}

/**
 * Hook to get the absolute URL for the attack details redirect (Attacks page + flyout).
 */
export const useGetAttackFlyoutLink = ({
  attackId,
  indexName,
  timestamp,
  isPreviewMode,
}: UseGetAttackFlyoutLinkProps): string | null => {
  const { getAppUrl } = useAppUrl();
  const isPreviewIndex = indexName.includes(DEFAULT_PREVIEW_INDEX);

  const attackDetailsLink = useMemo(() => {
    if (isPreviewMode || isPreviewIndex || !timestamp) {
      return null;
    }
    const path = buildAttackDetailPath({
      attackId,
      index: indexName,
      timestamp,
    });
    const url = getAppUrl({ path });
    return `${window.location.origin}${url}`;
  }, [attackId, getAppUrl, indexName, isPreviewIndex, isPreviewMode, timestamp]);

  return attackDetailsLink;
};
