/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LoggingClassification,
  LoggingClassificationRequest,
  OtelClassification,
  OtelClassificationRequest,
} from '../models/classification_codec';
import type { OperationError, OperationResult } from '../models/operation_result';

/** Runs required classification workflows without exposing their transport. */
export interface ClassificationWorkflowClient {
  /** Classifies a caller-batched, byte-bounded logging request; callers check response coverage. */
  classifyLogging(
    request: LoggingClassificationRequest
  ): Promise<OperationResult<readonly LoggingClassification[]>>;
  /** Classifies a caller-batched, byte-bounded OTel request; callers check response coverage. */
  classifyOtel(
    request: OtelClassificationRequest
  ): Promise<OperationResult<readonly OtelClassification[]>>;
}

/** Transport-neutral workflow content supplied by standalone or server composition. */
export interface WorkflowDefinition {
  readonly definition: string;
  readonly id: string;
  readonly version: string;
}

/** Describes one workflow definition that did not install. */
export interface WorkflowInstallationFailure {
  readonly error: OperationError;
  readonly workflowId: string;
}

/** Reports installed workflows and per-definition failures after a reconciliation pass. */
export interface WorkflowInstallation {
  readonly failures: readonly WorkflowInstallationFailure[];
  readonly installedIds: readonly string[];
}

/** Reconciles workflow definitions in the environment-specific lifecycle. */
export interface WorkflowInstaller {
  /** Installs workflow definitions and reports malformed or transport failures. */
  install(
    definitions: readonly WorkflowDefinition[]
  ): Promise<OperationResult<WorkflowInstallation>>;
}
