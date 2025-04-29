/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  GENERIC_ENTITY_FLYOUT_OPENED,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { GenericEntityDetailsPanelKey } from '../generic_details_left';
import { useGetGenericEntity } from './hooks/use_get_generic_entity';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { useGenericEntityCriticality } from './hooks/use_generic_entity_criticality';
import { GenericEntityFlyoutHeader } from './header';
import { GenericEntityFlyoutContent } from './content';

interface CommonError {
  body: {
    error: string;
    message: string;
    statusCode: number;
  };
}

export const isCommonError = (error: unknown): error is CommonError => {
  // @ts-ignore TS2339: Property body does not exist on type {}
  if (!error?.body || !error?.body?.error || !error?.body?.message || !error?.body?.statusCode) {
    return false;
  }

  return true;
};

export interface GenericEntityPanelProps {
  entityDocId: string;
  /** this is because FlyoutPanelProps defined params as Record<string, unknown> {@link FlyoutPanelProps#params} */
  [key: string]: unknown;
}

export interface GenericEntityPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'generic-entity-panel';
  params: GenericEntityPanelProps;
}

export const GenericEntityPanel = ({ entityDocId }: GenericEntityPanelProps) => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { getGenericEntity } = useGetGenericEntity(entityDocId);
  const { getAssetCriticality } = useGenericEntityCriticality({
    enabled: !!getGenericEntity.data?._source?.entity.id,
    idField: 'entity.id',
    // @ts-ignore since this query is only enabled when the entity.id exists, we can safely assume that idValue won't be undefined
    idValue: getGenericEntity.data?._source?.entity.id,
  });

  useEffect(() => {
    if (getGenericEntity.data?._id) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, GENERIC_ENTITY_FLYOUT_OPENED);
    }
  }, [getGenericEntity.data?._id]);

  // const { telemetry } = useKibana().services;
  // const { eventId, indexName, scopeId, isPreview } = useDocumentDetailsContext();

  const expandDetails = useCallback(() => {
    openLeftPanel({
      id: GenericEntityDetailsPanelKey,
      path: {
        tab: 'csp_insights',
      },
      params: {
        isRiskScoreExist: false,
        name: 'name',
        field: 'agent.type',
        value: 'cloudbeat',
        entityDocId,
        scopeId: 'table',
        hasMisconfigurationFindings: false,
        hasVulnerabilitiesFindings: false,
        hasNonClosedAlerts: true,
        // id: eventId,
        // indexName,
        // scopeId,
      },
    });
    // telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
    //   location: scopeId,
    //   panel: 'left',
    // });
    // }, [eventId, openLeftPanel, indexName, scopeId, telemetry]);
  }, [openLeftPanel]);

  if (getGenericEntity.isLoading || getAssetCriticality.isLoading) {
    return (
      <>
        <EuiLoadingSpinner size="xl" css={{ position: 'absolute', inset: '50%' }} />
      </>
    );
  }

  if (!getGenericEntity.data?._source || getGenericEntity.isError) {
    return (
      <>
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.genericEntityFlyout.errorTitle"
                defaultMessage="Unable to load entity"
              />
            </h2>
          }
          body={
            isCommonError(getGenericEntity.error) ? (
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.genericEntityFlyout.errorBody"
                  defaultMessage="{error} {statusCode}: {body}"
                  values={{
                    error: getGenericEntity.error.body.error,
                    statusCode: getGenericEntity.error.body.statusCode,
                    body: getGenericEntity.error.body.message,
                  }}
                />
              </p>
            ) : undefined
          }
        />
      </>
    );
  }

  const source = getGenericEntity.data._source;
  const entity = getGenericEntity.data._source.entity;

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
      <GenericEntityFlyoutHeader entity={entity} source={source} />
      <GenericEntityFlyoutContent source={source} />
    </>
  );
};

GenericEntityPanel.displayName = 'GenericEntityPanel';
