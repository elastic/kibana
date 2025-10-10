/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface PlaygroundNameProps {
  playgroundName: string;
  onEditName: () => void;
}

const EDIT_NAME_LABEL = i18n.translate(
  'xpack.searchPlayground.savedPlayground.editPlaygroundName.ariaLabel',
  { defaultMessage: 'Edit playground name' }
);

export const PlaygroundName = ({ playgroundName, onEditName }: PlaygroundNameProps) => {
  return (
    <EuiTitle css={css({ whiteSpace: 'nowrap' })} data-test-subj="playgroundName" size="xs">
      <h2>
        {playgroundName}
        <EuiButtonIcon
          aria-label={EDIT_NAME_LABEL}
          color="text"
          data-test-subj="edit-playground-name-button"
          display="empty"
          iconType="pencil"
          size="s"
          onClick={onEditName}
        />
      </h2>
    </EuiTitle>
  );
};
