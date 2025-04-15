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

  const handleAddPin = () => {
    onPinned([...pinnedItems, fieldName]);
  };

  const handleRemovePin = () => {
    if (pinnedItems && pinnedItems.includes(fieldName)) {
      onPinned((pinnedItems ?? []).filter((pinName: string) => fieldName !== pinName));
    }
  };

  if (pinnedItems?.includes(fieldName)) {
    return (
      <span>
        <EuiToolTip
          content={i18n.translate('xpack.infra.metadataEmbeddable.unpinField', {
            defaultMessage: 'Unpin field',
          })}
        >
          <EuiButtonIcon
            size="s"
            color="primary"
            iconType="pinFilled"
            data-test-subj="infraAssetDetailsMetadataRemovePin"
            aria-label={i18n.translate('xpack.infra.metadata.pinnedAriaLabel', {
              defaultMessage: 'Pinned {fieldName}',
              values: { fieldName },
            })}
            onClick={handleRemovePin}
          />
        </EuiToolTip>
      </span>
    );
  }

  // Custom table show on hover CSS, since this button is not technically in an action column
  // Potential EUI TODO - multiple action columns and `align`ed actions are not currently supported
  const showOnRowHoverCss = css`
    opacity: 0;
    ${euiCanAnimate} {
      transition: opacity ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
    }

    .euiTableRow:hover &,
    &:focus-within {
      opacity: 1;
    }
  `;

  return (
    <span className={showOnRowHoverCss}>
      <EuiToolTip
        content={i18n.translate('xpack.infra.metadataEmbeddable.pinField', {
          defaultMessage: 'Pin field',
        })}
      >
        <EuiButtonIcon
          color="primary"
          size="s"
          iconType="pin"
          data-test-subj="infraAssetDetailsMetadataAddPin"
          aria-label={i18n.translate('xpack.infra.metadataEmbeddable.pinField.ariaLabel', {
            defaultMessage: 'Pin {fieldName}',
            values: { fieldName },
          })}
          onClick={handleAddPin}
        />
      </EuiToolTip>
    </span>
  );
};
