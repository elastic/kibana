/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactElement } from 'react';
import React from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { useSectionFormValidation } from '../hooks/use_section_form_validation';
import { useShowSections } from '../hooks/use_show_sections';
import type { CreateSLOForm } from '../types';

interface Props {
  isEditMode: boolean;
  indicatorSection: ReactElement;
  objectiveSection: ReactElement;
  descriptionSection: ReactElement;
}

/**
 * Owns the form subscriptions that change on every keystroke (section validity, isValidating) so the
 * form root never re-renders on field changes. The section elements are created once by the root and
 * passed in, so React skips re-rendering them when only this component updates.
 */
export function SloEditFormSteps({
  isEditMode,
  indicatorSection,
  objectiveSection,
  descriptionSection,
}: Props) {
  const { control } = useFormContext<CreateSLOForm>();
  const { isValidating } = useFormState({ control });

  const { isIndicatorSectionValid, isObjectiveSectionValid, isDescriptionSectionValid } =
    useSectionFormValidation();

  const { showDescriptionSection, showObjectiveSection } = useShowSections(
    isEditMode,
    isValidating,
    isIndicatorSectionValid,
    isObjectiveSectionValid
  );

  return (
    <EuiSteps
      steps={[
        {
          title: i18n.translate('xpack.slo.sloEdit.definition.title', {
            defaultMessage: 'Define SLI',
          }),
          children: indicatorSection,
          status: isIndicatorSectionValid ? 'complete' : 'incomplete',
        },
        {
          title: i18n.translate('xpack.slo.sloEdit.objectives.title', {
            defaultMessage: 'Set objectives',
          }),
          children: showObjectiveSection ? objectiveSection : null,
          status: showObjectiveSection && isObjectiveSectionValid ? 'complete' : 'incomplete',
        },
        {
          title: i18n.translate('xpack.slo.sloEdit.description.title', {
            defaultMessage: 'Describe SLO',
          }),
          children: showDescriptionSection ? descriptionSection : null,
          status: showDescriptionSection && isDescriptionSectionValid ? 'complete' : 'incomplete',
        },
      ]}
    />
  );
}
