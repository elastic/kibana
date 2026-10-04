/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import { SiemMigrationsIcon } from '../../../common/icon';
import { START_MIGRATION_TITLE_CLASS_NAME } from '../../../common/styles';
import { useUploadPanelStyles } from '../../../common/styles/upload_panel.styles';
import { useMigrationDataInputContext, MigrationsReadMore } from '../../../common/components';
import * as i18n from './translations';

export interface UploadWorkflowsPanelProps {
  isUploadMore?: boolean;
  isDisabled?: boolean;
}

export interface UploadWorkflowsSectionPanelProps extends UploadWorkflowsPanelProps {
  onOpenFlyout?: React.MouseEventHandler;
}

export const UploadWorkflowsSectionPanel = React.memo<UploadWorkflowsSectionPanelProps>(
  function UploadWorkflowsSectionPanel({
    isUploadMore = false,
    isDisabled = false,
    onOpenFlyout,
  }) {
    const styles = useUploadPanelStyles(isUploadMore);

    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize={isUploadMore ? 'm' : 'l'}>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          className={styles}
          gutterSize={isUploadMore ? 'm' : 'l'}
        >
          <EuiFlexItem grow={false}>
            <SiemMigrationsIcon className="siemMigrationsIcon" />
          </EuiFlexItem>
          <EuiFlexItem>
            {isUploadMore ? (
              <EuiText size="s" className={START_MIGRATION_TITLE_CLASS_NAME}>
                <p>{i18n.START_WORKFLOW_MIGRATION_CARD_UPLOAD_MORE_TITLE}</p>
              </EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="m" className={START_MIGRATION_TITLE_CLASS_NAME}>
                    <p>{i18n.START_WORKFLOW_MIGRATION_CARD_UPLOAD_TITLE}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>{i18n.START_WORKFLOW_MIGRATION_CARD_UPLOAD_DESCRIPTION}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <MigrationsReadMore migrationType="workflow" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isUploadMore ? (
              <EuiButtonEmpty
                data-test-subj="startWorkflowMigrationUploadMoreButton"
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_WORKFLOW_MIGRATION_CARD_UPLOAD_MORE_BUTTON}
              </EuiButtonEmpty>
            ) : (
              <EuiButton
                data-test-subj="startWorkflowMigrationUploadButton"
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_WORKFLOW_MIGRATION_CARD_UPLOAD_BUTTON}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

export const UploadWorkflowsPanel = React.memo<UploadWorkflowsPanelProps>(
  function UploadWorkflowsPanel({ isUploadMore = false, isDisabled = false }) {
    const { openFlyout } = useMigrationDataInputContext();

    const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
      openFlyout();
    }, [openFlyout]);

    return (
      <UploadWorkflowsSectionPanel
        isUploadMore={isUploadMore}
        isDisabled={isDisabled}
        onOpenFlyout={onOpenFlyout}
      />
    );
  }
);

UploadWorkflowsPanel.displayName = 'UploadWorkflowsPanel';
