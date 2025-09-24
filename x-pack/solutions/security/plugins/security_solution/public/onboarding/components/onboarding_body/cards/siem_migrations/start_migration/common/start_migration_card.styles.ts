/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import { START_MIGRATION_TITLE_CLASS_NAME } from '../../../../../../../siem_migrations/common/styles';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    .${START_MIGRATION_TITLE_CLASS_NAME} {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
  `;
};
