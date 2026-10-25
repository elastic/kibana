/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
    const [yaml, setYaml] = useState(PHISHING_EMAIL_YAML);
    const resetYaml = useCallback(() => setYaml(PHISHING_EMAIL_YAML), []);

    const tabs: EuiTabbedContentTab[] = useMemo(
      () => [
        {
          id: 'translation',
          name: i18n.TRANSLATION_TAB,
          content: <TranslationTab yaml={yaml} />,
        },
        {
          id: 'summary',
          name: i18n.SUMMARY_TAB,
          content: <SummaryTab />,
        },
      ],
      [yaml]
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
                  <EuiButtonEmpty onClick={resetYaml}>{i18n.RESET_YAML}</EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="save" onClick={onClose}>
                    {i18n.SAVE_AS_WORKFLOW}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton fill iconType="play" onClick={onClose}>
                    {i18n.SAVE_AND_RUN}
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
