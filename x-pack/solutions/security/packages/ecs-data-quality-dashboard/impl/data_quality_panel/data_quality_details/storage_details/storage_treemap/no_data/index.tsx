/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import * as i18n from '../translations';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    noDataLabel: css({
      textAlign: 'center',
    }),
    container: css({
      padding: `${euiTheme.size.m} 0`,
    }),
  };
};

interface Props {
  reason?: string;
}

const NoDataComponent: React.FC<Props> = ({ reason }) => {
  const styles = useStyles();
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow>
        <div css={styles.container}>
          <EuiText css={styles.noDataLabel} color="subdued" data-test-subj="noDataLabel" size="xs">
            {i18n.NO_DATA_LABEL}
          </EuiText>

          {reason != null && (
            <>
              <EuiSpacer size="s" />
              <EuiText
                css={styles.noDataLabel}
                color="subdued"
                data-test-subj="reasonLabel"
                size="xs"
              >
                {reason}
              </EuiText>
            </>
          )}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

NoDataComponent.displayName = 'NoDataComponent';

export const NoData = React.memo(NoDataComponent);
