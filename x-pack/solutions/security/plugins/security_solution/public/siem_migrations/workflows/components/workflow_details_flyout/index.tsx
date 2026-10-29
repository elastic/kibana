/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTabbedContent,
  type EuiTabbedContentTab,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { PHISHING_EMAIL_YAML } from '../../common/workflow_content';
import { TranslationTab } from './translation_tab';
import { SummaryTab } from './summary_tab';
import * as i18n from './translations';

export interface WorkflowDetailsFlyoutProps {
  onClose: () => void;
}

export const WorkflowDetailsFlyout: React.FC<WorkflowDetailsFlyoutProps> = React.memo(
  ({ onClose }) => {
    const titleId = useGeneratedHtmlId({ prefix: 'workflowDetailsFlyoutTitle' });

    const tabs: EuiTabbedContentTab[] = useMemo(
      () => [
        {
          id: 'translation',
          name: i18n.TRANSLATION_TAB,
          content: <TranslationTab yaml={PHISHING_EMAIL_YAML} />,
        },
        {
          id: 'summary',
          name: i18n.SUMMARY_TAB,
          content: <SummaryTab />,
        },
      ],
      []
    );

    return (
      <EuiFlyout
        onClose={onClose}
        size="l"
        aria-labelledby={titleId}
        data-test-subj="workflowDetailsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{i18n.FLYOUT_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.SOURCE_SUBTITLE}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="workflow" onClick={onClose}>
                    {i18n.INSTALL_AND_EDIT}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={onClose}>
                    {i18n.INSTALL}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
WorkflowDetailsFlyout.displayName = 'WorkflowDetailsFlyout';
