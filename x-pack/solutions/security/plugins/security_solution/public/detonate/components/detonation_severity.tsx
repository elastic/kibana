/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';

import type { DetonationSeverity } from '../../../common/detonate';
import { SeverityBadge } from '../../common/components/severity_badge';
import { NO_RULE_SEVERITY, NO_RULE_SEVERITY_TOOLTIP } from '../translations';

interface DetonationSeverityProps {
  severity: DetonationSeverity | null;
}

/**
 * Shows the single highest detection-rule severity rather than every severity the detonation
 * produced. A detonation caught only by endpoint protections has no rule severity at all, which is
 * stated explicitly instead of being rendered as a dash next to real severities.
 */
const DetonationSeverityCellComponent: React.FC<DetonationSeverityProps> = ({ severity }) => {
  if (severity === null) {
    return (
      <EuiToolTip content={NO_RULE_SEVERITY_TOOLTIP}>
        <EuiText size="s" color="subdued" tabIndex={0}>
          {NO_RULE_SEVERITY}
        </EuiText>
      </EuiToolTip>
    );
  }

  return <SeverityBadge value={severity} data-test-subj="detonateSeverity" />;
};

export const DetonationSeverityCell = React.memo(DetonationSeverityCellComponent);
