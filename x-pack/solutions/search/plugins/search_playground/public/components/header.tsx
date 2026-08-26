/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../../common/doc_links';
import { useKibana } from '../hooks/use_kibana';
import { LOCAL_STORAGE_KEY as PLAYGROUND_SESSION_LOCAL_STORAGE_KEY } from '../providers/unsaved_form_provider';
import type { PlaygroundForm } from '../types';
import { PlaygroundFormFields, PlaygroundPageMode, PlaygroundViewMode } from '../types';
import { hasSavedPlaygroundFormErrors } from '../utils/saved_playgrounds';
import { SelectIndicesFlyout } from './select_indices_flyout';
import { SavePlaygroundModal } from './saved_playground/save_playground_modal';
import { ViewCodeFlyout } from './view_code/view_code_flyout';
import { useShowFileUploadFlyout } from './upload_file_button';

interface HeaderProps {
  pageMode: PlaygroundPageMode;
  viewMode: PlaygroundViewMode;
  showDocs?: boolean;
  onModeChange: (mode: PlaygroundViewMode) => void;
  isActionsDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageMode,
  viewMode,
  onModeChange,
  showDocs = false,
  isActionsDisabled = false,
}) => {
  const { history } = useKibana().services;
  const {
    formState: { errors: formErrors },
  } = useFormContext<PlaygroundForm>();
  const selectedIndices = useWatch<PlaygroundForm, PlaygroundFormFields.indices>({
    name: PlaygroundFormFields.indices,
  });
  const hasNoIndices = !selectedIndices || selectedIndices.length === 0;
  const hasFormErrors = hasSavedPlaygroundFormErrors(formErrors);
  const showFileUploadFlyout = useShowFileUploadFlyout();

  const [showDataFlyout, setShowDataFlyout] = useState<boolean>(false);
  const [showViewCodeFlyout, setShowViewCodeFlyout] = useState<boolean>(false);
  const [showSavePlaygroundModal, setShowSavePlaygroundModal] = useState<boolean>(false);

  const onNavigateToNewPlayground = useCallback(
    (id: string) => {
      setShowSavePlaygroundModal(false);
      localStorage.removeItem(PLAYGROUND_SESSION_LOCAL_STORAGE_KEY);
      history.push(`/p/${id}/${PlaygroundPageMode.Chat}`);
    },
    [history]
  );

  const tabs = useMemo<AppHeaderTab[]>(
    () => [
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
        isSelected: viewMode === PlaygroundViewMode.preview,
        onClick: () => onModeChange(PlaygroundViewMode.preview),
        disabled: isActionsDisabled,
        'data-test-subj': 'chatMode',
      },
      {
        id: PlaygroundViewMode.query,
        label: i18n.translate('xpack.searchPlayground.header.view.query', {
          defaultMessage: 'Query',
        }),
        isSelected: viewMode === PlaygroundViewMode.query,
        onClick: () => onModeChange(PlaygroundViewMode.query),
        disabled: isActionsDisabled,
        'data-test-subj': 'queryMode',
      },
    ],
    [pageMode, viewMode, onModeChange, isActionsDisabled]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'data',
          label: i18n.translate('xpack.searchPlayground.dataActionButton', {
            defaultMessage: 'Data',
          }),
          iconType: 'database',
          run: () => setShowDataFlyout(true),
          disableButton: hasNoIndices,
          testId: 'dataSourceActionButton',
        },
        {
          id: 'export',
          label: i18n.translate('xpack.searchPlayground.export.actionButtonLabel', {
            defaultMessage: 'Export',
          }),
          iconType: 'export',
          run: () => setShowViewCodeFlyout(true),
          disableButton: hasNoIndices,
          testId: 'viewCodeActionButton',
        },
        {
          id: 'uploadFile',
          label: i18n.translate('xpack.searchPlayground.setupPage.uploadFileLabel', {
            defaultMessage: 'Upload file',
          }),
          iconType: 'plusCircle',
          overflow: true,
          run: showFileUploadFlyout,
          testId: 'uploadFileButton',
        },
      ],
      primaryActionItem: {
        id: 'save',
        label: i18n.translate('xpack.searchPlayground.header.saveButton.text', {
          defaultMessage: 'Save',
        }),
        iconType: 'save',
        run: () => setShowSavePlaygroundModal(true),
        disableButton: hasFormErrors || isActionsDisabled,
        testId: 'playground-save-button',
      },
    }),
    [hasNoIndices, hasFormErrors, isActionsDisabled, showFileUploadFlyout]
  );

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.searchPlayground.unsaved.pageTitle', {
          defaultMessage: 'Unsaved playground',
        })}
        tabs={tabs}
        menu={menu}
        docLink={showDocs ? docLinks.chatPlayground : undefined}
      />
      {showDataFlyout && <SelectIndicesFlyout onClose={() => setShowDataFlyout(false)} />}
      {showViewCodeFlyout && (
        <ViewCodeFlyout selectedPageMode={pageMode} onClose={() => setShowViewCodeFlyout(false)} />
      )}
      {showSavePlaygroundModal && (
        <SavePlaygroundModal
          onNavigateToNewPlayground={onNavigateToNewPlayground}
          onClose={() => setShowSavePlaygroundModal(false)}
        />
      )}
    </>
  );
};
