/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiFlyoutProps,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import {
  CLOSE_BUTTON_LABEL,
  SUMMARY_TAB_LABEL,
} from '../../../common/components/details_flyout/translation';
import {
  ScrollableFlyoutTabbedContent,
  TabContentPadding,
} from '../../../common/components/details_flyout/utils';
import type { FlyoutPrevNextNavigation } from '../../../../common/flyout_prev_next_nav';
import { FlyoutPrevNextNav } from '../../../../common/flyout_prev_next_nav';
import { UpdatedByLabel } from '../../../common/components/updated_by_label';
import * as i18n from './translations';

export interface WorkflowMigrationDetailsFlyoutProps {
  migrationWorkflow: WorkflowMigrationWorkflow;
  closeFlyout: () => void;
  /** Goes to the previous and the next workflow of the table */
  navigation: FlyoutPrevNextNavigation;
  size?: EuiFlyoutProps['size'];
}

const TRANSLATION_TAB_ID = 'translation';
const SUMMARY_TAB_ID = 'summary';

/** Details of a translated workflow, the content of its tabs is not available yet */
export const WorkflowMigrationDetailsFlyout = React.memo(function WorkflowMigrationDetailsFlyout({
  migrationWorkflow,
  closeFlyout,
  navigation,
  size,
}: WorkflowMigrationDetailsFlyoutProps) {
  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: TRANSLATION_TAB_ID,
        name: i18n.TRANSLATION_TAB_LABEL,
        'data-test-subj': 'tabTranslation',
        content: <TabContentPadding />,
      },
      {
        id: SUMMARY_TAB_ID,
        name: SUMMARY_TAB_LABEL,
        'data-test-subj': 'tabSummary',
        content: <TabContentPadding />,
      },
    ],
    []
  );

  const [selectedTabId, setSelectedTabId] = useState<string>(TRANSLATION_TAB_ID);
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];
  const onTabClick = useCallback((tab: EuiTabbedContentTab) => setSelectedTabId(tab.id), []);

  const description =
    migrationWorkflow.elastic_workflow?.description ??
    migrationWorkflow.original_workflow.description;

  const titleId = useGeneratedHtmlId({ prefix: 'migrationWorkflowsFlyoutTitle' });

  return (
    <EuiFlyout
      size={size}
      onClose={closeFlyout}
      paddingSize="l"
      key="migration-workflow-flyout"
      aria-labelledby={titleId}
      data-test-subj="workflowDetailsFlyout"
    >
      <EuiFlyoutHeader>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" direction="row">
          <EuiFlexItem grow={false}>
            <FlyoutPrevNextNav navigation={navigation} isDisabled={false} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m" data-test-subj="detailsFlyoutTitle">
              <h2 id={titleId}>
                {migrationWorkflow.elastic_workflow?.title ||
                  migrationWorkflow.original_workflow.title}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <UpdatedByLabel
          updatedBy={migrationWorkflow.updated_by ?? migrationWorkflow.created_by}
          updatedAt={migrationWorkflow.updated_at ?? migrationWorkflow['@timestamp']}
        />
        {description && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued" data-test-subj="detailsFlyoutDescription">
              <p>{description}</p>
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ScrollableFlyoutTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={onTabClick}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={closeFlyout}
              flush="left"
              data-test-subj="detailsFlyoutCloseButton"
            >
              {CLOSE_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
