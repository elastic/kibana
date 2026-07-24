/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

/**
 * Deliberately follows the Nightshift design spec instead of the `dateFormat`
 * advanced setting. `dateFormat:tz` is still respected — core sets moment's
 * default timezone from it.
 */
export const NIGHTSHIFT_TIMESTAMP_FORMAT = 'MMM D, YYYY @ HH:mm:ss';

export const formatTimestamp = (timestamp: string): string =>
  moment(timestamp).format(NIGHTSHIFT_TIMESTAMP_FORMAT);
