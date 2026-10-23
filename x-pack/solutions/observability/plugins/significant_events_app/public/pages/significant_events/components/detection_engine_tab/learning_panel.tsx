/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCode,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  type EuiBasicTableColumn,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AUTONOMY_LEVELS,
  LEARNING_CAPABILITIES,
  type AutonomyLevel,
  type CandidateStage,
  type IncidentLabel,
  type KiProposal,
  type LabelledIncident,
  type LearningCapability,
  type MemoryNote,
  type StrategyCandidate,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import type { IDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { useDetectionEngineLearning } from '../../../../hooks/use_detection_engine_learning';
import { formatTime } from './format';

const STAGE_COLORS: Record<CandidateStage, string> = {
  proposed: 'default',
  replay_failed: 'danger',
  trial: 'primary',
  review: 'warning',
  live: 'success',
  kept: 'success',
  rolled_back: 'danger',
  rejected: 'hollow',
};

const LABEL_COLORS: Record<IncidentLabel, string> = {
  confirmed: 'success',
  missed: 'danger',
  false_positive: 'warning',
};

const CAPABILITY_LABELS: Record<LearningCapability, string> = {
  memory: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.memory', {
    defaultMessage: 'Memory the agent reads',
  }),
  tuning: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.tuning', {
    defaultMessage: 'Threshold tuning',
  }),
  detectors: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.detectors', {
    defaultMessage: 'New detectors',
  }),
};

const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  off: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.off', {
    defaultMessage: 'Off',
  }),
  suggest: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.suggest', {
    defaultMessage: 'Suggest',
  }),
  act: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.act', {
    defaultMessage: 'Act',
  }),
};

/** What a candidate's last replay or trial showed, in one line. */
function evidenceOf(candidate: StrategyCandidate): string {
  const parts = [
    candidate.replay
      ? i18n.translate('xpack.significantEventsApp.detectionEngine.learning.replayLine', {
          defaultMessage:
            'Replay: {opens} would-be events, {caught} kept incidents caught, {outsidePerDay} per day outside real incidents ({unlabelled} unlabelled, {dismissed} dismissed)',
          values: {
            opens: candidate.replay.would_open,
            caught: candidate.replay.caught.length,
            outsidePerDay: candidate.replay.outside_opens_per_day,
            unlabelled: candidate.replay.unlabelled_opens,
            dismissed: candidate.replay.dismissed_opens,
          },
        })
      : undefined,
    candidate.trial?.judged_at
      ? i18n.translate('xpack.significantEventsApp.detectionEngine.learning.trialLine', {
          defaultMessage:
            'Trial: {raise} would-raise minutes, {opens} would-be events, {unlabelled} unlabelled, {dismissed} dismissed',
          values: {
            raise: candidate.trial.would_raise,
            opens: candidate.trial.would_open,
            unlabelled: candidate.trial.unlabelled_opens,
            dismissed: candidate.trial.dismissed_opens,
          },
        })
      : undefined,
    candidate.live
      ? i18n.translate('xpack.significantEventsApp.detectionEngine.learning.liveLine', {
          defaultMessage: 'Live: {opened} events, {dismissed} dismissed',
          values: { opened: candidate.live.events_opened, dismissed: candidate.live.dismissed },
        })
      : undefined,
  ];
  return parts.filter(Boolean).join(' · ');
}

interface ICandidatesTableProps {
  candidates: StrategyCandidate[];
  actions: IDetectionEngineActions;
}

