/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import { AnimatedCounter } from './animated_counter';
import { Generate } from '../generate';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';

interface Props {
  aiConnectorsCount: number | null; // null when connectors are not configured
  alertsCount: number;
  attackDiscoveriesCount: number;
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: (overrideConnectorId?: string) => void;
}

const EmptyPromptComponent: React.FC<Props> = ({
  aiConnectorsCount,
  alertsCount,
  attackDiscoveriesCount,
  isLoading,
  isDisabled = false,
  onGenerate,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const currentTitle = useMemo(
    () => (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="emptyPromptTitleContainer"
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem data-test-subj="emptyPromptAvatar" grow={false}>
          <AssistantBeacon size="xl" backgroundColor="emptyShade" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <EuiFlexItem
              css={css`
                margin-right: ${euiTheme.size.xs};
              `}
              data-test-subj="upTo"
              grow={false}
            >
              <span>{i18n.UP_TO}</span>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="emptyPromptAnimatedCounter" grow={false}>
              <AnimatedCounter count={alertsCount} />
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="emptyPromptAlertsWillBeAnalyzed" grow={false}>
              <span>{i18n.ALERTS_WILL_BE_ANALYZED(alertsCount)}</span>
            </EuiFlexItem>

            <EuiFlexItem
              css={css`
                margin-left: ${euiTheme.size.xs};
              `}
              grow={false}
            >
              <EuiIconTip
                content={i18n.RESPONSES_FROM_AI_SYSTEMS}
                data-test-subj="responsesFromAiSystemsTooltip"
                position="right"
                type="info"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [alertsCount, euiTheme.size.xs]
  );

  const historyTitle = useMemo(
    () => (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="bodyContainer"
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem data-test-subj="emptyPromptAvatar" grow={false}>
          <AssistantBeacon size="xl" backgroundColor="emptyShade" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle data-test-subj="historyTitle" size="m">
            <h1>{i18n.NO_RESULTS_MATCH_YOUR_SEARCH}</h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const currentBody = useMemo(
    () => (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="bodyContainer"
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="startGeneratingDiscoveriesLabel">
            {i18n.START_GENERATING_DISCOVERIES}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const historyBody = useMemo(
    () => (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="historyBody"
        direction="column"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem
          css={css`
            display: inline-flex;
            text-align: left;
          `}
          grow={false}
        >
          <span>{i18n.HERE_ARE_SOME_THINGS_TO_TRY}</span>

          <ul
            css={css`
              text-align: left;
            `}
          >
            <li>
              <span>{i18n.EXPAND_THE_TIME_RANGE}</span>
            </li>
            <li>
              <span>{i18n.GENERATE_NEW_ATTACK_DISCOVERIES}</span>
            </li>
          </ul>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const actions = useMemo(() => {
    return <Generate isLoading={isLoading} isDisabled={isDisabled} onGenerate={onGenerate} />;
  }, [isDisabled, isLoading, onGenerate]);

  if (isLoading || aiConnectorsCount == null || attackDiscoveriesCount > 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="emptyPrompt"
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem data-test-subj="emptyPromptContainer" grow={false}>
        <EuiEmptyPrompt
          actions={actions}
          body={attackDiscoveryAlertsEnabled ? historyBody : currentBody}
          title={attackDiscoveryAlertsEnabled ? historyTitle : currentTitle}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="learnMore"
          href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
          target="_blank"
        >
          {i18n.LEARN_MORE}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EmptyPrompt = React.memo(EmptyPromptComponent);
