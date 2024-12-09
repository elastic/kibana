/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { createCellActionFactory, type CellActionTemplate } from '@kbn/cell-actions/actions';
import { isDataViewFieldSubtypeNested } from '@kbn/es-query';
import { first } from 'lodash/fp';
import { fieldHasCellActions } from '../../utils';
import type { StartServices } from '../../../../types';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';
import { isLensSupportedType } from '../../../../common/utils/lens';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.actions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

const ICON = 'visBarVertical';

export const createShowTopNCellActionFactory = createCellActionFactory(
  ({ services }: { services: StartServices }): CellActionTemplate<SecurityCellAction> => ({
    type: SecurityCellActionType.SHOW_TOP_N,
    getIconType: () => ICON,
    getDisplayName: ({ data }) => SHOW_TOP(data[0]?.field.name),
    getDisplayNameTooltip: ({ data }) => SHOW_TOP(data[0]?.field.name),
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 &&
        fieldHasCellActions(field.name) &&
        isLensSupportedType(field.type) &&
        !isDataViewFieldSubtypeNested(field) &&
        !!field.aggregatable
      );
    },
    execute: async (context) => {
      const firstItem = first(context.data);
      if (!context.nodeRef.current || !firstItem) return;

      services.topValuesPopover.showPopover({
        fieldName: firstItem.field.name,
        scopeId: context.metadata?.scopeId,
        nodeRef: context.nodeRef.current,
      });
    },
  })
);
