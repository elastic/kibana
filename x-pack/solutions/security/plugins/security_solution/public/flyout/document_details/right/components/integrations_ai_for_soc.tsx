/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CardIcon } from '@kbn/fleet-plugin/public';
import { AlertHeaderBlock } from './alert_header_block';
import { useDocumentDetailsContext } from '../../shared/context';

/**
 * Document details risk score displayed in flyout right section header
 */
export const Integrations = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
  // TODO get real data
  const integration = {
    title: 'CrowdStrike',
    name: 'crowdstrike',
    version: '1.61.1',
  }; //  getFieldsData(ALERT_INTEGRATION)
  // TODO get real data
  const icons = [
    {
      src: '/img/logo-integrations-crowdstrike.svg',
      path: '/package/crowdstrike/1.61.1/img/logo-integrations-crowdstrike.svg',
      title: 'CrowdStrike',
      size: '216x216',
      type: 'image/svg+xml',
    },
  ];

  return (
    <AlertHeaderBlock
      paddingSize="none"
      hasBorder={false}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.header.integrationTitle"
          defaultMessage="Integration"
        />
      }
    >
      <CardIcon
        icons={icons}
        integrationName={integration.title}
        packageName={integration.name}
        size="xl"
        version={integration.version}
      />
    </AlertHeaderBlock>
  );
});

Integrations.displayName = 'Integrations';
