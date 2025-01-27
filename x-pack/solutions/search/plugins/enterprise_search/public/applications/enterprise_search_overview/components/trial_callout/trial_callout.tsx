/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import moment from 'moment';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { LicensingLogic } from '../../../shared/licensing';

export const TrialCallout: React.FC = () => {
  const { license, isTrial } = useValues(LicensingLogic);

  if (!isTrial) return null;

  const title = (
    <>
      <FormattedMessage
        id="xpack.enterpriseSearch.trialCalloutTitle"
        defaultMessage="Your Elastic Stack Trial license, which enables Platinum features, expires in {days, plural, one {# day} other {# days}}."
        values={{
          days: moment(license?.expiryDateInMillis).diff(moment({ hours: 0 }), 'days'),
        }}
      />{' '}
      <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
        <u>
          <FormattedMessage
            id="xpack.enterpriseSearch.trialCalloutLink"
            defaultMessage="Learn more about Elastic Stack licenses."
          />
        </u>
      </EuiLink>
    </>
  );

  return (
    <>
      <EuiCallOut size="s" title={title} iconType="iInCircle" style={{ margin: '0 auto' }} />
      <EuiSpacer size="xxl" />
    </>
  );
};
