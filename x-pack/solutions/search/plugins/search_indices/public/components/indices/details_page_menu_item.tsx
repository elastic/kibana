/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';
import type { UserStartPrivilegesResponse } from '../../../common';

interface SearchIndexDetailsPageMenuItemPopoverProps {
  handleDeleteIndexModal: () => void;
  showApiReference: boolean;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const SearchIndexDetailsPageMenuItemPopover = ({
  showApiReference = false,
  handleDeleteIndexModal,
  userPrivileges,
}: SearchIndexDetailsPageMenuItemPopoverProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const { docLinks } = useKibana().services;
  const canManageIndex = useMemo(() => {
    return userPrivileges?.privileges.canManageIndex === true;
  }, [userPrivileges]);
  const contextMenuItems = [
    showApiReference && (
      <EuiContextMenuItem
        key="apiReference"
        icon={<EuiIcon type="documentation" />}
        href={docLinks.links.apiReference}
        size="s"
        target="_blank"
        data-test-subj="moreOptionsApiReference"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.searchIndices.moreOptions.apiReferenceLabel"
            defaultMessage="API Reference"
          />
        </EuiText>
      </EuiContextMenuItem>
    ),
    <EuiContextMenuItem
      key="deleteIndex"
      icon={<EuiIcon color={canManageIndex ? 'danger' : undefined} type="trash" />}
      size="s"
      onClick={handleDeleteIndexModal}
      data-test-subj="moreOptionsDeleteIndex"
      toolTipContent={
        !canManageIndex
          ? i18n.translate('xpack.searchIndices.moreOptions.deleteIndex.permissionToolTip', {
              defaultMessage: 'You do not have permission to delete an index',
            })
          : undefined
      }
      toolTipProps={{ 'data-test-subj': 'moreOptionsDeleteIndexTooltip' }}
      disabled={!canManageIndex}
    >
      <EuiText size="s" color={canManageIndex ? 'danger' : undefined}>
        <FormattedMessage
          id="xpack.searchIndices.moreOptions.deleteIndexLabel"
          defaultMessage="Delete Index"
        />
      </EuiText>
    </EuiContextMenuItem>,
  ].filter(Boolean) as ReactElement[];

  return (
    <EuiPopover
      isOpen={showMoreOptions}
      closePopover={() => setShowMoreOptions(!showMoreOptions)}
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          size="m"
          data-test-subj="moreOptionsActionButton"
          aria-label={i18n.translate('xpack.searchIndices.moreOptions.ariaLabel', {
            defaultMessage: 'More options',
          })}
        />
      }
    >
      <EuiContextMenuPanel data-test-subj="moreOptionsContextMenu" items={contextMenuItems} />
    </EuiPopover>
  );
};
