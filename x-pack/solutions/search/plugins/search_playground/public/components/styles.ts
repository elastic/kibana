/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { type EuiThemeComputed } from '@elastic/eui';

export const AddDataFlyoutIndicesSelectable = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    '.euiSelectableList': {
      marginTop: euiTheme.size.s,
      marginBottom: euiTheme.size.l,
      marginLeft: euiTheme.size.l,
      marginRight: euiTheme.size.l,
    },
  });
