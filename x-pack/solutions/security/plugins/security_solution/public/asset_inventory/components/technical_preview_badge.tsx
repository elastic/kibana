/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiBetaBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const TechnicalPreviewBadge = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBetaBadge
      css={css`
        margin-left: ${euiTheme.size.s};
      `}
      label={i18n.translate('xpack.securitySolution.assetInventory.technicalPreviewLabel', {
        defaultMessage: 'Technical Preview',
      })}
      size="s"
      color="subdued"
      tooltipContent={i18n.translate(
        'xpack.securitySolution.assetInventory.technicalPreviewTooltip',
        {
          defaultMessage:
            'This functionality is experimental and not supported. It may change or be removed at any time.',
        }
      )}
    />
  );
};
