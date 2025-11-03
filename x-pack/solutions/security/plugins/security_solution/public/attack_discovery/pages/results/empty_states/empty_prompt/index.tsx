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
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import React, { useMemo } from 'react';

import { Generate } from '../generate';
import type { SettingsOverrideOptions } from '../../history/types';
import * as i18n from './translations';

interface Props {
  aiConnectorsCount: number | null; // null when connectors are not configured
  attackDiscoveriesCount: number;
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
}

const EmptyPromptComponent: React.FC<Props> = ({
  aiConnectorsCount,
  attackDiscoveriesCount,
  isLoading,
  isDisabled = false,
  onGenerate,
}) => {
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
        <EuiEmptyPrompt actions={actions} body={historyBody} title={historyTitle} />
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
