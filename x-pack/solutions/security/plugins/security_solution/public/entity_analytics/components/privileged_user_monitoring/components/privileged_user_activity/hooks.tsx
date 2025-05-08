/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  generateListESQLQuery,
  generateVisualizationESQLQuery,
} from '../../../privileged_user_monitoring_onboarding/components/sample_dashboard/esql_data_generation';
import { VisualizationToggleOptions } from './types';
import {
  buildGrantedRightsColumns,
  buildAccountSwitchesColumns,
  buildAuthenticationsColumns,
} from './columns';
import { getLensAttributes } from './get_lens_attributes';
import {
  getAccountSwitchesEsqlSource,
  getAuthenticationsEsqlSource,
  getGrantedRightsEsqlSource,
} from './esql_source_query';
import {
  ACCOUNT_SWITCH_STACK_BY,
  AUTHENTICATIONS_STACK_BY,
  GRANTED_RIGHTS_STACK_BY,
} from './constants';

export const usePrivilegedUserActivityParams = (
  selectedToggleOption: VisualizationToggleOptions
) => {
  const esqlSource = useMemo(() => {
    switch (selectedToggleOption) {
      case VisualizationToggleOptions.GRANTED_RIGHTS:
        return getGrantedRightsEsqlSource();
      case VisualizationToggleOptions.ACCOUNT_SWITCHES:
        return getAccountSwitchesEsqlSource();
      case VisualizationToggleOptions.AUTHENTICATIONS:
        return getAuthenticationsEsqlSource();
    }
  }, [selectedToggleOption]);

  const generateTableQuery = useMemo(() => generateListESQLQuery(esqlSource), [esqlSource]);
  const generateVisualizationQuery = useMemo(
    () => generateVisualizationESQLQuery(esqlSource),
    [esqlSource]
  );

  const { openRightPanel } = useExpandableFlyoutApi();

  const columns = useMemo(() => {
    switch (selectedToggleOption) {
      case VisualizationToggleOptions.GRANTED_RIGHTS:
        return buildGrantedRightsColumns(openRightPanel);
      case VisualizationToggleOptions.ACCOUNT_SWITCHES:
        return buildAccountSwitchesColumns(openRightPanel);
      case VisualizationToggleOptions.AUTHENTICATIONS:
        return buildAuthenticationsColumns(openRightPanel);
    }
  }, [selectedToggleOption, openRightPanel]);

  return {
    getLensAttributes,
    generateVisualizationQuery,
    generateTableQuery,
    columns,
  };
};

export const useToggleOptions = () =>
  useMemo(
    () => [
      {
        id: VisualizationToggleOptions.GRANTED_RIGHTS,
        label: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.grantedRights"
            defaultMessage="Granted rights"
          />
        ),
      },

      {
        id: VisualizationToggleOptions.ACCOUNT_SWITCHES,
        label: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.accountSwitches"
            defaultMessage="Account switches"
          />
        ),
      },
      {
        id: VisualizationToggleOptions.AUTHENTICATIONS,
        label: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userActivity.authentications"
            defaultMessage="Authentications"
          />
        ),
      },
    ],
    []
  );

export const useStackByOptions = (selectedToggleOption: VisualizationToggleOptions) => {
  if (selectedToggleOption === VisualizationToggleOptions.GRANTED_RIGHTS) {
    return GRANTED_RIGHTS_STACK_BY;
  }
  if (selectedToggleOption === VisualizationToggleOptions.ACCOUNT_SWITCHES) {
    return ACCOUNT_SWITCH_STACK_BY;
  }
  if (selectedToggleOption === VisualizationToggleOptions.AUTHENTICATIONS) {
    return AUTHENTICATIONS_STACK_BY;
  }
  return [];
};
