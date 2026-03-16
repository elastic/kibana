/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPopover, EuiText, EuiButtonIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

export const CorrelationInfoIcon = memo(function CorrelationInfoIcon(): JSX.Element {
  const { docLinks } = useKibana().services;
  const [isPopoverOpen, { off: closePopover, on: togglePopover }] = useBoolean(false);

  const button = (
    <EuiButtonIcon
      iconType="iInCircle"
      onClick={togglePopover}
      aria-label={i18n.CORRELATION_INFO_ARIA_LABEL}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      aria-label={i18n.CORRELATION_INFO_ARIA_LABEL}
    >
      <EuiText size="s" style={{ maxWidth: 300 }}>
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationInfoText"
          defaultMessage="Correlation rules identify patterns across alerts from multiple detection rules. They group related alerts by shared fields (like host or user) within a time window, creating a single correlated alert that links the contributing alerts together. {learnMore}"
          values={{
            learnMore: (
              <EuiLink
                href={docLinks.links.securitySolution.createCorrelationRuleType}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationInfoLearnMore"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
});
