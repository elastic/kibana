/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type {
  AlertsEventTypes,
  AlertsGroupingTelemetryEventsMap,
} from './events/alerts_grouping/types';
import type {
  DataQualityEventTypes,
  DataQualityTelemetryEventsMap,
} from './events/data_quality/types';
import type {
  EntityAnalyticsTelemetryEventsMap,
  EntityEventTypes,
} from './events/entity_analytics/types';
import type { AssistantEventTypes, AssistantTelemetryEventsMap } from './events/ai_assistant/types';
import type {
  DocumentDetailsTelemetryEventsMap,
  DocumentEventTypes,
} from './events/document_details/types';
import type {
  OnboardingHubEventTypes,
  OnboardingHubTelemetryEventsMap,
} from './events/onboarding/types';
import type {
  ManualRuleRunEventTypes,
  ManualRuleRunTelemetryEventsMap,
} from './events/manual_rule_run/types';
import type { EventLogEventTypes, EventLogTelemetryEventsMap } from './events/event_log/types';
import type { NotesEventTypes, NotesTelemetryEventsMap } from './events/notes/types';
import type {
  PreviewRuleEventTypes,
  PreviewRuleTelemetryEventsMap,
} from './events/preview_rule/types';
import type { AppEventTypes, AppTelemetryEventsMap } from './events/app/types';
import type {
  SiemMigrationsEventTypes,
  SiemMigrationsTelemetryEventsMap,
} from './events/siem_migrations/types';

export * from './events/app/types';
export * from './events/ai_assistant/types';
export * from './events/alerts_grouping/types';
export * from './events/data_quality/types';
export * from './events/onboarding/types';
export * from './events/entity_analytics/types';
export * from './events/document_details/types';
export * from './events/manual_rule_run/types';
export * from './events/event_log/types';
export * from './events/preview_rule/types';
export * from './events/notes/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

// Combine all event type data
export type TelemetryEventTypeData<T extends TelemetryEventTypes> = T extends AssistantEventTypes
  ? AssistantTelemetryEventsMap[T]
  : T extends AlertsEventTypes
  ? AlertsGroupingTelemetryEventsMap[T]
  : T extends PreviewRuleEventTypes
  ? PreviewRuleTelemetryEventsMap[T]
  : T extends EntityEventTypes
  ? EntityAnalyticsTelemetryEventsMap[T]
  : T extends DataQualityEventTypes
  ? DataQualityTelemetryEventsMap[T]
  : T extends DocumentEventTypes
  ? DocumentDetailsTelemetryEventsMap[T]
  : T extends OnboardingHubEventTypes
  ? OnboardingHubTelemetryEventsMap[T]
  : T extends ManualRuleRunEventTypes
  ? ManualRuleRunTelemetryEventsMap[T]
  : T extends EventLogEventTypes
  ? EventLogTelemetryEventsMap[T]
  : T extends NotesEventTypes
  ? NotesTelemetryEventsMap[T]
  : T extends AppEventTypes
  ? AppTelemetryEventsMap[T]
  : T extends SiemMigrationsEventTypes
  ? SiemMigrationsTelemetryEventsMap[T]
  : never;

export type TelemetryEventTypes =
  | AssistantEventTypes
  | AlertsEventTypes
  | PreviewRuleEventTypes
  | EntityEventTypes
  | DataQualityEventTypes
  | DocumentEventTypes
  | OnboardingHubEventTypes
  | ManualRuleRunEventTypes
  | EventLogEventTypes
  | NotesEventTypes
  | AppEventTypes
  | SiemMigrationsEventTypes;
