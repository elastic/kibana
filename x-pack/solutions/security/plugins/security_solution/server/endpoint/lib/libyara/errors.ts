/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from '../../../../common/endpoint/errors';

/**
 * Thrown when the libyara WASM engine fails (trap, module load, allocation,
 * malformed engine output, etc.). Compile/product diagnostics use `errorCount`
 * instead and do not throw.
 */
export class YaraEngineUnavailableError extends EndpointError {}
