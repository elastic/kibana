/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: This is a placeholder. Once https://github.com/elastic/kibana/pull/267971
// is merged, this component will be replaced with the correct banner.

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useSecuritySolutionLinkProps } from '../../../common/components/links';
import analyticsSpeedAcceleration from './analytics_speed_acceleration.svg';
import * as i18n from './translations';

export const SampleAttackDiscoveryCta: React.FC = () => {
  const { href } = useSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.attackDiscovery,
  });

  return (
    <EuiPanel hasShadow={false} hasBorder={true} color="subdued" paddingSize="l">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiIcon type={analyticsSpeedAcceleration} size="original" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{i18n.RUN_ATTACK_DISCOVERY_TEXT}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="m" color="subdued">
                <p>{i18n.GET_STARTED_ATTACK_DISCOVERY_TEXT}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-self: flex-end;
          `}
        >
          <EuiButtonEmpty
            size="s"
            iconType="popout"
            iconSide="left"
            color="primary"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-test-subj="sampleAttackDiscoveryCtaButton"
          >
            {i18n.ATTACK_DISCOVERY_LINK}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
