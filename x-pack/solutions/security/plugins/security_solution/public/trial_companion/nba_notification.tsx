/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  title: string;
  message: string;
  viewButtonText: string | undefined;
  onSeenBanner: () => void;
  onViewButton: (() => void) | undefined;
}
export const NBANotification: React.FC<Props> = ({
  title,
  message,
  viewButtonText,
  onSeenBanner,
  onViewButton,
}) => {
  window.console.log('Rendering NBA Notification:', title, message, viewButtonText);

  return (
    <EuiCallOut
      announceOnMount
      iconType="cheer"
      onDismiss={onSeenBanner}
      title={
        <FormattedMessage
          id="xpack.securitySolution.trialNotifications.trialNotification.title"
          defaultMessage="{title}"
          values={{ title }}
        />
      }
    >
      <FormattedMessage
        id="xpack.securitySolution.trialNotifications.trialNotification.message"
        defaultMessage="{message}"
        values={{ message }}
      />
      <EuiSpacer size="s" />
      {onViewButton && viewButtonText && (
        <EuiButton size="s" onClick={onViewButton} color="success" style={{ marginRight: '8px' }}>
          <FormattedMessage
            id="xpack.securitySolution.trialNotifications.trialNotification.viewButton"
            defaultMessage="{viewButtonText}"
            values={{ viewButtonText }}
          />
        </EuiButton>
      )}
    </EuiCallOut>
  );
};
