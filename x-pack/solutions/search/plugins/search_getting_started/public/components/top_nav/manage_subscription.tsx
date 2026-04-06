/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  manageSubscriptionLink: string;
}

export const ManageSubscription: React.FC<Props> = ({ manageSubscriptionLink }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiLink
        href={manageSubscriptionLink}
        target="_blank"
        data-test-subj="gettingStartedManageSubscription"
      >
        {i18n.translate('xpack.search.gettingStarted.topNav.manageSubscriptionLabel', {
          defaultMessage: 'Manage subscription',
        })}
      </EuiLink>
    </EuiFlexItem>
  );
};
