/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Store } from 'redux';

import type { SecuritySolutionPluginContext, SelectedDataView } from '../types';
import { useKibana } from '../../common/lib/kibana';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useSetUrlParams } from '../../management/components/artifact_list_page/hooks/use_set_url_params';
import { BlockListForm } from '../../management/pages/blocklist/view/components/blocklist_form';
import { BlocklistsApiClient } from '../../management/pages/blocklist/services';
import { getStore, inputsSelectors } from '../../common/store';
import { FiltersGlobal } from '../../common/components/filters_global';
import { licenseService } from '../../common/hooks/use_license';
import { useSourcererDataView } from '../../sourcerer/containers';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
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

  const sourcererDataView = useSourcererDataView();

  const securitySolutionStore = getStore() as Store;

  const canWriteBlocklist = useUserPrivileges().endpointPrivileges.canWriteBlocklist;

  const contextValue: SecuritySolutionPluginContext = useMemo(
    () => ({
      securitySolutionStore,
      getFiltersGlobalComponent: () => FiltersGlobal,
      getPageWrapper: () => SecuritySolutionPageWrapper,
      licenseService,
      sourcererDataView: sourcererDataView as unknown as SelectedDataView,
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
        securitySolutionStore.dispatch(
          setQuery({
            inputId: InputsModelId.global,
            id: query.id,
            refetch: query.refetch,
            inspect: null,
            loading: query.loading,
          })
        ),
      deregisterQuery: (query) =>
        securitySolutionStore.dispatch(
          deleteOneQuery({
            inputId: InputsModelId.global,
            id: query.id,
          })
        ),

      SiemSearchBar,
    }),
    [canWriteBlocklist, http, securitySolutionStore, sourcererDataView, hasAccessToTimeline]
  );

  return contextValue;
};
