/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { MISCONFIGURATION_STATUS } from '@kbn/cloud-security-posture-common';

interface Props {
  type?: 'passed' | 'failed';
}

// 'fail' / 'pass' are same chars length, but not same width size.
// 46px is used to make sure the badge is always the same width.
const BADGE_WIDTH = '46px';

const getColor = (type: Props['type']): EuiBadgeProps['color'] => {
  if (type === MISCONFIGURATION_STATUS.PASSED) return 'success';
  if (type === MISCONFIGURATION_STATUS.FAILED) return 'danger';
  return 'default';
};

export const CspEvaluationBadge = ({ type }: Props) => (
  <EuiBadge
    color={getColor(type)}
    css={css`
      width: ${BADGE_WIDTH};
      display: flex;
      justify-content: center;
    `}
    data-test-subj={`${type}_finding`}
  >
    {type === MISCONFIGURATION_STATUS.FAILED ? (
      <FormattedMessage
        id="securitySolutionPackages.csp.cspEvaluationBadge.failLabel"
        defaultMessage="Fail"
      />
    ) : type === MISCONFIGURATION_STATUS.PASSED ? (
      <FormattedMessage
        id="securitySolutionPackages.csp.cspEvaluationBadge.passLabel"
        defaultMessage="Pass"
      />
    ) : (
      <FormattedMessage
        id="securitySolutionPackages.csp.cspEvaluationBadge.naLabel"
        defaultMessage="N/A"
      />
    )}
  </EuiBadge>
);
