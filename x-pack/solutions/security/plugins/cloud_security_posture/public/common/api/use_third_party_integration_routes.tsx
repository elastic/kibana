/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAdd3PIntegrationRoute } from './use_wiz_integration_route';

export type ThirdPartyIntegrationId =
  | 'wiz'
  | 'aws_security_hub'
  | 'aws_inspector'
  | 'microsoft_365_defender'
  | 'google_scc'
  | 'tenable'
  | 'qualys'
  | 'rapid7';

export interface IntegrationItem {
  id: ThirdPartyIntegrationId;
  label: string;
  href: string | undefined;
}

export const useThirdPartyIntegrationLinks = (
  findingsType: 'misconfiguration' | 'vulnerability'
): IntegrationItem[] => {
  const links = {
    wiz: useAdd3PIntegrationRoute('wiz'),
    google_scc: useAdd3PIntegrationRoute('google_scc'),
    tenable: useAdd3PIntegrationRoute('tenable_io'),
    qualys: useAdd3PIntegrationRoute('qualys_vmdr'),
    rapid7: useAdd3PIntegrationRoute('rapid7_insightvm'),
    microsoft_365_defender: useAdd3PIntegrationRoute('m365_defender'),
    aws_security_hub: useAdd3PIntegrationRoute('aws', 'securityhub'),
    aws_inspector: useAdd3PIntegrationRoute('aws', 'inspector'),
  };

  const all: Record<'misconfiguration' | 'vulnerability', IntegrationItem[]> = {
    misconfiguration: [
      { id: 'wiz', label: 'Wiz', href: links.wiz },
      { id: 'aws_security_hub', label: 'AWS Security Hub', href: links.aws_security_hub },
      {
        id: 'microsoft_365_defender',
        label: 'Microsoft 365 Defender',
        href: links.microsoft_365_defender,
      },
    ],
    vulnerability: [
      { id: 'qualys', label: 'Qualys', href: links.qualys },
      { id: 'tenable', label: 'tenable.io', href: links.tenable },
      { id: 'rapid7', label: 'Rapid7', href: links.rapid7 },
      { id: 'wiz', label: 'Wiz', href: links.wiz },
      { id: 'aws_security_hub', label: 'AWS Security Hub', href: links.aws_security_hub },
      { id: 'aws_inspector', label: 'AWS Inspector', href: links.aws_inspector },
      { id: 'google_scc', label: 'Google SCC', href: links.google_scc },
      {
        id: 'microsoft_365_defender',
        label: 'Microsoft 365 Defender',
        href: links.microsoft_365_defender,
      },
    ],
  };

  return all[findingsType];
};
