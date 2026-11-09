/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Most technique ids a hunt carries for one report: the techniques a report hands to a run, and
 * the techniques a run reports as searched. The `maxItems` of every technique-id array in the hunt
 * route schemas (`kbn-alertzero-common/impl/schemas/hunt`) is generated from YAML and must be kept
 * at this value by hand.
 */
export const MAX_HUNT_TECHNIQUE_IDS = 100;
