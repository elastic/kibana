/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface DisabledTypesTextType {
  [typeName: string]: string;
}
import * as i18n from '../translations';

export const disabledTypesWithTooltipText: DisabledTypesTextType = {
  binary: i18n.BINARY_TYPE_NOT_SUPPORTED,
};
