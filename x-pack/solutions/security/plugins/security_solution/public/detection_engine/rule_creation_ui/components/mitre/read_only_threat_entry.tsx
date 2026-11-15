/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import type { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import { getMitreEntityDisplayName } from '@kbn/security-mitre-attack-common';
import * as Rulei18n from '../../../common/translations';

interface ReadOnlyThreatEntryProps {
  threat: Threat;
  isDisabled: boolean;
  onRemove: (threat: Threat) => void;
}

/** Read-only rendering of one threat entry: tactic, techniques, subtechniques and a remove button. */
export const ReadOnlyThreatEntry: React.FC<ReadOnlyThreatEntryProps> = ({
  threat,
  isDisabled,
  onRemove,
}) => (
  <>
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
            onClick={() => onRemove(threat)}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
