/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSelect,
  useEuiTheme,
  type EuiButtonGroupOptionProps,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DataActionButton } from '../data_action_button';
import { ViewCodeAction } from '../view_code/view_code_action';
import { PlaygroundPageMode, PlaygroundViewMode } from '../../types';
import { useSearchPlaygroundFeatureFlag } from '../../hooks/use_search_playground_feature_flag';

import { PlaygroundMoreOptionsMenu } from './playground_more_options';
import { PlaygroundName } from './playground_name';
import { SavedPlaygroundSaveButton } from './saved_button';

interface SavedPlaygroundHeaderProps {
  pageMode: PlaygroundPageMode;
  viewMode: PlaygroundViewMode;
  onModeChange: (mode: PlaygroundViewMode) => void;
  onSelectPageModeChange: (mode: PlaygroundPageMode) => void;
  isActionsDisabled?: boolean;
  playgroundName: string;
  hasChanges: boolean;
  onEditName: () => void;
  onDeletePlayground: () => void;
  onCopyPlayground: () => void;
}

export const SavedPlaygroundHeader: React.FC<SavedPlaygroundHeaderProps> = ({
  pageMode,
  viewMode,
  onModeChange,
  isActionsDisabled = false,
  onSelectPageModeChange,
  playgroundName,
  hasChanges,
  onEditName,
  onDeletePlayground,
  onCopyPlayground,
}) => {
  const isSearchModeEnabled = useSearchPlaygroundFeatureFlag();
  const { euiTheme } = useEuiTheme();
  const options: Array<EuiButtonGroupOptionProps & { id: PlaygroundViewMode }> = [
    {
      id: PlaygroundViewMode.preview,
      label:
        pageMode === PlaygroundPageMode.chat
          ? i18n.translate('xpack.searchPlayground.header.view.chat', {
              defaultMessage: 'Chat',
            })
          : i18n.translate('xpack.searchPlayground.header.view.preview', {
              defaultMessage: 'Preview',
            }),
      'data-test-subj': 'chatMode',
    },
    {
      id: PlaygroundViewMode.query,
      label: i18n.translate('xpack.searchPlayground.header.view.query', {
        defaultMessage: 'Query',
      }),
      'data-test-subj': 'queryMode',
    },
  ];

  return (
    <EuiPageTemplate.Header
      css={{
        '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' },
        backgroundColor: euiTheme.colors.emptyShade,
      }}
      paddingSize="s"
      data-test-subj="saved-playground-header"
    >
      <EuiPageHeaderSection>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <PlaygroundName playgroundName={playgroundName} onEditName={onEditName} />
          {isSearchModeEnabled && (
            <EuiSelect
              data-test-subj="page-mode-select"
              options={[
                { value: PlaygroundPageMode.Chat, text: 'Chat' },
                { value: PlaygroundPageMode.Search, text: 'Search' },
              ]}
              value={pageMode}
              onChange={(e) => onSelectPageModeChange(e.target.value as PlaygroundPageMode)}
            />
          )}
          {hasChanges ? (
            <EuiBadge color="warning" data-test-subj="playground-unsaved-changes-badge">
              <FormattedMessage
                id="xpack.searchPlayground.header.unsavedChangesBadge"
                defaultMessage="Unsaved changes"
              />
            </EuiBadge>
          ) : null}
        </EuiFlexGroup>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiButtonGroup
          legend="viewMode"
          options={options}
          idSelected={viewMode}
          onChange={(id: string) => onModeChange(id as PlaygroundViewMode)}
          buttonSize="compressed"
          isDisabled={isActionsDisabled}
          data-test-subj="viewModeSelector"
        />
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="playground-header-actions">
          <DataActionButton />
          <EuiSpacer css={css({ borderLeft: euiTheme.border.thin })} />
          <ViewCodeAction selectedPageMode={pageMode} />
          <EuiSpacer />
          <SavedPlaygroundSaveButton hasChanges={hasChanges} />
          <PlaygroundMoreOptionsMenu onDeletePlayground={onDeletePlayground} />
        </EuiFlexGroup>
      </EuiPageHeaderSection>
    </EuiPageTemplate.Header>
  );
};
