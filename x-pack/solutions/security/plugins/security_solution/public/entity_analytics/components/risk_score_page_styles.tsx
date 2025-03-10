/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import type { EuiThemeComputed } from '@elastic/eui';
interface EntityAnalyticsRiskScorePageStyles {
  VerticalSeparator: ReturnType<typeof styled.div>;
}

export const getEntityAnalyticsRiskScorePageStyles = (
  euiTheme: EuiThemeComputed
): EntityAnalyticsRiskScorePageStyles => ({
  VerticalSeparator: styled.div`
    :before {
      content: '';
      height: ${euiTheme.size.l};
      border-left: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    }
  `,
});
