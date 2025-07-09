/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import type { SecuritySolutionPluginContext } from '../types';
import { useKibana } from '../../common/lib/kibana';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useSetUrlParams } from '../../management/components/artifact_list_page/hooks/use_set_url_params';
import { BlockListForm } from '../../management/pages/blocklist/view/components/blocklist_form';
import { BlocklistsApiClient } from '../../management/pages/blocklist/services';
import { inputsSelectors } from '../../common/store';
import { licenseService } from '../../common/hooks/use_license';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { deleteOneQuery, setQuery } from '../../common/store/inputs/actions';
import { InputsModelId } from '../../common/store/inputs/constants';
import { ArtifactFlyout } from '../../management/components/artifact_list_page/components/artifact_flyout';
import { extractTimelineCapabilities } from '../../common/utils/timeline_capabilities';

export const useSecurityContext = (): SecuritySolutionPluginContext => {
  const {
    http,
    application: { capabilities },
  } = useKibana().services;

  const { read: hasAccessToTimeline } = extractTimelineCapabilities(capabilities);

  const dispatch = useDispatch();

  const canWriteBlocklist = useUserPrivileges().endpointPrivileges.canWriteBlocklist;

  return useMemo(() => {
    return {
      getPageWrapper: () => SecuritySolutionPageWrapper,
      licenseService,
      hasAccessToTimeline,

      blockList: {
        canWriteBlocklist,
        exceptionListApiClient: BlocklistsApiClient.getInstance(http),
        useSetUrlParams,
        // @ts-ignore
        getFlyoutComponent: () => ArtifactFlyout,
        // @ts-ignore
        getFormComponent: () => BlockListForm,
      } as unknown as SecuritySolutionPluginContext['blockList'],

      useQuery: () => useSelector(inputsSelectors.globalQuerySelector()),
      useFilters: () => useSelector(inputsSelectors.globalFiltersQuerySelector()),
      useGlobalTime,

      registerQuery: (query) =>
        dispatch(
          setQuery({
            inputId: InputsModelId.global,
            id: query.id,
            refetch: query.refetch,
            inspect: null,
            loading: query.loading,
          })
        ),
      deregisterQuery: (query) =>
        dispatch(
          deleteOneQuery({
            inputId: InputsModelId.global,
            id: query.id,
          })
        ),
    };
  }, [hasAccessToTimeline, canWriteBlocklist, http, dispatch]);
};
