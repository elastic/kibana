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
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import type { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import { getMitreEntityDisplayName } from '@kbn/security-mitre-attack-common';
import * as Rulei18n from '../../../common/translations';
import { UNKNOWN_FRAMEWORK_LABEL } from '../description_step/translations';
import * as i18n from './translations';

interface UnknownFrameworkThreatSectionProps {
  label: string;
  threats: Threat[];
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
  isDisabled,
  onRemoveThreats,
}) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="mitreUnknownFrameworkSection">
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
    <EuiCallOut
      color="warning"
      size="s"
      iconType="warning"
      title={i18n.UNKNOWN_FRAMEWORK_WARNING}
    />
    {threats.map((threat, index) => (
      <div key={`${threat.tactic?.id ?? 'none'}-${index}`}>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" justifyContent="spaceBetween">
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{threat.tactic ? getMitreEntityDisplayName(threat.tactic) : ''}</strong>
              <ul>
                {(threat.technique ?? [])
                  .filter((technique) => technique != null)
                  .map((technique, techniqueIndex) => (
                    <li key={`${technique.id}-${techniqueIndex}`}>
                      {getMitreEntityDisplayName(technique)}
                      {(technique.subtechnique ?? []).length > 0 && (
                        <ul>
                          {(technique.subtechnique ?? [])
                            .filter((subtechnique) => subtechnique != null)
                            .map((subtechnique, subtechniqueIndex) => (
                              <li key={`${subtechnique.id}-${subtechniqueIndex}`}>
                                {getMitreEntityDisplayName(subtechnique)}
                              </li>
                            ))}
                        </ul>
                      )}
                    </li>
                  ))}
              </ul>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={Rulei18n.DELETE} disableScreenReaderOutput>
              <EuiButtonIcon
                color="danger"
                iconType="trash"
                aria-label={Rulei18n.DELETE}
                data-test-subj="removeMitreThreatEntry"
                isDisabled={isDisabled}
                onClick={() => onRemoveThreats([threat])}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    ))}
  </EuiPanel>
);
