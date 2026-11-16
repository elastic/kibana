/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import React from 'react';

import * as i18n from './translations';
import { AttackDiscoveryUpsellingSection } from '../../sections/attack_discovery';
import type { UpsellingPageProps } from '../../service/types';

interface Props extends UpsellingPageProps {
  actions?: React.ReactNode;
  availabilityMessage: string;
  docLink?: string;
  upgradeMessage: string;
}

/**
 * This component handles the styling of the _page_ that hosts the upselling section
 * for the Attacks page.
 */
const AttacksUpsellingPageComponent: React.FC<Props> = ({
  actions,
  appHeader: Header = AppHeader,
  availabilityMessage,
  docLink,
  upgradeMessage,
}) => {
  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <Header title={i18n.ATTACKS_PAGE_TITLE} docLink={docLink} spacing="largeBleed" />
        <EuiSpacer size="xxl" />
        <AttackDiscoveryUpsellingSection
          actions={actions}
          availabilityMessage={availabilityMessage}
          upgradeMessage={upgradeMessage}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

AttacksUpsellingPageComponent.displayName = 'AttacksUpsellingPage';

export const AttacksUpsellingPage = React.memo(AttacksUpsellingPageComponent);
