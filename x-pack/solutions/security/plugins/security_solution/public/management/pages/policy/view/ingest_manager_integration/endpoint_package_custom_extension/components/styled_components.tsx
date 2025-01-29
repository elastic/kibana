/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const StyledEuiFlexGridGroup = styled(EuiFlexGroup)`
  display: grid;
  grid-template-columns: 33% 45% 22%;
  grid-template-areas: 'title summary link';
`;

export const StyledEuiFlexGridItem = styled(EuiFlexItem)<{
  gridarea: string;
  alignitems?: string;
}>`
  grid-area: ${({ gridarea }) => gridarea};
  align-items: ${({ alignitems }) => alignitems ?? 'center'};
  margin: 0px;
  padding: 12px;
`;

export const StyledEuiFlexItem = styled(EuiFlexItem)`
  flex-direction: row-reverse;
`;
