/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import numeral from '@elastic/numeral';
import React, { useCallback, useEffect, useMemo } from 'react';

import type { Filter, Query } from '@kbn/es-query';
import styled from '@emotion/styled';
import { EuiButton } from '@elastic/eui';
import type { DataView } from '@kbn/data-plugin/common';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { PageScope } from '../../../data_view_manager/constants';
import { APP_UI_ID, DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { SHOWING, UNIT } from '../../../common/components/events_viewer/translations';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import type {
  MatrixHistogramConfigs,
  MatrixHistogramOption,
} from '../../../common/components/matrix_histogram/types';
import { convertToBuildEsQuery } from '../../../common/lib/kuery';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import {
  eventsHistogramConfig,
  eventsStackByOptions,
  NO_BREAKDOWN_STACK_BY_VALUE,
} from '../../../common/components/events_tab/histogram_configurations';
import { HostsTableType } from '../../../explore/hosts/store/model';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';

import * as i18n from '../../pages/translations';
import { SecurityPageName } from '../../../app/types';
import { useFormatUrl } from '../../../common/components/link_to';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';

const DEFAULT_STACK_BY = NO_BREAKDOWN_STACK_BY_VALUE;

const ID = 'eventsByDatasetOverview';
const CHART_HEIGHT = 160;

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery'> {
  filterQuery?: string;
  filters: Filter[];
  headerChildren?: React.ReactNode;
  dataView: DataView;
  onlyField?: string;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  query: Query;
  // Make a unique query type everywhere this query is used
  queryType: 'topN' | 'overview';
  showSpacer?: boolean;
  hideQueryToggle?: boolean;
  sourcererScopeId?: PageScope;
  applyGlobalQueriesAndFilters?: boolean;
}

const getHistogramOption = (fieldName: string): MatrixHistogramOption => ({
  text: fieldName,
  value: fieldName,
});

const StyledLinkButton = styled(EuiButton)`
  margin-left: 0;
  @media only screen and (min-width: ${(props) => props.theme.euiTheme.breakpoint.m}) {
    margin-left: ${({ theme }) => theme.euiTheme.size.l};
  }
`;

const EventsByDatasetComponent: React.FC<Props> = ({
  filterQuery: filterQueryFromProps,
  deleteQuery,
  filters,
  from,
  headerChildren,
  dataView,
  onlyField,
  paddingSize,
  query,
  queryType,
  showSpacer = true,
  sourcererScopeId,
  to,
  hideQueryToggle = false,
  applyGlobalQueriesAndFilters,
}) => {
  const uniqueQueryId = useMemo(() => `${ID}-${queryType}`, [queryType]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: uniqueQueryId });
      }
    };
  }, [deleteQuery, uniqueQueryId]);

  const kibana = useKibana();
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.hosts);
  const { navigateToApp } = kibana.services.application;
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const goToHostEvents = useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.hosts,
        path: getTabsOnHostsUrl(HostsTableType.events, urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const eventsCountViewEventsButton = useMemo(
    () => (
      <StyledLinkButton
        onClick={goToHostEvents}
        href={formatUrl(getTabsOnHostsUrl(HostsTableType.events))}
      >
        {i18n.VIEW_EVENTS}
      </StyledLinkButton>
    ),
    [goToHostEvents, formatUrl]
  );

  const [filterQuery, kqlError] = useMemo(() => {
    if (filterQueryFromProps == null) {
      return convertToBuildEsQuery({
        config: getEsQueryConfig(kibana.services.uiSettings),
        dataView,
        queries: [query],
        filters,
      });
    }
    return [filterQueryFromProps];
  }, [filterQueryFromProps, kibana.services.uiSettings, dataView, query, filters]);

  useInvalidFilterQuery({
    id: uniqueQueryId,
    filterQuery,
    kqlError,
    query,
    startDate: from,
    endDate: to,
  });

  const eventsByDatasetHistogramConfigs: MatrixHistogramConfigs = useMemo(
    () => ({
      ...eventsHistogramConfig,
      stackByOptions:
        onlyField != null ? [getHistogramOption(onlyField)] : eventsHistogramConfig.stackByOptions,
      defaultStackByOption:
        onlyField != null
          ? getHistogramOption(onlyField)
          : eventsStackByOptions.find((o) => o.value === DEFAULT_STACK_BY) ??
            eventsStackByOptions[0],
      legendPosition: Position.Right,
      subtitle: (totalCount: number) =>
        `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
      titleSize: onlyField == null ? 'm' : 's',
    }),
    [onlyField, defaultNumberFormat]
  );

  const headerContent = useMemo(() => {
    if (onlyField == null || headerChildren != null) {
      return (
        <>
          {headerChildren}
          {onlyField == null && eventsCountViewEventsButton}
        </>
      );
    } else {
      return null;
    }
  }, [onlyField, headerChildren, eventsCountViewEventsButton]);

  return (
    <MatrixHistogram
      endDate={to}
      filterQuery={filterQuery}
      headerChildren={headerContent}
      id={uniqueQueryId}
      paddingSize={paddingSize}
      showSpacer={showSpacer}
      startDate={from}
      sourcererScopeId={sourcererScopeId}
      {...eventsByDatasetHistogramConfigs}
      title={onlyField != null ? i18n.TOP(onlyField) : eventsByDatasetHistogramConfigs.title}
      chartHeight={CHART_HEIGHT}
      hideQueryToggle={hideQueryToggle}
      applyGlobalQueriesAndFilters={applyGlobalQueriesAndFilters}
    />
  );
};

EventsByDatasetComponent.displayName = 'EventsByDatasetComponent';

export const EventsByDataset = React.memo(EventsByDatasetComponent);
