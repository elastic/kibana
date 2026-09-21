/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortReason } from '@kbn/kibana-utils-plugin/common';

/** Coordinates the lifetime of requests started for an embeddable load. */
export class RequestCancellationManager {
  private abortController = new AbortController();
  private hasStartedLoad = false;

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public startLoad(): void {
    if (this.hasStartedLoad) {
      this.abortController.abort(AbortReason.REPLACED);
      this.abortController = new AbortController();
    }
    this.hasStartedLoad = true;
  }

  public cancel(reason: AbortReason = AbortReason.CANCELED): void {
    this.abortController.abort(reason);
  }
}
