/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';

const borderSpec = `1px solid ${euiThemeVars.euiColorLightShade}`;

export function NestedView({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={css`
        padding-left: ${euiThemeVars.euiSizeS}; //11px
        margin-left: ${euiThemeVars.euiSizeS}; //11px
        border-left: ${last ? 'none' : borderSpec};
        margin-top: -${euiThemeVars.euiSizeXS}; //-4px
        padding-top: ${euiThemeVars.euiSizeXS}; //4px
        position: relative;
      `}
    >
      <div
        className={css`
          border-bottom: ${borderSpec};
          border-left: ${borderSpec};
          position: absolute;
          top: 0;
          left: ${last ? '0px' : '-1px'};
          width: ${last ? '9px' : '10px'};
          height: ${euiThemeVars.euiSizeL}; //25px
        `}
      />
      {children}
    </div>
  );
}
