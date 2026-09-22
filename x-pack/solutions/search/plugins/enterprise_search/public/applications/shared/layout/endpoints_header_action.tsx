/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiHeaderLinks } from '@elastic/eui';

import type { AppHeaderMenu } from '@kbn/app-header';
import {
  KibanaWiredConnectionDetailsProvider,
  ConnectionDetailsFlyoutContent,
} from '@kbn/cloud/connection_details';
import { i18n } from '@kbn/i18n';

import { EndpointIcon } from './endpoint_icon';

export const ENDPOINTS_API_KEYS_BUTTON_TEST_SUBJ =
  'enterpriseSearchEndpointsHeaderActionEndpointsApiKeysButton';

export const ENDPOINTS_API_KEYS_MENU_ITEM_ID = 'endpointsApiKeys';

const endpointsApiKeysLabel = i18n.translate(
  'xpack.enterpriseSearch.pageTemplate.endpointsButtonLabel',
  { defaultMessage: 'Endpoints & API keys' }
);

const endpointsFlyoutAriaLabel = i18n.translate(
  'xpack.enterpriseSearch.pageTemplate.endpointsFlyout.ariaLabel',
  { defaultMessage: 'Endpoints & API keys' }
);

export const EndpointsApiKeysFlyout: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <EuiFlyout aria-label={endpointsFlyoutAriaLabel} onClose={onClose} size="s">
      <KibanaWiredConnectionDetailsProvider>
        <ConnectionDetailsFlyoutContent />
      </KibanaWiredConnectionDetailsProvider>
    </EuiFlyout>
  );
};

export const createEndpointsAppHeaderMenuItem = ({
  isSelected,
  onToggle,
}: {
  isSelected: boolean;
  onToggle: () => void;
}): NonNullable<AppHeaderMenu['items']>[number] => ({
  iconType: EndpointIcon,
  id: ENDPOINTS_API_KEYS_MENU_ITEM_ID,
  isSelected,
  label: endpointsApiKeysLabel,
  run: onToggle,
  testId: ENDPOINTS_API_KEYS_BUTTON_TEST_SUBJ,
});

export const EndpointsHeaderAction: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <EuiHeaderLinks>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          {!!children && <EuiFlexItem>{children}</EuiFlexItem>}
          <EuiButtonEmpty
            iconType={EndpointIcon}
            size="s"
            onClick={() => setOpen((x) => !x)}
            data-test-subj={ENDPOINTS_API_KEYS_BUTTON_TEST_SUBJ}
          >
            {endpointsApiKeysLabel}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiHeaderLinks>
      {open && <EndpointsApiKeysFlyout onClose={() => setOpen(false)} />}
    </>
  );
};
