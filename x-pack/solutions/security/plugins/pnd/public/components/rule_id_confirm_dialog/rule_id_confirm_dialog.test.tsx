/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { RuleIdConfirmDialog } from './rule_id_confirm_dialog';

const type = (testSubj: string, value: string) => {
  fireEvent.change(screen.getByTestId(testSubj), { target: { value } });
};

const fillValidForm = () => {
  type('pndRuleIdConfirmDialogRuleId', 'rule-1');
  type('pndRuleIdConfirmDialogRationale', 'Confirmed with the on-call analyst.');
};

describe('RuleIdConfirmDialog', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog', () => {
    renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByTestId('pndRuleIdConfirmDialog')).toBeInTheDocument();
  });

  it('prefills the model-authored rule id', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog initialRuleId="rule-1" onCancel={onCancel} onConfirm={onConfirm} />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogRuleId')).toHaveValue('rule-1');
  });

  it('leaves the field empty when the proposal carried no rule id', () => {
    renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByTestId('pndRuleIdConfirmDialogRuleId')).toHaveValue('');
  });

  /**
   * The tuning flow reaches this dialog *after* the approval modal, where the analyst has already
   * written why they are approving. Asking for it a second time would read as the first answer having
   * been thrown away — and the two rationales go to `_respond` and `_apply` as one decision.
   */
  it('carries a rationale the analyst has already written into the field', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog
        initialRationale="Confirmed with the on-call analyst."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogRationale')).toHaveValue(
      'Confirmed with the on-call analyst.'
    );
  });

  it('leaves the rationale empty when nothing has been written yet', () => {
    renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByTestId('pndRuleIdConfirmDialogRationale')).toHaveValue('');
  });

  it('confirms straight away with a seeded rationale, without retyping it', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog
        initialRationale="Confirmed with the on-call analyst."
        initialRuleId="rule-1"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    expect(onConfirm).toHaveBeenCalledWith({
      rationale: 'Confirmed with the on-call analyst.',
      ruleId: 'rule-1',
    });
  });

  it('lets the analyst replace a seeded rationale', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog
        initialRationale="Confirmed with the on-call analyst."
        initialRuleId="rule-1"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    type('pndRuleIdConfirmDialogRationale', 'Actually, the rule is too broad.');
    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    expect(onConfirm).toHaveBeenCalledWith({
      rationale: 'Actually, the rule is too broad.',
      ruleId: 'rule-1',
    });
  });

  it('says the prefilled id is model-authored and must be confirmed', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog initialRuleId="rule-1" onCancel={onCancel} onConfirm={onConfirm} />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialog')).toHaveTextContent(/confirm/i);
  });

  it('renders the rule name when the proposal carries one', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog
        onCancel={onCancel}
        onConfirm={onConfirm}
        ruleName="Suspicious PowerShell"
      />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialog')).toHaveTextContent('Suspicious PowerShell');
  });

  it('confirms with the edited rule id and the rationale', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog initialRuleId="wrong-id" onCancel={onCancel} onConfirm={onConfirm} />
    );

    fillValidForm();
    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    expect(onConfirm).toHaveBeenCalledWith({
      rationale: 'Confirmed with the on-call analyst.',
      ruleId: 'rule-1',
    });
  });

  it('trims both values, so a stray space cannot 404 the apply call', () => {
    renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

    type('pndRuleIdConfirmDialogRuleId', '  rule-1  ');
    type('pndRuleIdConfirmDialogRationale', '  Looks right.  ');
    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    expect(onConfirm).toHaveBeenCalledWith({ rationale: 'Looks right.', ruleId: 'rule-1' });
  });

  describe('validation', () => {
    it('does not confirm without a rule id', () => {
      renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

      type('pndRuleIdConfirmDialogRationale', 'Looks right.');
      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('explains that the rule id is required', () => {
      renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

      expect(screen.getByTestId('pndRuleIdConfirmDialogRuleIdError')).toBeInTheDocument();
    });

    it('rejects a whitespace-only rule id', () => {
      renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

      type('pndRuleIdConfirmDialogRuleId', '   ');
      type('pndRuleIdConfirmDialogRationale', 'Looks right.');
      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('does not confirm without a rationale, which _respond and _apply both require', () => {
      renderWithPndProviders(
        <RuleIdConfirmDialog initialRuleId="rule-1" onCancel={onCancel} onConfirm={onConfirm} />
      );

      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('explains that the rationale is required', () => {
      renderWithPndProviders(
        <RuleIdConfirmDialog initialRuleId="rule-1" onCancel={onCancel} onConfirm={onConfirm} />
      );

      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

      expect(screen.getByTestId('pndRuleIdConfirmDialogRationaleError')).toBeInTheDocument();
    });

    it('rejects a whitespace-only rationale', () => {
      renderWithPndProviders(
        <RuleIdConfirmDialog initialRuleId="rule-1" onCancel={onCancel} onConfirm={onConfirm} />
      );

      type('pndRuleIdConfirmDialogRationale', '   ');
      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('clears the error once the field is fixed', () => {
      renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));
      type('pndRuleIdConfirmDialogRuleId', 'rule-1');

      expect(screen.queryByTestId('pndRuleIdConfirmDialogRuleIdError')).not.toBeInTheDocument();
    });
  });

  it('cancels', () => {
    renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogCancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders the evidence its caller composes in, so the approver sees the change and the backtest', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm}>
        <div data-test-subj="pndTestEvidence">{'evidence'}</div>
      </RuleIdConfirmDialog>
    );

    expect(screen.getByTestId('pndTestEvidence')).toBeInTheDocument();
  });

  it('surfaces a server error, so a rules-write denial fails visibly', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog
        errorMessage="Forbidden: missing securitySolution rules write privilege"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogError')).toHaveTextContent(/forbidden/i);
  });

  it('omits the error callout when there is no error', () => {
    renderWithPndProviders(<RuleIdConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.queryByTestId('pndRuleIdConfirmDialogError')).not.toBeInTheDocument();
  });

  it('disables confirm while the apply call is in flight', () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog
        initialRuleId="rule-1"
        isLoading
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogConfirm')).toBeDisabled();
  });

  it("uses the caller's confirm label", () => {
    renderWithPndProviders(
      <RuleIdConfirmDialog confirmLabel="Apply tuning" onCancel={onCancel} onConfirm={onConfirm} />
    );

    expect(screen.getByTestId('pndRuleIdConfirmDialogConfirm')).toHaveTextContent('Apply tuning');
  });
});
