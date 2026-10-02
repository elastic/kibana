/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import { SettingsTab } from '../significant_events/components/settings/tab';
import { CostEstimate } from '../significant_events/components/settings/cost_estimate';
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
  const id = useGeneratedHtmlId({ prefix: 'nightshiftSettings' });
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
          <CostEstimate />
        </>
      )}
      {section === 'investigations' && <InvestigationControls />}
      {section === 'detections' && (
        <>
          <DiscoveryControls />
          <EuiSpacer size="l" />
          <CostEstimate />
          <EuiSpacer size="l" />
          <EuiAccordion id={`${id}-advanced`} buttonContent={journey.advanced} paddingSize="m">
            <SettingsTab />
          </EuiAccordion>
        </>
      )}
    </>
  );
};
