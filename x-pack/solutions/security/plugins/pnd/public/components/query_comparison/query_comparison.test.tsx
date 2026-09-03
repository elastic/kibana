/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { QueryComparison } from './query_comparison';

const currentQuery = 'process.name : "powershell.exe"';
const proposedQuery = 'process.name : "powershell.exe" and not user.name : "svc-backup"';

const defaultProps = {
  currentQuery,
  proposedQuery,
};

describe('QueryComparison', () => {
  describe('a proposal with no query rewrite', () => {
    it('renders nothing when no query is proposed', () => {
      renderWithPndProviders(<QueryComparison currentQuery={currentQuery} />);

      expect(screen.queryByTestId('pndQueryComparison')).not.toBeInTheDocument();
    });

    it('renders nothing when the proposed query is only whitespace', () => {
      renderWithPndProviders(<QueryComparison {...defaultProps} proposedQuery="   " />);

      expect(screen.queryByTestId('pndQueryComparison')).not.toBeInTheDocument();
    });

    // Printing the rule's query beside nothing would read as though a query change were on the table.
    it('does not render the rule query as it stands when nothing proposes to change it', () => {
      renderWithPndProviders(<QueryComparison currentQuery={currentQuery} />);

      expect(screen.queryByTestId('pndQueryComparisonCurrent')).not.toBeInTheDocument();
    });
  });

  describe('both queries present', () => {
    it('renders the rule query as it stands', () => {
      renderWithPndProviders(<QueryComparison {...defaultProps} />);

      expect(screen.getByTestId('pndQueryComparisonCurrent')).toHaveTextContent(
        'process.name : "powershell.exe"'
      );
    });

    it('renders the proposed query', () => {
      renderWithPndProviders(<QueryComparison {...defaultProps} />);

      expect(screen.getByTestId('pndQueryComparisonProposed')).toHaveTextContent(
        'not user.name : "svc-backup"'
      );
    });

    // A rewrite is only judgeable against the query it replaces, so it is never abbreviated here.
    it('renders the proposed query in full rather than a summary of it', () => {
      const long = `${proposedQuery} and ${'a'.repeat(2000)}`;

      renderWithPndProviders(<QueryComparison {...defaultProps} proposedQuery={long} />);

      expect(screen.getByTestId('pndQueryComparisonProposed')).toHaveTextContent(long);
    });

    it('does not warn that the current query could not be read', () => {
      renderWithPndProviders(<QueryComparison {...defaultProps} />);

      expect(screen.queryByTestId('pndQueryComparisonUnknownCurrent')).not.toBeInTheDocument();
    });

    it('does not warn that the two queries are identical', () => {
      renderWithPndProviders(<QueryComparison {...defaultProps} />);

      expect(screen.queryByTestId('pndQueryComparisonIdentical')).not.toBeInTheDocument();
    });
  });

  describe('the rule query as it stands could not be read', () => {
    it('warns that there is nothing to compare the rewrite against', () => {
      renderWithPndProviders(<QueryComparison proposedQuery={proposedQuery} />);

      expect(screen.getByTestId('pndQueryComparisonUnknownCurrent')).toBeInTheDocument();
    });

    it('still renders the proposed query', () => {
      renderWithPndProviders(<QueryComparison proposedQuery={proposedQuery} />);

      expect(screen.getByTestId('pndQueryComparisonProposed')).toHaveTextContent(
        'not user.name : "svc-backup"'
      );
    });

    // An empty code block would read as "this rule currently matches nothing".
    it('renders no current side rather than an empty one', () => {
      renderWithPndProviders(<QueryComparison proposedQuery={proposedQuery} />);

      expect(screen.queryByTestId('pndQueryComparisonCurrent')).not.toBeInTheDocument();
    });

    it('treats a whitespace-only current query as unreadable', () => {
      renderWithPndProviders(<QueryComparison currentQuery="  " proposedQuery={proposedQuery} />);

      expect(screen.getByTestId('pndQueryComparisonUnknownCurrent')).toBeInTheDocument();
    });

    it('tells the approver to open the rule to read its current query', () => {
      renderWithPndProviders(<QueryComparison proposedQuery={proposedQuery} />);

      expect(screen.getByTestId('pndQueryComparisonUnknownCurrent')).toHaveTextContent(
        /open the rule/i
      );
    });
  });

  describe('the rewrite changes nothing', () => {
    it('warns when the proposed query is identical to the current one', () => {
      renderWithPndProviders(
        <QueryComparison currentQuery={currentQuery} proposedQuery={currentQuery} />
      );

      expect(screen.getByTestId('pndQueryComparisonIdentical')).toBeInTheDocument();
    });

    it('says approving would change nothing about which documents the rule matches', () => {
      renderWithPndProviders(
        <QueryComparison currentQuery={currentQuery} proposedQuery={currentQuery} />
      );

      expect(screen.getByTestId('pndQueryComparisonIdentical')).toHaveTextContent(
        /changes nothing/i
      );
    });

    it('still renders both sides so the approver can see what was compared', () => {
      renderWithPndProviders(
        <QueryComparison currentQuery={currentQuery} proposedQuery={currentQuery} />
      );

      expect(screen.getByTestId('pndQueryComparisonCurrent')).toBeInTheDocument();
    });
  });
});
