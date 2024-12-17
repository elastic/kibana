/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { createCellActionFactory, type CellActionTemplate } from '@kbn/cell-actions/actions';
import {
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  filterOutNullableValues,
  valueToArray,
} from '@kbn/cell-actions/actions/utils';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import { timelineActions } from '../../../../timelines/store';
import { addProvider, showTimeline } from '../../../../timelines/store/actions';
import { TimelineId } from '../../../../../common/types';
import type { SecurityAppStore } from '../../../../common/store';
import { fieldHasCellActions } from '../../utils';
import { extractTimelineCapabilities } from '../../../../common/utils/timeline_capabilities';
import {
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  INVESTIGATE_IN_TIMELINE,
} from '../constants';
import { createDataProviders, isValidDataProviderField } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../../types';
import type { SecurityCellAction } from '../../types';
import { timelineDefaults } from '../../../../timelines/store/defaults';

export const createInvestigateInNewTimelineCellActionFactory = createCellActionFactory(
  ({
    store,
    services,
  }: {
    store: SecurityAppStore;
    services: StartServices;
  }): CellActionTemplate<SecurityCellAction> => {
    const {
      notifications: notificationsService,
      application: { capabilities },
    } = services;
    const timelineCapabilities = extractTimelineCapabilities(capabilities);

    return {
      type: SecurityCellActionType.INVESTIGATE_IN_NEW_TIMELINE,
      getIconType: () => ADD_TO_TIMELINE_ICON,
      getDisplayName: () => INVESTIGATE_IN_TIMELINE,
      getDisplayNameTooltip: () => INVESTIGATE_IN_TIMELINE,
      isCompatible: async ({ data }) => {
        const field = data[0]?.field;

        return (
          (timelineCapabilities.read || timelineCapabilities.crud) &&
          data.length === 1 && // TODO Add support for multiple values
          fieldHasCellActions(field.name) &&
          isValidDataProviderField(field.name, field.type) &&
          isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
        );
      },
      execute: async ({ data, metadata }) => {
        const field = data[0]?.field;
        const rawValue = data[0]?.value;
        const value = filterOutNullableValues(valueToArray(rawValue));

        if (!isValueSupportedByDefaultActions(value)) {
          notificationsService.toasts.addWarning({
            title: ACTION_INCOMPATIBLE_VALUE_WARNING,
          });
          return;
        }

        const dataProviders =
          createDataProviders({
            contextId: TimelineId.active,
            fieldType: field.type,
            values: value,
            field: field.name,
            negate: metadata?.negateFilters === true,
          }) ?? [];

        for (const andFilter of metadata?.andFilters ?? []) {
          const andDataProviders =
            createDataProviders({
              contextId: TimelineId.active,
              field: andFilter.field,
              values: andFilter.value,
            }) ?? [];
          if (andDataProviders) {
            for (const dataProvider of dataProviders) {
              dataProvider.and.push(...andDataProviders);
            }
          }
        }

        if (dataProviders.length > 0) {
          // clear timeline
          store.dispatch(
            timelineActions.createTimeline({
              ...timelineDefaults,
              id: TimelineId.active,
            })
          );
          store.dispatch(showTimeline({ id: TimelineId.active, show: true }));

          store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));
        } else {
          notificationsService.toasts.addWarning({
            title: ADD_TO_TIMELINE_FAILED_TITLE,
            text: ADD_TO_TIMELINE_FAILED_TEXT,
          });
        }
      },
    };
  }
);
