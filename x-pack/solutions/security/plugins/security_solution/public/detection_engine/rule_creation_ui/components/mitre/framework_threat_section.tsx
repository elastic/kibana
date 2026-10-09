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
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useCallback } from 'react';
import { isEqual } from 'lodash';
import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import {
  THREAT_FRAMEWORK_NAME,
  getMitreEntityDisplayName,
} from '@kbn/security-mitre-attack-common';
import * as Rulei18n from '../../../common/translations';
import type { FieldHook } from '../../../../shared_imports';
import { threatDefault } from '../step_about_rule/default_value';
import { MyAddItemButton } from '../add_item_form';
import * as i18n from './translations';
import { MitreAttackTechniqueFields } from './technique_fields';
import { createUnsupportedMitreOption } from './unsupported_mitre_option';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';

interface MitreFrameworkThreatSectionProps {
  framework: MitreFramework;
  field: FieldHook;
  threats: Threat[];
  idAria: string;
  isDisabled: boolean;
  onFieldChange: (threats: Threats) => void;
  onRemoveThreats: (threats: Threat[]) => void;
}

export const MitreFrameworkThreatSection: React.FC<MitreFrameworkThreatSectionProps> = ({
  framework,
  field,
  threats,
  idAria,
  isDisabled,
  onFieldChange,
  onRemoveThreats,
}) => {
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );
  const { tactics, techniques, subtechniques, isLoading, isError } = useMitreConfiguration({
    framework,
  });
  const frameworkLabel = THREAT_FRAMEWORK_NAME[framework];

  const addTactic = useCallback(() => {
    field.setValue([
      ...(field.value as Threats),
      {
        framework: frameworkLabel,
        tactic: { id: 'none', name: 'none', reference: 'none' },
        technique: [],
      },
    ]);
  }, [field, frameworkLabel]);

  const updateTactic = useCallback(
    (threat: Threat, value: string) => {
      const values = [...(field.value as Threats)];
      const index = values.indexOf(threat);
      if (index === -1) {
        return;
      }
      const { id, reference, name } = tactics.find((t) => t.id === value) ?? {
        id: '',
        name: '',
        reference: '',
      };
      values.splice(index, 1, {
        ...values[index],
        // The options are this section's dataset, so the row's framework must follow the section.
        framework: frameworkLabel,
        tactic: { id, reference, name },
        technique: [],
      });
      field.setValue([...values]);
    },
    [field, frameworkLabel, tactics]
  );

  const findCurrentTacticOption = useCallback(
    (threat: Threat) =>
      threat.tactic.name === 'none' || tactics.length === 0
        ? undefined
        : tactics.find((t) => t.id === threat.tactic.id),
    [tactics]
  );

  const isUnsupportedTactic = useCallback(
    (threat: Threat) =>
      isMitreAttackUpdatesUIEnabled &&
      tactics.length > 0 &&
      threat.tactic.name !== 'none' &&
      findCurrentTacticOption(threat) === undefined,
    [findCurrentTacticOption, isMitreAttackUpdatesUIEnabled, tactics]
  );

  const getRenamedFromName = useCallback(
    (threat: Threat) => {
      if (!isMitreAttackUpdatesUIEnabled) return undefined;
      const matchedOption = findCurrentTacticOption(threat);
      return matchedOption && matchedOption.name !== threat.tactic.name
        ? threat.tactic.name
        : undefined;
    },
    [findCurrentTacticOption, isMitreAttackUpdatesUIEnabled]
  );

  const getSelectTactic = (threat: Threat, disabled: boolean) => {
    const tacticName = threat.tactic.name;
    const isUnsupported = isUnsupportedTactic(threat);
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow>
          <EuiSuperSelect
            id="mitreAttackTactic"
            options={[
              ...(tacticName === 'none'
                ? [
                    {
                      inputDisplay: <>{i18n.TACTIC_PLACEHOLDER}</>,
                      value: 'none',
                      disabled,
                    },
                  ]
                : []),
              ...(isUnsupported
                ? [
                    createUnsupportedMitreOption({
                      id: threat.tactic.id,
                      name: threat.tactic.name,
                    }),
                  ]
                : []),
              ...tactics.map((t) => ({
                inputDisplay: <>{getMitreEntityDisplayName(t)}</>,
                value: t.id,
                disabled,
              })),
            ]}
            prepend={`${frameworkLabel} ${i18n.TACTIC}`}
            aria-label=""
            onChange={(value: string) => updateTactic(threat, value)}
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
              isDisabled={isDisabled || isEqual(field.value, threatDefault)}
              onClick={() => onRemoveThreats([threat])}
              aria-label={Rulei18n.DELETE}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={`mitreFrameworkSection-${framework}`}>
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow>
          <EuiTitle size="xxs">
            <h4>{frameworkLabel}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.REMOVE_FRAMEWORK} disableScreenReaderOutput>
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              aria-label={i18n.REMOVE_FRAMEWORK}
              data-test-subj="removeMitreFramework"
              isDisabled={isDisabled || threats.length === 0}
              onClick={() => onRemoveThreats(threats)}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiLoadingSpinner size="m" data-test-subj="mitreAttackLoading" />
      ) : isError ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.MITRE_LOADING_ERROR(frameworkLabel)}
          data-test-subj="mitreAttackError"
        />
      ) : (
        <>
          {threats.map((threat) => {
            const index = (field.value as Threats).indexOf(threat);
            if (index === -1) {
              return null;
            }
            const tacticUnsupported = isUnsupportedTactic(threat);
            const tacticError = tacticUnsupported
              ? i18n.UNSUPPORTED_MITRE_ID_ERROR(threat.tactic.id, frameworkLabel)
              : undefined;
            const tacticRenamedFrom = getRenamedFromName(threat);
            const tacticHelpText = tacticRenamedFrom
              ? i18n.RENAMED_FROM_HINT(tacticRenamedFrom, frameworkLabel)
              : undefined;
            return (
              <div key={`${threat.tactic?.id ?? 'none'}-${index}`}>
                <EuiFormRow
                  fullWidth
                  describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                  isInvalid={tacticUnsupported}
                  error={tacticError}
                  helpText={tacticHelpText}
                >
                  {getSelectTactic(threat, isDisabled)}
                </EuiFormRow>
                <MitreAttackTechniqueFields
                  field={field}
                  threatIndex={index}
                  isDisabled={isDisabled || threat.tactic.name === 'none'}
                  idAria={idAria}
                  onFieldChange={onFieldChange}
                  tactics={tactics}
                  techniques={techniques}
                  subtechniques={subtechniques}
                  labelPrefix={frameworkLabel}
                />
              </div>
            );
          })}
          <MyAddItemButton
            data-test-subj="addMitreAttackTactic"
            onClick={addTactic}
            isDisabled={isDisabled}
          >
            {i18n.ADD_MITRE_TACTIC}
          </MyAddItemButton>
        </>
      )}
    </EuiPanel>
  );
};
