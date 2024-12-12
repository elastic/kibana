/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButton,
} from '@elastic/eui';
import styled from '@emotion/styled';

import { useNavigation } from '@kbn/security-solution-navigation';
import * as i18n from '../pages/translations';

const StyledEuiCard = styled(EuiCard)`
  span.euiTitle {
    max-width: 540px;
    display: block;
    margin: 0 auto;
  }
`;

export const EntityAnalyticsUpsellingSection = memo(
  ({
    upgradeMessage,
    upgradeHref,
    upgradeToLabel,
  }: {
    upgradeMessage: string;
    upgradeToLabel: string;
    upgradeHref?: string;
  }) => {
    const { navigateTo } = useNavigation();
    const goToSubscription = useCallback(() => {
      navigateTo({ url: upgradeHref });
    }, [navigateTo, upgradeHref]);

    return (
      <StyledEuiCard
        betaBadgeProps={{ label: upgradeToLabel }}
        icon={<EuiIcon size="xl" type="lock" />}
        display="subdued"
        title={
          <h3>
            <strong>{i18n.ENTITY_ANALYTICS_LICENSE_DESC}</strong>
          </h3>
        }
        description={false}
        paddingSize="xl"
      >
        <EuiFlexGroup
          data-test-subj="paywallCardDescription"
          className="paywallCardDescription"
          direction="column"
          gutterSize="none"
        >
          <EuiText>
            <EuiFlexItem>
              <p>
                <EuiTextColor color="subdued">{upgradeMessage}</EuiTextColor>
              </p>
            </EuiFlexItem>
            <EuiFlexItem>
              {upgradeHref && (
                <div>
                  {/* eslint-disable-next-line @elastic/eui/href-or-on-click*/}
                  <EuiButton href={upgradeHref} onClick={goToSubscription} fill>
                    {i18n.UPGRADE_BUTTON(upgradeToLabel)}
                  </EuiButton>
                </div>
              )}
            </EuiFlexItem>
          </EuiText>
        </EuiFlexGroup>
      </StyledEuiCard>
    );
  }
);

EntityAnalyticsUpsellingSection.displayName = 'EntityAnalyticsUpsellingSection';
