/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import {
  FLYOUT_VARIANT_OPTIONS,
  setFlyoutVariant,
  useFlyoutVariant,
  usePrototypeSelectorVisible,
  type FlyoutVariant,
} from '../../common/flyout_variant';

/** Prototype switcher, rendered in the Kibana top bar. */
export const PrototypeVariantSelect: React.FC = () => {
  const variant = useFlyoutVariant();
  const isVisible = usePrototypeSelectorVisible();

  if (!isVisible) {
    return null;
  }

  return (
    <EuiSelect
      compressed
      prepend="Prototype"
      aria-label="Prototype variant"
      options={FLYOUT_VARIANT_OPTIONS}
      value={variant}
      onChange={(e) => setFlyoutVariant(e.target.value as FlyoutVariant)}
      data-test-subj="workflowPrototypeVariant"
      css={{ minWidth: 300 }}
    />
  );
};
