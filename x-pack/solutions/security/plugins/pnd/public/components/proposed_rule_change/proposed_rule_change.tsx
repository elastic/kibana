/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { PND_TUNABLE_RULE_FIELDS } from '@kbn/pnd-common';
import type { PndTunableRuleField } from '@kbn/pnd-common';
import * as i18n from './translations';

/**
 * A model-authored rule change. The permitted fields are typed; the index
 * signature exists because the value really can carry anything, and a field
 * outside the permitted set has to be *shown to the approver as rejected* rather
 * than quietly dropped.
 */
export interface PndTunableRuleChange {
  enabled?: boolean;
  investigation_fields?: unknown;
  note?: string;
  query?: string;
  [field: string]: unknown;
}

export interface DescribedRuleChangeItem {
  /** Secondary line: the guide prose, the field names, the exception-list count. */
  detail?: string;
  field: PndTunableRuleField;
  /** The change in human terms, e.g. "Disable rule". */
  summary: string;
}

export interface DescribedRuleChange {
  permitted: DescribedRuleChangeItem[];
  /** Field names the server's allow-list will reject with a 400. */
  unsupported: string[];
}

/** Investigation guides can be long; the dialog shows the head of one. */
const MAX_NOTE_LENGTH = 500;

/**
 * A rewritten query is bounded at 20000 by the route's schema, which is far more than a
 * summary line can carry. This is the head of one; the side-by-side diff against the rule's
 * current query is the approval surface's job, not this summary's.
 */
const MAX_QUERY_LENGTH = 500;

const isTunableField = (field: string): field is PndTunableRuleField =>
  (PND_TUNABLE_RULE_FIELDS as readonly string[]).includes(field);

const describeEnabled = (value: unknown): DescribedRuleChangeItem => {
  if (typeof value !== 'boolean') {
    return { field: 'enabled', summary: i18n.ENABLED_UNCLEAR };
  }
  return { field: 'enabled', summary: value ? i18n.ENABLE_RULE : i18n.DISABLE_RULE };
};

const investigationFieldNames = (value: unknown): string | undefined => {
  const fieldNames = (value as { field_names?: unknown } | undefined)?.field_names;

  if (!Array.isArray(fieldNames)) {
    return undefined;
  }

  const names = fieldNames.filter((name): name is string => typeof name === 'string');

  return names.length > 0 ? i18n.investigationFieldNames(names.join(', ')) : undefined;
};

const describeInvestigationFields = (value: unknown): DescribedRuleChangeItem => ({
  detail: investigationFieldNames(value),
  field: 'investigation_fields',
  summary: i18n.UPDATE_INVESTIGATION_FIELDS,
});

const describeNote = (value: unknown): DescribedRuleChangeItem => ({
  detail:
    typeof value === 'string' && value.trim().length > 0
      ? value.slice(0, MAX_NOTE_LENGTH)
      : undefined,
  field: 'note',
  summary: i18n.UPDATE_INVESTIGATION_GUIDE,
});

/**
 * A query rewrite is the one tunable field that changes which documents match, so the
 * proposed query is always shown — an approver cannot judge "Update rule query" on its own.
 */
const describeQuery = (value: unknown): DescribedRuleChangeItem => ({
  detail:
    typeof value === 'string' && value.trim().length > 0
      ? value.slice(0, MAX_QUERY_LENGTH)
      : undefined,
  field: 'query',
  summary: i18n.UPDATE_RULE_QUERY,
});

/**
 * The switch is exhaustive over `PndTunableRuleField` on purpose: widening
 * `PND_TUNABLE_RULE_FIELDS` in `@kbn/pnd-common` fails this type check rather than
 * rendering a blank item for the new field.
 */
const describeField = (field: PndTunableRuleField, value: unknown): DescribedRuleChangeItem => {
  switch (field) {
    case 'enabled':
      return describeEnabled(value);
    case 'investigation_fields':
      return describeInvestigationFields(value);
    case 'note':
      return describeNote(value);
    case 'query':
      return describeQuery(value);
  }
};

/**
 * Splits a proposed change into what PND may apply, described in human terms, and
 * what the server's allow-list will reject. Permitted items come back in
 * `PND_TUNABLE_RULE_FIELDS` order, so the same change always reads the same way.
 */
export const describeRuleChange = (change: PndTunableRuleChange = {}): DescribedRuleChange => ({
  permitted: PND_TUNABLE_RULE_FIELDS.filter((field) => change[field] !== undefined).map((field) =>
    describeField(field, change[field])
  ),
  unsupported: Object.keys(change).filter(
    (field) => !isTunableField(field) && change[field] !== undefined
  ),
});

export interface ProposedRuleChangeProps {
  change?: PndTunableRuleChange;
  ruleId?: string;
  ruleName?: string;
}

/**
 * The change a tuning proposal would make to a detection rule, in human terms.
 *
 * This is what the `await_apply_tuning` approver is authorizing — a write to a
 * production detection rule — so it never renders raw JSON, and a field outside
 * the permitted set is shown as *will be rejected* rather than as a change.
 */
export const ProposedRuleChange: React.FC<ProposedRuleChangeProps> = ({
  change,
  ruleId,
  ruleName,
}) => {
  const { permitted, unsupported } = describeRuleChange(change);

  return (
    <div data-test-subj="pndProposedRuleChange">
      <EuiTitle size="xxs">
        <h4>{i18n.TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {ruleName != null ? (
        <EuiText data-test-subj="pndProposedRuleChangeRuleName" size="s">
          <strong>{ruleName}</strong>
        </EuiText>
      ) : null}
      {ruleId != null ? (
        <EuiText color="subdued" size="xs">
          {`${i18n.RULE_ID}: `}
          <code data-test-subj="pndProposedRuleChangeRuleId">{ruleId}</code>
        </EuiText>
      ) : null}
      {permitted.length === 0 && unsupported.length === 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="pndProposedRuleChangeEmpty"
            iconType="warning"
            size="s"
            text={<p>{i18n.EMPTY_BODY}</p>}
            title={i18n.EMPTY_TITLE}
          />
        </>
      ) : null}
      {permitted.map(({ detail, field, summary }) => (
        <React.Fragment key={field}>
          <EuiSpacer size="xs" />
          <EuiFlexGroup
            alignItems="flexStart"
            data-test-subj={`pndProposedRuleChangeItem-${field}`}
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="pencil" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{summary}</strong>
              </EuiText>
              {detail != null ? (
                <EuiText color="subdued" size="xs">
                  {detail}
                </EuiText>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      ))}
      {unsupported.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            announceOnMount
            color="danger"
            data-test-subj="pndProposedRuleChangeUnsupported"
            iconType="error"
            size="s"
            text={
              <p>
                {i18n.unsupportedBody(unsupported.join(', '), PND_TUNABLE_RULE_FIELDS.join(', '))}
              </p>
            }
            title={i18n.UNSUPPORTED_TITLE}
          />
        </>
      ) : null}
    </div>
  );
};
