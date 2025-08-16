/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CasesPermissions } from '@kbn/cases-plugin/common';
import AlertsFlyout from '../../../components/alerts_flyout/alerts_flyout';
import { observabilityFeatureId } from '../../../../common';
import { useKibana } from '../../../utils/kibana_react';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';
import { useFetchAlertData } from '../../../hooks/use_fetch_alert_data';
import { ObservabilityAlertsTable } from '../../..';
import { CASES_PATH, paths } from '../../../../common/locators/paths';
import { CaseViewAlertsTableProps } from '@kbn/cases-plugin/public/components/case_view/types';
import { EuiConfirmModal } from '@elastic/eui';

export interface CasesProps {
  permissions: CasesPermissions;
}

export function Cases({ permissions }: CasesProps) {
  const {
    application: { navigateToUrl },
    cases,
    http
  } = useKibana().services;

  const { observabilityRuleTypeRegistry } = usePluginContext();

  const [selectedAlertId, setSelectedAlertId] = useState<string>('');

  const [alertLoading, alertDetail] = useFetchAlertDetail(selectedAlertId);

  const handleFlyoutClose = () => setSelectedAlertId('');

  const handleShowAlertDetails = (alertId: string) => {
    setSelectedAlertId(alertId);
  };
  if (!cases) {
    return (
      <>
        {i18n.translate('xpack.observability.cases.casesPluginIsNotLabel', {
          defaultMessage:
            'Cases plugin is not available. Please ensure it is installed and enabled.',
        })}
      </>
    );
  }

  const CasesList = cases.ui.getCases;

  return (
    <>
      <CasesList
        basePath={CASES_PATH}
        features={{
          alerts: { sync: false, isExperimental: false },
          observables: { enabled: false },
        }}
        owner={[observabilityFeatureId]}
        permissions={permissions}
        ruleDetailsNavigation={{
          href: (ruleId) => http.basePath.prepend(paths.observability.ruleDetails(ruleId || '')),
          onClick: (ruleId, ev) => {
            const ruleLink = http.basePath.prepend(paths.observability.ruleDetails(ruleId || ''));

            if (ev != null) {
              ev.preventDefault();
            }

            return navigateToUrl(ruleLink);
          },
        }}
        showAlertDetails={handleShowAlertDetails}
        useFetchAlertData={useFetchAlertData}
        renderAlertsTable={(props) => <InvertedAlertsTable props={props} />}
      />

      {alertDetail && selectedAlertId !== '' && !alertLoading ? (
        <AlertsFlyout
          alert={alertDetail.raw}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          onClose={handleFlyoutClose}
        />
      ) : null}
    </>
  );
}

function InvertedAlertsTable({ props }: { props: CaseViewAlertsTableProps }) {
  const [isRemoveAlertModalOpen, setIsRemoveAlertModalOpen] = useState<boolean>(false);
  const [activeAlertId, setActiveAlertId] = useState<string | number | null>(null);

  const {
    application,
    cases,
    data,
    http,
    notifications,
    fieldFormats,
    licensing,
    settings,
  } = useKibana().services;

  return (
    <>
      <ObservabilityAlertsTable
        {...props}
        services={{
          data,
          http,
          notifications,
          fieldFormats,
          application,
          licensing,
          cases,
          settings,
        }}
        additionalContext={{
          extraRowActions: [
            {
              label: 'Remove from case',
              key: 'remove-alert-from-case',
              callback: ({ alert }) => {
                const id = String(alert['kibana.alert.instance.id']?.[0]);
                
                if (id) {
                  setActiveAlertId(id);
                  setIsRemoveAlertModalOpen(true);
                }
              }
            }
          ]
        }}
      />
      {isRemoveAlertModalOpen
        ? <EuiConfirmModal
            aria-labelledby={'confirmRemoveAlert'}
            title="Remove alert from this case?"
            titleProps={{ id: 'confirmRemoveAlert' }}
            onCancel={() => setIsRemoveAlertModalOpen(false)}
            onConfirm={() => {
              // call new cases.api.removeAlertFromCase() method, giving it the
              // case ID and the active alert ID stored in state
              console.log(`Removing alert ID ${activeAlertId} from case ${props.caseId}`);
              setIsRemoveAlertModalOpen(false);
            }}
            cancelButtonText="Cancel"
            confirmButtonText="Remove alert"
            buttonColor="danger"
            defaultFocusedButton="confirm"
          >
            <p>This alert will be permanently removed from this case.</p>
          </EuiConfirmModal>
        : null
      }
    </>
  )
}
