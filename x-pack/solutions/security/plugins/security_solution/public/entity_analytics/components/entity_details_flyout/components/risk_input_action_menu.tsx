/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import React from 'react';
import type { InputAlert } from '../../../hooks/use_risk_contributing_alerts';
import { useRiskInputActionsPanels } from '../hooks/use_risk_input_actions_panels';

interface RiskInputActionMenuProps {
  closePopover: () => void;
  inputs: InputAlert[];
}

export const RiskInputActionMenu = ({ closePopover, inputs }: RiskInputActionMenuProps) => {
  const panels = useRiskInputActionsPanels(inputs, closePopover);

  return <EuiContextMenu initialPanelId={0} panels={panels} />;
};
