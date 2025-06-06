/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '@kbn/security-solution-navigation';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { LinkAnchor } from '../../../../../common/components/links';
import { HeaderSection } from '../../../../../common/components/header_section';
import { PAGE_SIZE, PRIVILEGED_USER_ACTIVITY_QUERY_ID } from './constants';
import { EsqlDashboardPanel } from '../../../privileged_user_monitoring_onboarding/components/esql_dashboard_panel/esql_dashboard_panel';
import { usePrivilegedUserActivityParams, useStackByOptions, useToggleOptions } from './hooks';
import type { TableItemType } from './types';
import { VisualizationToggleOptions } from './types';

const TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.title',
  { defaultMessage: 'Privileged user activity' }
);

export const UserActivityPrivilegedUsersPanel: React.FC = () => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(PRIVILEGED_USER_ACTIVITY_QUERY_ID);
  const { from, to } = useGlobalTime();
  const [selectedToggleOption, setToggleOption] = useState<VisualizationToggleOptions>(
    VisualizationToggleOptions.GRANTED_RIGHTS
  );
  const { getLensAttributes, columns, generateVisualizationQuery, generateTableQuery } =
    usePrivilegedUserActivityParams(selectedToggleOption);
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
          <LinkAnchor
            href={getAppUrl({
              appId: 'discover',
              path: `#/?&_a=(query:(esql:'${generateTableQuery('@timestamp', 'DESC', 100)}'))`,
            })}
          >
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
                legend={'ABOUT_CONTROL_LEGEND'}
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
          {generateVisualizationQuery && generateTableQuery && (
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
          )}
        </>
      )}
    </EuiPanel>
  );
};
