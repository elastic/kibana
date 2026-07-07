/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FieldsGroupNames } from '@kbn/unified-field-list';
import type { UnifiedFieldListSidebarContainerProps } from '@kbn/unified-field-list';

// This is passed to the unified components container to initialize the field list on the left side of the view
export const getFieldsListCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] =
  () => {
    return {
      originatingApp: 'security_solution',
      localStorageKeyPrefix: 'securitySolution',
      timeRangeUpdatesType: 'timefilter',
      compressed: true,
      showSidebarToggleButton: true,
      disablePopularFields: false,
      buttonAddFieldToWorkspaceProps: {
        'aria-label': i18n.translate(
          'xpack.securitySolution.fieldChooser.timelineField.addFieldTooltip',
          {
            defaultMessage: 'Add field as column',
          }
        ),
      },
      buttonRemoveFieldFromWorkspaceProps: {
        'aria-label': i18n.translate(
          'xpack.securitySolution.timeline.fieldChooser.timelineField.removeFieldTooltip',
          {
            defaultMessage: 'Remove field from table',
          }
        ),
      },
      onOverrideFieldGroupDetails: (groupName) => {
        if (groupName === FieldsGroupNames.AvailableFields) {
          return {
            helpText: i18n.translate(
              'xpack.securitySolution.timeline.fieldChooser.availableFieldsTooltip',
              {
                defaultMessage: 'Fields available for display in the table.',
              }
            ),
          };
        }
      },
      dataTestSubj: {
        fieldListAddFieldButtonTestSubj: 'dataView-add-field_btn',
        fieldListSidebarDataTestSubj: 'timeline-sidebar',
        fieldListItemStatsDataTestSubj: 'dscFieldStats',
        fieldListItemDndDataTestSubjPrefix: 'dscFieldListPanelField',
        fieldListItemPopoverDataTestSubj: 'timelineFieldListPanelPopover',
        fieldListItemPopoverHeaderDataTestSubjPrefix: 'timelineFieldListPanel',
      },
    };
  };
