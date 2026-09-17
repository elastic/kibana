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
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { isEqual } from 'lodash';
import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import { getMitreEntityDisplayName } from '@kbn/security-mitre-attack-common';
import * as Rulei18n from '../../../common/translations';
import type { FieldHook } from '../../../../shared_imports';
import { threatDefault } from '../step_about_rule/default_value';
import { MyAddItemButton } from '../add_item_form';
import * as i18n from './translations';
import { MitreAttackTechniqueFields } from './technique_fields';
import { sortMitreEntitiesByName } from './helpers';
import { createUnsupportedMitreOption } from './unsupported_mitre_option';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';

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
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );

  const { tactics, techniques, subtechniques, isLoading, isError } = useMitreConfiguration();

  const removeTactic = useCallback(
    (index: number) => {
      const values = [...(field.value as Threats)];
      values.splice(index, 1);
      if (isEmpty(values)) {
        field.setValue(threatDefault);
      } else {
        field.setValue(values);
      }
    },
    [field]
  );

  const addMitreAttackTactic = useCallback(() => {
    const values = [...(field.value as Threats)];
    if (!isEmpty(values[values.length - 1])) {
      field.setValue([
        ...values,
        { tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] },
      ]);
    } else {
      field.setValue([{ tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] }]);
    }
  }, [field]);

  const updateTactic = useCallback(
    (index: number, value: string) => {
      const values = [...(field.value as Threats)];
      const { id, reference, name } = tactics.find((t) => t.id === value) ?? {
        id: '',
        name: '',
        reference: '',
      };
      values.splice(index, 1, {
        ...values[index],
        tactic: { id, reference, name },
        technique: [],
      });
      field.setValue([...values]);
    },
    [field, tactics]
  );

  const values = useMemo(() => {
    return [...(field.value as Threats)];
  }, [field]);

  // Pickers present tactics alphabetically; sort here so getSelectTactic receives a stable,
  // name-ordered reference without re-sorting on every render.
  const sortedTactics = useMemo(() => sortMitreEntitiesByName(tactics), [tactics]);

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

  const getSelectTactic = useCallback(
    (threat: Threat, index: number, disabled: boolean) => {
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
                ...sortedTactics.map((t) => ({
                  inputDisplay: <>{getMitreEntityDisplayName(t)}</>,
                  value: t.id,
                  disabled,
                })),
              ]}
              prepend={`${field.label} ${i18n.TACTIC}`}
              aria-label=""
              onChange={updateTactic.bind(null, index)}
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
                isDisabled={isDisabled || isEqual(values, threatDefault)}
                onClick={() => removeTactic(index)}
                aria-label={Rulei18n.DELETE}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [
      field.label,
      isDisabled,
      isUnsupportedTactic,
      removeTactic,
      sortedTactics,
      updateTactic,
      values,
    ]
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

  if (isLoading) {
    return (
      <MitreAttackContainer>
        <EuiLoadingSpinner size="m" data-test-subj="mitreAttackLoading" />
      </MitreAttackContainer>
    );
  }

  if (isError) {
    return (
      <MitreAttackContainer>
        <KbnDangerCallout
          announceOnMount
          title={i18n.MITRE_LOADING_ERROR}
          data-test-subj="mitreAttackError"
        />
      </MitreAttackContainer>
    );
  }

  return (
    <MitreAttackContainer>
      {values.map((threat, index) => {
        const tacticUnsupported = isUnsupportedTactic(threat);
        const tacticError = tacticUnsupported
          ? i18n.UNSUPPORTED_MITRE_ID_ERROR(threat.tactic.id)
          : undefined;
        const tacticRenamedFrom = getRenamedFromName(threat);
        const tacticHelpText = tacticRenamedFrom
          ? i18n.RENAMED_FROM_HINT(tacticRenamedFrom)
          : undefined;
        return (
          <div key={index}>
            {index === 0 ? (
              <EuiFormRow
                fullWidth
                label={`${field.label} ${i18n.THREATS}`}
                labelAppend={field.labelAppend}
                describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                isInvalid={tacticUnsupported}
                error={tacticError}
                helpText={tacticHelpText}
              >
                <>{getSelectTactic(threat, index, isDisabled)}</>
              </EuiFormRow>
            ) : (
              <EuiFormRow
                fullWidth
                describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                isInvalid={tacticUnsupported}
                error={tacticError}
                helpText={tacticHelpText}
              >
                {getSelectTactic(threat, index, isDisabled)}
              </EuiFormRow>
            )}

            <MitreAttackTechniqueFields
              field={field}
              threatIndex={index}
              isDisabled={isDisabled || threat.tactic.name === 'none'}
              idAria={idAria}
              onFieldChange={onFieldChange}
              tactics={tactics}
              techniques={techniques}
              subtechniques={subtechniques}
            />
          </div>
        );
      })}
      <MyAddItemButton
        data-test-subj="addMitreAttackTactic"
        onClick={addMitreAttackTactic}
        isDisabled={isDisabled}
      >
        {i18n.ADD_MITRE_TACTIC}
      </MyAddItemButton>
    </MitreAttackContainer>
  );
});
