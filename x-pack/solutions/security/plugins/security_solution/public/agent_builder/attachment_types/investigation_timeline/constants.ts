/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Moment format for timeline timestamps. Uses second precision.
 * The time zone follows the user's `dateFormat:tz` setting, and the
 * raw value stays available on hover.
 */
export const TIMELINE_TIMESTAMP_FORMAT = 'MMM D, YYYY @ HH:mm:ss';
