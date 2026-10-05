/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ALERTZERO_ENABLED_SETTING_ID, ALERTZERO_FEATURE_ID } from '@kbn/alertzero-common';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { SubscriptionAvailability } from '../../common/availability';
import type { AlertZeroStartDependencies } from '../types';

type Services = CoreStart & AlertZeroStartDependencies;

const SubscriptionActions = ({ serverless }: { serverless: boolean }) => {
  const {
    services: { cloud, application },
  } = useKibana<Services>();
  const [billingUrl, setBillingUrl] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    if (serverless && cloud) {
      void cloud
        .getPrivilegedUrls()
        .then(({ billingUrl: url }) => {
          if (!cancelled && url?.startsWith('https://')) {
            setBillingUrl(url);
          }
        })
        .catch(() => {
          // Users without billing access should contact their administrator.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [cloud, serverless]);

  if (serverless) {
    return billingUrl ? (
      <EuiButton fill href={billingUrl} target="_blank">
        <FormattedMessage
          id="xpack.alertzero.access.manageSubscriptionButtonLabel"
          defaultMessage="Manage subscription"
        />
      </EuiButton>
    ) : (
      <FormattedMessage
        id="xpack.alertzero.access.contactBillingAdminDescription"
        defaultMessage="Contact your administrator to upgrade your subscription."
      />
    );
  }
  return (
    <>
      <EuiButton fill href="https://www.elastic.co/subscriptions" target="_blank">
        <FormattedMessage
          id="xpack.alertzero.access.subscriptionPlansButtonLabel"
          defaultMessage="Subscription plans"
        />
      </EuiButton>
      <EuiButtonEmpty
        href={application.getUrlForApp('management', { deepLinkId: 'license_management' })}
      >
        <FormattedMessage
          id="xpack.alertzero.access.manageLicenseButtonLabel"
          defaultMessage="Manage your license"
        />
      </EuiButtonEmpty>
    </>
  );
};

/** Prevents feature content and data requests until space, subscription and read access are allowed. */
export const AccessBoundary = ({
  availability$,
  children,
}: React.PropsWithChildren<{
  availability$: Observable<SubscriptionAvailability>;
}>): React.ReactElement => {
  const {
    services: { application, uiSettings, agentBuilder, agenticInvestigations, proposals },
  } = useKibana<Services>();
  const subscription = useObservable(availability$, 'loading');
  const enabled$ = useMemo(
    () => uiSettings.get$<boolean>(ALERTZERO_ENABLED_SETTING_ID, false),
    [uiSettings]
  );
  const enabled = useObservable(enabled$, false);

  if (!enabled) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertzeroDisabled"
        iconType="lock"
        title={
          <h2>
            <FormattedMessage
              id="xpack.alertzero.access.disabledTitle"
              defaultMessage="AlertZero is not enabled"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.alertzero.access.disabledDescription"
              defaultMessage="Contact your administrator to enable AlertZero for this space in Advanced Settings."
            />
          </p>
        }
      />
    );
  }
  if (subscription === 'loading') {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertzeroAccessLoading"
        icon={<EuiLoadingSpinner size="xl" />}
      />
    );
  }
  if (subscription === 'license' || subscription === 'serverless_tier') {
    const serverless = subscription === 'serverless_tier';
    return (
      <EuiEmptyPrompt
        data-test-subj="alertzeroSubscriptionGate"
        iconType="lock"
        title={
          <h2>
            {serverless ? (
              <FormattedMessage
                id="xpack.alertzero.access.upgradeSubscriptionTitle"
                defaultMessage="Upgrade your subscription"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertzero.access.upgradeLicenseTitle"
                defaultMessage="Upgrade your license"
              />
            )}
          </h2>
        }
        body={
          <p>
            {serverless ? (
              <FormattedMessage
                id="xpack.alertzero.access.upgradeSubscriptionDescription"
                defaultMessage="AlertZero requires the Security Complete subscription."
              />
            ) : (
              <FormattedMessage
                id="xpack.alertzero.access.upgradeLicenseDescription"
                defaultMessage="AlertZero requires an active Enterprise license."
              />
            )}
          </p>
        }
        actions={<SubscriptionActions serverless={serverless} />}
      />
    );
  }
  if (application.capabilities[ALERTZERO_FEATURE_ID]?.show !== true) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertzeroPrivilegesGate"
        iconType="lock"
        title={
          <h2>
            <FormattedMessage
              id="xpack.alertzero.access.missingPrivilegesTitle"
              defaultMessage="Contact your administrator for access"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.alertzero.access.missingPrivilegesDescription"
              defaultMessage="To view AlertZero in this space, you need the AlertZero Read privilege."
            />
          </p>
        }
      />
    );
  }
  if (!agentBuilder || !agenticInvestigations || !proposals) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.alertzero.access.dependenciesUnavailableTitle"
              defaultMessage="AlertZero is unavailable"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.alertzero.access.dependenciesUnavailableDescription"
              defaultMessage="Contact your administrator to enable AlertZero's required plugins."
            />
          </p>
        }
      />
    );
  }
  return <>{children}</>;
};
