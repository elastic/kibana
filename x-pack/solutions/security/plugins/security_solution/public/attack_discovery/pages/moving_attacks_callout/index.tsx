/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { useMovingAttacksCallout } from './use_moving_attacks_callout';
import * as i18n from './translations';

export const CALLOUT_TEST_DATA_ID = 'moving-attacks-callout' as string;

/**
 * Component to display a moving attacks callout
 */
export const MovingAttacksCallout = () => {
  const { isMovingAttacksCalloutVisible, hideMovingAttacksCallout } = useMovingAttacksCallout();

  return isMovingAttacksCalloutVisible ? (
    <>
      <EuiCallOut
        announceOnMount
        onDismiss={hideMovingAttacksCallout}
        title={
          <FormattedMessage
            id="xpack.securitySolution.attackDiscovery.movingAttacksCallout.title"
            defaultMessage="Attack discovery is moving to Detections"
          />
        }
        iconType="bolt"
        data-test-subj={CALLOUT_TEST_DATA_ID}
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.attackDiscovery.movingAttacksCallout.description"
            defaultMessage="You can now schedule scans and view attacks from Detections -> Attacks. Manual scans are still available only on the legacy page. Attack discovery will move completely to the Detections section in a future release."
          />
        </p>
        <SecuritySolutionLinkButton
          deepLinkId={SecurityPageName.attacks}
          fill
          data-test-subj="viewAttacksButton"
        >
          {i18n.VIEW_ATTACKS_BUTTON}
        </SecuritySolutionLinkButton>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  ) : null;
};
