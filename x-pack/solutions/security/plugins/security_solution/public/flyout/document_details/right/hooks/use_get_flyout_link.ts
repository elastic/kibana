/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';

import { buildAlertDetailPath } from '../../../../../common/utils/alert_detail_path';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';

export interface UseGetFlyoutLinkProps {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * Timestamp of the document
   */
  timestamp: string;
}

/**
 * Hook to get the link to the alert details page
 */
export const useGetFlyoutLink = ({
  eventId,
  indexName,
  timestamp,
}: UseGetFlyoutLinkProps): string | null => {
  const { getAppUrl } = useAppUrl();
  const alertDetailPath = buildAlertDetailPath({
    alertId: eventId,
    index: indexName,
    timestamp,
  });
  const isPreviewAlert = indexName.includes(DEFAULT_PREVIEW_INDEX);

  // getAppUrl accounts for the users selected space
  const alertDetailsLink = useMemo(() => {
    if (isPreviewAlert) return null;
    const url = getAppUrl({ path: alertDetailPath });
    // We use window.location.origin instead of http.basePath as the http.basePath has to be configured in config dev yml
    return `${window.location.origin}${url}`;
  }, [isPreviewAlert, getAppUrl, alertDetailPath]);

  return alertDetailsLink;
};
