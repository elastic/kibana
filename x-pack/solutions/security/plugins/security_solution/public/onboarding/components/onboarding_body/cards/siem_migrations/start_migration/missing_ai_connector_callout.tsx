/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { CardCallOut } from '../../common/card_callout';
import * as i18n from './translations';

interface MissingAIConnectorCalloutProps {
  onExpandAiConnectorsCard: () => void;
}

export const MissingAIConnectorCallout = React.memo<MissingAIConnectorCalloutProps>(
  ({ onExpandAiConnectorsCard }) => (
    <OnboardingCardContentPanel paddingSize="none">
      <CardCallOut
        color="warning"
        text={i18n.START_MIGRATION_CARD_CONNECTOR_MISSING_TEXT}
        action={
          <EuiLink onClick={onExpandAiConnectorsCard}>
            <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
              <EuiFlexItem>{i18n.START_MIGRATION_CARD_CONNECTOR_MISSING_BUTTON}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="arrowRight" color="primary" size="s" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        }
      />
    </OnboardingCardContentPanel>
  )
);
MissingAIConnectorCallout.displayName = 'MissingAIConnectorCallout';
