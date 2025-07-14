/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '@kbn/security-solution-navigation';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { encode } from '@kbn/rison';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { LinkAnchor } from '../../../../../common/components/links';
import { HeaderSection } from '../../../../../common/components/header_section';
import { PAGE_SIZE, PRIVILEGED_USER_ACTIVITY_QUERY_ID } from './constants';
import { EsqlDashboardPanel } from '../../../privileged_user_monitoring_onboarding/components/esql_dashboard_panel/esql_dashboard_panel';
import { usePrivilegedUserActivityParams, useStackByOptions, useToggleOptions } from './hooks';
import type { TableItemType } from './types';
import { VisualizationToggleOptions } from './types';

const PICK_VISUALIZATION_LEGEND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.pickVisualizationLegend',
  { defaultMessage: 'Select a visualization to display' }
);

const TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.title',
  { defaultMessage: 'Privileged user activity' }
);

export const UserActivityPrivilegedUsersPanel: React.FC<{
  sourcererDataView: DataViewSpec;
}> = ({ sourcererDataView }) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(PRIVILEGED_USER_ACTIVITY_QUERY_ID);
  const { from, to } = useGlobalTime();
  const [selectedToggleOption, setToggleOption] = useState<VisualizationToggleOptions>(
    VisualizationToggleOptions.GRANTED_RIGHTS
  );

  const {
    getLensAttributes,
    columns,
    generateVisualizationQuery,
    generateTableQuery,
    hasLoadedDependencies,
  } = usePrivilegedUserActivityParams(selectedToggleOption, sourcererDataView);
  const stackByOptions = useStackByOptions(selectedToggleOption);
  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? stackByOptions[0]
      );
    },
    [stackByOptions]
  );
  const defaultStackByOption = stackByOptions[0];
  const [selectedStackByOption, setSelectedStackByOption] = useState(defaultStackByOption);
  const toggleOptions = useToggleOptions();
  const { getAppUrl } = useNavigation();

  const { discoverUrl } = useMemo(() => {
    if (!generateTableQuery) return { discoverUrl: '' };

    const query = generateTableQuery('@timestamp', 'DESC', 100);
    const appState = {
      query: {
        esql: query,
      },
    };

    try {
      const encodedAppState = encode(appState);
      return {
        discoverUrl: getAppUrl({
          appId: 'discover',
          path: `#/?_a=${encodedAppState}`,
        }),
      };
    } catch (error) {
      return {
        discoverUrl: getAppUrl({
          appId: 'discover',
          path: '#/',
        }),
      };
    }
  }, [generateTableQuery, getAppUrl]);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="severity-level-panel">
      <HeaderSection
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        id={PRIVILEGED_USER_ACTIVITY_QUERY_ID}
        showInspectButton={false}
        title={TITLE}
        titleSize="s"
        outerDirection="column"
        hideSubtitle
      >
        {generateTableQuery && (
          <LinkAnchor href={discoverUrl}>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.linkDescription"
              defaultMessage="View all events"
            />
          </LinkAnchor>
        )}
      </HeaderSection>
      {toggleStatus && (
        <>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                options={toggleOptions}
                idSelected={selectedToggleOption}
                onChange={(id) => {
                  setToggleOption(id as VisualizationToggleOptions);
                  setSelectedStackByOption(defaultStackByOption);
                }}
                legend={PICK_VISUALIZATION_LEGEND}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {stackByOptions.length > 1 && (
                <EuiSelect
                  onChange={setSelectedChartOptionCallback}
                  options={stackByOptions}
                  prepend={i18n.translate('xpack.securitySolution.genericDashboard.stackBy.label', {
                    defaultMessage: 'Stack by',
                  })}
                  value={selectedStackByOption?.value}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {generateVisualizationQuery && generateTableQuery ? (
            <EsqlDashboardPanel<TableItemType>
              title={TITLE}
              stackByField={selectedStackByOption.value}
              timerange={{ from, to }}
              getLensAttributes={getLensAttributes}
              generateVisualizationQuery={generateVisualizationQuery}
              generateTableQuery={generateTableQuery}
              columns={columns}
              pageSize={PAGE_SIZE}
              showInspectTable={true}
            />
          ) : (
            // If dependencies are loaded but the query generation functions are not available, show an error message
            hasLoadedDependencies && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.missingMappings.errorTitle"
                    defaultMessage="There was a problem rendering the visualization"
                  />
                }
                color="warning"
                iconType="error"
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.missingMappings.errorMessage"
                  defaultMessage="The required fields are not present in the data view."
                />
              </EuiCallOut>
            )
          )}
        </>
      )}
    </EuiPanel>
  );
};
