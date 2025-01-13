/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';

import { useRouteMatch } from 'react-router-dom';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { SLO_DETAIL_PATH } from '../../../common/locators/paths';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import { AlertsFlyoutHeader } from './alerts_flyout_header';
import { AlertsFlyoutBody } from './alerts_flyout_body';
import { AlertsFlyoutFooter } from './alerts_flyout_footer';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';

export { AlertsFlyout } from './alerts_flyout';

export const useGetAlertFlyoutComponents = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);
  const body = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(props.alert);
      return <AlertsFlyoutBody alert={alert} rawAlert={props.alert} id={props.id} />;
    },
    [observabilityRuleTypeRegistry]
  );

  const header = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const alert = parseAlert(observabilityRuleTypeRegistry)(props.alert);
      return <AlertsFlyoutHeader alert={alert} />;
    },
    [observabilityRuleTypeRegistry]
  );

  const footer = useCallback(
    (props: AlertsTableFlyoutBaseProps) => {
      const isInApp = Boolean(SLO_ALERTS_TABLE_ID === props.id && isSLODetailsPage);
      const alert = parseAlert(observabilityRuleTypeRegistry)(props.alert);
      return <AlertsFlyoutFooter isInApp={isInApp} alert={alert} />;
    },
    [isSLODetailsPage, observabilityRuleTypeRegistry]
  );

  return useMemo(
    () => ({
      body,
      header,
      footer,
    }),
    [body, header, footer]
  );
};
