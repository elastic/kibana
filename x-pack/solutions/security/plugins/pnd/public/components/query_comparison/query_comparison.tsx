/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import * as i18n from './translations';

export interface QueryComparisonProps {
  /** The rule's query as it stands today, when the watch could read it. */
  currentQuery?: string;
  /** The rewrite the tuning proposes. Absent for every tuning that is not a query change. */
  proposedQuery?: string;
}

const asQuery = (value: string | undefined): string | undefined =>
  value != null && value.trim().length > 0 ? value : undefined;

interface QuerySideProps {
  label: string;
  query: string;
  testSubj: string;
}

const QuerySide: React.FC<QuerySideProps> = ({ label, query, testSubj }) => (
  <>
    <EuiText color="subdued" size="xs">
      <strong>{label}</strong>
    </EuiText>
    <EuiCodeBlock
      data-test-subj={testSubj}
      fontSize="s"
      isCopyable
      language="text"
      paddingSize="s"
      transparentBackground={false}
    >
      {query}
    </EuiCodeBlock>
  </>
);

/**
 * The rule query as it stands beside the rewrite a tuning proposes.
 *
 * This is the evidence that made `query` tunable at all. The other three tunable fields are their own
 * description — "Disable rule" says what approving does — but a rewritten query is only judgeable
 * against the query it replaces, so the two are always shown together and the query is never
 * summarized or truncated here.
 *
 * Rendered only when there **is** a proposed query: a tuning that changes an investigation guide has
 * no query diff to show, and printing the rule's current query beside nothing would read as though a
 * query change were on the table. Two degradations are stated rather than hidden:
 *
 * - the current query could not be read (the rule fetch failed, and the drafting agent named no
 *   starting query either), so the rewrite is shown with an explicit warning that there is nothing to
 *   compare it against — never as a diff against an empty string, which would read as "this rule
 *   currently matches nothing";
 * - the rewrite is byte-identical to the current query, which is a no-op an approver would otherwise
 *   have to spot by eye.
 */
export const QueryComparison: React.FC<QueryComparisonProps> = ({
  currentQuery,
  proposedQuery,
}) => {
  const proposed = asQuery(proposedQuery);

  if (proposed == null) {
    return null;
  }

  const current = asQuery(currentQuery);

  return (
    <div data-test-subj="pndQueryComparison">
      <EuiTitle size="xxs">
        <h4>{i18n.TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {current == null ? (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="pndQueryComparisonUnknownCurrent"
            iconType="warning"
            size="s"
            text={<p>{i18n.UNKNOWN_CURRENT_BODY}</p>}
            title={i18n.UNKNOWN_CURRENT_TITLE}
          />
          <EuiSpacer size="xs" />
        </>
      ) : null}
      {current != null && current === proposed ? (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="pndQueryComparisonIdentical"
            iconType="warning"
            size="s"
            text={<p>{i18n.IDENTICAL_BODY}</p>}
            title={i18n.IDENTICAL_TITLE}
          />
          <EuiSpacer size="xs" />
        </>
      ) : null}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {current != null ? (
          <EuiFlexItem>
            <QuerySide label={i18n.CURRENT} query={current} testSubj="pndQueryComparisonCurrent" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <QuerySide label={i18n.PROPOSED} query={proposed} testSubj="pndQueryComparisonProposed" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
