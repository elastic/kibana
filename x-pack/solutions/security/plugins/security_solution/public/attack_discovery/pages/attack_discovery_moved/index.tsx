/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiImage, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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

const TITLE = i18n.translate('xpack.securitySolution.attackDiscovery.moved.title', {
  defaultMessage: 'Attack Discovery has moved',
});

const ILLUSTRATION_ALT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.moved.illustrationAlt',
  {
    defaultMessage: 'Attack Discovery has moved to Attacks',
  }
);

const GO_TO_ATTACKS_BUTTON = i18n.translate(
  'xpack.securitySolution.attackDiscovery.moved.goToAttacksButton',
  {
    defaultMessage: 'Go to Attacks',
  }
);

const ATTACK_DISCOVERY_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.moved.attackDiscoveryLabel',
  {
    defaultMessage: 'Attack Discovery',
  }
);

const ATTACKS_LABEL = i18n.translate('xpack.securitySolution.attackDiscovery.moved.attacksLabel', {
  defaultMessage: 'Attacks',
});

const DETECTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.moved.detectionsLabel',
  {
    defaultMessage: 'Detections',
  }
);

const ADVANCED_SETTINGS_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.moved.advancedSettingsLabel',
  {
    defaultMessage: 'Advanced Settings',
  }
);

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
            alt={ILLUSTRATION_ALT}
            size="original"
          />
        }
        title={<h2 data-test-subj="attackDiscoveryMovedTitle">{TITLE}</h2>}
        titleSize="m"
        body={
          <p data-test-subj="attackDiscoveryMovedBody">
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.moved.description"
              defaultMessage="{attackDiscovery} now exists as {attacks} and is located under {detections} in the side navigation"
              values={{
                attackDiscovery: <em>{ATTACK_DISCOVERY_LABEL}</em>,
                attacks: <em>{ATTACKS_LABEL}</em>,
                detections: <strong>{DETECTIONS_LABEL}</strong>,
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
            {GO_TO_ATTACKS_BUTTON}
          </SecuritySolutionLinkButton>
        }
        footer={
          <EuiText size="s" color="subdued" data-test-subj="attackDiscoveryMovedOptOut">
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.moved.optOut"
              defaultMessage="Prefer the previous experience? Disable alerts and attacks alignment in {advancedSettingsLink}."
              values={{
                advancedSettingsLink: (
                  <EuiLink href={advancedSettingsUrl}>{ADVANCED_SETTINGS_LABEL}</EuiLink>
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
