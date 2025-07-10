/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface Props {
  color: string;
  label: string;
  paletteSelected: string;
}

export const ColorLabel = ({ label, color, paletteSelected }: Props) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type="stopFilled"
          color={color}
          size="xl"
          aria-label={i18n.translate('xpack.infra.legendControls.iconColorLabel', {
            defaultMessage: '{label} {paletteSelected} color',
            values: { label, paletteSelected },
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>{label}</strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
