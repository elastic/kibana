/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingTypeMapping,
  IngestProcessorContainer,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';

import type { EntityDefinition } from '@kbn/entities-schema';
import type { EntityType } from '../../../../../common/api/entity_analytics';

export type EntityDefinitionMetadataElement = NonNullable<EntityDefinition['metadata']>[number];

export interface EntityEngineInstallationDescriptor {
  id: string;
  version: string;
  entityType: EntityType;
  identityField: string;

  /**
   * Default static index patterns to use as the source of entity data.
   * By default, the Security Data View patterns will be added to this list.
   * API parameters can be used to add additional patterns.
   **/
  indexPatterns: string[];

  /**
   * The mappings for the entity store index.
   */
  indexMappings: MappingTypeMapping;

  /**
   * Field descriptions for the entity.
   * Identity fields are not included here as they are treated separately.
   */
  fields: FieldDescription[];

  /**
   * Entity manager default pivot transform settings.
   * Any kibana.yml configuration will override these settings.
   */
  settings: {
    syncDelay: string;
    frequency: string;
    timeout: string;
    docsPerSecond?: number;
    lookbackPeriod: string;
    timestampField: string;
  };

  /**
   * The ingest pipeline to apply to the entity data.
   * This can be an array of processors which get appended to the default pipeline,
   * or a function that takes the default processors and returns an array of processors.
   **/
  pipeline?:
    | IngestProcessorContainer[]
    | ((defaultProcessors: IngestProcessorContainer[]) => IngestProcessorContainer[]);

  /**
   * Whether the extracted entity data is dynamic.
   * If true, it means we don't know which fields will be extracted from the definition itself, and we need to apply field retention to all the incoming doc's fields.
   *
   * This is mainly used for the Asset Inventory use case.
   */
  dynamic: boolean;
}

export type FieldDescription = EntityDefinitionMetadataElement & {
  mapping: MappingProperty;
  retention: FieldRetentionOp;
};

export type FieldRetentionOp =
  | { operation: 'collect_values'; maxLength: number }
  | { operation: 'prefer_newest_value' }
  | { operation: 'prefer_oldest_value' };