/** Every change on the evolution path, with why it is where it is. */
function CandidatesTable({ candidates, actions }: ICandidatesTableProps) {
  const columns: Array<EuiBasicTableColumn<StrategyCandidate>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.candidate', {
        defaultMessage: 'Candidate',
      }),
      render: (title: string, candidate: StrategyCandidate) => (
        <div>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {candidate.hypothesis}
          </EuiText>
          {candidate.detector && (
            <EuiCode transparentBackground>{candidate.detector.condition}</EuiCode>
          )}
          {candidate.threshold && (
            <EuiText size="xs">
              {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.threshold', {
                defaultMessage: 'mad_k {from} to {to}',
                values: {
                  from: candidate.threshold.from_mad_k,
                  to: candidate.threshold.to_mad_k,
                },
              })}
            </EuiText>
          )}
        </div>
      ),
    },
    {
      field: 'origin',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.origin', {
        defaultMessage: 'From',
      }),
      width: '140px',
      render: (origin: StrategyCandidate['origin'], candidate: StrategyCandidate) => (
        <EuiText size="xs">
          {origin.kind === 'decision_tree'
            ? i18n.translate('xpack.significantEventsApp.detectionEngine.learning.fromTree', {
                defaultMessage: 'Decision tree {tree}, {count} confirmations',
                values: { tree: origin.tree_id, count: origin.confirmations },
              })
            : origin.kind}
          <br />
          {candidate.scope.service}
        </EuiText>
      ),
    },
    {
      field: 'stage',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.stage', {
        defaultMessage: 'Stage',
      }),
      width: '110px',
      render: (stage: CandidateStage) => <EuiBadge color={STAGE_COLORS[stage]}>{stage}</EuiBadge>,
    },
    {
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.evidence', {
        defaultMessage: 'Evidence',
      }),
      render: (candidate: StrategyCandidate) => {
        const last = candidate.history[candidate.history.length - 1];
        return (
          <div>
            <EuiText size="xs">{evidenceOf(candidate)}</EuiText>
            <EuiText size="xs" color="subdued">
              {formatTime(last.at)}: {last.note}
            </EuiText>
          </div>
        );
      },
    },
    {
      name: '',
      width: '170px',
      render: (candidate: StrategyCandidate) => (
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {candidate.stage === 'review' && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                data-test-subj="detectionEngineApproveCandidate"
                isLoading={actions.pendingAction === 'approve'}
                onClick={() => actions.approveCandidate(candidate.candidate_id)}
              >
                {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.approve', {
                  defaultMessage: 'Approve',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          {['proposed', 'trial', 'review', 'live', 'kept'].includes(candidate.stage) && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="danger"
                data-test-subj="detectionEngineRejectCandidate"
                isLoading={actions.pendingAction === 'reject'}
                onClick={() => actions.rejectCandidate({ candidateId: candidate.candidate_id })}
              >
                {candidate.stage === 'live' || candidate.stage === 'kept'
                  ? i18n.translate('xpack.significantEventsApp.detectionEngine.learning.rollback', {
                      defaultMessage: 'Roll back',
                    })
                  : i18n.translate('xpack.significantEventsApp.detectionEngine.learning.reject', {
                      defaultMessage: 'Reject',
                    })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
  ];
  return (
    <EuiBasicTable
      data-test-subj="detectionEngineCandidatesTable"
      tableCaption={i18n.translate(
        'xpack.significantEventsApp.detectionEngine.learning.candidatesCaption',
        { defaultMessage: 'Candidates on the evolution path' }
      )}
      items={candidates}
      columns={columns}
      noItemsMessage={i18n.translate(
        'xpack.significantEventsApp.detectionEngine.learning.noCandidates',
        {
          defaultMessage:
            'No candidates yet. They come from decision trees investigations confirmed twice, from missed incidents and from repeated dismissals.',
        }
      )}
    />
  );
}

interface IReportMissedModalProps {
  services: string[];
  actions: IDetectionEngineActions;
  onClose: () => void;
}

/** Reports a problem the engine did not raise, so the learning loop can find what would have. */
function ReportMissedModal({ services, actions, onClose }: IReportMissedModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [description, setDescription] = useState('');
  const titleId = useGeneratedHtmlId({ prefix: 'reportMissedTitle' });
  const valid = selected.length > 0 && !Number.isNaN(Date.parse(from)) && description.trim();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="detectionEngineReportMissedModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.reportTitle', {
            defaultMessage: 'Report a missed incident',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.significantEventsApp.detectionEngine.learning.services', {
            defaultMessage: 'Services, where it started first',
          })}
        >
          <EuiComboBox
            data-test-subj="detectionEngineMissedServices"
            options={services.map((service) => ({ label: service }))}
            selectedOptions={selected.map((service) => ({ label: service }))}
            onChange={(options) => setSelected(options.map((option) => option.label))}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.significantEventsApp.detectionEngine.learning.from', {
            defaultMessage: 'Started (ISO time)',
          })}
        >
          <EuiFieldText
            data-test-subj="detectionEngineMissedFrom"
            value={from}
            placeholder="2026-10-19T08:30:00Z"
            onChange={(event) => setFrom(event.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.significantEventsApp.detectionEngine.learning.to', {
            defaultMessage: 'Ended (ISO time, optional)',
          })}
        >
          <EuiFieldText
            data-test-subj="detectionEngineMissedTo"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.significantEventsApp.detectionEngine.learning.what', {
            defaultMessage: 'What happened',
          })}
        >
          <EuiTextArea
            data-test-subj="detectionEngineMissedDescription"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="detectionEngineMissedCancel" onClick={onClose}>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="detectionEngineMissedSubmit"
          isDisabled={!valid}
          isLoading={actions.pendingAction === 'reportMissed'}
          onClick={async () => {
            await actions.reportMissed({
              services: selected,
              from: new Date(from).toISOString(),
              to: to && !Number.isNaN(Date.parse(to)) ? new Date(to).toISOString() : undefined,
              description: description.trim(),
            });
            onClose();
          }}
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.report', {
            defaultMessage: 'Report',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

