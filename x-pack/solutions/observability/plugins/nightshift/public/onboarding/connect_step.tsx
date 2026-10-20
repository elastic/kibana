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
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { SlackAppCard } from '../settings/components/apps_section';
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
  const { application } = useKibana().services;
  // Same privilege as the Apps section of the Nightshift settings.
  const { canManageAndConfigure } = getNightshiftCapabilities(application.capabilities.nightshift);

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
              "Nightshift already sees this deployment's telemetry. Give it credentials for at least one other tool to look at. Connecting Slack and describing your system are optional.",
          })}
        </p>
      </EuiText>

      <EuiSpacer size="m" />
      <SectionTitle
        isRequired
        title={i18n.translate('xpack.nightshift.onboarding.secrets.title', {
          defaultMessage: 'Credentials for your tools',
        })}
      />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.nightshift.onboarding.secrets.description', {
            defaultMessage:
              "Nightshift works from a sandbox. Save at least one credential, such as a GitHub token or another Elastic deployment's URL and API key, and it looks there too. Values are stored encrypted and never shown again.",
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m" data-test-subj="nightshiftOnboardingSecrets">
        <SandboxSecretsPanel presets={SECRET_PRESETS} />
      </EuiPanel>

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

function SectionTitle({
  title,
  isRequired = false,
}: {
  title: string;
  isRequired?: boolean;
}): React.ReactElement {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {isRequired
            ? i18n.translate('xpack.nightshift.onboarding.requiredBadge', {
                defaultMessage: 'Required',
              })
            : i18n.translate('xpack.nightshift.onboarding.optionalBadge', {
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
