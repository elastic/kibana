/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React from 'react';
// import { i18n } from '@kbn/i18n';
// import useLocalStorage from 'react-use/lib/useLocalStorage';
// import { EuiButton, EuiCallOut } from '@elastic/eui';
// import { FormattedMessage } from '@kbn/i18n-react';
// import { useAdd3PIntegrationRoute } from '../../common/api/use_wiz_integration_route';
// import { LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY } from '../../common/constants';

// export const ThirdPartyIntegrationsCallout = ({
//   findingsPageName,
// }: ThirdPartyIntegrationsCalloutProps) => {
//   const wizAddIntegrationLink = useAdd3PIntegrationRoute('wiz');
//   const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
//     LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY
//   );

//   if (userHasDismissedCallout) return null;

//   return (
//     <EuiCallOut
//       title={i18n.translate('xpack.csp.findings.3pIntegrationsCallout.title', {
//         defaultMessage:
//           "New! Ingest your cloud security product's data into Elastic for centralized analytics, hunting, investigations, visualizations, and more",
//       })}
//       iconType="cheer"
//       onDismiss={() => setUserHasDismissedCallout(true)}
//     >
//       <EuiButton href={wizAddIntegrationLink}>
//         <FormattedMessage
//           id="xpack.csp.findings.3pIntegrationsCallout.buttonTitle"
//           defaultMessage="Integrate Wiz"
//         />
//       </EuiButton>
//     </EuiCallOut>
//   );
// };

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiButton,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAdd3PIntegrationRoute } from '../../common/api/use_wiz_integration_route';
import { LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY } from '../../common/constants';

interface ThirdPartyIntegrationsCalloutProps {
  findingsPageName: 'misconfiguration' | 'vulnerability'; // Extend with more options as needed
}

export const ThirdPartyIntegrationsCallout = ({
  findingsPageName,
}: ThirdPartyIntegrationsCalloutProps) => {
  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const vulnerabilityIntegrationsList = [
    { id: 'wiz', label: 'Wiz', href: useAdd3PIntegrationRoute('wiz') },
    { id: 'google_scc', label: 'Google SCC', href: useAdd3PIntegrationRoute('google_scc') },
    { id: 'tenable_io', label: 'tenable.io', href: useAdd3PIntegrationRoute('tenable_io') },
    { id: 'qualys_vmdr', label: 'Qualys', href: useAdd3PIntegrationRoute('qualys_vmdr') },
    { id: 'rapid7_insightvm', label: 'Rapid7', href: useAdd3PIntegrationRoute('rapid7_insightvm') },
    {
      id: 'm365_defender',
      label: 'Microsoft 365 Defender',
      href: useAdd3PIntegrationRoute('m365_defender'),
    },
    {
      id: 'aws_securityhub',
      label: 'AWS Security Hub',
      href: useAdd3PIntegrationRoute('aws', 'securityhub'),
    },
    {
      id: 'aws_inspector',
      label: 'AWS Inspector',
      href: useAdd3PIntegrationRoute('aws', 'inspector'),
    },
  ];

  const misconfigurationIntegrationsList = [
    { id: 'wiz', label: 'Wiz', href: useAdd3PIntegrationRoute('wiz') },
    {
      id: 'aws_security_hub',
      label: 'AWS Security Hub',
      href: useAdd3PIntegrationRoute('aws', 'securityhub'),
    },
    {
      id: 'microsoft_365_defender',
      label: 'Microsoft 365 Defender',
      href: useAdd3PIntegrationRoute('m365_defender'),
    },
  ];

  const integrations =
    findingsPageName === 'misconfiguration'
      ? misconfigurationIntegrationsList
      : vulnerabilityIntegrationsList;

  const popoverButton = (
    <EuiButton
      iconType="arrowDown"
      iconSide="right"
      onClick={togglePopover}
      aria-expanded={isPopoverOpen}
      aria-haspopup="true"
      color="primary"
      fill
    >
      <FormattedMessage
        id="xpack.csp.findings.3pIntegrationsCallout.addIntegrationButtonTitle"
        defaultMessage="Add Integration"
      />
    </EuiButton>
  );

  const panelItems = integrations.map(({ id, label, href }) => (
    <EuiContextMenuItem
      key={id}
      href={href}
      onClick={closePopover}
      disabled={!href}
      data-test-subj={`integrationOption-${id}`}
    >
      {label}
    </EuiContextMenuItem>
  ));

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
          <EuiPopover
            id="thirdPartyIntegrationPopover"
            button={popoverButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={panelItems} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
