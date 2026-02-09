/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { validateDataView } from '@kbn/data-view-validation';
import { EntityType, ALL_ENTITY_TYPES } from '../../../../common/domain/definitions/entity_schema';
import { LogExtractionBodyParams } from '../../constants';
import { fromKueryExpression } from '@kbn/es-query';
import { parseDurationToMs } from '../../../infra/time';
import { DELAY_DEFAULT, LOOKBACK_PERIOD_DEFAULT } from '@kbn/entity-store/server/domain/definitions/saved_objects';

const MIN_FREQUENCY_MS = 30 * 1000;

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
            message: "must be a valid KQL query",
        });
    }
    if (data.additionalIndexPatterns !== undefined) {
        data.additionalIndexPatterns.forEach((value, i) => {
            const errors = validateDataView(value);
            const illegalChars = errors.ILLEGAL_CHARACTERS ?? [];
            const hasSpaces = errors.CONTAINS_SPACES;
            if (illegalChars.length > 0 || hasSpaces) {
                const parts = illegalChars.length > 0 ? [illegalChars.join(', ')] : [];
                if (hasSpaces) {
                    parts.push('(space)');
                }
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['additionalIndexPatterns', i],
                    message: `must be a valid index pattern: cannot contain ${parts.join(', ')}`,
                });
            }
        });
    }
    if (data.frequency !== undefined && !validateFrequency(data.frequency)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['frequency'],
            message: 'must be at least 30 seconds',
        });
    }
    if (data.lookbackPeriod !== undefined || data.delay !== undefined) {
        if (isDelayGteLookbackPeriod(data.delay, data.lookbackPeriod)) {
            ctx.addIssue({  
                code: z.ZodIssueCode.custom,
                path: ['delay'],
                message: 'must be less than lookbackPeriod',
            });
        }
    }
}

function isDelayGteLookbackPeriod(
    delay?: string,
    lookbackPeriod?: string
): boolean {
    const lookbackPeriodValue = lookbackPeriod ?? LOOKBACK_PERIOD_DEFAULT;
    const delayValue = delay ?? DELAY_DEFAULT;
    try {
        const lookbackPeriodMs = parseDurationToMs(lookbackPeriodValue);
        const delayMs = parseDurationToMs(delayValue);
        return delayMs >= lookbackPeriodMs;
    } catch {
        return false;
    }
}

function validateFrequency(frequency: string): boolean {
    try {
        return parseDurationToMs(frequency) >= MIN_FREQUENCY_MS;
    } catch {
        return false;
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
