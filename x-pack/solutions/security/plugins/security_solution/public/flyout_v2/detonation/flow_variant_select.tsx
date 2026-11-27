/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPortal, EuiSelect, useEuiTheme } from '@elastic/eui';
import { FLOW_VARIANT_OPTIONS, setFlowVariant, useFlowVariant } from './flow_variant';
import type { FlowVariant } from './flow_variant';

/**
 * Prototype switcher between detonate flows. Rendered in a portal and pinned to the Kibana top bar,
 * so it sits over the current UI on every Security page.
 */
export const FlowVariantSelect: React.FC = () => {
  const variant = useFlowVariant();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPortal>
      <div
        css={{ position: 'fixed', top: 8, right: 500, zIndex: euiTheme.levels.header }}
        data-test-subj="detonateFlowVariantContainer"
      >
        <EuiSelect
          compressed
          prepend="Flow"
          aria-label="Detonate flow"
          options={FLOW_VARIANT_OPTIONS}
          value={variant}
          onChange={(e) => setFlowVariant(e.target.value as FlowVariant)}
          data-test-subj="detonateFlowVariant"
          css={{ minWidth: 220 }}
        />
      </div>
    </EuiPortal>
  );
};
