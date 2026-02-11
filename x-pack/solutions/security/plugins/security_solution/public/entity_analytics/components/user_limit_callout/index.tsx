/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { noop } from 'lodash/fp';
import { useUserLimitStatus } from '../../hooks/use_privileged_monitoring_health';

interface UserLimitCallOutProps {
  /** Variant to display - compact shows basic info, full shows detailed warnings */
  variant?: 'compact' | 'full';
  /** Whether to show only when limit is exceeded (default: false - shows info at 90%+ usage) */
  showOnlyWhenExceeded?: boolean;
  /** Callback when "Manage data sources" button is clicked */
  onManageDataSources?: () => void;
}

export const UserLimitCallOut: React.FC<UserLimitCallOutProps> = ({
  variant = 'full',
  showOnlyWhenExceeded = false,
  onManageDataSources = noop,
}: UserLimitCallOutProps) => {
  const { userStats, isLoading } = useUserLimitStatus();

  if (isLoading || !userStats) {
    return null;
  }

  const { currentCount, maxAllowed } = userStats;

  // Determine when to show the callout
  const shouldShow =
    userStats.isLimitExceeded ||
    (!showOnlyWhenExceeded && (userStats.isNearLimit || variant === 'compact'));
  if (!shouldShow) {
    return null;
  }

  if (userStats.isLimitExceeded) {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.exceeded.title"
            defaultMessage="Performance may be degraded"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="privileged-user-limit-exceeded-callout"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.exceeded.description"
            defaultMessage="You have {currentCount} privileged users, which exceeds the limit of {maxAllowed}. Remove some privileged users to prevent performance degradation."
            values={{
              currentCount: <strong>{currentCount.toLocaleString()}</strong>,
              maxAllowed: <strong>{maxAllowed.toLocaleString()}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        <EuiButton
          size="s"
          iconType="gear"
          color="warning"
          onClick={onManageDataSources}
          data-test-subj="manage-data-sources-button-exceeded"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.manageDataSources"
            defaultMessage="Manage data sources"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (userStats.isNearLimit && variant === 'full') {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.nearLimit.title"
            defaultMessage="Approaching user limit"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="privileged-user-near-limit-callout"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.nearLimit.description"
            defaultMessage="You're currently monitoring {currentCount} out of {maxAllowed} allowed privileged users ({utilizationPercentage}% of limit). Consider removing some users to prevent performance degradation."
            values={{
              currentCount: <strong>{currentCount.toLocaleString()}</strong>,
              maxAllowed: <strong>{maxAllowed.toLocaleString()}</strong>,
              utilizationPercentage: <strong>{userStats.usagePercentage}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        <EuiButton
          size="s"
          iconType="gear"
          color="warning"
          onClick={onManageDataSources}
          data-test-subj="manage-data-sources-button-near-limit"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.manageDataSources"
            defaultMessage="Manage data sources"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (variant === 'compact') {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.info.title"
            defaultMessage="User limit information"
          />
        }
        color="primary"
        iconType="info"
        size="s"
        data-test-subj="privileged-user-limit-info-callout"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.info.description"
            defaultMessage="Maximum supported number of privileged users allowed: {maxAllowed}"
            values={{
              maxAllowed: <strong>{maxAllowed.toLocaleString()}</strong>,
            }}
          />
        </EuiText>
      </EuiCallOut>
    );
  }

  return null;
};

UserLimitCallOut.displayName = 'UserLimitCallOut';
