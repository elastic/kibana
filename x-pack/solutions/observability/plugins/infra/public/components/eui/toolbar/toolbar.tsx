/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import styled from '@emotion/styled';

export const Toolbar = styled(EuiPanel)`
  border-top: none;
  border-right: none;
  border-left: none;
  border-radius: 0;
  padding: ${(props) => props.theme.euiTheme.size.s} ${(props) => props.theme.euiTheme.size.l};
`;

Toolbar.defaultProps = { grow: false, paddingSize: 'none' };
