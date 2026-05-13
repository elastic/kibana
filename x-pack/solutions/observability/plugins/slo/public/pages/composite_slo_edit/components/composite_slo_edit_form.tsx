/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiSpacer, EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { COMPOSITE_SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import type { CreateCompositeSLOForm } from '../types';
import { CompositeSloDescriptionSection } from './composite_slo_description_section';
import { CompositeSloFormFooter } from './composite_slo_form_footer';
import { CompositeSloMembersSection } from './composite_slo_members_section';
import { CompositeSloObjectiveSection } from './composite_slo_objective_section';

interface Props {
  initialValues?: CreateCompositeSLOForm;
  compositeSloId?: string;
  isEditMode?: boolean;
}

export function CompositeSloEditForm({ initialValues, compositeSloId, isEditMode = false }: Props) {
  const form = useForm<CreateCompositeSLOForm>({
    defaultValues: initialValues ?? COMPOSITE_SLO_EDIT_FORM_DEFAULT_VALUES,
    values: initialValues,
    mode: 'all',
  });

  const { watch, formState } = form;
  const members = watch('members');
  const name = watch('name');

  const isMembersSectionValid =
    members.length > 0 && members.every((m) => Number.isInteger(m.weight) && m.weight >= 1);
  const isObjectiveSectionValid =
    formState.isValid || (!formState.errors.timeWindow && !formState.errors.objective);
  const isDescriptionSectionValid = Boolean(name);

  return (
    <FormProvider {...form}>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="compositeSloForm">
        <EuiCallOut
          size="s"
          color="primary"
          iconType="iInCircle"
          title={i18n.translate('xpack.slo.compositeSloEdit.experimentalNotice', {
            defaultMessage:
              'Composite SLOs are experimental. The weighted average of member SLO error budgets determines the composite SLO status.',
          })}
        />
        <EuiSpacer size="s" />
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.slo.compositeSloEdit.membersStep.title', {
                defaultMessage: 'Select member SLOs',
              }),
              children: <CompositeSloMembersSection />,
              status: isMembersSectionValid ? 'complete' : 'incomplete',
            },
            {
              title: i18n.translate('xpack.slo.compositeSloEdit.objectiveStep.title', {
                defaultMessage: 'Set objectives',
              }),
              children: <CompositeSloObjectiveSection />,
              status: isObjectiveSectionValid ? 'complete' : 'incomplete',
            },
            {
              title: i18n.translate('xpack.slo.compositeSloEdit.descriptionStep.title', {
                defaultMessage: 'Describe composite SLO',
              }),
              children: <CompositeSloDescriptionSection />,
              status: isDescriptionSectionValid ? 'complete' : 'incomplete',
            },
          ]}
        />

        <CompositeSloFormFooter compositeSloId={compositeSloId} isEditMode={isEditMode} />
      </EuiFlexGroup>
    </FormProvider>
  );
}
