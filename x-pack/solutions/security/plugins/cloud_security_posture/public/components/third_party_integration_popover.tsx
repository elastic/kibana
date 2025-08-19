/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useThirdPartyIntegrationLinks } from '../common/api/use_third_party_integration_routes';

interface Props {
  findingsType: 'misconfiguration' | 'vulnerability';
  buttonTestSubj: string;
}

export const ThirdPartyIntegrationsPopover = ({ findingsType, buttonTestSubj }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const togglePopover = () => setIsOpen((open) => !open);
  const closePopover = () => setIsOpen(false);

  const integrationLinks = useThirdPartyIntegrationLinks(findingsType);

  const button = (
    <EuiButton
      iconType="arrowDown"
      iconSide="right"
      onClick={togglePopover}
      aria-expanded={isOpen}
      aria-haspopup="true"
      color="primary"
      fill
      data-test-subj={buttonTestSubj}
    >
      <FormattedMessage
        id="xpack.csp.integrationPopover.addIntegrationButtonTitle"
        defaultMessage="Add Integration"
      />
    </EuiButton>
  );

  const items = integrationLinks.map(({ id, label, href }) => (
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

  return (
    <EuiPopover
      id={`thirdPartyIntegrationPopover-${findingsType}`}
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
