/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

import { SAVE_BUTTON_LABEL } from '../../../../../shared/constants';
import { docLinks } from '../../../../../shared/doc_links';
import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV, RESET_BUTTON } from '../../../../constants';
import {
  SYNC_MANAGEMENT_CONTENT_EXTRACTION_LABEL,
  SYNC_MANAGEMENT_THUMBNAILS_LABEL,
  SYNC_MANAGEMENT_THUMBNAILS_GLOBAL_CONFIG_LABEL,
  SOURCE_ASSETS_AND_OBJECTS_DESCRIPTION,
  SOURCE_ASSETS_AND_OBJECTS_ASSETS_LABEL,
  SYNC_UNSAVED_CHANGES_MESSAGE,
  SOURCE_ASSETS_AND_OBJECTS_LEARN_MORE_LINK,
  SOURCE_ASSETS_AND_OBJECTS_OBJECTS_LABEL,
} from '../../constants';
import { SourceLogic } from '../../source_logic';
import { SourceLayout } from '../source_layout';

import { IndexingRulesTable } from './indexing_rules_table';
import { SynchronizationLogic } from './synchronization_logic';

export const AssetsAndObjects: React.FC = () => {
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { thumbnailsChecked, contentExtractionChecked, hasUnsavedAssetsAndObjectsChanges } =
    useValues(SynchronizationLogic({ contentSource }));
  const {
    setThumbnailsChecked,
    setContentExtractionChecked,
    updateAssetsAndObjectsSettings,
    resetSyncSettings,
  } = useActions(SynchronizationLogic({ contentSource }));

  const { areThumbnailsConfigEnabled } = contentSource;

  const actions = (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButton
          fill
          onClick={updateAssetsAndObjectsSettings}
          disabled={!hasUnsavedAssetsAndObjectsChanges}
        >
          {SAVE_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty onClick={resetSyncSettings} disabled={!hasUnsavedAssetsAndObjectsChanges}>
          {RESET_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <SourceLayout
      pageChrome={[NAV.SYNCHRONIZATION_ASSETS_AND_OBJECTS]}
      pageViewTelemetry="source_synchronization"
      isLoading={dataLoading}
    >
      <UnsavedChangesPrompt
        hasUnsavedChanges={hasUnsavedAssetsAndObjectsChanges}
        messageText={SYNC_UNSAVED_CHANGES_MESSAGE}
      />
      <ViewContentHeader title={NAV.SYNCHRONIZATION_ASSETS_AND_OBJECTS} action={actions} />
      {SOURCE_ASSETS_AND_OBJECTS_DESCRIPTION}
      <EuiSpacer />
      <EuiLink href={docLinks.workplaceSearchSynch} external>
        {SOURCE_ASSETS_AND_OBJECTS_LEARN_MORE_LINK}
      </EuiLink>
      <EuiHorizontalRule />
      <EuiTitle size="s">
        <h3>{SOURCE_ASSETS_AND_OBJECTS_ASSETS_LABEL}</h3>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            checked={thumbnailsChecked}
            onChange={(e) => setThumbnailsChecked(e.target.checked)}
            label={
              areThumbnailsConfigEnabled
                ? SYNC_MANAGEMENT_THUMBNAILS_LABEL
                : SYNC_MANAGEMENT_THUMBNAILS_GLOBAL_CONFIG_LABEL
            }
            disabled={!areThumbnailsConfigEnabled}
            data-test-subj="ThumbnailsToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            checked={contentExtractionChecked}
            onChange={(e) => setContentExtractionChecked(e.target.checked)}
            label={SYNC_MANAGEMENT_CONTENT_EXTRACTION_LABEL}
            data-test-subj="ContentExtractionToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiTitle size="s">
        <h3>{SOURCE_ASSETS_AND_OBJECTS_OBJECTS_LABEL}</h3>
      </EuiTitle>
      <EuiFlexGroup>
        <EuiFlexItem>
          <IndexingRulesTable />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SourceLayout>
  );
};
