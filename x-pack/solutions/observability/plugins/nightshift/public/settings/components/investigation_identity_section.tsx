/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import {
  useInvestigatorServiceAccount,
  useSetInvestigatorServiceAccount,
} from '../hooks/use_investigator_service_account';
import { SettingsSectionRow } from './settings_section';

/** Lets an admin run this space's investigations as the Nightshift service account. */
export const InvestigationIdentitySection = ({ canManage }: { canManage: boolean }) => {
  const status = useInvestigatorServiceAccount();
  const setServiceAccount = useSetInvestigatorServiceAccount();

  const isBound = status.data?.installed === true && status.data.enabled === true;
  const serviceAccountId = status.data?.serviceAccountId ?? 'kibana/nightshift_investigator';

  const renderControl = () => {
    if (status.isLoading) return <EuiLoadingSpinner size="m" />;
    if (status.data && !status.data.serviceAccountsEnabled) {
      return (
        <KbnInfoCallout
          size="s"
          title={i18n.translate('xpack.nightshift.settings.serviceAccount.disabledCalloutTitle', {
            defaultMessage: 'Service accounts are turned off in this deployment',
          })}
        />
      );
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          {isBound ? (
            <EuiBadge color="success" iconType="check" data-test-subj="nightshiftServiceAccountOn">
              {i18n.translate('xpack.nightshift.settings.serviceAccount.onBadge', {
                defaultMessage: 'Runs as service account',
              })}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow" data-test-subj="nightshiftServiceAccountOff">
              {i18n.translate('xpack.nightshift.settings.serviceAccount.offBadge', {
                defaultMessage: 'Runs as the requesting user',
              })}
            </EuiBadge>
          )}
        </EuiFlexItem>
        {isBound && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.nightshift.settings.serviceAccount.boundAccount"
                defaultMessage="Account: {account}"
                values={{ account: <EuiCode>{serviceAccountId}</EuiCode> }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType={isBound ? 'user' : 'lock'}
            color={isBound ? 'text' : 'primary'}
            fill={!isBound}
            isLoading={setServiceAccount.isLoading}
            isDisabled={!canManage}
            onClick={() => setServiceAccount.mutate(isBound ? 'disable' : 'enable')}
            data-test-subj="nightshiftToggleServiceAccount"
          >
            {isBound
              ? i18n.translate('xpack.nightshift.settings.serviceAccount.disableButton', {
                  defaultMessage: 'Run as requesting user',
                })
              : i18n.translate('xpack.nightshift.settings.serviceAccount.enableButton', {
                  defaultMessage: 'Enable service account',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <SettingsSectionRow
      title={i18n.translate('xpack.nightshift.settings.serviceAccount.title', {
        defaultMessage: 'Investigation identity',
      })}
      description={
        <p>
          <FormattedMessage
            id="xpack.nightshift.settings.serviceAccount.description"
            defaultMessage="Run investigations in this space as the {account} service account instead of the user who starts them. Enabling creates the account and its role if they do not exist and requires the {privilege} cluster privilege."
            values={{
              account: <EuiCode>{serviceAccountId}</EuiCode>,
              privilege: <EuiCode>manage_security</EuiCode>,
            }}
          />
        </p>
      }
      data-test-subj="nightshiftInvestigationIdentitySection"
    >
      {renderControl()}
    </SettingsSectionRow>
  );
};
