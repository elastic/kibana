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
  EuiSpacer,
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';

import type { Threat, Threats, ThreatTechnique } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  MitreTacticSummary,
  MitreTechniqueSummary,
  MitreSubtechniqueSummary,
} from '@kbn/security-mitre-attack-common';
import { getMitreEntityDisplayName } from '@kbn/security-mitre-attack-common';
import * as Rulei18n from '../../../common/translations';
import type { FieldHook } from '../../../../shared_imports';
import { MyAddItemButton } from '../add_item_form';
import * as i18n from './translations';
import { MitreAttackSubtechniqueFields } from './subtechnique_fields';
import { createUnsupportedMitreOption } from './unsupported_mitre_option';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { hasSubtechniqueOptions } from './helpers';
const TechniqueContainer = styled.div`
  ${({ theme }) => css`
    margin-left: 24px;
    padding-left: 24px;
    border-left: 2px solid ${theme.eui.euiColorLightestShade};
  `}
`;

interface AddTechniqueProps {
  field: FieldHook;
  threatIndex: number;
  idAria: string;
  isDisabled: boolean;
  onFieldChange: (threats: Threats) => void;
  tactics: MitreTacticSummary[];
  techniques: MitreTechniqueSummary[];
  subtechniques: MitreSubtechniqueSummary[];
}

