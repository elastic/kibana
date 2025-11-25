/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiText, EuiLink, EuiIcon, useEuiTheme, EuiTitle, EuiSpacer } from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation';
import { css } from '@emotion/react';
import * as i18n from './translations';

interface Props {
  minutesPerAlert: number;
  analystHourlyRate: number;
}

const ValueReportSettingsComponent: React.FC<Props> = ({ minutesPerAlert, analystHourlyRate }) => {
  const { navigateTo } = useNavigation();
  const {
    euiTheme: { size },
  } = useEuiTheme();
  const goToKibanaSettings = useCallback(
    () => navigateTo({ appId: 'management', path: '/kibana/settings?query=defaultValueReport' }),
    [navigateTo]
  );
  return (
    <div
      css={css`
        padding: ${size.base} ${size.xl};
      `}
      className="valueReportSettings"
    >
      <EuiTitle size="m">
        <h2>{i18n.COST_CALCULATIONS}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText size="xs">
        <p>
          {i18n.COST_CALCULATION({ minutesPerAlert, analystHourlyRate })}{' '}
          <EuiLink onClick={goToKibanaSettings}>
            {i18n.CHANGE_RATE}
            <EuiIcon
              type="popout"
              size="s"
              css={css`
                margin-left: 4px;
              `}
            />
          </EuiLink>
        </p>
        <p>{i18n.LEGAL_DISCLAIMER}</p>
      </EuiText>
    </div>
  );
};

export const ValueReportSettings = React.memo(ValueReportSettingsComponent);
