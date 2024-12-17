/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiTextColor,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

const LockedPolicyDiv = styled.div`
  .euiCard__betaBadgeWrapper {
    .euiCard__betaBadge {
      width: auto;
    }
  }
  .lockedCardDescription {
    padding: 0 33.3%;
  }
`;

export interface SettingLockedCardProps {
  title: string;
  'data-test-subj'?: string;
}

export const SettingLockedCard = memo(
  ({ title, 'data-test-subj': dataTestSubj }: SettingLockedCardProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <LockedPolicyDiv>
        <EuiCard
          data-test-subj={getTestId()}
          betaBadgeProps={{
            'data-test-subj': getTestId('badge'),
            label: i18n.translate('xpack.securitySolution.endpoint.policy.details.platinum', {
              defaultMessage: 'Platinum',
            }),
          }}
          isDisabled={true}
          icon={<EuiIcon size="xl" type="lock" />}
          title={
            <h3 data-test-subj={getTestId('title')}>
              <strong>{title}</strong>
            </h3>
          }
          description={false}
        >
          <EuiFlexGroup className="lockedCardDescription" direction="column" gutterSize="none">
            <EuiText>
              <EuiFlexItem>
                <h4>
                  <EuiTextColor color="subdued">
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.policy.details.upgradeToPlatinum"
                      defaultMessage="Upgrade to Elastic Platinum"
                    />
                  </EuiTextColor>
                </h4>
              </EuiFlexItem>
              <EuiFlexItem>
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policy.details.lockedCardUpgradeMessage"
                    defaultMessage="To turn on this protection, you must upgrade your license to Platinum, start a
              free 30-day trial, or spin up a {cloudDeploymentLink} on AWS, GCP, or Azure."
                    values={{
                      cloudDeploymentLink: (
                        <EuiLink
                          href="https://www.elastic.co/cloud/"
                          target="_blank"
                          data-test-subj={getTestId('cloudLink')}
                        >
                          <FormattedMessage
                            id="xpack.securitySolution.endpoint.policy.details.cloudDeploymentLInk"
                            defaultMessage="cloud deployment"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiFlexItem>
            </EuiText>
          </EuiFlexGroup>
        </EuiCard>
      </LockedPolicyDiv>
    );
  }
);
SettingLockedCard.displayName = 'SettingLockedCard';
