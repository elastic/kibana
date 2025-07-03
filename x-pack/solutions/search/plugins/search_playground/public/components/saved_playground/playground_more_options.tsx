/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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

export interface PlaygroundMoreOptionsMenuProps {
  onDeletePlayground: () => void;
}

export const PlaygroundMoreOptionsMenu = ({
  onDeletePlayground,
}: PlaygroundMoreOptionsMenuProps) => {
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  return (
    <EuiPopover
      isOpen={showMoreOptions}
      closePopover={() => setShowMoreOptions(false)}
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          size="m"
          data-test-subj="moreOptionsActionButton"
          aria-label={i18n.translate(
            'xpack.searchPlayground.savedPlayground.moreOptions.ariaLabel',
            {
              defaultMessage: 'More options',
            }
          )}
        />
      }
    >
      <EuiContextMenuPanel
        data-test-subj="moreOptionsContextMenu"
        items={[
          <EuiContextMenuItem
            key="deletePlayground"
            icon={<EuiIcon color="danger" type="trash" />}
            size="s"
            onClick={onDeletePlayground}
            data-test-subj="moreOptionsDeletePlayground"
          >
            <EuiText size="s" color="danger">
              <FormattedMessage
                id="xpack.searchPlayground.savedPlayground.moreOptions.deletePlayground.label"
                defaultMessage="Delete playground"
              />
            </EuiText>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
