/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, EuiSkeletonRectangle } from '@elastic/eui';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { RUNTIME_FIELD_MAP } from '../../../../../../../detections/components/alert_summary/wrapper';
import { Table } from './table';
import { useSpaceId } from '../../../../../../../common/hooks/use_space_id';
import { useFetchIntegrations } from '../../../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useCreateDataView } from '../../../../../../../common/hooks/use_create_data_view';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../../../common/constants';

const DATAVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiForSocTableTab.dataViewError',
  {
    defaultMessage: 'Unable to create data view',
  }
);

export const ERROR_TEST_ID = 'attack-discovery-alert-error';
export const SKELETON_TEST_ID = 'attack-discovery-alert-skeleton';
export const CONTENT_TEST_ID = 'attack-discovery-alert-content';

interface AiForSOCAlertsTabProps {
  /**
   * Id to pass down to the ResponseOps alerts table
   */
  id: string;
  /**
   * Query that contains the id of the alerts to display in the table
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
}

/**
 * Component used in the Attack Discovery alerts table, only in the AI4DSOC tier.
 * It fetches packages (integrations) and creates a local dataView.
 * It renders a loading skeleton while packages are being fetched and while the dataView is being created.
 */
export const AiForSOCAlertsTab = memo(({ id, query }: AiForSOCAlertsTabProps) => {
  const spaceId = useSpaceId();
  const dataViewSpec = useMemo(
    () => ({
      title: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
      runtimeFieldMap: RUNTIME_FIELD_MAP,
    }),
    [spaceId]
  );

  const { dataView, loading: dataViewLoading } = useCreateDataView({ dataViewSpec });

  // Fetch all integrations
  const { installedPackages, isLoading: integrationIsLoading } = useFetchIntegrations();

  return (
    <EuiSkeletonRectangle
      data-test-subj={SKELETON_TEST_ID}
      height={400}
      isLoading={integrationIsLoading || dataViewLoading}
      width="100%"
    >
      <>
        {!dataView || !dataView.id ? (
          <EuiEmptyPrompt
            color="danger"
            data-test-subj={ERROR_TEST_ID}
            iconType="error"
            title={<h2>{DATAVIEW_ERROR}</h2>}
          />
        ) : (
          <div data-test-subj={CONTENT_TEST_ID}>
            <Table dataView={dataView} id={id} packages={installedPackages} query={query} />
          </div>
        )}
      </>
    </EuiSkeletonRectangle>
  );
});

AiForSOCAlertsTab.displayName = 'AiForSOCAlertsTab';
