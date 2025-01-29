/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiSuperSelect } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { Filter, Query } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import { EventsByDataset } from '../../../overview/components/events_by_dataset';
import { SignalsByCategory } from '../../../overview/components/signals_by_category';
import type { InputsModelId } from '../../store/inputs/constants';
import type { TimelineEventsType } from '../../../../common/types/timeline';
import type { TopNOption } from './helpers';
import { getSourcererScopeName, removeIgnoredAlertFilters } from './helpers';
import * as i18n from './translations';
import type { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

const TopNContainer = styled.div`
  min-width: 600px;
`;

const CloseButton = styled(EuiButtonIcon)`
  position: absolute;
  right: 4px;
  top: 4px;
`;

const ViewSelect = styled(EuiSuperSelect<string>)`
  width: 170px;
`;

const TopNContent = styled.div`
  margin-top: 4px;
  margin-right: ${({ theme }) => theme.eui.euiSizeXS};

  .euiPanel {
    border: none;
  }
`;

export interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  filterQuery?: string;
  defaultView: TimelineEventsType;
  field: AlertsStackByField;
  filters: Filter[];
  indexPattern?: DataViewSpec;
  options: TopNOption[];
  paddingSize?: 's' | 'm' | 'l' | 'none';
  query: Query;
  setAbsoluteRangeDatePickerTarget: InputsModelId;
  scopeId?: string;
  toggleTopN: () => void;
  onFilterAdded?: () => void; // eslint-disable-line react/no-unused-prop-types
  applyGlobalQueriesAndFilters?: boolean;
}

const TopNComponent: React.FC<Props> = ({
  filterQuery,
  defaultView,
  deleteQuery,
  filters,
  field,
  from,
  indexPattern,
  options,
  paddingSize,
  query,
  setAbsoluteRangeDatePickerTarget,
  setQuery,
  scopeId,
  to,
  toggleTopN,
  applyGlobalQueriesAndFilters,
}) => {
  const [view, setView] = useState<TimelineEventsType>(defaultView);
  const onViewSelected = useCallback(
    (value: string) => setView(value as TimelineEventsType),
    [setView]
  );
  const sourcererScopeId = getSourcererScopeName({ scopeId, view });

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const headerChildren = useMemo(
    () => (
      <ViewSelect
        data-test-subj="view-select"
        disabled={options.length === 1}
        onChange={onViewSelected}
        options={options}
        valueOfSelected={view}
      />
    ),
    [onViewSelected, options, view]
  );

  // alert workflow statuses (e.g. open | closed) and other alert-specific
  // filters must be ignored when viewing raw alerts
  const applicableFilters = useMemo(
    () => removeIgnoredAlertFilters({ filters, tableId: scopeId, view }),
    [filters, scopeId, view]
  );

  return (
    <TopNContainer data-test-subj="topN-container">
      <TopNContent>
        {view === 'raw' || view === 'all' ? (
          <EventsByDataset
            filterQuery={filterQuery}
            deleteQuery={deleteQuery}
            filters={applicableFilters}
            from={from}
            headerChildren={headerChildren}
            dataViewSpec={indexPattern}
            onlyField={field}
            paddingSize={paddingSize}
            query={query}
            queryType="topN"
            setQuery={setQuery}
            showSpacer={false}
            toggleTopN={toggleTopN}
            sourcererScopeId={sourcererScopeId}
            to={to}
            hideQueryToggle
            applyGlobalQueriesAndFilters={applyGlobalQueriesAndFilters}
          />
        ) : (
          <SignalsByCategory
            filters={applicableFilters}
            headerChildren={headerChildren}
            onlyField={field}
            paddingSize={paddingSize}
            setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
            hideQueryToggle
          />
        )}
      </TopNContent>

      <CloseButton
        aria-label={i18n.CLOSE}
        data-test-subj="close"
        iconType="cross"
        onClick={toggleTopN}
      />
    </TopNContainer>
  );
};

TopNComponent.displayName = 'TopNComponent';

export const TopN = React.memo(TopNComponent);
