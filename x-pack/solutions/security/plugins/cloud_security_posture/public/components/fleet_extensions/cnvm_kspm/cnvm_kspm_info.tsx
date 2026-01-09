/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { VULN_MGMT_POLICY_TEMPLATE } from '../../../../common/constants';

interface CnvmKspmTemplateInfoProps {
  policyTemplate: typeof KSPM_POLICY_TEMPLATE | typeof VULN_MGMT_POLICY_TEMPLATE;
}

export const CnvmKspmTemplateInfo = ({ policyTemplate }: CnvmKspmTemplateInfoProps) => (
  <EuiText color="subdued" size="s">
    {policyTemplate === KSPM_POLICY_TEMPLATE && (
      <FormattedMessage
        id="xpack.csp.fleetIntegration.configureKspmIntegrationDescription"
        defaultMessage="Select the Kubernetes cluster type you want to monitor and then fill in the name and description to help identify this integration"
      />
    )}
    {policyTemplate === VULN_MGMT_POLICY_TEMPLATE && (
      <>
        <EuiCallOut
          announceOnMount={false}
          iconType="info"
          color="primary"
          data-test-subj="additionalChargeCalloutTestSubj"
          title={
            <FormattedMessage
              id="xpack.csp.fleetIntegration.cnvm.additionalChargesCalloutTitle"
              defaultMessage="Additional charges on cloud provider billing account."
            />
          }
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.csp.fleetIntegration.cnvm.additionalChargesCalloutDescription"
                defaultMessage="Please note that using this service may result in additional charges on your next cloud provider billing statement due to increased usage."
              />
            </p>
          </EuiText>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <FormattedMessage
          id="xpack.csp.fleetIntegration.cnvm.awsSupportText"
          defaultMessage="We currently support <b>AWS(Amazon Web Services)</b> cloud provider"
          values={{
            b: (chunks) => <b>{chunks}</b>,
          }}
        />
        <EuiSpacer size="s" />
        <FormattedMessage
          id="xpack.csp.fleetIntegration.cnvm.chooseNameAndDescriptionText"
          defaultMessage="Choose a name and description to help identify this integration"
        />
      </>
    )}
  </EuiText>
);
