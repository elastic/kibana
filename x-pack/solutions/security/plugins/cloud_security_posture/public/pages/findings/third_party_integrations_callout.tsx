/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY } from '../../common/constants';
import { ThirdPartyIntegrationsPopover } from '../../components/third_party_integration_popover';

interface ThirdPartyIntegrationsCalloutProps {
  findingsPageName: 'misconfiguration' | 'vulnerability';
}

export const ThirdPartyIntegrationsCallout = ({
  findingsPageName,
}: ThirdPartyIntegrationsCalloutProps) => {
  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY
  );

  if (userHasDismissedCallout) return null;

  return (
    <EuiCallOut
      title={i18n.translate('xpack.csp.findings.3pIntegrationsCallout.title', {
        defaultMessage:
          "New! Ingest your cloud security product's data into Elastic for centralized analytics, hunting, investigations, visualizations, and more",
      })}
      iconType="cheer"
      onDismiss={() => setUserHasDismissedCallout(true)}
    >
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <ThirdPartyIntegrationsPopover
            findingsType={findingsPageName}
            buttonTestSubj="thirdPartyIntegrationCalloutButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
