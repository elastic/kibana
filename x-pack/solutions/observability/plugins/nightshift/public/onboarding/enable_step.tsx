/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCode,
  EuiEmptyPrompt,
  EuiIllustration,
  EuiLink,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { openSourceAi } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { getNightshiftServiceAccountName } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { NIGHTSHIFT_SERVICE_ACCOUNT_PRIVILEGES_HREF } from '../service_account/nightshift_setup_prompt';
import { useEnableNightshift } from './use_onboarding';

/**
 * The first onboarding step: a one-time setup of the space that installs the Nightshift
 * investigation agent there. Admins (Nightshift manage) enable it; everyone else is asked to
 * find one.
 */
export function OnboardingEnableStep(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const enable = useEnableNightshift();
  const account = getNightshiftServiceAccountName('agent');

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="nightshiftOnboardingEnableStep">
      <EuiEmptyPrompt
        layout="vertical"
        color="transparent"
        paddingSize="l"
        css={css`
          max-width: none;
        `}
        icon={
          <EuiIllustration
            type={openSourceAi}
            alt=""
            css={css`
              max-inline-size: 160px;
              margin-inline: auto;
            `}
          />
        }
        title={
          <h2
            css={css`
              font-size: ${euiTheme.size.base};
            `}
          >
            {i18n.translate('xpack.nightshift.onboarding.enable.title', {
              defaultMessage: 'One-time admin setup required for this space',
            })}
          </h2>
        }
        titleSize="xs"
        body={
          canManage ? (
            <p>
              <FormattedMessage
                id="xpack.nightshift.onboarding.enable.adminDescription"
                defaultMessage="Grant the agent a {account} account with {privilegesLink}. It will perform investigations and actions on behalf of users in this space. You can revoke privileges anytime in settings."
                values={{
                  account: <EuiCode>{account}</EuiCode>,
                  privilegesLink: (
                    <EuiLink
                      href={NIGHTSHIFT_SERVICE_ACCOUNT_PRIVILEGES_HREF}
                      target="_blank"
                      external
                      css={css`
                        white-space: nowrap;
                      `}
                      data-test-subj="nightshiftOnboardingPrivilegesLink"
                    >
                      {i18n.translate('xpack.nightshift.onboarding.enable.privilegesLink', {
                        defaultMessage: 'these privileges',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          ) : (
            <p>
              {i18n.translate('xpack.nightshift.onboarding.enable.userDescription', {
                defaultMessage:
                  'A Nightshift administrator has to enable Elastic nightshift once for this space. Ask them to turn it on.',
              })}
            </p>
          )
        }
        actions={
          <EuiButton
            fill
            size="s"
            iconType={canManage ? undefined : 'lock'}
            isDisabled={!canManage}
            isLoading={enable.isLoading}
            onClick={() => enable.mutate()}
            data-test-subj="nightshiftOnboardingEnableButton"
          >
            {i18n.translate('xpack.nightshift.onboarding.enable.button', {
              defaultMessage: 'Enable Elastic nightshift',
            })}
          </EuiButton>
        }
      />
    </EuiPanel>
  );
}
