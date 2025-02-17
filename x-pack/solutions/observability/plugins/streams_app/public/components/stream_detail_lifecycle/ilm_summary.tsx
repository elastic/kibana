/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize, last } from 'lodash';
import React, { useMemo } from 'react';
import {
  IlmPolicyDeletePhase,
  IlmPolicyPhase,
  IlmPolicyPhases,
  IngestStreamGetResponse,
  IngestStreamLifecycleILM,
  PhaseName,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  formatNumber,
} from '@elastic/eui';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { orderIlmPhases, parseDurationInSeconds } from './helpers';
import { IlmLink } from './ilm_link';

const ILM_PHASES = {
  hot: {
    color: '#F6726A',
    description: () =>
      i18n.translate('xpack.streams.streamDetailLifecycle.hotPhaseDescription', {
        defaultMessage: 'Recent, frequently-searched data. Best indexing and search performance.',
      }),
  },
  warm: {
    color: '#FCD883',
    description: () =>
      i18n.translate('xpack.streams.streamDetailLifecycle.warmPhaseDescription', {
        defaultMessage:
          'Frequently searched data, rarely updated. Optimized for search, not indexing.',
      }),
  },
  cold: {
    color: '#A6EDEA',
    description: () =>
      i18n.translate('xpack.streams.streamDetailLifecycle.coldPhaseDescription', {
        defaultMessage:
          'Data searched infrequently, not updated. Optimized for cost savings over search performance.',
      }),
  },
  frozen: {
    color: '#61A2FF',
    description: () =>
      i18n.translate('xpack.streams.streamDetailLifecycle.frozenPhaseDescription', {
        defaultMessage:
          'Most cost-effective way to store your data and still be able to search it.',
      }),
  },
  delete: {
    color: '#DDD',
    description: (duration?: string) =>
      i18n.translate('xpack.streams.streamDetailLifecycle.deletePhaseDescription', {
        defaultMessage: 'Data deleted after {duration}.',
        values: { duration },
      }),
  },
};

export function IlmSummary({
  definition,
  lifecycle,
  ilmLocator,
}: {
  definition: IngestStreamGetResponse;
  lifecycle: IngestStreamLifecycleILM;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
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

  const phasesWithGrow = useMemo(() => {
    if (!value) return undefined;

    const orderedPhases = orderIlmPhases(value);
    const totalDuration = parseDurationInSeconds(last(orderedPhases)!.min_age);

    return orderedPhases.map((phase, index, phases) => {
      const nextPhase = phases[index + 1];
      if (!nextPhase) {
        return { ...phase, grow: phase.name === 'delete' ? false : 2 };
      }

      const phaseDuration =
        parseDurationInSeconds(nextPhase!.min_age) - parseDurationInSeconds(phase!.min_age);
      return {
        ...phase,
        grow: Math.max(2, Math.round((phaseDuration / totalDuration) * 10)),
      };
    });
  }, [value]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.policySummar', {
                  defaultMessage: 'Policy summary',
                })}
              </h5>
            </EuiText>
            <EuiTextColor color="subdued">
              Phases and details of the lifecycle applied to this stream
            </EuiTextColor>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <IlmLink lifecycle={lifecycle} ilmLocator={ilmLocator} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel grow={true} hasShadow={false} hasBorder={false} paddingSize="s">
        {loading || !phasesWithGrow ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
            {phasesWithGrow.map((phase, index) => (
              <EuiFlexItem grow={phase.grow as false | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}>
                <IlmPhase phase={phase} minAge={phasesWithGrow[index + 1]?.min_age} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      <PhasesLegend phases={value} />
    </EuiFlexGroup>
  );
}

function IlmPhase({
  phase,
  minAge,
}: {
  phase: IlmPolicyPhase | IlmPolicyDeletePhase;
  minAge?: string;
}) {
  const borderRadius =
    phase.name === 'delete'
      ? undefined
      : phase.name === 'hot'
      ? minAge
        ? '0px 16px 16px 0px'
        : '0px'
      : minAge
      ? '16px'
      : '16px 0px 0px 16px';

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        style={phase.name !== 'delete' ? { borderRight: '1px dashed black' } : undefined}
      >
        <EuiPanel
          paddingSize="s"
          hasBorder={false}
          hasShadow={false}
          css={{
            backgroundColor: ILM_PHASES[phase.name].color,
            margin: '0 2px',
            borderRadius,
          }}
          grow={false}
        >
          {phase.name === 'delete' ? (
            <EuiText size="xs" style={{ margin: '0 2px' }}>
              <EuiIcon size="s" style={{}} type="trash" />
            </EuiText>
          ) : (
            <EuiText size="xs">
              <b>{capitalize(phase.name)}</b>
            </EuiText>
          )}
        </EuiPanel>
        {'size_in_bytes' in phase ? (
          <EuiPanel
            paddingSize="s"
            borderRadius="none"
            hasBorder={false}
            hasShadow={false}
            grow={false}
            style={{ marginBottom: '40px' }}
          >
            <EuiText size="xs">
              <p>
                <b>Size</b> {formatNumber(phase.size_in_bytes, '0.0 b')}
              </p>
            </EuiText>
          </EuiPanel>
        ) : null}
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexEnd">
        {phase.name !== 'delete' ? (
          <EuiPanel
            paddingSize="xs"
            style={{
              marginRight: minAge ? '-20px' : '-5px',
              width: '50px',
              backgroundColor: ILM_PHASES.delete.color,
            }}
            grow={false}
            hasBorder={false}
            hasShadow={false}
          >
            <EuiText textAlign="center" size="xs">
              {minAge || '∞'}
            </EuiText>
          </EuiPanel>
        ) : undefined}
      </EuiFlexGroup>
    </>
  );
}

function phasesDescriptions(phases: IlmPolicyPhases) {
  const descriptions = orderIlmPhases(phases)
    .filter(({ name }) => name !== 'delete')
    .map(({ name, min_age: minAge }) => ({
      name,
      description: ILM_PHASES[name].description(minAge),
      color: ILM_PHASES[name].color,
    })) as Array<
    {
      name: PhaseName | 'indefinite';
      description: string;
    } & ({ color: string } | { icon: string })
  >;

  if (phases.delete) {
    descriptions.push({
      name: 'delete',
      description: ILM_PHASES.delete.description(phases.delete!.min_age),
      icon: 'trash',
    });
  } else {
    descriptions.push({
      name: 'indefinite',
      description: i18n.translate('xpack.streams.streamDetailLifecycle.noRetentionDescription', {
        defaultMessage: 'Data is stored indefinitely',
      }),
      icon: 'infinity',
    });
  }

  return descriptions;
}

function PhasesLegend({ phases }: { phases?: IlmPolicyPhases }) {
  if (!phases) return null;

  const descriptions = phasesDescriptions(phases);
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      {descriptions.map((phase, index) => (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false} style={{ width: '20px', alignItems: 'center' }}>
              {'color' in phase ? (
                <span
                  style={{
                    height: '12px',
                    width: '12px',
                    borderRadius: '50%',
                    backgroundColor: phase.color,
                    display: 'inline-block',
                  }}
                />
              ) : (
                <EuiIcon type={phase.icon} />
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={2}>
              <b>{capitalize(phase.name)}</b>
            </EuiFlexItem>

            <EuiFlexItem grow={10}>
              <EuiTextColor color="subdued">{phase.description}</EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>

          {index === descriptions.length - 1 ? null : <EuiSpacer size="s" />}
        </>
      ))}
    </EuiPanel>
  );
}
