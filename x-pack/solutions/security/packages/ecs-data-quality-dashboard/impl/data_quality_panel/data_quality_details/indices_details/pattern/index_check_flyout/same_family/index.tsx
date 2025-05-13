/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { SAME_FAMILY_BADGE_LABEL } from '../../../../../translations';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    sameFamilyBadge: css({
      margin: `0 ${euiTheme.size.xs}`,
    }),
  };
};

const SameFamilyComponent: React.FC = () => {
  const styles = useStyles();
  return (
    <EuiBadge css={styles.sameFamilyBadge} data-test-subj="sameFamily" color="warning">
      {SAME_FAMILY_BADGE_LABEL}
    </EuiBadge>
  );
};

SameFamilyComponent.displayName = 'SameFamilyComponent';

export const SameFamily = React.memo(SameFamilyComponent);
