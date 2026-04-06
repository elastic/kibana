/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAuthenticatedUser } from '@kbn/search-shared-ui';
import React from 'react';

export const WelcomeMessage = () => {
  const user = useAuthenticatedUser();
  return (
    <EuiFlexItem grow={false}>
      <EuiTitle
        size="xs"
        aria-label={i18n.translate('undefined.welcomeMessage.euiTitle.welcomeMessageLabel', {
          defaultMessage: 'Welcome message',
        })}
      >
        <h4>
          {user?.email
            ? i18n.translate('xpack.search.gettingStarted.welcome.title', {
                defaultMessage: 'Welcome, {email}',
                values: { email: user.email },
              })
            : i18n.translate('xpack.search.gettingStarted.welcome.title.default', {
                defaultMessage: 'Welcome',
              })}
        </h4>
      </EuiTitle>
    </EuiFlexItem>
  );
};
