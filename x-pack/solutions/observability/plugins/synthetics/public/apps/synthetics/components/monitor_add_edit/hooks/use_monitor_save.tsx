/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useParams, useRouteMatch } from 'react-router-dom';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams } from '../../../hooks';
import { MONITOR_EDIT_ROUTE } from '../../../../../../common/constants';
import { SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { createMonitorAPI, updateMonitorAPI } from '../../../state/monitor_management/api';
import { kibanaService } from '../../../../../utils/kibana_service';
import { cleanMonitorListState, IHttpSerializedFetchError } from '../../../state';
import { useSyntheticsRefreshContext } from '../../../contexts';

export const useMonitorSave = ({ monitorData }: { monitorData?: SyntheticsMonitor }) => {
  const dispatch = useDispatch();
  const { refreshApp } = useSyntheticsRefreshContext();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { spaceId } = useGetUrlParams();

  const editRouteMatch = useRouteMatch({ path: MONITOR_EDIT_ROUTE });
  const isEdit = editRouteMatch?.isExact;

  const { data, status, loading, error } = useFetcher(() => {
    if (monitorData) {
      if (isEdit) {
        return updateMonitorAPI({
          id: monitorId,
          spaceId,
          monitor: monitorData,
        });
      } else {
        return createMonitorAPI({
          monitor: monitorData,
        });
      }
    }
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Synthetics folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorData]);

  useEffect(() => {
    const { coreStart, toasts } = kibanaService;

    if (status === FETCH_STATUS.FAILURE && error) {
      toasts.addError(
        {
          ...error,
          message: (error as unknown as IHttpSerializedFetchError).body.message ?? error.message,
        },
        { title: MONITOR_FAILURE_LABEL }
      );
    } else if (status === FETCH_STATUS.SUCCESS && !loading) {
      refreshApp();
      dispatch(cleanMonitorListState());
      toasts.addSuccess({
        title: monitorId ? MONITOR_UPDATED_SUCCESS_LABEL : MONITOR_SUCCESS_LABEL,
        text: toMountPoint(
          <p data-test-subj="synthetcsMonitorSaveSubtext">
            {monitorId ? MONITOR_UPDATED_SUCCESS_LABEL_SUBTEXT : MONITOR_SUCCESS_LABEL_SUBTEXT}
          </p>,
          coreStart
        ),
        toastLifeTimeMs: 3000,
      });
    }
  }, [data, status, monitorId, loading, refreshApp, dispatch, error]);

  return { status, loading, isEdit };
};

const MONITOR_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorAddedSuccessMessage',
  {
    defaultMessage: 'Monitor added successfully.',
  }
);

const MONITOR_SUCCESS_LABEL_SUBTEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorAddedSuccessMessage.subtext',
  {
    defaultMessage: 'It will next run according to its defined schedule.',
  }
);

const MONITOR_UPDATED_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorEditedSuccessMessage',
  {
    defaultMessage: 'Monitor updated successfully.',
  }
);

const MONITOR_FAILURE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be saved. Please try again later.',
  }
);

const MONITOR_UPDATED_SUCCESS_LABEL_SUBTEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorFailureMessage.subtext',
  {
    defaultMessage: 'It will next run according to its defined schedule.',
  }
);
