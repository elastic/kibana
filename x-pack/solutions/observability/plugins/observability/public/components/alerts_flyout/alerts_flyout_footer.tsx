/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, useMemo } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRouteMatch } from 'react-router-dom';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import { GetObservabilityAlertsTableProp } from '../alerts_table/types';
import { useKibana } from '../../utils/kibana_react';
import { paths, SLO_DETAIL_PATH } from '../../../common/locators/paths';

export type AlertsFlyoutFooterProps = Pick<
  ComponentProps<GetObservabilityAlertsTableProp<'renderFlyoutFooter'>>,
  'alert' | 'tableId' | 'observabilityRuleTypeRegistry'
>;

export function AlertsFlyoutFooter({
  alert,
  tableId,
  observabilityRuleTypeRegistry,
}: AlertsFlyoutFooterProps) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const isSLODetailsPage = useRouteMatch(SLO_DETAIL_PATH);
  const parsedAlert = parseAlert(observabilityRuleTypeRegistry)(alert);
  const viewInAppUrl = useMemo(() => {
    if (!parsedAlert.hasBasePath) {
      return prepend(parsedAlert.link ?? '');
    }
    return parsedAlert.link;
  }, [parsedAlert.hasBasePath, parsedAlert.link, prepend]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        {!parsedAlert.link || (isSLODetailsPage && tableId === SLO_ALERTS_TABLE_ID) ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="alertsFlyoutViewInAppButton" fill href={viewInAppUrl}>
              {i18n.translate('xpack.observability.alertsFlyout.viewInAppButtonText', {
                defaultMessage: 'View in app',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="alertsFlyoutAlertDetailsButton"
            fill
            href={
              prepend &&
              prepend(paths.observability.alertDetails(parsedAlert.fields['kibana.alert.uuid']))
            }
          >
            {i18n.translate('xpack.observability.alertsFlyout.alertsDetailsButtonText', {
              defaultMessage: 'Alert details',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
