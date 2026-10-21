/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ClientPluginsStart } from '../../../../plugin';

export function hasGettingStartedAddDataReturn(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return (
    params.get('returnAppId') === 'observabilityOnboarding' && Boolean(params.get('returnPath'))
  );
}

export function getGettingStartedBackLink({
  search,
  getUrlForApp,
}: {
  search: string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): { href: string; text: string } | undefined {
  if (!hasGettingStartedAddDataReturn(search)) {
    return undefined;
  }
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const returnAppId = params.get('returnAppId');
  const returnPath = params.get('returnPath');
  if (!returnAppId || !returnPath) {
    return undefined;
  }
  return {
    href: getUrlForApp(returnAppId, { path: returnPath }),
    text: i18n.translate('xpack.synthetics.gettingStarted.backToSelectionLinkText', {
      defaultMessage: 'Back to selection',
    }),
  };
}

export const GettingStartedBackLink: React.FC = () => {
  const { search } = useLocation();
  const { application } = useKibana<ClientPluginsStart>().services;
  const backLink = getGettingStartedBackLink({
    search,
    getUrlForApp: (appId, options) => application?.getUrlForApp(appId, options) ?? '',
  });

  if (!backLink) {
    return null;
  }

  return (
    <EuiButtonEmpty
      iconType="chevronSingleLeft"
      size="xs"
      flush="left"
      href={backLink.href}
      data-test-subj="syntheticsGettingStartedBackLink"
    >
      {backLink.text}
    </EuiButtonEmpty>
  );
};
