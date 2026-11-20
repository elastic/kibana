/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import { ANALYTICS_SAMPLE_EVENTS_PATH } from '../../../common/analytics_sample_events';
import type { AnalyticsSampleEventsInstallResult } from '../../../common/analytics_sample_events';
import { useKibana } from '../../hooks/use_kibana';
import type { AnalyticsSampleData, AnalyticsSampleDatasetId } from '../types';

const SAMPLE_DATA_API_PATH = '/api/sample_data';
const INSTALLED_STATUS = 'installed';

interface SampleDatasetListItem {
  id: string;
  status?: string;
}

// Posting to the sample data API reinstalls a data set, so the installed ones are read first.
const installKibanaSampleDataset = async (http: HttpStart, dataset: string): Promise<void> => {
  const datasets = await http.get<SampleDatasetListItem[]>(SAMPLE_DATA_API_PATH);
  const isInstalled = datasets.some(
    ({ id, status }) => id === dataset && status === INSTALLED_STATUS
  );

  if (!isInstalled) {
    await http.post(`${SAMPLE_DATA_API_PATH}/${encodeURIComponent(dataset)}`);
  }
};

/** Installs the generated clickstream events, or the Kibana sample data set behind a use case. */
export const useSampleData = (): AnalyticsSampleData => {
  const { http, notifications } = useKibana().services;
  const [pendingInstalls, setPendingInstalls] = useState(0);

  const install = useCallback(
    async (dataset: AnalyticsSampleDatasetId): Promise<boolean> => {
      setPendingInstalls((count) => count + 1);
      try {
        if (dataset === 'clickstream') {
          // The route leaves complete, recent events untouched.
          await http.post<AnalyticsSampleEventsInstallResult>(ANALYTICS_SAMPLE_EVENTS_PATH);
        } else {
          await installKibanaSampleDataset(http, dataset);
        }
        return true;
      } catch (error) {
        notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: i18n.translate('xpack.searchHomepage.analytics.sampleData.installErrorTitle', {
            defaultMessage: 'Unable to install sample events',
          }),
        });
        return false;
      } finally {
        setPendingInstalls((count) => count - 1);
      }
    },
    [http, notifications]
  );

  return useMemo(
    () => ({ isInstalling: pendingInstalls > 0, install }),
    [pendingInstalls, install]
  );
};
