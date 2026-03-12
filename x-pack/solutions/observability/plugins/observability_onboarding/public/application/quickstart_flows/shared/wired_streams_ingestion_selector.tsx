/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBetaBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { FlowType } from '../../../hooks/use_wired_streams_status';
import { useKibana } from '../../../hooks/use_kibana';
import { EnableWiredStreamsConfirmModal } from './enable_wired_streams_confirm_modal';

export type IngestionMode = 'classic' | 'wired';

interface WiredStreamsIngestionSelectorProps {
  ingestionMode: IngestionMode;
  onChange: (mode: IngestionMode) => void;
  showDescription?: boolean;
  streamsDocLink?: string;
  isWiredStreamsEnabled: boolean;
  isEnabling: boolean;
  flowType: FlowType;
  onEnableWiredStreams: (flowType: FlowType) => Promise<boolean>;
}

export function WiredStreamsIngestionSelector({
  ingestionMode,
  onChange,
  showDescription = true,
  streamsDocLink,
  isWiredStreamsEnabled,
  isEnabling,
  flowType,
  onEnableWiredStreams,
}: WiredStreamsIngestionSelectorProps) {
  const {
    services: {
      context: { isServerless },
    },
  } = useKibana();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleModeChange = useCallback(
    (selectedId: string) => {
      const newMode = selectedId as IngestionMode;

      if (newMode === 'wired' && !isWiredStreamsEnabled) {
        setIsModalVisible(true);
      } else {
        onChange(newMode);
      }
    },
    [isWiredStreamsEnabled, onChange]
  );

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleModalConfirm = useCallback(async () => {
    const success = await onEnableWiredStreams(flowType);
    setIsModalVisible(false);
    if (success) {
      onChange('wired');
    }
  }, [onEnableWiredStreams, flowType, onChange]);

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
        <EuiToolTip
          position="top"
          title={i18n.translate('xpack.observability_onboarding.wiredStreams.tooltip.title', {
            defaultMessage: 'Wired Streams (Tech Preview)',
          })}
          content={
            <>
              {i18n.translate('xpack.observability_onboarding.wiredStreams.tooltip.description', {
                defaultMessage:
                  'Route logs to a managed hierarchy instead of classic data streams. Streams inherit lifecycle settings and processors from parent streams, enabling centralized configuration for data retention and routing.',
              })}
              {streamsDocLink && (
                <>
                  {' '}
                  <EuiLink
                    href={streamsDocLink}
                    target="_blank"
                    external
                    data-test-subj="observabilityOnboardingWiredStreamsTooltipLearnMoreLink"
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.wiredStreams.tooltip.learnMore',
                      {
                        defaultMessage: 'Learn more',
                      }
                    )}
                  </EuiLink>
                </>
              )}
            </>
          }
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} component="span">
            <EuiFlexItem grow={false} component="span">
              {i18n.translate('xpack.observability_onboarding.wiredStreams.wiredStreamsOption', {
                defaultMessage: 'Wired Streams',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false} component="span">
              <EuiBetaBadge
                label={i18n.translate('xpack.observability_onboarding.wiredStreams.techPreview', {
                  defaultMessage: 'Tech Preview',
                })}
                size="s"
                color="hollow"
                alignment="middle"
              />
            </EuiFlexItem>
            {isEnabling && (
              <EuiFlexItem grow={false} component="span">
                <EuiLoadingSpinner
                  size="s"
                  data-test-subj="observabilityOnboardingWiredStreamsEnablingSpinner"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiToolTip>
      ),
    },
  ];

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
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
            onChange={handleModeChange}
            isDisabled={isEnabling}
            data-test-subj="observabilityOnboardingIngestionModeSelector"
          />
        </EuiFlexItem>
        {showDescription && ingestionMode === 'wired' && (
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="subdued"
              data-test-subj="observabilityOnboardingWiredStreamsDescription"
            >
              {i18n.translate('xpack.observability_onboarding.wiredStreams.description', {
                defaultMessage:
                  'Streams provide our next-generation log ingestion model with a managed hierarchy. Wired Streams is currently in tech preview, and some features may not yet be fully supported. Logs will be routed to root streams (logs.otel or logs.ecs) based on their format, while other signals continue through standard data streams.',
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
        {ingestionMode === 'classic' && !isWiredStreamsEnabled && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.observability_onboarding.wiredStreams.willEnableNote', {
                defaultMessage:
                  'Selecting Wired Streams will enable the feature for your {envType}.',
                values: { envType: isServerless ? 'project' : 'cluster' },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {isModalVisible && (
        <EnableWiredStreamsConfirmModal
          onCancel={handleModalCancel}
          onConfirm={handleModalConfirm}
          isLoading={isEnabling}
          isServerless={isServerless}
          streamsDocLink={streamsDocLink}
        />
      )}
    </>
  );
}
