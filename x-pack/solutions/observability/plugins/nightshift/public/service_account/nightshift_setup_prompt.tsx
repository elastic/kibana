/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCode, EuiEmptyPrompt, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';
import { useSetUpNightshiftServiceAccount } from './use_investigator_service_account';

const DEFAULT_ACCOUNT = 'kibana/nightshift-agent-<space>';

/**
 * First-run step shown instead of Nightshift until the space is set up. Nightshift only works as
 * its service account, so nothing else in the app is usable before this.
 */
export const NightshiftSetupPrompt = ({
  status,
  canManage,
}: {
  status: InvestigatorServiceAccountStatus | undefined;
  canManage: boolean;
}) => {
  const setUp = useSetUpNightshiftServiceAccount();
  const account = status?.serviceAccountId ?? DEFAULT_ACCOUNT;
  const serviceAccountsOff = status?.serviceAccountsEnabled === false;

  const renderActions = () => {
    if (serviceAccountsOff) {
      return (
        <KbnInfoCallout
          size="s"
          title={i18n.translate('xpack.nightshift.setup.serviceAccountsOffTitle', {
            defaultMessage: 'Service accounts are turned off in this deployment',
          })}
          data-test-subj="nightshiftSetupServiceAccountsOff"
        >
          <FormattedMessage
            id="xpack.nightshift.setup.serviceAccountsOffBody"
            defaultMessage="Set {setting} in kibana.yml, then come back to set up Nightshift."
            values={{ setting: <EuiCode>xpack.security.serviceAccounts.enabled: true</EuiCode> }}
          />
        </KbnInfoCallout>
      );
    }
    if (!canManage) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="nightshiftSetupAskAdmin">
          {i18n.translate('xpack.nightshift.setup.askAdmin', {
            defaultMessage: 'Ask an administrator to set up Nightshift in this space.',
          })}
        </EuiText>
      );
    }
    return (
      <>
        <EuiButton
          fill
          iconType="lock"
          isLoading={setUp.isLoading}
          onClick={() => setUp.mutate()}
          data-test-subj="nightshiftSetUpServiceAccount"
        >
          {i18n.translate('xpack.nightshift.setup.enableButton', {
            defaultMessage: 'Enable service account',
          })}
        </EuiButton>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.nightshift.setup.privilegeHint"
            defaultMessage="Requires the {privilege} cluster privilege."
            values={{ privilege: <EuiCode>manage_security</EuiCode> }}
          />
        </EuiText>
      </>
    );
  };

  return (
    <EuiEmptyPrompt
      iconType="lock"
      color="plain"
      hasBorder
      data-test-subj="nightshiftSetupPrompt"
      title={
        <h2>
          {i18n.translate('xpack.nightshift.setup.title', {
            defaultMessage: 'Set up Nightshift in this space',
          })}
        </h2>
      }
      body={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.nightshift.setup.body"
              defaultMessage="Nightshift runs its investigations as its own service account, {account}, not as the people who use it. Its access is set by the account's role, which only applies to this space, and its work can be traced to it. An administrator sets it up once per space, which creates the space's Nightshift service accounts and roles if they do not exist yet."
              values={{ account: <EuiCode>{account}</EuiCode> }}
            />
          </p>
        </EuiText>
      }
      actions={renderActions()}
    />
  );
};
