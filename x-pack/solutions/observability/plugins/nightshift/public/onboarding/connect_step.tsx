/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { SlackAppCard } from '../settings/components/apps_section';
import { CustomContextSnippets } from '../custom_context/custom_context_flyout';
import { useFetchCustomContext } from '../custom_context/use_fetch_custom_context';
import { ConnectSourcesGrid } from '../sandbox_connectors/connect_sources_grid';
import { ConnectedConnectors } from '../sandbox_connectors/connected_connectors';

export function OnboardingConnectStep(): React.ReactElement {
  const { application } = useKibana().services;
  const { canManageAndConfigure } = getNightshiftCapabilities(application.capabilities.nightshift);
  const [connectedCollapseSignal, setConnectedCollapseSignal] = useState(0);

  return (
    <div data-test-subj="nightshiftOnboardingConnectStep">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.connect.title', {
            defaultMessage: 'Add signals and alerts',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.connect.description', {
            defaultMessage:
              "Nightshift already sees this deployment's telemetry. Connect other tools through Kibana connectors so it can look there too. Everything on this step is optional.",
          })}
        </p>
      </EuiText>

      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.connectors.title', {
            defaultMessage: 'Connect other sources',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div data-test-subj="nightshiftOnboardingConnectors">
        <ConnectSourcesGrid onConnected={() => setConnectedCollapseSignal((n) => n + 1)} />
        <EuiSpacer size="m" />
        <ConnectedConnectors collapseSignal={connectedCollapseSignal} />
      </div>

      <EuiSpacer size="l" />
      <div data-test-subj="nightshiftOnboardingSlack">
        <SlackAppCard
          canEdit={canManageAndConfigure}
          showWhenUnavailable
          description={i18n.translate('xpack.nightshift.onboarding.connect.slackDescription', {
            defaultMessage:
              'Get investigation updates in Slack and ask Nightshift for help from a channel.',
          })}
        />
      </div>

      <OnboardingHintsSection />
    </div>
  );
}

function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('xpack.nightshift.onboarding.optionalBadge', {
            defaultMessage: 'Optional',
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/**
 * Optional hints about the system. They are the space's custom context, which the investigation
 * agent reads on every run: the exploration and every investigation after it.
 */
function OnboardingHintsSection(): React.ReactElement | null {
  const { data, error } = useFetchCustomContext();
  // The custom context API is off (404) without the nightshift.enabled flag.
  if (error || !data) return null;
  return (
    <div data-test-subj="nightshiftOnboardingHints">
      <EuiSpacer size="l" />
      <SectionTitle
        title={i18n.translate('xpack.nightshift.onboarding.hints.title', {
          defaultMessage: 'Tell Nightshift about your system',
        })}
      />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.hints.description', {
            defaultMessage:
              'Which services matter most, where your data lives, who owns what. Nightshift uses these hints to find your first investigations, and in every investigation after that.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <CustomContextSnippets
        snippets={data.snippets}
        version={data.version}
        canEdit
        showEmptyPrompt={false}
        addLabel={i18n.translate('xpack.nightshift.onboarding.hints.addButton', {
          defaultMessage: 'Add a hint',
        })}
        placeholder={i18n.translate('xpack.nightshift.onboarding.hints.placeholder', {
          defaultMessage:
            'For example: checkout-service is business critical. Production logs are in logs-prod-*. Team Osprey owns payments.',
        })}
      />
    </div>
  );
}
