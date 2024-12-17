/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Actions, getActionsColumnWidth } from '../../../../../common/components/header_actions';
import type { ControlColumnProps } from '../../../../../../common/types';

import * as i18n from '../../../../../common/components/events_viewer/translations';

export const getDefaultControlColumn = (actionButtonCount: number): ControlColumnProps[] => [
  {
    headerCellRender: () => <>{i18n.ACTIONS}</>,
    id: 'default-timeline-control-column',
    rowCellRender: Actions,
    width: getActionsColumnWidth(actionButtonCount),
  },
];
