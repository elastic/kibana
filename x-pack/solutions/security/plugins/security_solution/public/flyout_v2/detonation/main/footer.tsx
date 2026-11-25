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
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { useFlowVariant } from '../flow_variant';
import * as i18n from '../translations';

export const DETONATION_FOOTER_TEST_ID = 'detonationReportFooter';
export const DETONATION_TAKE_ACTION_TEST_ID = 'detonationReportTakeAction';

/**
 * "Take action" menu of the report (Flow modal): response actions for the detonated file.
 * Prototype: the actions only close the menu.
 */
const TakeAction = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

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
            name: (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{i18n.OPEN_GH_ISSUE}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="sparkles"
                    size="m"
                    color="accent"
                    title={i18n.AI_GENERATED_ACTION}
                    data-test-subj="detonationActionAiIcon"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            icon: 'logoGithub',
            onClick: close,
            'data-test-subj': 'detonationActionOpenGhIssue',
          },
        ],
      },
    ],
    [close]
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
