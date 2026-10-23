/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  isNightshiftSetUp,
  useInvestigatorServiceAccount,
} from '../../service_account/use_investigator_service_account';
import { SettingsSectionRow } from './settings_section';

/** Shows whether this space is set up with the Nightshift service account, read-only. */
export const InvestigationIdentitySection = () => {
  const status = useInvestigatorServiceAccount();
  const isSetUp = isNightshiftSetUp(status.data);

  const renderStatus = () => {
    if (status.isLoading) return <EuiLoadingSpinner size="m" />;
    if (!status.data) {
      return (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="warning"
          title={i18n.translate('xpack.nightshift.settings.serviceAccount.errorTitle', {
            defaultMessage: 'Could not read the service account setup of this space',
          })}
          data-test-subj="nightshiftServiceAccountError"
        >
          {status.error?.message && <p>{status.error.message}</p>}
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType="refresh"
            onClick={() => status.refetch()}
            data-test-subj="nightshiftServiceAccountRetry"
          >
            {i18n.translate('xpack.nightshift.settings.serviceAccount.retry', {
              defaultMessage: 'Try again',
            })}
          </EuiButtonEmpty>
        </EuiCallOut>
      );
    }
    const [agent, ...otherAccounts] = status.data.serviceAccounts;
    const renderAccount = ({ name, id }: { name: string; id: string | null }) => (
      <>
        <EuiCode>{name}</EuiCode>
        {id && <> ({id})</>}
      </>
    );
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          {isSetUp ? (
            <EuiBadge color="success" iconType="check" data-test-subj="nightshiftServiceAccountOn">
              {i18n.translate('xpack.nightshift.settings.serviceAccount.onBadge', {
                defaultMessage: 'Set up',
              })}
            </EuiBadge>
          ) : (
            <EuiBadge color="warning" data-test-subj="nightshiftServiceAccountOff">
              {i18n.translate('xpack.nightshift.settings.serviceAccount.offBadge', {
                defaultMessage: 'Not set up',
              })}
            </EuiBadge>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.nightshift.settings.serviceAccount.account"
              defaultMessage="Account: {account} · Role: {role}"
              values={{
                account: renderAccount(agent),
                role: <EuiCode>{agent.role}</EuiCode>,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        {isSetUp && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="nightshiftServiceAccountOthers">
              <FormattedMessage
                id="xpack.nightshift.settings.serviceAccount.otherAccounts"
                defaultMessage="Other Nightshift accounts: {accounts}"
                values={{
                  accounts: otherAccounts.map((account, index) => (
                    <React.Fragment key={account.kind}>
                      {index > 0 && ', '}
                      {renderAccount(account)} · <EuiCode>{account.role}</EuiCode>
                    </React.Fragment>
                  )),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  return (
    <SettingsSectionRow
      title={i18n.translate('xpack.nightshift.settings.serviceAccount.title', {
        defaultMessage: 'Service account',
      })}
      description={
        <p>
          {i18n.translate('xpack.nightshift.settings.serviceAccount.description', {
            defaultMessage:
              'Nightshift runs every investigation in this space as this service account, not as the user who starts it. What it can read and change is set by the account’s role.',
          })}
        </p>
      }
      data-test-subj="nightshiftInvestigationIdentitySection"
    >
      {renderStatus()}
    </SettingsSectionRow>
  );
};
