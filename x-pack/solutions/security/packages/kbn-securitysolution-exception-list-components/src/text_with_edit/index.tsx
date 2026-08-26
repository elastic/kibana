/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import * as i18n from '../translations';
import { textWithEditContainerCss } from './text_with_edit.styles';
interface TextWithEditProps {
  isReadonly: boolean;
  dataTestSubj?: string;
  text: string;
  textCss?: Interpolation<Theme>;
  onEdit?: () => void;
}

const TextWithEditComponent: FC<TextWithEditProps> = ({
  isReadonly,
  dataTestSubj,
  text,
  onEdit,
  textCss,
}) => {
  return (
    <EuiFlexGroup css={textWithEditContainerCss} gutterSize="xs" component="span">
      <EuiFlexItem grow={10} component="span">
        <span css={textCss} data-test-subj={`${dataTestSubj || ''}Text`}>
          {text}
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false} component="span">
        {isReadonly ? null : (
          <EuiToolTip content={i18n.TEXT_WITH_EDIT_ARIA_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj={`${dataTestSubj || ''}EditIcon`}
              aria-label={i18n.TEXT_WITH_EDIT_ARIA_LABEL}
              iconType="pencil"
              onClick={() => (typeof onEdit === 'function' ? onEdit() : null)}
            />
          </EuiToolTip>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
TextWithEditComponent.displayName = 'TextWithEditComponent';

export const TextWithEdit = React.memo(TextWithEditComponent);

TextWithEdit.displayName = 'TextWithEdit';
