/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationTaskStatus } from '../../../common/siem_migrations/constants';
import type {
  MigrationTaskStats,
  SiemMigrationResourceBase,
} from '../../../common/siem_migrations/model/common.gen';

export interface GetMigrationsStatsAllParams {
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

export interface GetMigrationStatsParams {
  /** `id` of the migration to get stats for */
  migrationId: string;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

export interface MigrationSettingsBase {
  connectorId: string;
}

export enum StatusFilterBase {
  INSTALLED = 'installed',
  TRANSLATED = 'translated',
  PARTIALLY_TRANSLATED = 'partially_translated',
  UNTRANSLATABLE = 'untranslatable',
  FAILED = 'failed',
}

export interface FilterOptionsBase {
  status?: StatusFilterBase;
}

export interface MigrationStats extends MigrationTaskStats {
  status: SiemMigrationTaskStatus; // use the native enum instead of the zod enum from the model
  vendor: MigrationSource;
}

export enum SplunkDataInputStep {
  Upload = 1,
  Macros = 2,
  Lookups = 3,
  End = 10,
}

export interface MissingResourcesIndexed {
  macros: string[];
  lookups: string[];
}

export type OnMissingResourcesFetched = (missingResources: SiemMigrationResourceBase[]) => void;

export enum MigrationSource {
  SPLUNK = 'splunk',
  QRADAR = 'qradar',
}
export interface MigrationStepProps {
  dataInputStep: number;
  migrationSource: MigrationSource;
  migrationStats?: MigrationStats;
  onMigrationCreated: (createdMigrationStats: MigrationStats) => void;
  onMissingResourcesFetched: OnMissingResourcesFetched;
  setDataInputStep: React.Dispatch<React.SetStateAction<number>>;
  missingResourcesIndexed?: MissingResourcesIndexed;
}

export interface Step<
  Props = MigrationStepProps,
  C extends React.ComponentType<Props> = React.ComponentType<Props>
> {
  id: string;
  Component: C;
}

export type Steps = Array<Step<MigrationStepProps>>;
export type HandleMissingResourcesIndexed = ({
  migrationSource,
  newMissingResourcesIndexed,
}: {
  migrationSource: MigrationSource;
  newMissingResourcesIndexed?: MissingResourcesIndexed;
}) => void;
