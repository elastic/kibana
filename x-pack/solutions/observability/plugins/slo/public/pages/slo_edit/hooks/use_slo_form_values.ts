/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSLOResponse } from '@kbn/slo-schema';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { transformSloResponseToFormState } from '../helpers/process_slo_form_values';
import type { CreateSLOForm } from '../types';
import { useParseTemplateId } from './use_parse_template_id';
import { useParseUrlState } from './use_parse_url_state';

export interface UseSloFormValuesResponse {
  initialValues: CreateSLOForm | undefined;
  isLoading: boolean;
  isEditMode: boolean;
  slo: GetSLOResponse | undefined;
}

export function useSloFormValues(sloId?: string): UseSloFormValuesResponse {
  const isEditMode = Boolean(sloId);

  const { data: slo, isInitialLoading: isSloLoading } = useFetchSloDetails({ sloId });
  const sloFormValuesFromSloResponse = transformSloResponseToFormState(slo);

  const sloFormValuesFromUrlState = useParseUrlState();
  const { isInitialLoading: isTemplateLoading, data: sloFormValuesFromTemplateId } =
    useParseTemplateId();

  const initialValues = isEditMode
    ? sloFormValuesFromSloResponse
    : sloFormValuesFromUrlState ?? sloFormValuesFromTemplateId;

  return {
    initialValues,
    isLoading: isSloLoading || isTemplateLoading,
    isEditMode,
    slo,
  };
}
