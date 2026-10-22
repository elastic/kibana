/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButtonGroup,
  EuiButton,
  EuiCallOut,
  EuiFieldNumber,
  EuiIcon,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  STRATEGY_MODES,
  type EngineOverviewResponse,
  type StrategyMode,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import type { IDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { MODE_LABELS, STRATEGY_ICONS } from './labels';

type StrategyRow = EngineOverviewResponse['strategies'][number];

const BASELINE_POLICY_LABELS: Record<StrategyRow['baselinePolicy'], string> = {
  own_history: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.ownHistory', {
    defaultMessage: 'Own history',
  }),
  implicit_zero: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategies.implicitZero',
    { defaultMessage: 'New by definition' }
  ),
  skip: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.skip', {
    defaultMessage: "Skipped: the customer's rule decided",
  }),
  firing_frequency: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategies.firingFrequency',
    { defaultMessage: 'How often it fires: flapping or daily alerts are background' }
  ),
};

interface IStrategiesTableProps {
  overview: EngineOverviewResponse;
  actions: IDetectionEngineActions;
}

/** Every strategy, its mode and cap, how it performed, and what the learning loop proposes. */
export function StrategiesTable({ overview, actions }: IStrategiesTableProps) {
  const save = (row: StrategyRow, change: Partial<StrategyRow['config']>) =>
    actions.updateConfig({
      strategies: { ...overview.config.strategies, [row.id]: { ...row.config, ...change } },
    });

  const columns: Array<EuiBasicTableColumn<StrategyRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.name', {
        defaultMessage: 'Strategy',
      }),
      width: '30%',
      render: (name: string, row: StrategyRow) => (
        <div>
          <EuiIcon type={STRATEGY_ICONS[row.id]} aria-hidden={true} /> <strong>{name}</strong>
          <EuiText size="xs" color="subdued">
            <div>{row.watches}</div>
            <div>{row.reportsWhen}</div>
          </EuiText>
        </div>
      ),
    },
    {
      field: 'baselinePolicy',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.baseline', {
        defaultMessage: 'Baseline check',
      }),
      render: (policy: StrategyRow['baselinePolicy']) => BASELINE_POLICY_LABELS[policy],
    },
    {
      field: 'config',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.mode', {
        defaultMessage: 'Mode',
      }),
      width: '190px',
      render: (config: StrategyRow['config'], row: StrategyRow) => (
        <EuiButtonGroup
          buttonSize="compressed"
          data-test-subj={`detectionEngineStrategyMode-${row.id}`}
          legend={i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.modeAria', {
            defaultMessage: 'Mode of {strategy}',
            values: { strategy: row.name },
          })}
          idSelected={`${row.id}-${config.mode}`}
          options={STRATEGY_MODES.map((mode) => ({
            id: `${row.id}-${mode}`,
            label: MODE_LABELS[mode],
          }))}
          onChange={(id) => save(row, { mode: id.slice(row.id.length + 1) as StrategyMode })}
        />
      ),
    },
    {
      field: 'config',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.cap', {
        defaultMessage: 'Daily cap (opened today)',
      }),
      width: '150px',
      render: (config: StrategyRow['config'], row: StrategyRow) => (
        <EuiFieldNumber
          data-test-subj="significantEventsAppColumnsFieldNumber"
          compressed
          min={0}
          defaultValue={config.daily_cap}
          append={String(row.opened_today)}
          onBlur={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value !== config.daily_cap) {
              save(row, { daily_cap: value });
            }
          }}
        />
      ),
    },
    {
      field: 'scorecard',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.scorecard', {
        defaultMessage: 'Scorecard',
      }),
      render: (scorecard: StrategyRow['scorecard']) => (
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.score', {
              defaultMessage:
                'Score {score}: {caught} incidents caught, {missed} missed{warning}. ',
              values: {
                score: scorecard.score,
                caught: scorecard.incidents_caught,
                missed: scorecard.incidents_missed,
                warning:
                  scorecard.median_warning_minutes === undefined
                    ? ''
                    : `, raised ${scorecard.median_warning_minutes.toFixed(1)} min after the start`,
              },
            })}
          </strong>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.strategies.scorecardBody', {
            defaultMessage:
              '{signals} signals, {above} above normal, {trial} would raise in trial, {opened} events opened, {dismissed} dismissed, {verifier} verifier failures',
            values: {
              signals: scorecard.signals,
              above: scorecard.above_normal,
              trial: scorecard.would_raise_in_trial,
              opened: scorecard.events_opened,
              dismissed: scorecard.events_dismissed,
              verifier: scorecard.verifier_failures,
            },
          })}
        </EuiText>
      ),
    },
  ];

  return (
    <>
      {overview.proposals.map((proposal) => (
        <React.Fragment key={proposal.id}>
          <EuiCallOut
            size="s"
            iconType="sparkles"
            color="primary"
            data-test-subj={`detectionEngineProposal-${proposal.id}`}
            title={i18n.translate('xpack.significantEventsApp.detectionEngine.proposal.title', {
              defaultMessage: 'The engine proposes: {strategy}, {title}',
              values: {
                strategy: overview.strategies.find((row) => row.id === proposal.strategy)?.name,
                title: proposal.title,
              },
            })}
          >
            <p>{proposal.evidence}</p>
            <EuiButton
              size="s"
              data-test-subj={`detectionEngineAcceptProposal-${proposal.id}`}
              isLoading={actions.pendingAction === 'config'}
              onClick={() => {
                const row = overview.strategies.find((item) => item.id === proposal.strategy);
                if (row) {
                  save(row, proposal.change);
                }
              }}
            >
              {i18n.translate('xpack.significantEventsApp.detectionEngine.proposal.accept', {
                defaultMessage: 'Accept',
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      <EuiBasicTable
        data-test-subj="detectionEngineStrategiesTable"
        tableCaption={i18n.translate(
          'xpack.significantEventsApp.detectionEngine.strategies.caption',
          { defaultMessage: 'Signal strategies' }
        )}
        items={overview.strategies}
        columns={columns}
      />
    </>
  );
}
