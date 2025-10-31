/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import React, { useMemo } from 'react';

import { TableId } from '@kbn/securitysolution-data-table';
import { getEsQueryConfig } from '@kbn/data-service';
import { useBrowserFields } from '../../../../../../data_view_manager/hooks/use_browser_fields';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { SourcererScopeName } from '../../../../../../sourcerer/store/model';
import { combineQueries } from '../../../../../../common/lib/kuery';
import { buildTimeRangeFilter } from '../../../../../../detections/components/alerts_table/helpers';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../../common/store';
import { EaseAlertsTab } from './ease/wrapper';
import { useKibana } from '../../../../../../common/lib/kibana';
import { SECURITY_FEATURE_ID } from '../../../../../../../common';
import { AlertsTable } from '../../../../../../detections/components/alerts_table';
import { getColumns } from '../../../../../../detections/configurations/security_solution_detections/columns';
import { DataViewManagerScopeName } from '../../../../../../data_view_manager/constants';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}

const AlertsTabComponent: React.FC<Props> = ({ attackDiscovery, replacements }) => {
  const {
    application: { capabilities },
    uiSettings,
  } = useKibana().services;

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const { to: globalTo, from: globalFrom } = useGlobalTime();

  const { dataView } = useDataView(SourcererScopeName.detections);
  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);
  const browserFields = useBrowserFields(DataViewManagerScopeName.detections, dataView);

  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218731
  //  For EASE we need to show the Alert summary page alerts table
  const EASE = capabilities[SECURITY_FEATURE_ID].configurations;

  const originalAlertIds = useMemo(
    () => getOriginalAlertIds({ alertIds: attackDiscovery.alertIds, replacements }),
    [attackDiscovery, replacements]
  );

  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: originalAlertIds,
      },
    }),
    [originalAlertIds]
  );

  const timeRangeFilter = useMemo(
    () => buildTimeRangeFilter(globalFrom, globalTo),
    [globalFrom, globalTo]
  );
  const filters = useMemo(
    () => [
      ...globalFilters,
      ...timeRangeFilter,
      {
        query: { terms: { _id: originalAlertIds } },
        meta: {},
      },
    ],
    [globalFilters, originalAlertIds, timeRangeFilter]
  );

  const newQuery = useMemo(() => {
    const combinedQuery = combineQueries({
      config: getEsQueryConfig(uiSettings),
      dataProviders: [],
      dataViewSpec,
      dataView,
      browserFields,
      filters,
      kqlQuery: globalQuery,
      kqlMode: globalQuery.language,
    });

    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return { bool: {} };
    }

    try {
      const filter = JSON.parse(combinedQuery?.filterQuery);
      return { bool: { filter } };
    } catch {
      return { bool: {} };
    }
  }, [browserFields, dataView, dataViewSpec, filters, globalQuery, uiSettings]);

  const id = useMemo(() => `attack-discovery-alerts-${attackDiscovery.id}`, [attackDiscovery.id]);

  // add workflow_status as the 2nd column in the table:
  const columns = useMemo(() => {
    const defaultColumns = getColumns();

    return [
      ...defaultColumns.slice(0, 1),
      {
        columnHeaderType: 'not-filtered',
        id: 'kibana.alert.workflow_status',
      },
      ...defaultColumns.slice(1),
    ];
  }, []);

  return (
    <div data-test-subj="alertsTab">
      {EASE ? (
        <div data-test-subj="ease-alerts-table">
          <EaseAlertsTab id={id} query={alertIdsQuery} />
        </div>
      ) : (
        <div data-test-subj="detection-engine-alerts-table">
          <AlertsTable
            columns={columns}
            id={id}
            tableType={TableId.alertsOnCasePage}
            ruleTypeIds={SECURITY_SOLUTION_RULE_TYPE_IDS}
            query={newQuery}
            showAlertStatusWithFlapping={false}
          />
        </div>
      )}
    </div>
  );
};

AlertsTabComponent.displayName = 'AlertsTab';

export const AlertsTab = React.memo(AlertsTabComponent);
