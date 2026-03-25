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
import React, { useCallback, useState } from 'react';
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

  const sloOptions: EuiComboBoxOptionOption[] = (sloDefinitions?.results ?? []).map((slo) => ({
    label: slo.name,
    value: slo.id,
    key: slo.id,
  }));

  const handleAddMember = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      if (!selected.length) return;
      const { label, value } = selected[0];
      const sloId = String(value);
      const alreadyAdded = members.some((m) => m.sloId === sloId);
      if (!alreadyAdded && members.length < MAX_COMPOSITE_MEMBERS) {
        append({ sloId, sloName: label, instanceId: ALL_VALUE, weight: 1 });
      }
      setSloSearch('');
    },
    [append, members]
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
            options={sloOptions.filter((opt) => !members.some((m) => m.sloId === String(opt.value)))}
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
  const { control, watch } = useFormContext<CreateCompositeSLOForm>();
  const sloId = watch(`members.${index}.sloId`);
  const sloName = watch(`members.${index}.sloName`);

  const { data: instances, isLoading: isLoadingInstances } = useFetchSloInstances({
    sloId,
    size: 100,
  });

  const instanceOptions: EuiComboBoxOptionOption[] = [
    {
      label: i18n.translate('xpack.slo.compositeSloEdit.members.instanceId.allInstances', {
        defaultMessage: 'All instances',
      }),
      value: ALL_VALUE,
    },
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
        <Controller
          name={`members.${index}.instanceId`}
          control={control}
          render={({ field: { value, onChange } }) => {
            const selected = instanceOptions.filter((opt) => opt.value === (value ?? ALL_VALUE));
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
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <Controller
          name={`members.${index}.weight`}
          control={control}
          rules={{ required: true, min: 0.01, max: 1000 }}
          render={({ field: { ref, onChange, value }, fieldState }) => (
            <EuiFieldNumber
              compressed
              isInvalid={fieldState.invalid}
              value={value}
              min={0.01}
              step={0.01}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              data-test-subj={`compositeSloMemberWeightInput-${index}`}
            />
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
