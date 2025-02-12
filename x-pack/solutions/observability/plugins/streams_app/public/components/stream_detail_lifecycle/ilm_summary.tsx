/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import React, { ReactNode } from 'react';
import { IngestStreamGetResponse, IngestStreamLifecycleILM } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  formatNumber,
} from '@elastic/eui';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { parseDurationInSeconds } from './helpers';

export function IlmSummary({
  definition,
  lifecycle,
}: {
  definition: IngestStreamGetResponse;
  lifecycle: IngestStreamLifecycleILM;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value, loading } = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition) return;

      return streamsRepositoryClient.fetch('GET /api/streams/{name}/lifecycle/_stats', {
        params: { path: { name: definition.stream.name } },
        signal,
      });
    },
    [streamsRepositoryClient, definition]
  );

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.policySummar', {
                  defaultMessage: 'Policy summary',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={1}>
            <EuiText>{lifecycle.ilm.policy}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel grow={true} hasShadow={false} hasBorder={false} paddingSize="s">
        {loading || !value ? <EuiLoadingSpinner /> : <IlmTimeline summary={value} />}
      </EuiPanel>
    </>
  );
}

function PhasesDescription() {
  const descriptions = [
    { name: 'Hot phase', description: '' },
    { name: 'Warm phase', description: '' },
    { name: 'Cold phase', description: '' },
    { name: 'Frozen phase', description: '' },
    { name: 'Deletion', description: '' },
  ];

  return descriptions.map(({ name, description }) => <EuiText>{name}</EuiText>);
}

const phasesWithGrow = (summary) => {
  const orderedPhases = [
    { name: 'hot', phase: summary.hot },
    { name: 'warm', phase: summary.warm },
    { name: 'cold', phase: summary.cold },
    { name: 'frozen', phase: summary.frozen },
  ].filter(({ phase }) => !!phase);

  const totalDuration = parseDurationInSeconds(last(orderedPhases)!.phase.move_after);

  return orderedPhases.reduce((acc, { name, phase }, index, phases) => {
    const moveAfterInSeconds = parseDurationInSeconds(phase.move_after);
    if (!totalDuration || !moveAfterInSeconds) {
      // keep in this stage indefinitely
      acc[name] = { ...phase, grow: 2 };
      return acc;
    }
    const { phase: previousPhase } = phases[index - 1] || {};
    const prevMoveAfterInSeconds = parseDurationInSeconds(previousPhase?.move_after);
    const grow = Math.round(((moveAfterInSeconds - prevMoveAfterInSeconds) / totalDuration) * 10);
    acc[name] = { ...phase, grow: Math.max(grow, 2) };
    return acc;
  }, {});
};

function IlmTimeline({ summary }: { summary: any }) {
  const phases = phasesWithGrow(summary);

  return (
    <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={phases.hot.grow}>
        <IlmPhase
          name="hot"
          sizeInBytes={phases.hot.size_in_bytes}
          moveAfter={phases.hot.move_after}
        />
      </EuiFlexItem>
      {phases.warm ? (
        <EuiFlexItem grow={phases.warm.grow}>
          <IlmPhase
            name="warm"
            sizeInBytes={phases.warm.size_in_bytes}
            moveAfter={phases.warm.move_after}
          />
        </EuiFlexItem>
      ) : null}
      {phases.cold ? (
        <EuiFlexItem grow={phases.cold.grow}>
          <IlmPhase
            name="cold"
            sizeInBytes={phases.cold.size_in_bytes}
            moveAfter={phases.cold.move_after}
          />
        </EuiFlexItem>
      ) : null}
      {phases.frozen ? (
        <EuiFlexItem grow={phases.frozen.grow}>
          <IlmPhase
            name="frozen"
            sizeInBytes={phases.frozen.size_in_bytes}
            moveAfter={phases.frozen.move_after}
          />
        </EuiFlexItem>
      ) : null}
      {summary.delete ? (
        <EuiFlexItem grow={false}>
          <IlmPhase
            name="delete"
            content={<EuiIcon size="m" type="trash" />}
            sizeInBytes={summary.delete.size_in_bytes}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function IlmPhase({
  name,
  sizeInBytes,
  moveAfter,
  content,
}: {
  name: string;
  sizeInBytes?: number;
  moveAfter?: string;
  content?: ReactNode;
}) {
  const colors = {
    hot: '#F6726A',
    warm: '#FCD883',
    cold: '#A6EDEA',
    frozen: '#61A2FF',
    delete: '#CAD3E2',
  };
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiPanel
        paddingSize="s"
        borderRadius="none"
        hasBorder={false}
        hasShadow={false}
        css={{ backgroundColor: colors[name] }}
        grow={false}
      >
        <EuiText size="s">{content ? content : <b>{name}</b>}</EuiText>
      </EuiPanel>
      {name !== 'delete' ? (
        <EuiPanel
          paddingSize="s"
          borderRadius="none"
          hasBorder={false}
          hasShadow={false}
          grow={false}
        >
          <EuiText size="s">
            <p>
              <b>Size</b> {formatNumber(sizeInBytes, '0.0 b')}
            </p>
            <p>{moveAfter ? moveAfter : '∞'}</p>
          </EuiText>
        </EuiPanel>
      ) : null}
    </EuiFlexGroup>
  );
}
