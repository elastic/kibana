/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { getIndexResultToolTip } from '../utils/get_index_result_tooltip';
import { getCheckTextColor } from '../utils/get_check_text_color';
import { FAIL, PASS } from '../translations';

const styles = {
  badge: css({
    width: 44,
    textAlign: 'center',
    paddingInline: 0,
    '.euiBadge__content': {
      justifyContent: 'center',
    },
  }),
};

export type Props = React.ComponentProps<typeof EuiBadge> & {
  incompatible: number;
  tooltipText?: string;
};

export const IndexResultBadgeComponent: React.FC<Props> = ({
  incompatible,
  tooltipText,
  ...props
}) => {
  return (
    <EuiToolTip content={tooltipText ?? getIndexResultToolTip(incompatible)}>
      <EuiBadge
        css={styles.badge}
        data-test-subj="indexResultBadge"
        color={getCheckTextColor(incompatible)}
        {...props}
      >
        {incompatible > 0 ? FAIL : PASS}
      </EuiBadge>
    </EuiToolTip>
  );
};

IndexResultBadgeComponent.displayName = 'IndexCheckResultBadgeComponent';

export const IndexResultBadge = React.memo(IndexResultBadgeComponent);
