/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUserLimitStatus } from '../../api/hooks/use_privileged_monitoring_health';

interface UserLimitCallOutProps {
  /** Variant to display - compact shows basic info, full shows detailed warnings */
  variant?: 'compact' | 'full';
  /** Whether to show only when limit is exceeded (default: false - shows info at 90%+ usage) */
  showOnlyWhenExceeded?: boolean;
}

export const UserLimitCallOut: React.FC<UserLimitCallOutProps> = ({
  variant = 'full',
  showOnlyWhenExceeded = false,
}) => {
  const { userStats, isLoading, isLimitExceeded, isNearLimit, utilizationPercentage } =
    useUserLimitStatus();

  if (isLoading || !userStats) {
    return null;
  }

  const { current_count: currentCount, max_allowed: maxAllowed } = userStats;

  // Determine when to show the callout
  const shouldShow =
    isLimitExceeded || (!showOnlyWhenExceeded && (isNearLimit || variant === 'compact'));
  if (!shouldShow) {
    return null;
  }

  if (isLimitExceeded) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.userLimit.exceeded.title"
            defaultMessage="User limit exceeded"
          />
        }
        color="danger"
        iconType="warning"
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
      </EuiCallOut>
    );
  }

  if (isNearLimit && variant === 'full') {
    return (
      <EuiCallOut
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
              utilizationPercentage: <strong>{utilizationPercentage}</strong>,
            }}
          />
        </EuiText>
      </EuiCallOut>
    );
  }

  if (variant === 'compact') {
    return (
      <EuiCallOut
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
