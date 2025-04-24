/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  UNIVERSAL_ENTITY_FLYOUT_OPENED,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetGenericEntity } from './hooks/use_get_generic_entity';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { UniversalEntityFlyoutHeader } from './header';
import { UniversalEntityFlyoutContent } from './content';

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

export interface UniversalEntityPanelProps {
  entityDocId: string;
  /** this is because FlyoutPanelProps defined params as Record<string, unknown> {@link FlyoutPanelProps#params} */
  [key: string]: unknown;
}

export interface UniversalEntityPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'universal-entity-panel';
  params: UniversalEntityPanelProps;
}

export const UniversalEntityPanel = ({ entityDocId }: UniversalEntityPanelProps) => {
  const getGenericEntity = useGetGenericEntity(entityDocId);

  useEffect(() => {
    if (getGenericEntity.data?._id) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, UNIVERSAL_ENTITY_FLYOUT_OPENED);
    }
  }, [getGenericEntity.data?._id]);

  if (getGenericEntity.isLoading) {
    return (
      <>
        <EuiLoadingSpinner size="m" style={{ position: 'absolute', inset: '50%' }} />
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
                id="xpack.securitySolution.universalEntityFlyout.errorTitle"
                defaultMessage="Unable to load entity"
              />
            </h2>
          }
          body={
            isCommonError(getGenericEntity.error) ? (
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.universalEntityFlyout.errorBody"
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
      <FlyoutNavigation flyoutIsExpandable={false} />
      <UniversalEntityFlyoutHeader entity={entity} source={source} />
      <UniversalEntityFlyoutContent source={source} />
    </>
  );
};

UniversalEntityPanel.displayName = 'UniversalEntityPanel';
