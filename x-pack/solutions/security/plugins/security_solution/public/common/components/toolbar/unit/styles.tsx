/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';

export const UnitCount = styled.span`
  font-size: ${({ theme }) => theme.font.scale.xs};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  border-right: ${({ theme }) => theme.border.thin};
  margin-right: ${({ theme }) => theme.size.s};
  padding-right: ${({ theme }) => theme.size.m};
`;
