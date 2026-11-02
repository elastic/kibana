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
import {
  getNightshiftServiceAccountName,
  type InvestigatorServiceAccountStatus,
} from '@kbn/nightshift-investigations-plugin/common';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { useSetUpNightshiftServiceAccount } from './use_investigator_service_account';

/** The accounts, roles and privileges `_enable` grants, until product docs exist. */
export const NIGHTSHIFT_SERVICE_ACCOUNT_PRIVILEGES_HREF =
  'https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/nightshift_investigations/README.md#accounts-and-roles';

/**
 * The one "Enable Elastic Nightshift" step, shown until the space is set up: a single click binds
 * the space to its service accounts and installs the investigation agent. Nightshift runs as its
 * service account, so nothing else works before an admin does it. Enabling requires Nightshift
 * manage and `manage_security`; everyone else sees why the button is disabled.
 */
export const NightshiftSetupPrompt = ({
  status,
}: {
  status: InvestigatorServiceAccountStatus | undefined;
}) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const setUp = useSetUpNightshiftServiceAccount();
  // The account is found or created by name; the backend assigns its id on setup.
  const account = getNightshiftServiceAccountName('agent');
  const serviceAccountsOff = status?.serviceAccountsEnabled === false;
  const canEnable = canManage && !serviceAccountsOff && status?.canModifyBoundWorkflows === true;

  const body = serviceAccountsOff ? (
    <p data-test-subj="nightshiftSetupServiceAccountsOff">
      <FormattedMessage
        id="xpack.nightshift.setup.serviceAccountsOffBody"
        defaultMessage="Service accounts are turned off in this deployment. Set {setting} in kibana.yml, then come back to enable Elastic Nightshift."
        values={{ setting: <EuiCode>xpack.security.serviceAccounts.enabled: true</EuiCode> }}
      />
    </p>
  ) : canEnable ? (
    <p>
      <FormattedMessage
        id="xpack.nightshift.setup.adminBody"
        defaultMessage="Grant the agent a {account} account with {privilegesLink}, and install it in this space. It will perform investigations and actions on behalf of users in this space. You can revoke privileges anytime in Settings."
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
              data-test-subj="nightshiftSetupPrivilegesLink"
            >
              {i18n.translate('xpack.nightshift.setup.privilegesLink', {
                defaultMessage: 'these privileges',
              })}
            </EuiLink>
          ),
        }}
      />
    </p>
  ) : canManage ? (
    <p data-test-subj="nightshiftSetupAskAdmin">
      <FormattedMessage
        id="xpack.nightshift.setup.askAdminBody"
        defaultMessage="A space administrator with the {privilege} privilege has to enable Elastic Nightshift once for this space. Ask them to turn it on."
        values={{ privilege: <EuiCode>manage_security</EuiCode> }}
      />
    </p>
  ) : (
    <p data-test-subj="nightshiftSetupAskAdmin">
      {i18n.translate('xpack.nightshift.setup.askNightshiftAdminBody', {
        defaultMessage:
          'A Nightshift administrator has to enable Elastic Nightshift once for this space. Ask them to turn it on.',
      })}
    </p>
  );

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="nightshiftSetupPrompt">
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
            {i18n.translate('xpack.nightshift.setup.title', {
              defaultMessage: 'One-time admin setup required for this space',
            })}
          </h2>
        }
        titleSize="xs"
        body={body}
        actions={
          <EuiButton
            size="s"
            fill
            iconType={canEnable ? undefined : 'lock'}
            isDisabled={!canEnable}
            isLoading={setUp.isLoading}
            onClick={() => setUp.mutate()}
            data-test-subj="nightshiftSetUpServiceAccount"
          >
            {i18n.translate('xpack.nightshift.setup.enableButton', {
              defaultMessage: 'Enable Elastic Nightshift',
            })}
          </EuiButton>
        }
      />
    </EuiPanel>
  );
};
