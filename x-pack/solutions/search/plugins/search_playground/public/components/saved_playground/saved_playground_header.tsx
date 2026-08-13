/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab, AppHeaderTitle } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

import { PLUGIN_ID, PLUGIN_NAME } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import type { SavedPlaygroundForm } from '../../types';
import {
  PlaygroundPageMode,
  PlaygroundViewMode,
  PlaygroundFormFields,
  SavedPlaygroundFormFields,
} from '../../types';
import {
  hasSavedPlaygroundFormErrors,
  validatePlaygroundName,
} from '../../utils/saved_playgrounds';
import { SelectIndicesFlyout } from '../select_indices_flyout';
import { ViewCodeFlyout } from '../view_code/view_code_flyout';
import { useSavedPlaygroundSaveAction } from './saved_button';

interface SavedPlaygroundHeaderProps {
  pageMode: PlaygroundPageMode;
  viewMode: PlaygroundViewMode;
  onModeChange: (mode: PlaygroundViewMode) => void;
  isActionsDisabled?: boolean;
  playgroundName: string;
  hasChanges: boolean;
  onDeletePlayground: () => void;
  onCopyPlayground: () => void;
}

export const SavedPlaygroundHeader: React.FC<SavedPlaygroundHeaderProps> = ({
  pageMode,
  viewMode,
  onModeChange,
  isActionsDisabled = false,
  playgroundName,
  hasChanges,
  onDeletePlayground,
  onCopyPlayground,
}) => {
  const { application } = useKibana().services;
  const {
    setValue,
    formState: { errors: formErrors },
  } = useFormContext<SavedPlaygroundForm>();
  const selectedIndices = useWatch<SavedPlaygroundForm, PlaygroundFormFields.indices>({
    name: PlaygroundFormFields.indices,
  });
  const hasNoIndices = !selectedIndices || selectedIndices.length === 0;
  const hasFormErrors = hasSavedPlaygroundFormErrors(formErrors);
  const { onSave, isDisabled: isSaveDisabled, isSaving } = useSavedPlaygroundSaveAction(hasChanges);

  const [showDataFlyout, setShowDataFlyout] = useState<boolean>(false);
  const [showViewCodeFlyout, setShowViewCodeFlyout] = useState<boolean>(false);

  const title = useMemo<AppHeaderTitle>(
    () => ({
      text: playgroundName,
      ariaLabel: i18n.translate(
        'xpack.searchPlayground.savedPlayground.editPlaygroundName.ariaLabel',
        { defaultMessage: 'Edit playground name' }
      ),
      onSave: (nextTitle: string) => {
        const error = validatePlaygroundName(nextTitle);
        if (error !== null) {
          return error;
        }
        setValue(SavedPlaygroundFormFields.name, nextTitle, { shouldDirty: true });
      },
    }),
    [playgroundName, setValue]
  );

  const badges = useMemo<AppHeaderBadge[] | undefined>(
    () =>
      hasChanges
        ? [
            {
              label: i18n.translate('xpack.searchPlayground.header.unsavedChangesBadge', {
                defaultMessage: 'Unsaved changes',
              }),
              color: 'warning',
              'data-test-subj': 'playground-unsaved-changes-badge',
            },
          ]
        : undefined,
    [hasChanges]
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
          id: 'savePlaygroundAs',
          label: i18n.translate('xpack.searchPlayground.savedPlayground.moreOptions.saveAs.label', {
            defaultMessage: 'Save as',
          }),
          iconType: 'save',
          overflow: true,
          run: onCopyPlayground,
          disableButton: hasFormErrors,
          testId: 'moreOptionsSavePlaygroundAs',
        },
        {
          id: 'deletePlayground',
          label: i18n.translate(
            'xpack.searchPlayground.savedPlayground.moreOptions.deletePlayground.label',
            { defaultMessage: 'Delete playground' }
          ),
          iconType: 'trash',
          overflow: true,
          isDestructive: true,
          run: onDeletePlayground,
          testId: 'moreOptionsDeletePlayground',
        },
      ],
      primaryActionItem: {
        id: 'save',
        label: i18n.translate('xpack.searchPlayground.savedPlayground.header.saveButton.text', {
          defaultMessage: 'Save',
        }),
        iconType: 'save',
        run: onSave,
        disableButton: isSaveDisabled,
        isLoading: isSaving,
        testId: 'saved-playground-save-button',
      },
    }),
    [
      hasNoIndices,
      hasFormErrors,
      onCopyPlayground,
      onDeletePlayground,
      onSave,
      isSaveDisabled,
      isSaving,
    ]
  );

  return (
    <>
      <AppHeader
        title={title}
        back={{
          href: application.getUrlForApp(PLUGIN_ID),
          label: PLUGIN_NAME,
        }}
        badges={badges}
        tabs={tabs}
        menu={menu}
      />
      {showDataFlyout && <SelectIndicesFlyout onClose={() => setShowDataFlyout(false)} />}
      {showViewCodeFlyout && (
        <ViewCodeFlyout selectedPageMode={pageMode} onClose={() => setShowViewCodeFlyout(false)} />
      )}
    </>
  );
};
