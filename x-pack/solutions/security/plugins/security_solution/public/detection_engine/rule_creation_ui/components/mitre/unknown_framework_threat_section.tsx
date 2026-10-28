/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import type { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import { UNKNOWN_FRAMEWORK_LABEL } from '../description_step/translations';
import * as i18n from './translations';
import { ReadOnlyThreatEntry } from './read_only_threat_entry';

interface UnknownFrameworkThreatSectionProps {
  label: string;
  threats: Threat[];
  message?: string;
  dataTestSubj?: string;
  isDisabled: boolean;
  onRemoveThreats: (threats: Threat[]) => void;
}

/**
 * Read-only section for threat entries whose framework is not recognized. The mappings are
 * preserved on the rule and can only be removed, never edited.
 */
export const UnknownFrameworkThreatSection: React.FC<UnknownFrameworkThreatSectionProps> = ({
  label,
  threats,
  message = i18n.UNKNOWN_FRAMEWORK_WARNING,
  dataTestSubj = 'mitreUnknownFrameworkSection',
  isDisabled,
  onRemoveThreats,
}) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow>
        <EuiTitle size="xxs">
          <h4>{label || UNKNOWN_FRAMEWORK_LABEL}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.REMOVE_FRAMEWORK} disableScreenReaderOutput>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            aria-label={i18n.REMOVE_FRAMEWORK}
            data-test-subj="removeMitreFramework"
            isDisabled={isDisabled}
            onClick={() => onRemoveThreats(threats)}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiCallOut color="warning" size="s" iconType="warning" title={message} />
    {threats.map((threat, index) => (
      <ReadOnlyThreatEntry
        key={`${threat.tactic?.id ?? 'none'}-${index}`}
        threat={threat}
        isDisabled={isDisabled}
        onRemove={(entry) => onRemoveThreats([entry])}
      />
    ))}
  </EuiPanel>
);
