/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SECURITY_APP_ID, SecurityPageName } from '@kbn/deeplinks-security';
import * as i18n from './translations';

export const OnboardingSetUpDataPanel: React.FC = () => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{i18n.INTRO_SET_UP_DATA_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>{i18n.INTRO_SET_UP_DATA_BODY}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="external"
            iconSide="right"
            onClick={() =>
              application.navigateToApp(SECURITY_APP_ID, {
                deepLinkId: SecurityPageName.landing,
              })
            }
            data-test-subj="alertZeroOnboardingSetUpDataLink"
          >
            {i18n.INTRO_SET_UP_DATA_LINK}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
