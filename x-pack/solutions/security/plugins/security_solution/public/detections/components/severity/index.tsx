/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const SeverityBadge = styled(EuiBadge)`
  align-items: center;
  display: inline-flex;
  height: 40px;
  text-transform: capitalize;
`;

const getBadgeColorFromSeverity = (severity: string) => {
  switch (`${severity}`.toLowerCase()) {
    case 'low':
      return '#C5CFD8';
    case 'medium':
      return '#EFC44C';
    case 'high':
      return '#FF7E62';
    case 'critical':
      return '#C3505E';
    default:
      return 'hollow';
  }
};

const getTextColorFromSeverity = (severity: string) => {
  switch (`${severity}`.toLowerCase()) {
    case 'critical': // fall through
    case 'high':
      return 'ghost';
    default:
      return 'default';
  }
};

interface Props {
  severity: string;
}

const SeverityComponent: React.FC<Props> = ({ severity }) => (
  <SeverityBadge color={getBadgeColorFromSeverity(severity)} data-test-subj="severity-badge">
    <EuiText color={getTextColorFromSeverity(severity)} data-test-subj="severity-text" size="xs">
      {severity}
    </EuiText>
  </SeverityBadge>
);

export const Severity = React.memo(SeverityComponent);
