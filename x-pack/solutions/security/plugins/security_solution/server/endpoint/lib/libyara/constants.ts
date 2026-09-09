/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Meta keys are completely arbitrary in a YARA rule, but we are interested in the following keys:
 * - os: The operating system of the rule.
 * - arch: The architecture of the rule.
 * - scan_type: The scan type of the rule.
 */
export const YARA_META_KEYS_OF_INTEREST = ['os', 'arch', 'scan_type'] as const;
