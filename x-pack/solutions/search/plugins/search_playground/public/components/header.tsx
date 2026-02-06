/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSelect,
  EuiTitle,
  type EuiButtonGroupOptionProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useSearchPlaygroundFeatureFlag } from '../hooks/use_search_playground_feature_flag';
import { PlaygroundPageMode, PlaygroundViewMode } from '../types';
import { PlaygroundHeaderDocs } from './playground_header_docs';
import { SaveNewPlaygroundButton } from './save_new_playground_button';
import { Toolbar } from './toolbar';

interface HeaderProps {
  pageMode: PlaygroundPageMode;
  viewMode: PlaygroundViewMode;
  showDocs?: boolean;
  onModeChange: (mode: PlaygroundViewMode) => void;
  onSelectPageModeChange: (mode: PlaygroundPageMode) => void;
  isActionsDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageMode,
  viewMode,
  onModeChange,
  showDocs = false,
  isActionsDisabled = false,
  onSelectPageModeChange,
}) => {
  const isSearchModeEnabled = useSearchPlaygroundFeatureFlag();
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
      css={({ euiTheme }) => ({
        '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' },
        backgroundColor: euiTheme.colors.emptyShade,
      })}
      data-test-subj="chat-playground-home-page"
      paddingSize="s"
    >
      <EuiPageHeaderSection>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiTitle
            css={{ whiteSpace: 'nowrap' }}
            data-test-subj="chat-playground-home-page-title"
            size="xs"
          >
            <h2>
              <FormattedMessage
                id="xpack.searchPlayground.unsaved.pageTitle"
                defaultMessage="Unsaved playground"
              />
            </h2>
          </EuiTitle>

          {isSearchModeEnabled && (
            <EuiSelect
              data-test-subj="page-mode-select"
              options={[
                { value: PlaygroundPageMode.Chat, text: 'Chat' },
                { value: PlaygroundPageMode.Search, text: 'Search' },
              ]}
              value={pageMode}
              aria-label={i18n.translate('xpack.searchPlayground.header.pageModeSelectAriaLabel', {
                defaultMessage: 'Page mode',
              })}
              onChange={(e) => onSelectPageModeChange(e.target.value as PlaygroundPageMode)}
            />
          )}
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
      <EuiPageHeaderSection
        css={({ euiTheme }) => ({
          paddingRight: euiTheme.size.s,
        })}
      >
        <EuiFlexGroup alignItems="center">
          {showDocs && <PlaygroundHeaderDocs />}
          <Toolbar selectedPageMode={pageMode} />
          <SaveNewPlaygroundButton disabled={isActionsDisabled} />
        </EuiFlexGroup>
      </EuiPageHeaderSection>
    </EuiPageTemplate.Header>
  );
};
