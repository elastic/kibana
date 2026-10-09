/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import { DiscoveryControls } from '../detection/discovery_controls';
import { InvestigationControls } from '../detection/investigation_controls';
import { journey } from '../detection/journey_translations';

export const SettingsWorkspace = (): React.ReactElement => {
  const { core } = useKibana();
  const history = useHistory();
  const location = useLocation();
  const requested = new URLSearchParams(location.search).get('section');
  const section =
    requested === 'detections' || requested === 'investigations' ? requested : 'general';
  const developerMode = useDeveloperMode();
  return (
    <>
      <EuiText size="s" color="subdued">
        <p>{journey.settingsIntro}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTabs>
        {[
          { id: 'general', label: journey.general },
          { id: 'investigations', label: journey.investigations },
          { id: 'detections', label: journey.detectionsSettings },
        ].map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={section === tab.id}
            onClick={() => {
              const params = new URLSearchParams(location.search);
              params.set('section', tab.id);
              history.replace({ ...location, search: params.toString() });
            }}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      {section === 'general' && (
        <>
          <EuiPanel hasBorder hasShadow={false} paddingSize="l">
            <EuiTitle size="s">
              <h2>{journey.developerMode}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>{journey.developerModeHint}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiSwitch
              label={journey.developerMode}
              checked={developerMode.isDeveloperMode}
              disabled={
                developerMode.isSaving ||
                core.application.capabilities.advancedSettings?.save !== true
              }
              onChange={(event) => {
                void developerMode.setDeveloperMode(event.target.checked);
              }}
            />
          </EuiPanel>
          <EuiSpacer size="l" />
          <EuiButtonEmpty
            data-test-subj="significantEventsAppSettingsCostEstimateLink"
            iconType="popout"
            href={core.application.getUrlForApp(NIGHTSHIFT_APP_ID, {
              path: '/settings/detections',
            })}
          >
            {journey.cost}
          </EuiButtonEmpty>
        </>
      )}
      {section === 'investigations' && <InvestigationControls />}
      {section === 'detections' && (
        <>
          <DiscoveryControls />
          <EuiSpacer size="l" />
          <EuiButtonEmpty
            data-test-subj="significantEventsAppSettingsAdvancedLink"
            iconType="popout"
            href={core.application.getUrlForApp(NIGHTSHIFT_APP_ID, {
              path: '/settings/detections',
            })}
          >
            {journey.advanced}
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};