interface ILearningPanelProps {
  actions: IDetectionEngineActions;
  /** Services the engine watches, to report a missed incident on. */
  services: string[];
}

/**
 * The learning loop as people see it: how far it may act, the changes on the evolution path,
 * the labelled incidents every change is checked against, and the memory the agent reads.
 */
export function LearningPanel({ actions, services }: ILearningPanelProps) {
  const { data } = useDetectionEngineLearning();
  const [reporting, setReporting] = useState(false);
  if (!data) {
    return null;
  }

  const incidentColumns: Array<EuiBasicTableColumn<LabelledIncident>> = [
    {
      field: 'label',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.label', {
        defaultMessage: 'Label',
      }),
      width: '120px',
      render: (label: IncidentLabel) => <EuiBadge color={LABEL_COLORS[label]}>{label}</EuiBadge>,
    },
    {
      field: 'services',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.incidentServices', {
        defaultMessage: 'Services',
      }),
      width: '160px',
      render: (items: string[]) => items.join(', '),
    },
    {
      field: 'from',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.started', {
        defaultMessage: 'Started',
      }),
      width: '100px',
      render: (from: string) => formatTime(from),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.description', {
        defaultMessage: 'What',
      }),
    },
  ];

  const noteColumns: Array<EuiBasicTableColumn<MemoryNote>> = [
    {
      field: 'scope',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.about', {
        defaultMessage: 'About',
      }),
      width: '200px',
      render: (scope: MemoryNote['scope'], note: MemoryNote) => (
        <EuiText size="xs">
          {scope}: {note.key}
        </EuiText>
      ),
    },
    {
      field: 'text',
      name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.note', {
        defaultMessage: 'Note',
      }),
      render: (text: string, note: MemoryNote) => (
        <EuiText size="xs" color={note.retired_at ? 'subdued' : undefined}>
          {note.retired_at ? <s>{text}</s> : text}
        </EuiText>
      ),
    },
    {
      name: '',
      width: '90px',
      render: (note: MemoryNote) =>
        note.retired_at ? null : (
          <EuiButtonEmpty
            size="xs"
            data-test-subj="detectionEngineRetireNote"
            onClick={() =>
              actions.retireNote({
                noteId: note.note_id,
                reason: i18n.translate(
                  'xpack.significantEventsApp.detectionEngine.learning.retiredByPerson',
                  { defaultMessage: 'Retired from the Learning tab' }
                ),
              })
            }
          >
            {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.retire', {
              defaultMessage: 'Retire',
            })}
          </EuiButtonEmpty>
        ),
    },
  ];

  return (
    <div data-test-subj="detectionEngineLearningPanel">
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
        {LEARNING_CAPABILITIES.map((capability) => (
          <EuiFlexItem grow={false} key={capability}>
            <EuiFormRow label={CAPABILITY_LABELS[capability]} display="rowCompressed">
              <EuiButtonGroup
                buttonSize="compressed"
                legend={CAPABILITY_LABELS[capability]}
                idSelected={data.config.autonomy[capability]}
                options={AUTONOMY_LEVELS.map((level) => ({
                  id: level,
                  label: AUTONOMY_LABELS[level],
                }))}
                onChange={(level) =>
                  actions.updateConfig({
                    learning: { autonomy: { [capability]: level as AutonomyLevel } },
                  })
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        ))}
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="refresh"
            data-test-subj="detectionEngineRunLearning"
            isLoading={actions.pendingAction === 'learn'}
            onClick={() => actions.runLearning()}
          >
            {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.runPass', {
              defaultMessage: 'Run a learning pass',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="flag"
            color="danger"
            data-test-subj="detectionEngineReportMissed"
            onClick={() => setReporting(true)}
          >
            {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.reportMissed', {
              defaultMessage: 'Report a missed incident',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {data.last_run && (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.lastPass', {
            defaultMessage:
              'Last pass {at}: {incidents} labelled incidents, {trees} decision trees, {pages} investigation pages read; {notes} notes added, {proposed} candidates proposed, {advanced} moved on.',
            values: {
              at: formatTime(data.last_run.finished_at),
              incidents: data.last_run.evidence.incidents,
              trees: data.last_run.evidence.decision_trees,
              pages: data.last_run.evidence.investigation_pages,
              notes: data.last_run.memory.added,
              proposed: data.last_run.candidates.proposed,
              advanced: data.last_run.candidates.advanced,
            },
          })}
        </EuiText>
      )}
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.candidatesTitle', {
            defaultMessage: 'Changes on the evolution path',
          })}
        </h4>
      </EuiTitle>
      <CandidatesTable candidates={data.candidates} actions={actions} />
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.incidentsTitle', {
            defaultMessage: 'Labelled incidents every change is checked against',
          })}
        </h4>
      </EuiTitle>
      <EuiBasicTable
        data-test-subj="detectionEngineIncidentsTable"
        tableCaption={i18n.translate(
          'xpack.significantEventsApp.detectionEngine.learning.incidentsCaption',
          { defaultMessage: 'Labelled incidents' }
        )}
        items={data.incidents}
        columns={incidentColumns}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.memoryTitle', {
            defaultMessage: 'Memory the agent reads',
          })}
        </h4>
      </EuiTitle>
      <EuiBasicTable
        data-test-subj="detectionEngineMemoryTable"
        tableCaption={i18n.translate(
          'xpack.significantEventsApp.detectionEngine.learning.memoryCaption',
          { defaultMessage: 'Memory notes' }
        )}
        items={data.memory.slice(0, 50)}
        columns={noteColumns}
      />
      {data.ki_proposals.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.learning.kiTitle', {
                defaultMessage: 'Proposals for your KIs (the engine never changes them)',
              })}
            </h4>
          </EuiTitle>
          <EuiBasicTable
            data-test-subj="detectionEngineKiProposalsTable"
            tableCaption={i18n.translate(
              'xpack.significantEventsApp.detectionEngine.learning.kiCaption',
              { defaultMessage: 'Proposals about knowledge indicators' }
            )}
            items={data.ki_proposals}
            columns={[
              {
                field: 'title',
                name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.ki', {
                  defaultMessage: 'KI',
                }),
                width: '260px',
              },
              {
                field: 'kind',
                name: i18n.translate('xpack.significantEventsApp.detectionEngine.learning.kiKind', {
                  defaultMessage: 'Finding',
                }),
                width: '140px',
                render: (kind: KiProposal['kind']) => <EuiBadge>{kind}</EuiBadge>,
              },
              {
                field: 'proposal',
                name: i18n.translate(
                  'xpack.significantEventsApp.detectionEngine.learning.kiProposal',
                  { defaultMessage: 'Proposal' }
                ),
              },
            ]}
          />
        </>
      )}
      {reporting && (
        <ReportMissedModal
          services={services}
          actions={actions}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
