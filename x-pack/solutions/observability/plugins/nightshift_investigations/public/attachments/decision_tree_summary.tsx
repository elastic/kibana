/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { AttachmentSummaryGroup, AttachmentSummaryRow } from '@kbn/agentic-investigations-common';
import type { DecisionTreeAttachmentData } from '../../common/decision_trees';
import { decisionTreeLabel } from './decision_tree_label';

const DECISION_TREES_TITLE = i18n.translate(
  'xpack.nightshiftInvestigations.decisionTreeAttachment.summaryTitle',
  { defaultMessage: 'Decision trees' }
);

const DECISION_TREE_TYPE_NAME = i18n.translate(
  'xpack.nightshiftInvestigations.decisionTreeAttachment.typeName',
  { defaultMessage: 'Decision tree' }
);

const OPEN_IN_MANAGEMENT = i18n.translate(
  'xpack.nightshiftInvestigations.decisionTreeAttachment.openInManagement',
  { defaultMessage: 'Open in decision tree management' }
);

/** The tree as a row of the investigation flyout's attachment summary, opening its management page. */
export const DecisionTreeSummary: React.FC<{
  data: DecisionTreeAttachmentData;
  onOpen: () => void;
}> = ({ data, onOpen }) => (
  <AttachmentSummaryGroup
    title={DECISION_TREES_TITLE}
    rows={[
      <AttachmentSummaryRow
        key={data.tree_id}
        label={decisionTreeLabel(data)}
        typeName={DECISION_TREE_TYPE_NAME}
        iconType="branch"
        onClick={onOpen}
      />,
    ]}
  />
);

/** The tree inline in the chat: its name and version, and a link to its management page. */
export const DecisionTreeInline: React.FC<{
  data: DecisionTreeAttachmentData;
  href: string | undefined;
}> = ({ data, href }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{decisionTreeLabel(data)}</strong>
      </EuiText>
    </EuiFlexItem>
    {href && (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="popout"
          href={href}
          data-test-subj="nightshiftDecisionTreeAttachmentOpen"
        >
          {OPEN_IN_MANAGEMENT}
        </EuiButtonEmpty>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
