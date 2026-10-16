/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationResult, PageResult } from '../models/operation_result';
import type {
  GrepMatch,
  GrepRequest,
  SourcePageRequest,
  SourcePath,
  SourceWindow,
  SourceWindowRequest,
} from '../models/source_codec';

export type {
  GrepMatch,
  GrepRequest,
  SourcePageRequest,
  SourcePath,
  SourceWindow,
  SourceWindowRequest,
} from '../models/source_codec';

/** Reads only immutable source content from a resolved repository snapshot. */
export interface SourceReader {
  /**
   * Searches the immutable source snapshot and resolves with a typed page or failure.
   * Implementations must convert operational errors to PageResult failures and must not reject.
   */
  grep(request: GrepRequest): Promise<PageResult<GrepMatch>>;
  /**
   * Reads an inclusive source window and resolves with a typed result or failure.
   * Successful results may clamp either requested bound to existing file boundaries, but must include
   * every existing line in the returned clamped range. Implementations convert operational errors to
   * OperationResult failures and must not reject.
   */
  readWindow(request: SourceWindowRequest): Promise<OperationResult<SourceWindow>>;
  /**
   * Lists source paths and resolves with a typed page or failure.
   * Implementations must convert operational errors to PageResult failures and must not reject.
   */
  listSourcePage(request: SourcePageRequest): Promise<PageResult<SourcePath>>;
}
