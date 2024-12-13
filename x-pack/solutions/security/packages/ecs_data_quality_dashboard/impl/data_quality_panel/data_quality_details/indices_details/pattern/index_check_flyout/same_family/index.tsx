/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { SAME_FAMILY_BADGE_LABEL } from '../../../../../translations';

const SameFamilyBadge = styled(EuiBadge)`
  margin: ${({ theme }) => `0 ${theme.eui.euiSizeXS}`};
`;

const SameFamilyComponent: React.FC = () => (
  <SameFamilyBadge data-test-subj="sameFamily" color="warning">
    {SAME_FAMILY_BADGE_LABEL}
  </SameFamilyBadge>
);

SameFamilyComponent.displayName = 'SameFamilyComponent';

export const SameFamily = React.memo(SameFamilyComponent);
