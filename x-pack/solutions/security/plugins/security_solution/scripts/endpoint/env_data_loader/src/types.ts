/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ReportProgressCallback = (options: { doneCount: number; errorCount: number }) => void;

interface ProgressReporterStateProperties {
  prctDone: number;
  totalCount: number;
  doneCount: number;
  errorCount: number;
}

export interface ProgressReporterState extends ProgressReporterStateProperties {
  categories: Record<string, ProgressReporterStateProperties>;
}

export interface ProgressReporterInterface {
  addCategory(name: string, totalCount: number): ReportProgressCallback;

  getReporter(categoryName: string): ReportProgressCallback;

  getState(): ProgressReporterState;

  getStatus(): string;

  getStartedTime(): Date;

  startReporting(): void;

  stopReporting(): void;
}
