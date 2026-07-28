/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiImage, EuiLink, EuiText } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { SecurityPageName } from '@kbn/deeplinks-security';

import { useKibana } from '../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../common/lib/telemetry';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import simplifyLightSvg from './assets/simplify.light.svg';
import simplifyDarkSvg from './assets/simplify.dark.svg';
import * as i18n from './translations';

const AttackDiscoveryMovedPageComponent: React.FC = () => {
  const isDarkMode = useKibanaIsDarkMode();
  const {
    services: { application, telemetry },
  } = useKibana();

  const advancedSettingsUrl = useMemo(
    () =>
      application.getUrlForApp('management', {
        path: '/kibana/settings?query=alerts+and+attacks+alignment',
      }),
    [application]
  );

  const onGoToAttacksClick = useCallback(() => {
    telemetry.reportEvent(AttacksEventTypes.FeaturePromotionCalloutAction, {
      action: 'view_attacks',
    });
  }, [telemetry]);

  return (
    <>
      <EuiEmptyPrompt
        data-test-subj="attackDiscoveryMovedPage"
        icon={
          <EuiImage
            url={isDarkMode ? simplifyDarkSvg : simplifyLightSvg}
            alt={i18n.ILLUSTRATION_ALT}
            size="original"
          />
        }
        title={<h2 data-test-subj="attackDiscoveryMovedTitle">{i18n.TITLE}</h2>}
        titleSize="m"
        body={
          <p data-test-subj="attackDiscoveryMovedBody">
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.moved.description"
              defaultMessage="{attackDiscovery} now exists as {attacks} and is located under {detections} in the side navigation"
              values={{
                attackDiscovery: <em>{'Attack Discovery'}</em>,
                attacks: <em>{'Attacks'}</em>,
                detections: <strong>{'Detections'}</strong>,
              }}
            />
          </p>
        }
        actions={
          <SecuritySolutionLinkButton
            fill
            deepLinkId={SecurityPageName.attacks}
            data-test-subj="goToAttacksButton"
            onClick={onGoToAttacksClick}
          >
            {i18n.GO_TO_ATTACKS_BUTTON}
          </SecuritySolutionLinkButton>
        }
        footer={
          <EuiText size="s" color="subdued" data-test-subj="attackDiscoveryMovedOptOut">
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.moved.optOut"
              defaultMessage="Prefer the previous experience? Disable alerts and attacks alignment in {advancedSettingsLink}."
              values={{
                advancedSettingsLink: (
                  <EuiLink href={advancedSettingsUrl}>{'Advanced Settings'}</EuiLink>
                ),
              }}
            />
          </EuiText>
        }
      />

      <SpyRoute pageName={SecurityPageName.attackDiscovery} />
    </>
  );
};

AttackDiscoveryMovedPageComponent.displayName = 'AttackDiscoveryMovedPage';

export const AttackDiscoveryMovedPage = React.memo(AttackDiscoveryMovedPageComponent);
