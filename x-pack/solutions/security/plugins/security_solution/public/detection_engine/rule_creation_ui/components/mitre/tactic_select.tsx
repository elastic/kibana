/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreFramework, MitreTacticSummary } from '@kbn/security-mitre-attack-common';
import { getMitreEntityDisplayName } from '@kbn/security-mitre-attack-common';
import * as Rulei18n from '../../../common/translations';
import * as i18n from './translations';
import { createUnsupportedMitreOption } from './unsupported_mitre_option';

interface TacticSelectProps {
  framework: MitreFramework;
  threat: Threat;
  index: number;
  isDisabled: boolean;
  frameworkLabel: string;
  tactics: MitreTacticSummary[];
  isUnsupported: boolean;
  canRemove: boolean;
  onChange: (index: number, value: string) => void;
  onRemove: (threat: Threat) => void;
}

/** Tactic select for a single threat row, with its remove button. */
export const TacticSelect: React.FC<TacticSelectProps> = ({
  framework,
  threat,
  index,
  isDisabled,
  frameworkLabel,
  tactics,
  isUnsupported,
  canRemove,
  onChange,
  onRemove,
}) => {
  const baseOptions = useMemo(
    () =>
      tactics.map((t) => ({
        inputDisplay: <>{getMitreEntityDisplayName(t)}</>,
        value: t.id,
        disabled: isDisabled,
      })),
    [tactics, isDisabled]
  );

  const options = [
    ...(threat.tactic.name === 'none'
      ? [
          {
            inputDisplay: <>{i18n.TACTIC_PLACEHOLDER}</>,
            value: 'none',
            disabled: isDisabled,
          },
        ]
      : []),
    ...(isUnsupported
      ? [createUnsupportedMitreOption({ id: threat.tactic.id, name: threat.tactic.name })]
      : []),
    ...baseOptions,
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow>
        <EuiSuperSelect
          id={`mitreAttackTactic-${framework}-${index}`}
          options={options}
          prepend={`${frameworkLabel} ${i18n.TACTIC}`}
          aria-label=""
          onChange={(value: string) => onChange(index, value)}
          fullWidth={true}
          valueOfSelected={threat.tactic.id}
          data-test-subj="mitreAttackTactic"
          placeholder={i18n.TACTIC_PLACEHOLDER}
          isInvalid={isUnsupported}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={Rulei18n.DELETE} disableScreenReaderOutput>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            isDisabled={!canRemove}
            onClick={() => onRemove(threat)}
            aria-label={Rulei18n.DELETE}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
