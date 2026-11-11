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
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';
import { getNightshiftCapabilities, getNightshiftServiceAccountName } from '@kbn/nightshift-shared';
import { useKibana } from '../../../hooks/use_kibana';
import { useSetUpNightshiftServiceAccount } from '../../../data/service_accounts/use_set_up_nightshift_service_account';

/** The accounts, roles and privileges `_enable` grants, until product docs exist. */
export const NIGHTSHIFT_SERVICE_ACCOUNT_PRIVILEGES_HREF =
  'https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/nightshift_investigations/README.md#accounts-and-roles';

/**
 * The one "Enable Elastic nightshift" step, shown until the space is set up: a single click binds
 * the space to its service accounts and installs the investigation agent. Nightshift runs as its
 * service account, so nothing else works before an admin does it. Enabling requires Nightshift
 * manage, the Manage engines sub-privilege and `manage_security`; everyone else sees why the
 * button is disabled.
 */
export const NightshiftSetupPrompt = ({
  status,
}: {
  status: InvestigatorServiceAccountStatus | undefined;
}) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const { canManage, canManageAndConfigure } = getNightshiftCapabilities(
    application.capabilities.nightshift
  );
  const setUp = useSetUpNightshiftServiceAccount();
  // The accounts are found or created by name; the backend assigns their ids on setup.
  const accounts = (['agent', 'automations', 'detection'] as const).map(
    getNightshiftServiceAccountName
  );
  const serviceAccountsOff = status?.serviceAccountsEnabled === false;
  const hasManageSecurity = status?.canModifyBoundWorkflows === true;
  const canEnable = canManageAndConfigure && !serviceAccountsOff && hasManageSecurity;

  const body = serviceAccountsOff ? (
    <p data-test-subj="nightshiftSetupServiceAccountsOff">
      <FormattedMessage
        id="xpack.nightshift.setup.serviceAccountsOffBody"
        defaultMessage="Service accounts are turned off in this deployment. Set {setting} in kibana.yml, then come back to enable Elastic nightshift."
        values={{ setting: <EuiCode>xpack.security.serviceAccounts.enabled: true</EuiCode> }}
      />
    </p>
  ) : canEnable ? (
    <p>
      <FormattedMessage
        id="xpack.nightshift.setup.adminBody"
        defaultMessage="Grant the Nightshift service accounts {accounts} with {privilegesLink}, and install them in this space. They will perform investigations, automations and detection on behalf of users in this space. You can revoke privileges anytime in Settings."
        values={{
          accounts: (
            <>
              {new Intl.ListFormat(i18n.getLocale(), {
                style: 'long',
                type: 'conjunction',
              })
                .formatToParts(accounts)
                .map(({ type, value }, index) =>
                  type === 'element' ? (
                    <EuiCode key={value}>{value}</EuiCode>
                  ) : (
                    // EuiCode pads its right edge, which would leave a gap before the separator.
                    <span
                      key={`${index}-${value}`}
                      css={css`
                        margin-inline-start: -${euiTheme.size.xs};
                      `}
                    >
                      {value}
                    </span>
                  )
                )}
            </>
          ),
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
  ) : canManageAndConfigure ? (
    <p data-test-subj="nightshiftSetupAskAdmin">
      <FormattedMessage
        id="xpack.nightshift.setup.askAdminBody"
        defaultMessage="A space administrator with the {privilege} privilege has to enable Elastic nightshift once for this space. Ask them to turn it on."
        values={{ privilege: <EuiCode>manage_security</EuiCode> }}
      />
    </p>
  ) : canManage && hasManageSecurity ? (
    <p data-test-subj="nightshiftSetupAskAdmin">
      {i18n.translate('xpack.nightshift.setup.askEnginesAdminBody', {
        defaultMessage:
          'A space administrator with the nightshift Manage engines privilege has to enable Elastic nightshift once for this space. Ask them to turn it on.',
      })}
    </p>
  ) : canManage ? (
    <p data-test-subj="nightshiftSetupAskAdmin">
      <FormattedMessage
        id="xpack.nightshift.setup.askEnginesAndSecurityAdminBody"
        defaultMessage="A space administrator with the nightshift Manage engines privilege and the {privilege} privilege has to enable Elastic nightshift once for this space. Ask them to turn it on."
        values={{ privilege: <EuiCode>manage_security</EuiCode> }}
      />
    </p>
  ) : (
    <p data-test-subj="nightshiftSetupAskAdmin">
      {i18n.translate('xpack.nightshift.setup.askNightshiftAdminBody', {
        defaultMessage:
          'A nightshift administrator has to enable Elastic nightshift once for this space. Ask them to turn it on.',
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
              defaultMessage: 'Enable Elastic nightshift',
            })}
          </EuiButton>
        }
      />
    </EuiPanel>
  );
};
