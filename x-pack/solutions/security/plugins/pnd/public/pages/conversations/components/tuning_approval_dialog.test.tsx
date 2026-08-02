/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID } from '@kbn/pnd-common';
import type { PndProposalRow } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../test_helpers/render_with_providers';
// the live v8 anchors, imported rather than spelled out: `parse_tuning_proposal`'s own suite pins
// their text against the watch, and this suite is about what the dialog renders once they are read
import {
  TUNING_BACKTEST_AFTER_LABEL,
  TUNING_BACKTEST_BEFORE_LABEL,
  TUNING_CHANGE_LABEL,
  TUNING_CURRENT_QUERY_LABEL,
  TUNING_RULE_ID_LABEL,
  TUNING_RULE_NAME_LABEL,
} from '../helpers/parse_tuning_proposal';
import { TuningApprovalDialog } from './tuning_approval_dialog';

const RULE_ID = '8f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8';
const RULE_NAME = 'Endpoint Security [Insights]';
const CURRENT_QUERY = 'process.name : "powershell.exe"';
const PROPOSED_QUERY = 'process.name : "powershell.exe" and not user.name : "svc-backup"';

const reasoningFor = (change: string): string =>
  `Approval writes to a production detection rule. Rule: "${RULE_NAME}" (id ${RULE_ID}). Proposed change, restricted to enabled / investigation_fields / note: ${change}. Backtest over the same window — alerts as-is: 95; as-proposed: 3. Declining ends the run and changes nothing.`;

const createTuneProposal = (reasoning: string): PndProposalRow => ({
  alwaysGate: true,
  correlationId: 'alert-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: 'apply_tuning',
  inputSchema: {},
  message: `Apply a tuning to detection rule "${RULE_NAME}" (${RULE_ID})?`,
  reasoning,
  recommendedAction: 'tune',
  reversible: false,
  sourceId: `${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}:run-4:step-exec-4`,
  stepExecutionId: 'step-exec-4',
  stepId: 'await_apply_tuning',
  title: 'Apply a tuning',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  workflowRunId: 'run-4',
});

const defaultProps = {
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
  proposal: createTuneProposal(reasoningFor('{"enabled":false}')),
};

const confirm = (rationale = 'Ten false positives a day on the patch window.') => {
  fireEvent.change(screen.getByTestId('pndRuleIdConfirmDialogRationale'), {
    target: { value: rationale },
  });
  fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));
};

