/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { PND_TUNABLE_RULE_FIELDS } from '@kbn/pnd-common';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { ProposedRuleChange, describeRuleChange } from './proposed_rule_change';

describe('ProposedRuleChange', () => {
  describe('the permitted set is the server allow-list, not a second opinion about it', () => {
    it('permits exactly the fields `_apply` will accept', () => {
      const described = describeRuleChange(
        Object.fromEntries(PND_TUNABLE_RULE_FIELDS.map((field) => [field, 'x']))
      );

      expect(described.unsupported).toEqual([]);
    });

    it('describes every field of the allow-list, so a widened contract cannot render a blank item', () => {
      const described = describeRuleChange(
        Object.fromEntries(PND_TUNABLE_RULE_FIELDS.map((field) => [field, 'x']))
      );

      expect(described.permitted.map(({ field }) => field)).toEqual([...PND_TUNABLE_RULE_FIELDS]);
    });

    it('gives every permitted field a non-empty summary', () => {
      const described = describeRuleChange(
        Object.fromEntries(PND_TUNABLE_RULE_FIELDS.map((field) => [field, 'x']))
      );

      expect(described.permitted.every(({ summary }) => summary.length > 0)).toBe(true);
    });

    it('rejects exceptions_list, because a rule patch replaces that array rather than merging it', () => {
      const described = describeRuleChange({ exceptions_list: [{ id: 'list-1' }] });

      expect(described.unsupported).toEqual(['exceptions_list']);
    });
  });

  describe('an absent change is stated explicitly', () => {
    it('says no change was proposed when change is absent', () => {
      renderWithPndProviders(<ProposedRuleChange />);

      expect(screen.getByTestId('pndProposedRuleChangeEmpty')).toBeInTheDocument();
    });

    it('says no change was proposed for an empty change object', () => {
      renderWithPndProviders(<ProposedRuleChange change={{}} />);

      expect(screen.getByTestId('pndProposedRuleChangeEmpty')).toBeInTheDocument();
    });
  });

  describe('the permitted fields read in human terms', () => {
    it('renders enabled: false as disabling the rule', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ enabled: false }} />);

      expect(screen.getByTestId('pndProposedRuleChangeItem-enabled')).toHaveTextContent(
        /disable rule/i
      );
    });

    it('renders enabled: true as enabling the rule', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ enabled: true }} />);

      expect(screen.getByTestId('pndProposedRuleChangeItem-enabled')).toHaveTextContent(
        /enable rule/i
      );
    });

    it('renders note as updating the investigation guide', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ note: 'Check the parent process.' }} />);

      expect(screen.getByTestId('pndProposedRuleChangeItem-note')).toHaveTextContent(
        /investigation guide/i
      );
    });

    it('shows the proposed investigation guide text, because it is prose an approver can read', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ note: 'Check the parent process.' }} />);

      expect(screen.getByTestId('pndProposedRuleChangeItem-note')).toHaveTextContent(
        'Check the parent process.'
      );
    });

    it('renders investigation_fields as updating the investigation fields', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ investigation_fields: { field_names: ['host.name'] } }} />
      );

      expect(
        screen.getByTestId('pndProposedRuleChangeItem-investigation_fields')
      ).toHaveTextContent(/investigation fields/i);
    });

    it('names the investigation fields it would set', () => {
      renderWithPndProviders(
        <ProposedRuleChange
          change={{ investigation_fields: { field_names: ['host.name', 'user.name'] } }}
        />
      );

      expect(
        screen.getByTestId('pndProposedRuleChangeItem-investigation_fields')
      ).toHaveTextContent('host.name');
    });

    it('never prints the raw JSON of a structured field', () => {
      const { container } = renderWithPndProviders(
        <ProposedRuleChange change={{ investigation_fields: { field_names: ['host.name'] } }} />
      );

      expect(container.textContent).not.toContain('field_names');
    });

    it('renders query as updating the rule query', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ query: 'process.name : "powershell.exe"' }} />
      );

      expect(screen.getByTestId('pndProposedRuleChangeItem-query')).toHaveTextContent(
        /update rule query/i
      );
    });

    // "Update rule query" on its own tells an approver nothing about what would change.
    it('shows the proposed query, which is the whole substance of the change', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ query: 'process.name : "powershell.exe"' }} />
      );

      expect(screen.getByTestId('pndProposedRuleChangeItem-query')).toHaveTextContent(
        'process.name : "powershell.exe"'
      );
    });

    it('renders one item per proposed field', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ enabled: false, note: 'Guide.' }} />);

      expect(screen.getAllByTestId(/pndProposedRuleChangeItem-/)).toHaveLength(2);
    });
  });

  describe('a field outside the permitted set is flagged, not rendered as a change', () => {
    it('warns about the unsupported field', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ alert_suppression: { group_by: ['host.name'] } }} />
      );

      expect(screen.getByTestId('pndProposedRuleChangeUnsupported')).toBeInTheDocument();
    });

    it('names the unsupported field', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ alert_suppression: { group_by: ['host.name'] } }} />
      );

      expect(screen.getByTestId('pndProposedRuleChangeUnsupported')).toHaveTextContent(
        'alert_suppression'
      );
    });

    it('says the change would be rejected, matching the server allow-list', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ alert_suppression: { group_by: ['host.name'] } }} />
      );

      expect(screen.getByTestId('pndProposedRuleChangeUnsupported')).toHaveTextContent(/reject/i);
    });

    it('does not render an unsupported field as a permitted item', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ alert_suppression: { group_by: ['host.name'] } }} />
      );

      expect(
        screen.queryByTestId('pndProposedRuleChangeItem-alert_suppression')
      ).not.toBeInTheDocument();
    });

    it('still renders the permitted fields alongside the warning', () => {
      renderWithPndProviders(
        <ProposedRuleChange
          change={{ alert_suppression: { group_by: ['host.name'] }, enabled: false }}
        />
      );

      expect(screen.getByTestId('pndProposedRuleChangeItem-enabled')).toBeInTheDocument();
      expect(screen.getByTestId('pndProposedRuleChangeUnsupported')).toBeInTheDocument();
    });

    it('does not warn when every field is permitted', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ enabled: false }} />);

      expect(screen.queryByTestId('pndProposedRuleChangeUnsupported')).not.toBeInTheDocument();
    });

    it('flags an exceptions_list change, which the server refuses even though it looks tunable', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ exceptions_list: [{ id: 'list-1' }] }} />
      );

      expect(screen.getByTestId('pndProposedRuleChangeUnsupported')).toHaveTextContent(
        'exceptions_list'
      );
    });

    it('does not render exceptions_list as a change PND would make', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ exceptions_list: [{ id: 'list-1' }] }} />
      );

      expect(
        screen.queryByTestId('pndProposedRuleChangeItem-exceptions_list')
      ).not.toBeInTheDocument();
    });
  });

  describe('the rule being changed', () => {
    it('renders the rule name when the proposal carries one', () => {
      renderWithPndProviders(
        <ProposedRuleChange change={{ enabled: false }} ruleName="Suspicious PowerShell" />
      );

      expect(screen.getByTestId('pndProposedRuleChangeRuleName')).toHaveTextContent(
        'Suspicious PowerShell'
      );
    });

    it('renders the rule id when the proposal carries one', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ enabled: false }} ruleId="rule-1" />);

      expect(screen.getByTestId('pndProposedRuleChangeRuleId')).toHaveTextContent('rule-1');
    });

    it('omits the rule name element when there is no name', () => {
      renderWithPndProviders(<ProposedRuleChange change={{ enabled: false }} />);

      expect(screen.queryByTestId('pndProposedRuleChangeRuleName')).not.toBeInTheDocument();
    });
  });

  describe('describeRuleChange', () => {
    it('returns one description per permitted field', () => {
      const described = describeRuleChange({ enabled: false, note: 'Guide.' });

      expect(described.permitted.map(({ field }) => field)).toEqual(['enabled', 'note']);
    });

    it('returns the fields outside the permitted set', () => {
      const described = describeRuleChange({ alert_suppression: {}, threshold: {} });

      expect(described.unsupported).toEqual(['alert_suppression', 'threshold']);
    });

    it('reports an empty change as having nothing to apply', () => {
      const described = describeRuleChange({});

      expect(described.permitted).toEqual([]);
      expect(described.unsupported).toEqual([]);
    });

    it('ignores an explicitly undefined permitted field rather than describing it', () => {
      const described = describeRuleChange({ enabled: undefined, note: 'Guide.' });

      expect(described.permitted.map(({ field }) => field)).toEqual(['note']);
    });
  });
});
