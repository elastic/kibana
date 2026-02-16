/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TechnicalPreviewBadge } from '../../../../components/technical_preview_badge';

export type CreationMode = 'manual' | 'ai_assisted' | 'auto_discover';

const CREATION_MODE_OPTIONS = [
  {
    id: 'manual',
    label: i18n.translate('xpack.slo.sloEdit.creationMode.manual', {
      defaultMessage: 'Manual',
    }),
    'data-test-subj': 'sloCreationModeManual',
  },
  {
    id: 'ai_assisted',
    label: i18n.translate('xpack.slo.sloEdit.creationMode.aiAssisted', {
      defaultMessage: 'AI-assisted',
    }),
    iconType: 'sparkles',
    'data-test-subj': 'sloCreationModeAiAssisted',
  },
  {
    id: 'auto_discover',
    label: i18n.translate('xpack.slo.sloEdit.creationMode.autoDiscover', {
      defaultMessage: 'Auto-discover',
    }),
    iconType: 'magnifyWithPlus',
    'data-test-subj': 'sloCreationModeAutoDiscover',
  },
];

const AI_MODES: CreationMode[] = ['ai_assisted', 'auto_discover'];

interface CreationModeToggleProps {
  mode: CreationMode;
  onChange: (mode: CreationMode) => void;
}

export function CreationModeToggle({ mode, onChange }: CreationModeToggleProps) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.translate('xpack.slo.sloEdit.creationMode.legend', {
            defaultMessage: 'SLO creation mode',
          })}
          options={CREATION_MODE_OPTIONS}
          idSelected={mode}
          onChange={(id) => onChange(id as CreationMode)}
          buttonSize="compressed"
          color="primary"
          data-test-subj="sloCreationModeToggle"
        />
      </EuiFlexItem>
      {AI_MODES.includes(mode) && (
        <EuiFlexItem grow={false} data-test-subj="sloCreationModeTechPreviewBadge">
          <TechnicalPreviewBadge />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
