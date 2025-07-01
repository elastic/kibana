/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSelect,
  EuiTitle,
  useEuiTheme,
  type EuiButtonGroupOptionProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PlaygroundHeaderDocs } from './playground_header_docs';
import { Toolbar } from './toolbar';
import { PlaygroundPageMode, PlaygroundViewMode } from '../types';
import { useSearchPlaygroundFeatureFlag } from '../hooks/use_search_playground_feature_flag';

interface HeaderProps {
  pageMode: PlaygroundPageMode;
  viewMode: PlaygroundViewMode;
  showDocs?: boolean;
  onModeChange: (mode: PlaygroundViewMode) => void;
  onSelectPageModeChange: (mode: PlaygroundPageMode) => void;
  isActionsDisabled?: boolean;
  playgroundName?: string;
  hasChanges?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageMode,
  viewMode,
  onModeChange,
  showDocs = false,
  isActionsDisabled = false,
  onSelectPageModeChange,
  playgroundName,
  hasChanges,
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
      data-test-subj="chat-playground-home-page"
    >
      <EuiPageHeaderSection>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {playgroundName === undefined ? (
            <EuiTitle
              css={{ whiteSpace: 'nowrap' }}
              data-test-subj="chat-playground-home-page-title"
              size="xs"
            >
              <h2>
                <FormattedMessage
                  id="xpack.searchPlayground.pageTitle"
                  defaultMessage="Playground"
                />
              </h2>
            </EuiTitle>
          ) : (
            <EuiTitle css={{ whiteSpace: 'nowrap' }} data-test-subj="playgroundName" size="xs">
              <h2>{playgroundName}</h2>
            </EuiTitle>
          )}

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
          {isSearchModeEnabled && playgroundName !== undefined && hasChanges ? (
            <EuiBadge color="warning">
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
        <EuiFlexGroup alignItems="center">
          {showDocs && <PlaygroundHeaderDocs />}
          <Toolbar selectedPageMode={pageMode} />
        </EuiFlexGroup>
      </EuiPageHeaderSection>
    </EuiPageTemplate.Header>
  );
};
