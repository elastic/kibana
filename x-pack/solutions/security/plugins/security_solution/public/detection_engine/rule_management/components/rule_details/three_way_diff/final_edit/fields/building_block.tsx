/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { Field, UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { BuildingBlockObject } from '../../../../../../../../common/api/detection_engine';

export const buildingBlockSchema = { isBuildingBlock: schema.isBuildingBlock } as FormSchema<{
  isBuildingBlock: boolean;
}>;

export function BuildingBlockEdit(): JSX.Element {
  return <UseField path="isBuildingBlock" component={Field} />;
}

export function buildingBlockDeserializer(defaultValue: FormData) {
  return {
    isBuildingBlock: defaultValue.building_block,
  };
}

export function buildingBlockSerializer(formData: FormData): {
  building_block: BuildingBlockObject | undefined;
} {
  return { building_block: formData.isBuildingBlock ? { type: 'default' } : undefined };
}
