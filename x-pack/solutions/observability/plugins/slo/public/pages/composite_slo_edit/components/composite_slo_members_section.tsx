/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useFetchSloDefinitionsWithRemote } from '../../../hooks/use_fetch_slo_definitions_with_remote';
import { useFetchSloInstances } from '../../../hooks/use_fetch_slo_instances';
import { MAX_COMPOSITE_MEMBERS, MAX_WIDTH } from '../constants';
import type { CreateCompositeSLOForm } from '../types';

export function CompositeSloMembersSection() {
  const { control, watch } = useFormContext<CreateCompositeSLOForm>();
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });
  const members = watch('members');

  const [sloSearch, setSloSearch] = useState('');
  const { data: sloDefinitions, isLoading: isLoadingSlos } = useFetchSloDefinitionsWithRemote({
    search: sloSearch,
    size: 50,
  });

  const sloOptions: EuiComboBoxOptionOption[] = (sloDefinitions?.results ?? [])
    .filter((slo) => !slo.remote)
    .map((slo) => ({
      label: slo.name,
      value: slo.id,
      key: slo.id,
    }));

  const handleAddMember = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      if (!selected.length) return;
      const { label, value } = selected[0];
      const sloId = String(value);
      const sloDefinition = sloDefinitions?.results.find((slo) => slo.id === sloId);
      const groupBy = sloDefinition?.groupBy ?? ALL_VALUE;
      if (members.length < MAX_COMPOSITE_MEMBERS) {
        append({ sloId, sloName: label, groupBy, instanceId: ALL_VALUE, weight: 1 });
      }
      setSloSearch('');
    },
    [append, members, sloDefinitions]
  );

  const atMax = fields.length >= MAX_COMPOSITE_MEMBERS;

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="compositeSloMembersSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {atMax && (
          <EuiCallOut
            color="warning"
            size="s"
            title={i18n.translate('xpack.slo.compositeSloEdit.members.maxWarning', {
              defaultMessage: 'Maximum of {max} member SLOs reached.',
              values: { max: MAX_COMPOSITE_MEMBERS },
            })}
          />
        )}

        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.slo.compositeSloEdit.members.addSlo.label', {
            defaultMessage: 'Add member SLOs',
          })}
          helpText={i18n.translate('xpack.slo.compositeSloEdit.members.addSlo.helpText', {
            defaultMessage: 'Search and select SLOs to include. Maximum {max} members.',
            values: { max: MAX_COMPOSITE_MEMBERS },
          })}
        >
          <EuiComboBox
            fullWidth
            isDisabled={atMax}
            isLoading={isLoadingSlos}
            options={sloOptions}
            selectedOptions={[]}
            onSearchChange={setSloSearch}
            onChange={handleAddMember}
            isClearable={false}
            singleSelection={{ asPlainText: true }}
            placeholder={i18n.translate('xpack.slo.compositeSloEdit.members.addSlo.placeholder', {
              defaultMessage: 'Search for an SLO...',
            })}
            data-test-subj="compositeSloMemberComboBox"
          />
        </EuiFormRow>

        {fields.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={4}>
                <EuiText size="xs" color="subdued">
                  <strong>
                    {i18n.translate('xpack.slo.compositeSloEdit.members.table.sloColumn', {
                      defaultMessage: 'SLO',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiText size="xs" color="subdued">
                  <strong>
                    {i18n.translate('xpack.slo.compositeSloEdit.members.table.instanceColumn', {
                      defaultMessage: 'Instance',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiText size="xs" color="subdued">
                  <strong>
                    {i18n.translate('xpack.slo.compositeSloEdit.members.table.weightColumn', {
                      defaultMessage: 'Weight',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: 32 }} />
            </EuiFlexGroup>

            {fields.map((field, index) => (
              <MemberRow key={field.id} index={index} onRemove={() => remove(index)} />
            ))}
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

interface MemberRowProps {
  index: number;
  onRemove: () => void;
}

function MemberRow({ index, onRemove }: MemberRowProps) {
  const { control, watch, setValue } = useFormContext<CreateCompositeSLOForm>();
  const sloId = watch(`members.${index}.sloId`);
  const sloName = watch(`members.${index}.sloName`);
  const groupBy = watch(`members.${index}.groupBy`);
  const instanceId = watch(`members.${index}.instanceId`);

  const isGrouped = [groupBy].flat().some((g) => g !== ALL_VALUE);

  // If the member SLO's groupBy was removed after the composite was created, reset
  // the stale instanceId so it is not silently sent to the API while the UI shows
  // "All instances".
  useEffect(() => {
    if (!isGrouped && instanceId !== ALL_VALUE) {
      setValue(`members.${index}.instanceId`, ALL_VALUE);
    }
  }, [isGrouped, instanceId, index, setValue]);

  const { data: instances, isLoading: isLoadingInstances } = useFetchSloInstances({
    sloId,
    size: 100,
    enabled: isGrouped,
  });

  const allInstancesOption: EuiComboBoxOptionOption = {
    label: i18n.translate('xpack.slo.compositeSloEdit.members.instanceId.allInstances', {
      defaultMessage: 'All instances',
    }),
    value: ALL_VALUE,
  };

  const instanceOptions: EuiComboBoxOptionOption[] = [
    allInstancesOption,
    ...(instances?.results ?? []).map((inst) => ({
      label: inst.instanceId,
      value: inst.instanceId,
    })),
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart">
      <EuiFlexItem grow={4}>
        <EuiText size="s" style={{ paddingTop: 8 }}>
          {sloName}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={3}>
        {isGrouped ? (
          <Controller
            name={`members.${index}.instanceId`}
            control={control}
            render={({ field: { value, onChange } }) => {
              const selected = instanceOptions.filter((opt) => opt.value === value);
              return (
                <EuiComboBox
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  isLoading={isLoadingInstances}
                  options={instanceOptions}
                  selectedOptions={selected}
                  onChange={(opts) => onChange(opts[0]?.value ?? ALL_VALUE)}
                  isClearable={false}
                  compressed
                  data-test-subj={`compositeSloMemberInstanceComboBox-${index}`}
                />
              );
            }}
          />
        ) : (
          <EuiText size="s" color="subdued" style={{ paddingTop: 4 }}>
            {i18n.translate('xpack.slo.compositeSloEdit.members.instanceId.allInstances', {
              defaultMessage: 'All instances',
            })}
          </EuiText>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <Controller
          name={`members.${index}.weight`}
          control={control}
          rules={{ required: true, min: 1, validate: (v) => Number.isInteger(v) }}
          render={({ field: { ref, onChange, value }, fieldState }) => (
            <EuiFormRow
              isInvalid={fieldState.invalid}
              error={
                fieldState.invalid
                  ? i18n.translate('xpack.slo.compositeSloEdit.members.weight.error', {
                      defaultMessage: 'Weight must be a positive integer.',
                    })
                  : undefined
              }
            >
              <EuiFieldNumber
                compressed
                isInvalid={fieldState.invalid}
                value={value}
                min={1}
                step={1}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                data-test-subj={`compositeSloMemberWeightInput-${index}`}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('xpack.slo.compositeSloEdit.members.removeButton', {
            defaultMessage: 'Remove {name}',
            values: { name: sloName },
          })}
          onClick={onRemove}
          data-test-subj={`compositeSloMemberRemoveButton-${index}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
