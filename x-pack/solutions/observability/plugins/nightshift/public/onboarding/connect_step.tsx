/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import { CustomContextSnippets } from '../custom_context/custom_context_flyout';
import { useFetchCustomContext } from '../custom_context/use_fetch_custom_context';
import {
  SandboxSecretsPanel,
  type SandboxSecretPreset,
} from '../sandbox_secrets/sandbox_secrets_flyout';

/** Conventional secret names, so the agent recognizes the tool behind a secret. */
const SECRET_PRESETS: SandboxSecretPreset[] = [
  {
    id: 'github',
    label: i18n.translate('xpack.nightshift.onboarding.connect.githubPreset', {
      defaultMessage: 'GitHub token',
    }),
    iconType: 'logoGithub',
    keys: ['GITHUB_TOKEN'],
  },
  {
    id: 'elasticsearch',
    label: i18n.translate('xpack.nightshift.onboarding.connect.elasticsearchPreset', {
      defaultMessage: 'Another Elastic deployment',
    }),
    iconType: 'logoElasticsearch',
    keys: ['ELASTICSEARCH_URL', 'ELASTICSEARCH_API_KEY'],
  },
];

/** Step 1: give the sandbox credentials, connect Slack, and optionally describe the system. */
export function OnboardingConnectStep(): React.ReactElement {
  const { significantEventsApp } = useKibana().services;
  const SlackAppCard = significantEventsApp?.SlackAppCard;

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
              "Nightshift already sees this deployment's telemetry. Everything below is optional: add credentials for other tools it should look at, and connect Slack to work with Nightshift from your channels.",
          })}
        </p>
      </EuiText>

      <EuiSpacer size="m" />
      <OptionalSectionTitle
        title={i18n.translate('xpack.nightshift.onboarding.secrets.title', {
          defaultMessage: 'Credentials for your tools',
        })}
      />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.secrets.description', {
            defaultMessage:
              "Nightshift works from a sandbox. Add a GitHub token, another Elastic deployment's URL and API key, or any other credential, and it can look there too. Values are stored encrypted and never shown again.",
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m" data-test-subj="nightshiftOnboardingSecrets">
        <SandboxSecretsPanel presets={SECRET_PRESETS} />
      </EuiPanel>

      {SlackAppCard && (
        <>
          <EuiSpacer size="l" />
          <div data-test-subj="nightshiftOnboardingSlack">
            <SlackAppCard
              description={i18n.translate('xpack.nightshift.onboarding.connect.slackDescription', {
                defaultMessage:
                  'Get investigation updates in Slack and ask Nightshift for help from a channel.',
              })}
            />
          </div>
        </>
      )}

      <OnboardingHintsSection />
    </div>
  );
}

function OptionalSectionTitle({ title }: { title: string }): React.ReactElement {
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
      <OptionalSectionTitle
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
