/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { AiButtonIcon } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../utils/kibana_react';

export interface InvestigationItemChatButtonProps {
  tooltip: string;
  testSubj: string;
  onClick: () => void;
}

export function InvestigationItemChatButton({
  tooltip,
  testSubj,
  onClick,
}: InvestigationItemChatButtonProps): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;

  if (!agentBuilder) {
    return null;
  }

  return (
    <EuiToolTip content={tooltip}>
      <AiButtonIcon
        aria-label={tooltip}
        data-test-subj={testSubj}
        iconType="productAgent"
        onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
          clickEvent.stopPropagation();
          onClick();
        }}
        size="xs"
        variant="empty"
        css={css`
          && {
            color: ${euiTheme.colors.textSubdued} !important;
          }
        `}
      />
    </EuiToolTip>
  );
}