export const MitreAttackTechniqueFields: React.FC<AddTechniqueProps> = ({
  field,
  idAria,
  isDisabled,
  threatIndex,
  onFieldChange,
  tactics,
  techniques,
  subtechniques,
}): JSX.Element => {
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );

  const values = field.value as Threats;

  const removeTechnique = useCallback(
    (index: number) => {
      const threats = [...(field.value as Threats)];
      const techniqueList = threats[threatIndex].technique ?? [];
      techniqueList.splice(index, 1);
      threats[threatIndex] = {
        ...threats[threatIndex],
        technique: techniqueList,
      };
      onFieldChange(threats);
    },
    [field, threatIndex, onFieldChange]
  );

  const addMitreAttackTechnique = useCallback(() => {
    const threats = [...(field.value as Threats)];
    threats[threatIndex] = {
      ...threats[threatIndex],
      technique: [
        ...(threats[threatIndex].technique ?? []),
        { id: 'none', name: 'none', reference: 'none', subtechnique: [] },
      ],
    };
    onFieldChange(threats);
  }, [field, threatIndex, onFieldChange]);

  const updateTechnique = useCallback(
    (index: number, optionId: string) => {
      const threats = [...(field.value as Threats)];
      const { id, reference, name } = techniques.find((t) => t.id === optionId) ?? {
        id: '',
        name: '',
        reference: '',
      };
      const technique = threats[threatIndex].technique ?? [];
      onFieldChange([
        ...threats.slice(0, threatIndex),
        {
          ...threats[threatIndex],
          technique: [
            ...technique.slice(0, index),
            {
              id,
              reference,
              name,
              subtechnique: [],
            },
            ...technique.slice(index + 1),
          ],
        },
        ...threats.slice(threatIndex + 1),
      ]);
    },
    [field.value, techniques, threatIndex, onFieldChange]
  );

  const findCurrentTechniqueOption = useCallback(
    (technique: ThreatTechnique) =>
      technique.name === 'none' || techniques.length === 0
        ? undefined
        : techniques.find((t) => t.id === technique.id),
    [techniques]
  );

  const isUnsupportedTechnique = useCallback(
    (technique: ThreatTechnique) =>
      isMitreAttackUpdatesUIEnabled &&
      techniques.length > 0 &&
      technique.name !== 'none' &&
      findCurrentTechniqueOption(technique) === undefined,
    [findCurrentTechniqueOption, isMitreAttackUpdatesUIEnabled, techniques]
  );

  // True when the technique id still exists in the dataset but is no longer
  // assigned to the parent tactic (e.g. MITRE moved it in a version bump).
  // Without this signal, the EuiSuperSelect renders blank because its
  // `valueOfSelected` matches no option in the cascade-filtered list.
  const isTechniqueReassignedFromTactic = useCallback(
    (parentTactic: Threat['tactic'], technique: ThreatTechnique) => {
      if (
        !isMitreAttackUpdatesUIEnabled ||
        techniques.length === 0 ||
        tactics.length === 0 ||
        technique.name === 'none'
      ) {
        return false;
      }
      const option = findCurrentTechniqueOption(technique);
      if (!option) {
        return false;
      }
      return !option.tactic_ids.includes(parentTactic.id);
    },
    [findCurrentTechniqueOption, isMitreAttackUpdatesUIEnabled, tactics, techniques]
  );

  const getTechniqueRenamedFromName = useCallback(
    (technique: ThreatTechnique) => {
      if (!isMitreAttackUpdatesUIEnabled) return undefined;
      const matchedOption = findCurrentTechniqueOption(technique);
      return matchedOption && matchedOption.name !== technique.name ? technique.name : undefined;
    },
    [findCurrentTechniqueOption, isMitreAttackUpdatesUIEnabled]
  );

  const getSelectTechnique = useCallback(
    (
      parentTactic: Threat['tactic'],
      index: number,
      disabled: boolean,
      technique: ThreatTechnique
    ) => {
      // Filter techniques belonging to the parent tactic using MITRE tactic ids so renames
      // in MITRE upgrades don't blank the list. The managed source returns entities
      // name-ordered, so the filtered subset is already in the correct display order.
      const options = techniques.filter((t) => t.tactic_ids.includes(parentTactic.id));
      const isUnsupported = isUnsupportedTechnique(technique);
      const isReassigned = isTechniqueReassignedFromTactic(parentTactic, technique);
      const reassignedOption = isReassigned ? findCurrentTechniqueOption(technique) : undefined;
      return (
        <>
          <EuiSuperSelect
            id="mitreAttackTechnique"
            options={[
              ...(technique.name === 'none'
                ? [
                    {
                      inputDisplay: <>{i18n.TECHNIQUE_PLACEHOLDER}</>,
                      value: 'none',
                      disabled,
                    },
                  ]
                : []),
              ...(isUnsupported
                ? [createUnsupportedMitreOption({ id: technique.id, name: technique.name })]
                : []),
              // Prefer the dataset's current name for reassigned techniques so
              // the user sees the up-to-date label, falling back to stored.
              ...(isReassigned
                ? [
                    createUnsupportedMitreOption({
                      id: technique.id,
                      name: reassignedOption?.name ?? technique.name,
                    }),
                  ]
                : []),
              ...options.map((option) => ({
                inputDisplay: <>{getMitreEntityDisplayName(option)}</>,
                value: option.id,
                disabled,
              })),
            ]}
            prepend={`${field.label} ${i18n.TECHNIQUE}`}
            aria-label=""
            onChange={updateTechnique.bind(null, index)}
            fullWidth={true}
            valueOfSelected={technique.id}
            data-test-subj="mitreAttackTechnique"
            disabled={disabled}
            placeholder={i18n.TECHNIQUE_PLACEHOLDER}
            isInvalid={isUnsupported || isReassigned}
          />
        </>
      );
    },
    [
      field.label,
      findCurrentTechniqueOption,
      isTechniqueReassignedFromTactic,
      isUnsupportedTechnique,
      techniques,
      updateTechnique,
    ]
  );

  const threatEntry = values[threatIndex];
  const techniqueList = threatEntry?.technique ?? [];

  return (
    <TechniqueContainer>
      {techniqueList.map((technique, index) => {
        const techniqueUnsupported = isUnsupportedTechnique(technique);
        const techniqueReassigned = isTechniqueReassignedFromTactic(
          values[threatIndex].tactic,
          technique
        );
        const techniqueRenamedFrom = getTechniqueRenamedFromName(technique);
        const techniqueErrorMessage = techniqueUnsupported
          ? i18n.UNSUPPORTED_MITRE_ID_ERROR(technique.id)
          : techniqueReassigned
          ? i18n.TECHNIQUE_REASSIGNED_FROM_TACTIC_ERROR(technique.id)
          : undefined;
        return (
          <div key={index}>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              describedByIds={idAria ? [`${idAria} ${i18n.TECHNIQUE}`] : undefined}
              isInvalid={techniqueUnsupported || techniqueReassigned}
              error={techniqueErrorMessage}
              helpText={
                techniqueRenamedFrom ? i18n.RENAMED_FROM_HINT(techniqueRenamedFrom) : undefined
              }
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow>
                  {getSelectTechnique(values[threatIndex].tactic, index, isDisabled, technique)}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={Rulei18n.DELETE} disableScreenReaderOutput>
                    <EuiButtonIcon
                      color="danger"
                      iconType="trash"
                      isDisabled={isDisabled}
                      onClick={() => removeTechnique(index)}
                      aria-label={Rulei18n.DELETE}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>

            <MitreAttackSubtechniqueFields
              field={field}
              idAria={idAria}
              isDisabled={
                isDisabled ||
                technique.name === 'none' ||
                hasSubtechniqueOptions(technique, subtechniques) === false
              }
              threatIndex={threatIndex}
              techniqueIndex={index}
              onFieldChange={onFieldChange}
              subtechniques={subtechniques}
            />
          </div>
        );
      })}
      <MyAddItemButton
        data-test-subj="addMitreAttackTechnique"
        onClick={addMitreAttackTechnique}
        isDisabled={isDisabled}
      >
        {i18n.ADD_MITRE_TECHNIQUE}
      </MyAddItemButton>
    </TechniqueContainer>
  );
};
