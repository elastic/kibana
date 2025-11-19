/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { useMovingAttacksCallout } from './use_moving_attacks_callout';
import * as i18n from './translations';

export const CALLOUT_TEST_DATA_ID = 'moving-attacks-callout' as string;

/**
 * Component to display a moving attacks callout
 */
export const MovingAttacksCallout: React.FC = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  const { isMovingAttacksCalloutVisible, hideMovingAttacksCallout } = useMovingAttacksCallout();

  const isSmall = useIsWithinMaxBreakpoint('m');
  const calloutDescriptionWidth = css`
    max-width: ${isSmall ? 'auto' : '1000px'};
  `;

  const hideButtonSpacing = css`
    margin-left: ${euiTheme.size.s};
  `;

  return isMovingAttacksCalloutVisible ? (
    <>
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.securitySolution.attackDiscovery.movingAttacksCallout.title"
            defaultMessage="Attack Discovery is moving to Detections"
          />
        }
        iconType="bolt"
        data-test-subj={CALLOUT_TEST_DATA_ID}
      >
        <p css={calloutDescriptionWidth}>
          <FormattedMessage
            id="xpack.securitySolution.attackDiscovery.movingAttacksCallout.description"
            defaultMessage="You can now schedule scans and view promoted attacks from Detections -> Attacks. Manual scans are still available only here, on the legacy page. Attack Discovery will move completely to the Detections section in a future release."
          />
        </p>

        <SecuritySolutionLinkButton
          fill
          size="s"
          deepLinkId={SecurityPageName.attacks}
          data-test-subj="viewAttacksButton"
        >
          {i18n.VIEW_ATTACKS_BUTTON}
        </SecuritySolutionLinkButton>

        <EuiButton css={hideButtonSpacing} size="s" onClick={hideMovingAttacksCallout}>
          {i18n.HIDE_BUTTON}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  ) : null;
});
MovingAttacksCallout.displayName = 'MovingAttacksCallout';
