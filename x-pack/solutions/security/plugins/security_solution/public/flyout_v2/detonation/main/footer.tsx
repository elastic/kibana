/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButton,
  EuiContextMenu,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { REPORT, VERDICT_REASONS, AI_SUMMARY_HIGHLIGHTS } from '../report_data';
import { useFlowVariant } from '../flow_variant';
import * as i18n from '../translations';

const getAgentPrompt = (verdict: string, ruleName: string) =>
  verdict === 'Benign'
    ? `Help me open a GH ticket to inform the Detections team so they can fine tune this rule: ${ruleName}`
    : `Help me notify the Trade team so they can turn on this rule: ${ruleName} to prevent malicious behavior`;

const getReportText = () =>
  [
    `Detonation report for ${REPORT.fileName}`,
    `SHA-256: ${REPORT.sha256}`,
    `Verdict: ${REPORT.verdict} (threat score ${REPORT.score}/100)`,
    `Rule: ${REPORT.ruleName}`,
    '',
    ...AI_SUMMARY_HIGHLIGHTS.map(({ title, text }) => `${title}: ${text}`),
    '',
    'Why this verdict:',
    ...VERDICT_REASONS.map((r) => `- [${r.severity}] ${r.title} (+${r.points})`),
  ].join('\n');

export const DETONATION_FOOTER_TEST_ID = 'detonationReportFooter';
export const DETONATION_TAKE_ACTION_TEST_ID = 'detonationReportTakeAction';

/**
 * "Take action" menu of the report (Flow modal): response actions for the detonated file.
 * Prototype: the actions only close the menu.
 */
const TakeAction = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const { agentBuilder, http } = useKibana().services;
  const ruleUrl = `${window.location.origin}${http.basePath.prepend(
    `/app/security/rules/id/${REPORT.ruleId}`
  )}`;

  // Opens a new AI Agent conversation with the detonation report attached and a prompt that
  // depends on the verdict.
  const openAgentChat = useCallback(() => {
    agentBuilder?.openChat?.({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: getAgentPrompt(REPORT.verdict, `[${REPORT.ruleName}](${ruleUrl})`),
      attachments: [
        {
          id: `${SecurityAgentBuilderAttachments.detonation}-${REPORT.reportId}`,
          type: SecurityAgentBuilderAttachments.detonation,
          data: {
            attachmentLabel: `${REPORT.fileName} · ${i18n.DETONATION_REPORT_TITLE}`,
            report: getReportText(),
          },
        },
      ],
      sessionTag: 'security',
    });
  }, [agentBuilder, ruleUrl]);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.ISOLATE_HOST,
            icon: 'lock',
            onClick: close,
            'data-test-subj': 'detonationActionIsolateHost',
          },
          {
            name: i18n.ADD_TO_NEW_CASE,
            icon: 'briefcase',
            onClick: close,
            'data-test-subj': 'detonationActionAddToCase',
          },
          {
            name: i18n.OPEN_GH_ISSUE,
            icon: 'productAgent',
            onClick: () => {
              close();
              openAgentChat();
            },
            'data-test-subj': 'detonationActionOpenGhIssue',
          },
        ],
      },
    ],
    [close, openAgentChat]
  );

  return (
    <EuiPopover
      aria-label={i18n.TAKE_ACTION}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="upRight"
      panelPaddingSize="none"
      button={
        <EuiButton
          fill
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={DETONATION_TAKE_ACTION_TEST_ID}
        >
          {i18n.TAKE_ACTION}
        </EuiButton>
      }
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        data-test-subj="detonationTakeActionMenu"
      />
    </EuiPopover>
  );
});
TakeAction.displayName = 'TakeAction';

/**
 * Footer of the detonation report flyout. Flow modal shows a "Take action" menu; Flow toast keeps
 * the "Open full report" button.
 */
export const Footer = memo(() => {
  const flowVariant = useFlowVariant();

  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      responsive={false}
      data-test-subj={DETONATION_FOOTER_TEST_ID}
    >
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={window.location.href}>
          {(copy) => (
            <EuiButton onClick={copy} data-test-subj="detonationReportCopyPermalink">
              {i18n.COPY_PERMALINK}
            </EuiButton>
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {flowVariant === 'modal' ? (
          <TakeAction />
        ) : (
          <EuiButton fill data-test-subj="detonationReportOpenFull">
            {i18n.OPEN_FULL_REPORT}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

Footer.displayName = 'Footer';
