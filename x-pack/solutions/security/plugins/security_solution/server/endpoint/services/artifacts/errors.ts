/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from '../../../../common/endpoint/errors';

/**
 * Indicates that the internal manifest that is managed by ManifestManager is invalid or contains
 * invalid data
 */
export class InvalidInternalManifestError extends EndpointError {}