describe('TuningApprovalDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefills the model-authored rule id', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    expect(screen.getByTestId('pndRuleIdConfirmDialogRuleId')).toHaveValue(RULE_ID);
  });

  it('leaves the rule id editable, because the model may have invented it', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    fireEvent.change(screen.getByTestId('pndRuleIdConfirmDialogRuleId'), {
      target: { value: 'corrected-id' },
    });

    expect(screen.getByTestId('pndRuleIdConfirmDialogRuleId')).toHaveValue('corrected-id');
  });

  it('names the rule being changed', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    expect(screen.getByTestId('pndProposedRuleChangeRuleName')).toHaveTextContent(RULE_NAME);
  });

  it('shows the exact change being authorized, in human terms', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    expect(screen.getByTestId('pndProposedRuleChangeItem-enabled')).toHaveTextContent(
      'Disable rule'
    );
  });

  it('says out loud when there is no backtest behind the proposal', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toBeInTheDocument();
  });

  it('shows the backtest when the proposal carries one', () => {
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        proposal={{
          ...defaultProps.proposal,
          preview: { after: { alertCount: 3 }, before: { alertCount: 95 } },
        }}
      />
    );

    expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent('3');
  });

  it('confirms with the model-authored change', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} onConfirm={onConfirm} />);

    confirm();

    expect(onConfirm).toHaveBeenCalledWith({
      change: { enabled: false },
      rationale: 'Ten false positives a day on the patch window.',
      ruleId: RULE_ID,
    });
  });

  it('confirms with the rule id the analyst corrected, not the one the model wrote', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByTestId('pndRuleIdConfirmDialogRuleId'), {
      target: { value: 'corrected-id' },
    });
    confirm();

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ ruleId: 'corrected-id' }));
  });

  /**
   * The approval modal comes first in this flow and already took a rationale, so the analyst has
   * written one before this dialog opens. Carrying it forward is what makes the two calls read as one
   * decision rather than as two.
   */
  it('carries the rationale from the approval modal forward', () => {
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        initialRationale="Ten false positives a day on the patch window."
      />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogRationale')).toHaveValue(
      'Ten false positives a day on the patch window.'
    );
  });

  it('confirms with the carried-forward rationale, without asking for it twice', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        initialRationale="Ten false positives a day on the patch window."
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ rationale: 'Ten false positives a day on the patch window.' })
    );
  });

  it('does not confirm without a rationale, which _apply requires too', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a field outside the tunable set as one the server will reject', () => {
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        proposal={createTuneProposal(
          reasoningFor('{"alert_suppression":{"group_by":["host.name"]}}')
        )}
      />
    );

    expect(screen.getByTestId('pndProposedRuleChangeUnsupported')).toBeInTheDocument();
  });

  it('sends an unsafe change to the server rather than dropping it silently, so its 400 is visible', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        onConfirm={onConfirm}
        proposal={createTuneProposal(
          reasoningFor('{"alert_suppression":{"group_by":["host.name"]}}')
        )}
      />
    );

    confirm();

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ change: { alert_suppression: { group_by: ['host.name'] } } })
    );
  });

  it('says so when nothing machine-readable could be recovered from the proposal', () => {
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        proposal={createTuneProposal('No structured change.')}
      />
    );

    expect(screen.getByTestId('pndTuningApprovalNoModelChange')).toBeInTheDocument();
  });

  it('offers the analyst a disable, which is visible, explainable and reversible', () => {
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        proposal={createTuneProposal('No structured change.')}
      />
    );

    expect(screen.getByTestId('pndTuningApprovalDisableRule')).toBeChecked();
  });

  it('confirms the analyst-authored disable rather than an empty change', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        onConfirm={onConfirm}
        proposal={createTuneProposal('No structured change.')}
      />
    );

    confirm();

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ change: { enabled: false } }));
  });

  it('confirms an enable when the analyst turns the disable off', () => {
    const onConfirm = jest.fn();
    renderWithPndProviders(
      <TuningApprovalDialog
        {...defaultProps}
        onConfirm={onConfirm}
        proposal={createTuneProposal('No structured change.')}
      />
    );

    fireEvent.click(screen.getByTestId('pndTuningApprovalDisableRule'));
    confirm();

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ change: { enabled: true } }));
  });

  it('offers no analyst-authored change when the model wrote one', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    expect(screen.queryByTestId('pndTuningApprovalDisableRule')).not.toBeInTheDocument();
  });

  it('warns that the field is the rule id rather than the rule_id', () => {
    renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

    expect(screen.getByTestId('pndTuningApprovalRuleIdNote')).toBeInTheDocument();
  });

  it('renders a server failure in place, so the typed rationale is not lost', () => {
    renderWithPndProviders(
      <TuningApprovalDialog {...defaultProps} errorMessage="Not authorized to change rules" />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogError')).toHaveTextContent(
      'Not authorized to change rules'
    );
  });

  // R6/R5. `reasoningFor` above is the pre-v4 prose shape, kept because a gate parked for up to 30
  // days survives an upgrade. These cover the v4 through v7 shape, which is still pending for the
  // same reason: each fact behind a stable label as JSON, and a workflow-authored reason when nothing
  // was measured.
  describe('a proposal parked by a v4 through v7 Detection Watch', () => {
    const anchoredReasoningFor = (
      change: string,
      preview = '{"before": {}, "after": {}, "notMeasured": "No rule preview was run: the PND tuning agent holds no tools."}'
    ): string =>
      `Approval writes to a production detection rule. Rule name: "${RULE_NAME}". Rule id: "${RULE_ID}". Proposed change (enabled / investigation_fields / note only): ${change}. Backtest detail: ${preview}. Declining ends the run and changes nothing.`;

    it('prefills the rule id without re-parsing prose', () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={createTuneProposal(anchoredReasoningFor('{"enabled":false}'))}
        />
      );

      expect(screen.getByTestId('pndRuleIdConfirmDialogRuleId')).toHaveValue(RULE_ID);
    });

    it('names the rule', () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={createTuneProposal(anchoredReasoningFor('{"enabled":false}'))}
        />
      );

      expect(screen.getByTestId('pndProposedRuleChangeRuleName')).toHaveTextContent(RULE_NAME);
    });

    it('shows the change the model authored', () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={createTuneProposal(anchoredReasoningFor('{"note":"Check the patch window"}'))}
        />
      );

      expect(screen.getByTestId('pndProposedRuleChangeItem-note')).toBeInTheDocument();
    });

    // R5: `PndProposalRow.preview` has no producer in `pnd/server`, so before this the approver only
    // ever saw the generic "no backtest available" and was never told why.
    it("states the workflow's reason for there being no backtest", () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={createTuneProposal(anchoredReasoningFor('{"enabled":false}'))}
        />
      );

      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toHaveTextContent(
        /holds no tools/
      );
    });

    it('renders a real backtest when the workflow carried one', () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={createTuneProposal(
            anchoredReasoningFor(
              '{"enabled":false}',
              '{"after":{"alertCount":3},"before":{"alertCount":95}}'
            )
          )}
        />
      );

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent('3');
    });

    it('does not warn about prose recovery, because none happened', () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={createTuneProposal(anchoredReasoningFor('{"enabled":false}'))}
        />
      );

      expect(screen.queryByTestId('pndTuningApprovalLegacyRecovery')).not.toBeInTheDocument();
    });

    it('warns when the fields did have to be read back out of prose', () => {
      renderWithPndProviders(<TuningApprovalDialog {...defaultProps} />);

      expect(screen.getByTestId('pndTuningApprovalLegacyRecovery')).toBeInTheDocument();
    });

    // The degraded card `draft_tuning`'s `on-failure` handler parks: neither the summary nor the gate
    // question names a rule, because there is no draft. Nothing was recovered from prose, so warning
    // about prose recovery would point at a problem that is not the one the analyst has.
    it('does not warn about prose recovery on a card with no draft at all', () => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          proposal={{
            ...createTuneProposal(
              'NO TUNING WAS DRAFTED: the detection-engineer agent did not return a rule to tune.'
            ),
            message:
              'No tuning was drafted: the detection-engineer agent did not return a rule to tune. Dismiss this proposal — there is nothing to apply.',
          }}
        />
      );

      expect(screen.queryByTestId('pndTuningApprovalLegacyRecovery')).not.toBeInTheDocument();
    });
  });

  // v8 made `query` tunable, which is the whole reason this dialog exists in its current form: the
  // summary above can say "Update rule query", but only the rewrite beside the query it replaces says
  // what approving actually changes about which documents match. Both come from
  // `resolveTuningEvidence`, the same merge point the flyout's Review tuning section resolves through.
  describe('a tuning that rewrites the rule query', () => {
    const queryReasoning = ({
      after = '3',
      before = '95',
      currentQuery = JSON.stringify(CURRENT_QUERY),
      change = JSON.stringify({ query: PROPOSED_QUERY }),
    } = {}): string =>
      `Approval writes to a production detection rule. ${TUNING_RULE_NAME_LABEL} "${RULE_NAME}". ${TUNING_RULE_ID_LABEL} "${RULE_ID}". ${TUNING_BACKTEST_BEFORE_LABEL} ${before}. ${TUNING_BACKTEST_AFTER_LABEL} ${after}. ${TUNING_CHANGE_LABEL} ${change}. ${TUNING_CURRENT_QUERY_LABEL} ${currentQuery}. Declining ends the run and changes nothing.`;

    const renderQueryDialog = (reasoning = queryReasoning(), onConfirm = jest.fn()) => {
      renderWithPndProviders(
        <TuningApprovalDialog
          {...defaultProps}
          onConfirm={onConfirm}
          proposal={createTuneProposal(reasoning)}
        />
      );

      return { onConfirm };
    };

    it('renders the rule query as it stands, which the rewrite has to be read against', () => {
      renderQueryDialog();

      expect(screen.getByTestId('pndQueryComparisonCurrent')).toHaveTextContent(CURRENT_QUERY);
    });

    it('renders the query the tuning proposes', () => {
      renderQueryDialog();

      expect(screen.getByTestId('pndQueryComparisonProposed')).toHaveTextContent(PROPOSED_QUERY);
    });

    it('renders the alert count the rule produces as it stands', () => {
      renderQueryDialog();

      expect(screen.getByTestId('pndBacktestComparisonBeforeCount')).toHaveTextContent('95');
    });

    it('renders the alert count the rewrite would produce', () => {
      renderQueryDialog();

      expect(screen.getByTestId('pndBacktestComparisonAfterCount')).toHaveTextContent('3');
    });

    it('names the query as the field being changed', () => {
      renderQueryDialog();

      expect(screen.getByTestId('pndProposedRuleChangeItem-query')).toBeInTheDocument();
    });

    it('confirms with the query rewrite, which is what _apply now accepts', () => {
      const { onConfirm } = renderQueryDialog();

      confirm();

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ change: { query: PROPOSED_QUERY } })
      );
    });

    // Never a diff against an empty string: that reads as "this rule currently matches nothing".
    it('warns rather than showing an empty as-is side when the query could not be read', () => {
      renderQueryDialog(queryReasoning({ currentQuery: '""' }));

      expect(screen.getByTestId('pndQueryComparisonUnknownCurrent')).toBeInTheDocument();
    });

    it('still renders the proposed query when the as-is query could not be read', () => {
      renderQueryDialog(queryReasoning({ currentQuery: '""' }));

      expect(screen.getByTestId('pndQueryComparisonProposed')).toHaveTextContent(PROPOSED_QUERY);
    });

    it('renders no query diff for a tuning that rewrites no query', () => {
      renderQueryDialog(queryReasoning({ change: '{"enabled":false}' }));

      expect(screen.queryByTestId('pndQueryComparison')).not.toBeInTheDocument();
    });
  });
});
