/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useSourcererDataView } from '../../sourcerer/containers';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { VisualizationEmbeddable } from '../../common/components/visualization_actions/visualization_embeddable';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { getLensAttributes } from './get_lens_attributes';

const ESQL = `FROM commands-privtest
| RENAME @timestamp AS event_timestamp
| LOOKUP JOIN privileged-users ON user.name
| WHERE MATCH(message, \"sudo su\") 
| RENAME event_timestamp AS @timestamp
| EVAL is_privileged = COALESCE(labels.is_privileged, false)
| EVAL privileged_status = CASE(is_privileged, \"privileged\", \"not_privileged\")
| EVAL timestamp=DATE_TRUNC(30 second, @timestamp)
| stats results = count(*) by timestamp`;

const PrivilegedUserMonitoringComponent = () => {
  const { loading: isSourcererLoading, sourcererDataView } = useSourcererDataView();
  const { to, from } = useGlobalTime();
  const timerange = useMemo(() => ({ from, to }), [from, to]);

  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={'Privileged User Monitoring'} />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
        ) : (
          <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
            <VisualizationEmbeddable
              applyGlobalQueriesAndFilters={true}
              esql={ESQL}
              data-test-subj="embeddable-matrix-histogram"
              getLensAttributes={getLensAttributes}
              height={155}
              id={'my-id'}
              timerange={timerange}
            />
          </EuiFlexGroup>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </>
  );
};

export const PrivilegedUserMonitoringPage = React.memo(PrivilegedUserMonitoringComponent);

// [x] New page
// [x] ESQL JOIN based lens visualisation
// [x] Stack by visualization with lens
// [ ] ESQL JOIN based search strategy backed visualisation
//    [ ] implemented using search strategies
//  [x] Searchbar with KQL query (it would be good to look in kibana how other people build ESQL commands. e.g lens must do it because they add limits to queries for you, hopefully there is a nice library)
//  [ ] inspect button
