/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import {
  budgetingMethodSchema,
  indicatorSchema,
  objectiveSchema,
  optionalSettingsSchema,
  tagsSchema,
  timeWindowSchema,
} from '@kbn/slo-schema';
import { isRight } from 'fp-ts/Either';
import type { SLOTemplate, StoredSLOTemplate } from '../domain/models';
import { SLOTemplateNotFound } from '../errors';
import { SO_SLO_TEMPLATE_TYPE } from '../saved_objects';

export interface SLOTemplateRepository {
  findById(templateId: string): Promise<SLOTemplate>;
}

export class DefaultSLOTemplateRepository implements SLOTemplateRepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async findById(templateId: string): Promise<SLOTemplate> {
    try {
      const response = await this.soClient.get<StoredSLOTemplate>(SO_SLO_TEMPLATE_TYPE, templateId);

      return this.toSloTemplate(response.attributes);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new SLOTemplateNotFound(`SLO Template with id [${templateId}] not found`);
      }
      throw e;
    }
  }

  // We use .decode() instead of .is() when objects contains durationType fields
  // stored as "1h", decoded as { unit: "h", value: 1 }
  private toSloTemplate(stored: StoredSLOTemplate): SLOTemplate {
    try {
      const template: SLOTemplate = {};
      if (stored.name && typeof stored.name === 'string') {
        template.name = stored.name;
      }

      if (stored.description && typeof stored.description === 'string') {
        template.description = stored.description;
      }

      // TODO: Consider using individual indicator schemas based on indicator.type with fallback for the required fields
      // e.g. for 'sli.kql.custom' we can validate only against the custom indicator schema using
      // Object.assign({}, { filter: "", good: "", total: "", ... }, stored.indicator.params)
      if (stored.indicator && indicatorSchema.is(stored.indicator)) {
        template.indicator = stored.indicator;
      }

      if (stored.budgetingMethod && budgetingMethodSchema.is(stored.budgetingMethod)) {
        template.budgetingMethod = stored.budgetingMethod;
      }

      if (stored.objective) {
        const decoded = objectiveSchema.decode(stored.objective);
        if (isRight(decoded)) {
          template.objective = decoded.right;
        }
      }

      if (stored.timeWindow) {
        const decoded = timeWindowSchema.decode(stored.timeWindow);
        if (isRight(decoded)) {
          template.timeWindow = decoded.right;
        }
      }

      if (stored.tags && tagsSchema.is(stored.tags)) {
        template.tags = stored.tags;
      }

      if (stored.settings) {
        const decoded = optionalSettingsSchema.decode(stored.settings);
        if (isRight(decoded)) {
          template.settings = decoded.right;
        }
      }

      return template;
    } catch {
      return {};
    }
  }
}
