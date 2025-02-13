/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn, addFilterOut, createFilterOutActionFactory } from '@kbn/cell-actions/actions';
import {
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  filterOutNullableValues,
  valueToArray,
} from '@kbn/cell-actions/actions/utils';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { fieldHasCellActions } from '../../utils';
import type { SecurityAppStore } from '../../../../common/store';
import type { StartServices } from '../../../../types';
import { isTimelineScope } from '../../../../helpers';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';

export const createFilterOutCellActionFactory = ({
  services,
}: {
  store: SecurityAppStore;
  services: StartServices;
}) => {
  const { filterManager } = services.data.query;
  const { notifications } = services;
  const {
    query: { filterManager: timelineFilterManager },
  } = services.timelineDataService;

  const genericFilterOutActionFactory = createFilterOutActionFactory({
    filterManager,
    notifications,
  });

  return genericFilterOutActionFactory.combine<SecurityCellAction>({
    type: SecurityCellActionType.FILTER,
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 && // TODO Add support for multiple values
        fieldHasCellActions(field.name) &&
        isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
      );
    },
    execute: async ({ data, metadata }) => {
      const fieldName = data[0]?.field.name;
      const rawValue = data[0]?.value;
      const dataViewId = metadata?.dataViewId;
      const value = filterOutNullableValues(valueToArray(rawValue));

      if (!isValueSupportedByDefaultActions(value)) {
        notifications.toasts.addWarning({
          title: ACTION_INCOMPATIBLE_VALUE_WARNING,
        });
        return;
      }

      if (!fieldName) return;

      // if negateFilters is true we have to perform the opposite operation, we can just execute filterIn with the same params
      const addFilter = metadata?.negateFilters === true ? addFilterIn : addFilterOut;

      if (metadata?.scopeId && isTimelineScope(metadata.scopeId)) {
        addFilter({ filterManager: timelineFilterManager, fieldName, value, dataViewId });
      } else {
        addFilter({ filterManager, fieldName, value, dataViewId });
      }
    },
  });
};
