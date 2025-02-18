/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { CommonProps } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';

import type { ListPageRouteState } from '../../../../common/endpoint/types';

import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

const EuiButtonEmptyStyled = styled(EuiButtonEmpty)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};

  .euiIcon {
    width: ${({ theme }) => theme.eui.euiSizeM};
    height: ${({ theme }) => theme.eui.euiSizeM};
  }

  .text {
    font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
    margin-inline-start: ${({ theme }) => theme.eui.euiSizeXS};
  }
`;

export type BackToExternalAppButtonProps = CommonProps & ListPageRouteState;
export const BackToExternalAppButton = memo<BackToExternalAppButtonProps>(
  ({ backButtonLabel, backButtonUrl, onBackButtonNavigateTo, ...commonProps }) => {
    const handleBackOnClick = useNavigateToAppEventHandler(...onBackButtonNavigateTo);

    return (
      <EuiButtonEmptyStyled
        data-test-subj="backToOrigin"
        {...commonProps}
        flush="left"
        size="xs"
        iconType="arrowLeft"
        href={backButtonUrl}
        onClick={handleBackOnClick}
        textProps={{ className: 'text' }}
      >
        {backButtonLabel || (
          <FormattedMessage id="xpack.securitySolution.list.backButton" defaultMessage="Back" />
        )}
      </EuiButtonEmptyStyled>
    );
  }
);

BackToExternalAppButton.displayName = 'BackToExternalAppButton';
