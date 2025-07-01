/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import * as i18n from './translations';
import { usePrebuiltRuleBaseVersionContext } from './base_version_diff/base_version_context';

interface CustomizedPrebuiltRulePerFieldBadgeProps {
  label: string;
  field: string;
}

export const CustomizedPrebuiltRulePerFieldBadge: React.FC<
  CustomizedPrebuiltRulePerFieldBadgeProps
> = ({ field, label }) => {
  const { euiTheme } = useEuiTheme();
  const {
    actions: { openBaseVersionFlyout },
    state: { doesBaseVersionExist, modifiedFields },
  } = usePrebuiltRuleBaseVersionContext();

  if (!doesBaseVersionExist || !modifiedFields.has(field)) {
    return label;
  }

  return (
    <>
      {label}
      <EuiBadge
        data-test-subj="modified-prebuilt-rule-per-field-badge"
        color="primary"
        iconType="expand"
        iconSide="right"
        onClick={() => openBaseVersionFlyout({ isReverting: false })}
        iconOnClick={() => openBaseVersionFlyout({ isReverting: false })}
        onClickAriaLabel={i18n.MODIFIED_PREBUILT_RULE_PER_FIELD_LABEL}
        iconOnClickAriaLabel={i18n.MODIFIED_PREBUILT_RULE_PER_FIELD_LABEL}
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
      >
        {i18n.MODIFIED_PREBUILT_RULE_PER_FIELD_LABEL}
      </EuiBadge>
    </>
  );
};
