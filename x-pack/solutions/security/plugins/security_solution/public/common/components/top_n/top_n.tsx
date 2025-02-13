/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiSuperSelect, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';

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

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    topNContainer: css`
      min-width: 600px;
    `,
    closeButton: css`
      position: absolute;
      right: 4px;
      top: 4px;
    `,
    viewSelect: css`
      width: 170px;
    `,
    topNContent: css`
      margin-top: 4px;
      margin-right: ${euiTheme.size.xs};

      .euiPanel {
        border: none;
      }
    `,
  };
};

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
  const styles = useStyles();
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
      <EuiSuperSelect<string>
        css={styles.viewSelect}
        data-test-subj="view-select"
        disabled={options.length === 1}
        onChange={onViewSelected}
        options={options}
        valueOfSelected={view}
      />
    ),
    [onViewSelected, options, styles.viewSelect, view]
  );

  // alert workflow statuses (e.g. open | closed) and other alert-specific
  // filters must be ignored when viewing raw alerts
  const applicableFilters = useMemo(
    () => removeIgnoredAlertFilters({ filters, tableId: scopeId, view }),
    [filters, scopeId, view]
  );

  return (
    <div css={styles.topNContainer} data-test-subj="topN-container">
      <div css={styles.topNContent}>
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
      </div>

      <EuiButtonIcon
        css={styles.closeButton}
        aria-label={i18n.CLOSE}
        data-test-subj="close"
        iconType="cross"
        onClick={toggleTopN}
      />
    </div>
  );
};

TopNComponent.displayName = 'TopNComponent';

export const TopN = React.memo(TopNComponent);
