/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import styled from '@emotion/styled';

const InfoContainer = styled(EuiText)`
  margin-right: ${({ theme }) => theme.euiTheme.size.s};
`;

const Label = styled.span`
  font-weight: ${({ theme }) => theme.euiTheme.font.weight.bold};
  margin-right: ${({ theme }) => theme.euiTheme.size.xs};
`;

export const Info = ({ label, value }: { value: React.ReactNode; label: string }) => (
  <InfoContainer size="xs">
    <Label>{label} </Label> {value}
  </InfoContainer>
);
