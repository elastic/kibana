/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreFramework, ThreatFrameworkGroup } from '@kbn/security-mitre-attack-common';
import {
  DEFAULT_MITRE_FRAMEWORK,
  THREAT_FRAMEWORK_NAME,
  groupThreatsByFramework,
} from '@kbn/security-mitre-attack-common';
import { useAvailableMitreFrameworks } from '../../../../common/hooks/mitre/use_available_mitre_frameworks';
import type { FieldHook } from '../../../../shared_imports';
import { threatDefault } from '../step_about_rule/default_value';
import * as i18n from './translations';
import { MitreFrameworkThreatSection } from './framework_threat_section';
import { UnknownFrameworkThreatSection } from './unknown_framework_threat_section';

const MitreAttackContainer = styled.div`
  margin-top: 16px;
`;

interface AddItemProps {
  field: FieldHook;
  dataTestSubj: string; // eslint-disable-line react/no-unused-prop-types
  idAria: string;
  isDisabled: boolean;
}

// eslint-disable-next-line react/display-name
export const AddMitreAttackThreat = memo(({ field, idAria, isDisabled }: AddItemProps) => {
  const [isAddFrameworkOpen, setIsAddFrameworkOpen] = useState(false);
  const availableFrameworks = useAvailableMitreFrameworks();
  const values = field.value as Threats;
  const groups = useMemo((): Array<ThreatFrameworkGroup<Threat>> => {
    const grouped = groupThreatsByFramework(values);
    // An empty threat array (e.g. a saved rule without threats) still shows the enterprise section.
    return grouped.length > 0
      ? grouped
      : [
          {
            framework: DEFAULT_MITRE_FRAMEWORK,
            label: THREAT_FRAMEWORK_NAME[DEFAULT_MITRE_FRAMEWORK],
            threats: [],
          },
        ];
  }, [values]);
  const absentFrameworks = useMemo(
    () => availableFrameworks.filter((fw) => !groups.some((group) => group.framework === fw)),
    [availableFrameworks, groups]
  );

  const removeThreats = useCallback(
    (threatsToRemove: Threat[]) => {
      const remaining = (field.value as Threats).filter(
        (entry) => !threatsToRemove.includes(entry)
      );
      field.setValue(isEmpty(remaining) ? threatDefault : remaining);
    },
    [field]
  );

  const addFramework = useCallback(
    (framework: MitreFramework) => {
      setIsAddFrameworkOpen(false);
      field.setValue([
        ...(field.value as Threats),
        {
          framework: THREAT_FRAMEWORK_NAME[framework],
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ]);
    },
    [field]
  );

  /**
   * Uses the fieldhook to set a new field value
   *
   * Value is memoized on top level props, any deep changes will have to be new objects
   */
  const onFieldChange = useCallback(
    (threats: Threats) => {
      field.setValue(threats);
    },
    [field]
  );

  return (
    <MitreAttackContainer>
      <EuiFormRow
        fullWidth
        hasChildLabel={false}
        label={field.label}
        labelAppend={field.labelAppend}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <div>
          {groups.map((group) => (
            <React.Fragment key={group.framework ?? `unknown-${group.label}`}>
              {group.framework && availableFrameworks.includes(group.framework) ? (
                <MitreFrameworkThreatSection
                  framework={group.framework}
                  field={field}
                  threats={group.threats}
                  idAria={idAria}
                  isDisabled={isDisabled}
                  onFieldChange={onFieldChange}
                  onRemoveThreats={removeThreats}
                />
              ) : (
                <UnknownFrameworkThreatSection
                  label={group.label}
                  threats={group.threats}
                  {...(group.framework
                    ? {
                        message: i18n.FRAMEWORK_UNAVAILABLE_WARNING,
                        dataTestSubj: `mitreUnavailableFrameworkSection-${group.framework}`,
                      }
                    : {})}
                  isDisabled={isDisabled}
                  onRemoveThreats={removeThreats}
                />
              )}
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
          <EuiPopover
            aria-label={i18n.ADD_FRAMEWORK}
            isOpen={isAddFrameworkOpen}
            closePopover={() => setIsAddFrameworkOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            button={
              <EuiButtonEmpty
                iconType="plusCircle"
                size="xs"
                data-test-subj="addMitreFramework"
                isDisabled={isDisabled || absentFrameworks.length === 0}
                onClick={() => setIsAddFrameworkOpen((open) => !open)}
              >
                {i18n.ADD_FRAMEWORK}
              </EuiButtonEmpty>
            }
          >
            <EuiContextMenuPanel
              items={absentFrameworks.map((framework) => (
                <EuiContextMenuItem
                  key={framework}
                  data-test-subj={`addMitreFramework-${framework}`}
                  onClick={() => addFramework(framework)}
                >
                  {THREAT_FRAMEWORK_NAME[framework]}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </div>
      </EuiFormRow>
    </MitreAttackContainer>
  );
});
