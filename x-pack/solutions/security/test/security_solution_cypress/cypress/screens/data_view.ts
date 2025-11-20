/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const DATA_VIEW_PICKER = getDataTestSubjectSelector('new-data-view-picker');

export const DATA_VIEW_PICKER_POPOVER = getDataTestSubjectSelector('changeDataViewPopover');

export const MANAGE_DATA_VIEW_BUTTON = getDataTestSubjectSelector('indexPattern-manage-field');

export const INDEX_PATTERN_INPUT = getDataTestSubjectSelector('createIndexPatternTitleInput');

export const CLOSE_MANAGE_DATA_VIEW_FLYOUT_BUTTON = getDataTestSubjectSelector('closeFlyoutButton');
