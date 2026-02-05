/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { EntityType, ALL_ENTITY_TYPES } from '../../../domain/definitions/entity_schema';
import { LogExtractionBodyParams } from '../../constants';
import { fromKueryExpression } from '@kbn/es-query';

export const BodySchema = z.object({
    entityTypes: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
    logExtraction: LogExtractionBodyParams.optional().superRefine(validateLogExtractionParams),
});

function validateLogExtractionParams(
    data: LogExtractionBodyParams | undefined,
    ctx: z.RefinementCtx
) {
    if (!data) {
        return;
    }
    if (data.filter !== undefined && !validateKql(data.filter)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['filter'],
            message: "filter must be a valid KQL query",
        });
    }
}

export function validateKql(kql: string): boolean {
    try {
        if (!kql || kql.trim() === '') {
            throw new Error('Filter cannot be empty');
        }

        fromKueryExpression(kql);

        if (/(\s+)(and|or)\s*$/i.test(kql)) {
            throw new Error('Incomplete KQL expression');
        }

        if (!kql.includes(':')) {
            throw new Error('Field-based KQL is required');
        }
        return true;
    } catch (error) {
        return false;
    }
};
