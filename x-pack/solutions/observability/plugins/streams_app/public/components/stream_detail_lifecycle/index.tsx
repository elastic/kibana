/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useCallback, useEffect } from 'react';
import {
  IngestStreamLifecycle,
  ReadStreamDefinition,
  WiredReadStreamDefinition,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
} from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';

function useLifecycleState({ definition }: { definition?: ReadStreamDefinition }) {
  return {};
}

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition?: WiredReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const theme = useEuiTheme().euiTheme;
  const lifecycleAppState = useLifecycleState({ definition });

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  if (!definition) {
    return null;
  }

  return (
    <EuiFlexItem
      className={css`
        overflow: auto;
      `}
      grow={false}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        className={css`
          overflow: auto;
        `}
      >
        <EuiFlexItem>
          <EuiPanel
            hasShadow={false}
            hasBorder
            className={css`
              display: flex;
              max-width: 100%;
              overflow: auto;
              flex-grow: 1;
            `}
            paddingSize="s"
          >
            <EuiFlexGroup
              gutterSize="m"
              className={css`
                overflow: auto;
              `}
            >
              <EuiFlexItem grow={1}>
                <RetentionSummary definition={definition} />
              </EuiFlexItem>

              <EuiFlexItem grow={4}>
                <RetentionMetadata definition={definition} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function RetentionSummary({ definition }: { definition: WiredReadStreamDefinition }) {
  const summaryText = (() => {
    const lifecycle = definition.stream.ingest.lifecycle;
    if (isInheritLifecycle(lifecycle)) {
      return (
        <p>
          This data stream is using an inherit policy.
          <br />
          You can override it with a custom data retention or with an ILM policy.
        </p>
      );
    } else if (isDslLifecycle(lifecycle)) {
      return (
        <p>
          This data stream is using a custom data retention as an override at this level.
          <br />
          {isRoot(definition.name)
            ? 'You can modify it or use an ILM policy.'
            : 'You can modify it, use an ILM policy or inherit the retention of the nearest parent.'}
        </p>
      );
    } else if (isIlmLifecycle(lifecycle)) {
      return (
        <p>
          This data stream is using an ILM policy as an override at this level.
          <br />
          {isRoot(definition.name)
            ? 'You can modify it or use a custom data retention.'
            : 'You can modify it, use a custom data retention or inherit the retention of the nearest parent.'}
        </p>
      );
    }

    return (
      <p>
        The retention for this data stream is disabled.
        <br />
        You can set a custom data retention or use an ILM policy.
      </p>
    );
  })();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      className={css`
        display: flex;
        max-width: 100%;
        overflow: auto;
        flex-grow: 1;
      `}
      paddingSize="s"
    >
      <EuiText>
        <h5>Retention summary</h5>
        {summaryText}
      </EuiText>
    </EuiPanel>
  );
}

function RetentionMetadata({ definition }: { definition: WiredReadStreamDefinition }) {
  const Row = ({
    metadata,
    value,
    action,
    onClick,
  }: {
    metadata: string;
    value: string;
    action?: string;
    onClick?: () => void;
  }) => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem grow={2}>
          <EuiText>
            <b>{metadata}</b>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiText>{value}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {action && onClick ? (
            <EuiButton size="s" onClick={onClick}>
              {action}
            </EuiButton>
          ) : undefined}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const lifecycle = definition.effective_lifecycle;

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <Row
        metadata="Retention period"
        value={
          isDslLifecycle(lifecycle)
            ? lifecycle.dsl.data_retention ?? '∞'
            : isIlmLifecycle(lifecycle)
            ? 'Policy-based'
            : 'Disabled'
        }
        action="Edit data retention"
        onClick={() => console.log('hello')}
      />
      <EuiHorizontalRule margin="m" />
      <Row metadata="Source" value={lifecycle.from} />
    </EuiPanel>
  );
}
