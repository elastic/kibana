/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch } from 'react';
import React from 'react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon, useEuiTheme, euiCanAnimate } from '@elastic/eui';
import type { Field } from './utils';

interface AddMetadataPinToRowProps {
  fieldName: Field['name'];
  pinnedItems: Array<Field['name']>;
  onPinned: Dispatch<React.SetStateAction<Array<Field['name']> | undefined>>;
}

export const AddMetadataPinToRow = ({
  fieldName,
  pinnedItems,
  onPinned,
}: AddMetadataPinToRowProps) => {
  const { euiTheme } = useEuiTheme();

  const isPinned = pinnedItems?.includes(fieldName);

  const handleClick = () => {
    if (isPinned) {
      onPinned((pinnedItems ?? []).filter((pinName: string) => fieldName !== pinName));
    } else {
      onPinned([...pinnedItems, fieldName]);
    }
  };

  // Custom table show on hover CSS, since this button is not technically in an action column
  // Potential EUI TODO - multiple action columns and `align`ed actions are not currently supported
  const showOnRowHoverCss = css`
    opacity: ${isPinned ? 1 : 0};
    ${euiCanAnimate} {
      transition: opacity ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
    }

    .euiTableRow:hover &,
    &:focus-within {
      opacity: 1;
    }
  `;

  const tooltipContent = isPinned
    ? i18n.translate('xpack.infra.metadataEmbeddable.unpinField', {
        defaultMessage: 'Unpin field',
      })
    : i18n.translate('xpack.infra.metadataEmbeddable.pinField', {
        defaultMessage: 'Pin field',
      });

  const ariaLabel = isPinned
    ? i18n.translate('xpack.infra.metadata.pinnedAriaLabel', {
        defaultMessage: 'Pinned {fieldName}',
        values: { fieldName },
      })
    : i18n.translate('xpack.infra.metadataEmbeddable.pinField.ariaLabel', {
        defaultMessage: 'Pin {fieldName}',
        values: { fieldName },
      });

  return (
    <span className={showOnRowHoverCss}>
      <EuiToolTip content={tooltipContent}>
        <EuiButtonIcon
          size="s"
          color="primary"
          iconType={isPinned ? 'pinFilled' : 'pin'}
          data-test-subj={
            isPinned ? 'infraAssetDetailsMetadataRemovePin' : 'infraAssetDetailsMetadataAddPin'
          }
          aria-label={ariaLabel}
          onClick={handleClick}
        />
      </EuiToolTip>
    </span>
  );
};
