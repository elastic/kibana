/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTextColor } from '@elastic/eui';

import * as i18n from './translations';

interface UnsupportedMitreOptionDisplayProps {
  id: string;
}

const UnsupportedMitreOptionDisplay: React.FC<UnsupportedMitreOptionDisplayProps> = ({ id }) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="warning" color="warning" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTextColor color="warning">{i18n.UNSUPPORTED_MITRE_ID_OPTION_LABEL(id)}</EuiTextColor>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * Builds a disabled "ghost" `EuiSuperSelect` option that represents a MITRE
 * ATT&CK® ID which is no longer present in the bundled dataset. Use this to
 * keep the unsupported value visible in the select while signaling that the
 * user must replace it with a supported value.
 *
 * The option's `value` is the raw MITRE ID so that the consuming select can
 * set `valueOfSelected` to the same id and render this option in the trigger.
 */
export const createUnsupportedMitreOption = (id: string): EuiSuperSelectOption<string> => ({
  value: id,
  inputDisplay: <UnsupportedMitreOptionDisplay id={id} />,
  dropdownDisplay: <UnsupportedMitreOptionDisplay id={id} />,
  disabled: true,
  'data-test-subj': `mitreUnsupportedOption-${id}`,
});
