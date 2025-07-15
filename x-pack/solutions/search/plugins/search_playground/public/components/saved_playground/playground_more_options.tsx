/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext } from 'react-hook-form';
import { SavedPlaygroundForm } from '../../types';
import { hasSavedPlaygroundFormErrors } from '../../utils/saved_playgrounds';

/**
 * Props for the PlaygroundMoreOptionsMenu component
 */
export interface PlaygroundMoreOptionsMenuProps {
  /** Callback function to handle opening the save as modal */
  onSavePlaygroundAs: () => void;
  /** Callback function to handle opening delete playground modal */
  onDeletePlayground: () => void;
}

export const PlaygroundMoreOptionsMenu = ({
  onSavePlaygroundAs,
  onDeletePlayground,
}: PlaygroundMoreOptionsMenuProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const {
    formState: { errors: formErrors },
  } = useFormContext<SavedPlaygroundForm>();
  const hasFormErrors = hasSavedPlaygroundFormErrors(formErrors);

  const closePopover = useCallback(() => setShowMoreOptions(false), []);
  const onOpenDeleteConfirm = useCallback(() => {
    closePopover();
    onDeletePlayground();
  }, [onDeletePlayground, closePopover]);
  const onOpenSaveAs = useCallback(() => {
    closePopover();
    onSavePlaygroundAs();
  }, [onSavePlaygroundAs, closePopover]);
  const togglePopover = useCallback(() => {
    setShowMoreOptions(!showMoreOptions);
  }, [showMoreOptions]);

  const menuItems = [
    <EuiContextMenuItem
      key="savePlaygroundAs"
      icon={<EuiIcon type="save" />}
      size="s"
      onClick={onOpenSaveAs}
      data-test-subj="moreOptionsSavePlaygroundAs"
      disabled={hasFormErrors}
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.searchPlayground.savedPlayground.moreOptions.saveAs.label"
          defaultMessage="Save as"
        />
      </EuiText>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="deletePlayground"
      icon={<EuiIcon color="danger" type="trash" />}
      size="s"
      onClick={onOpenDeleteConfirm}
      data-test-subj="moreOptionsDeletePlayground"
    >
      <EuiText size="s" color="danger">
        <FormattedMessage
          id="xpack.searchPlayground.savedPlayground.moreOptions.deletePlayground.label"
          defaultMessage="Delete playground"
        />
      </EuiText>
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      isOpen={showMoreOptions}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          onClick={togglePopover}
          size="m"
          data-test-subj="moreOptionsActionButton"
          aria-label={i18n.translate(
            'xpack.searchPlayground.savedPlayground.moreOptions.ariaLabel',
            {
              defaultMessage: 'More options',
            }
          )}
          aria-expanded={showMoreOptions}
          aria-haspopup="true"
        />
      }
    >
      <EuiContextMenuPanel data-test-subj="moreOptionsContextMenu" items={menuItems} />
    </EuiPopover>
  );
};
