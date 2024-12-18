/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { SecuritySolutionPluginContext } from '@kbn/threat-intelligence-plugin/public';
import { THREAT_INTELLIGENCE_BASE_PATH } from '@kbn/threat-intelligence-plugin/public';
import type { Store } from 'redux';
import { useSelector } from 'react-redux';
import type { SelectedDataView } from '@kbn/threat-intelligence-plugin/public/types';
import { useUserPrivileges } from '../common/components/user_privileges';
import { useSetUrlParams } from '../management/components/artifact_list_page/hooks/use_set_url_params';
import { BlockListForm } from '../management/pages/blocklist/view/components/blocklist_form';
import { BlocklistsApiClient } from '../management/pages/blocklist/services';
import { useInvestigateInTimeline } from './use_investigate_in_timeline';
import { getStore, inputsSelectors } from '../common/store';
import { useKibana } from '../common/lib/kibana';
import { FiltersGlobal } from '../common/components/filters_global';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { licenseService } from '../common/hooks/use_license';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { useSourcererDataView } from '../sourcerer/containers';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SiemSearchBar } from '../common/components/search_bar';
import { useGlobalTime } from '../common/containers/use_global_time';
import { deleteOneQuery, setQuery } from '../common/store/inputs/actions';
import { InputsModelId } from '../common/store/inputs/constants';
import { ArtifactFlyout } from '../management/components/artifact_list_page/components/artifact_flyout';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const ThreatIntelligence = memo(() => {
  const { threatIntelligence, http } = useKibana().services;
  const ThreatIntelligencePlugin = threatIntelligence.getComponent();

  const sourcererDataView = useSourcererDataView();

  const securitySolutionStore = getStore() as Store;

  const canWriteBlocklist = useUserPrivileges().endpointPrivileges.canWriteBlocklist;

  const securitySolutionContext: SecuritySolutionPluginContext = useMemo(
    () => ({
      securitySolutionStore,
      getFiltersGlobalComponent: () => FiltersGlobal,
      getPageWrapper: () => SecuritySolutionPageWrapper,
      licenseService,
      sourcererDataView: sourcererDataView as unknown as SelectedDataView,
      getUseInvestigateInTimeline: useInvestigateInTimeline,

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
    [canWriteBlocklist, http, securitySolutionStore, sourcererDataView]
  );

  return (
    <SecurityRoutePageWrapper pageName={SecurityPageName.threatIntelligence}>
      <ThreatIntelligencePlugin securitySolutionContext={securitySolutionContext} />
      <SpyRoute pageName={SecurityPageName.threatIntelligence} />
    </SecurityRoutePageWrapper>
  );
});

ThreatIntelligence.displayName = 'ThreatIntelligence';

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_BASE_PATH,
    render: () => <ThreatIntelligence />,
  },
];
