/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { EMPTY_STAT } from '../../../../../constants';

export const getFormattedCheckTime = (checkedAt: number) =>
  moment(checkedAt).isValid() ? moment(checkedAt).format('MMM DD, YYYY @ HH:mm:ss') : EMPTY_STAT;
