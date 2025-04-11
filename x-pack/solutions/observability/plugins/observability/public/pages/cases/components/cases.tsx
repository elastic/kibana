/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import { CasesPermissions } from '@kbn/cases-plugin/common';
import { observabilityFeatureId } from '../../../../common';
import { useKibana } from '../../../utils/kibana_react';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';
import { useFetchAlertData } from '../../../hooks/use_fetch_alert_data';
import { LazyAlertsFlyout, ObservabilityAlertsTable } from '../../..';
import { CASES_PATH, paths } from '../../../../common/locators/paths';

export interface CasesProps {
  permissions: CasesPermissions;
}

export function Cases({ permissions }: CasesProps) {
  const {
    application: { navigateToUrl },
    cases: {
      ui: { getCases: CasesList },
    },
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;

  const { observabilityRuleTypeRegistry } = usePluginContext();

  const [selectedAlertId, setSelectedAlertId] = useState<string>('');

  const [alertLoading, alertDetail] = useFetchAlertDetail(selectedAlertId);

  const handleFlyoutClose = () => setSelectedAlertId('');

  const handleShowAlertDetails = (alertId: string) => {
    setSelectedAlertId(alertId);
  };

  return (
    <>
      <CasesList
        basePath={CASES_PATH}
        features={{ alerts: { sync: false, isExperimental: false } }}
        owner={[observabilityFeatureId]}
        permissions={permissions}
        ruleDetailsNavigation={{
          href: (ruleId) => prepend(paths.observability.ruleDetails(ruleId || '')),
          onClick: (ruleId, ev) => {
            const ruleLink = prepend(paths.observability.ruleDetails(ruleId || ''));

            if (ev != null) {
              ev.preventDefault();
            }

            return navigateToUrl(ruleLink);
          },
        }}
        showAlertDetails={handleShowAlertDetails}
        useFetchAlertData={useFetchAlertData}
        renderAlertsTable={(props) => <ObservabilityAlertsTable {...props} />}
      />

      {alertDetail && selectedAlertId !== '' && !alertLoading ? (
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alert={alertDetail.raw}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={handleFlyoutClose}
          />
        </Suspense>
      ) : null}
    </>
  );
}
