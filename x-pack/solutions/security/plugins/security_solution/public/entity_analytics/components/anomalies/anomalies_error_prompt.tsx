/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiIconProps, EuiTitleProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiIcon, useEuiFontSize } from '@elastic/eui';
import { ENTITY_ANOMALY_STATE_ERROR_BODY, ENTITY_ANOMALY_STATE_ERROR_TITLE } from './translations';

export type AnomaliesErrorPromptVariant = 'leftTab' | 'rightOverview';

interface AnomaliesErrorPromptProps {
  variant: AnomaliesErrorPromptVariant;
  'data-test-subj'?: string;
}

const ERROR_PROMPT_VARIANT_CONFIG: Record<
  AnomaliesErrorPromptVariant,
  {
    titleSize: EuiTitleProps['size'];
    iconSize: EuiIconProps['size'];
  }
> = {
  leftTab: {
    titleSize: 'xs',
    iconSize: 'xl',
  },
  rightOverview: {
    titleSize: 'xs',
    iconSize: 'xl',
  },
};

export const AnomaliesErrorPrompt: React.FC<AnomaliesErrorPromptProps> = ({
  variant,
  'data-test-subj': dataTestSubj,
}) => {
  const bodyFontSize = useEuiFontSize('s').fontSize;
  const { titleSize, iconSize } = ERROR_PROMPT_VARIANT_CONFIG[variant];

  return (
    <EuiEmptyPrompt
      data-test-subj={dataTestSubj}
      color="danger"
      icon={<EuiIcon type="error" size={iconSize} color="danger" aria-hidden={true} />}
      title={<h4>{ENTITY_ANOMALY_STATE_ERROR_TITLE}</h4>}
      titleSize={titleSize}
      body={
        <p
          css={css`
            font-size: ${bodyFontSize};
          `}
        >
          {ENTITY_ANOMALY_STATE_ERROR_BODY}
        </p>
      }
    />
  );
};
