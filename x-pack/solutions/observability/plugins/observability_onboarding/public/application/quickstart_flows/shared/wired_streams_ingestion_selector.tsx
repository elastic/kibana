/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBetaBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export type IngestionMode = 'classic' | 'wired';

interface WiredStreamsIngestionSelectorProps {
  ingestionMode: IngestionMode;
  onChange: (mode: IngestionMode) => void;
  showDescription?: boolean;
  streamsDocLink?: string;
}

const ingestionModeOptions = [
  {
    id: 'classic' as const,
    label: i18n.translate('xpack.observability_onboarding.wiredStreams.classicIngestion', {
      defaultMessage: 'Classic ingestion',
    }),
  },
  {
    id: 'wired' as const,
    label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {i18n.translate('xpack.observability_onboarding.wiredStreams.wiredStreamsOption', {
          defaultMessage: 'Wired Streams',
        })}
        <EuiBetaBadge
          label={i18n.translate('xpack.observability_onboarding.wiredStreams.techPreview', {
            defaultMessage: 'Tech Preview',
          })}
          size="s"
          color="hollow"
          style={{ verticalAlign: 'middle' }}
        />
      </span>
    ),
  },
];

export function WiredStreamsIngestionSelector({
  ingestionMode,
  onChange,
  showDescription = true,
  streamsDocLink,
}: WiredStreamsIngestionSelectorProps) {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.observability_onboarding.wiredStreams.ingestionLabel', {
                defaultMessage: 'Ingestion selector',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.observability_onboarding.wiredStreams.chooseIngestion', {
              defaultMessage: 'Choose ingestion mode',
            })}
            options={ingestionModeOptions}
            type="single"
            idSelected={ingestionMode}
            onChange={(id: string) => {
              onChange(id as IngestionMode);
            }}
            data-test-subj="observabilityOnboardingIngestionModeSelector"
          />
        </EuiFlexItem>
        {showDescription && ingestionMode === 'wired' && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.observability_onboarding.wiredStreams.description', {
                defaultMessage:
                  'Streams provide our next-generation log ingestion model with a managed hierarchy. Wired Streams is currently in tech preview, and some features such as content packs may not yet be fully supported. Logs will be routed to a Wired Stream (logs.<name>), while other signals continue through standard data streams.',
              })}{' '}
              {streamsDocLink && (
                <EuiLink
                  data-test-subj="observabilityOnboardingWiredStreamsIngestionSelectorReadMoreAboutStreamsLink"
                  href={streamsDocLink}
                  target="_blank"
                  external
                >
                  {i18n.translate('xpack.observability_onboarding.wiredStreams.readMore', {
                    defaultMessage: 'Read more about Streams',
                  })}
                </EuiLink>
              )}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
    </>
  );
}
