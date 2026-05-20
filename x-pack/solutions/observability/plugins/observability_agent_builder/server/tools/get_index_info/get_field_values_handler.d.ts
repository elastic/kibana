import type { IScopedClusterClient } from '@kbn/core/server';
interface KeywordFieldResult {
    type: 'keyword';
    field: string;
    values: string[];
    hasMoreValues: boolean;
}
interface NumericFieldResult {
    type: 'numeric';
    field: string;
    min: number;
    max: number;
}
interface DateFieldResult {
    type: 'date';
    field: string;
    min: string;
    max: string;
}
interface BooleanFieldResult {
    type: 'boolean';
    field: string;
}
interface TextFieldResult {
    type: 'text';
    field: string;
    samples: string[];
}
interface UnsupportedFieldResult {
    type: 'unsupported';
    field: string;
    fieldType: string;
}
interface FieldErrorResult {
    type: 'error';
    field: string;
    message: string;
}
export interface FieldValuesRecordResult {
    fields: Record<string, KeywordFieldResult | NumericFieldResult | DateFieldResult | BooleanFieldResult | TextFieldResult | UnsupportedFieldResult | FieldErrorResult>;
}
/** Determines the category for a field type */
export declare function getFieldCategory(fieldType: string): 'keyword' | 'numeric' | 'date' | 'boolean' | 'text' | 'unsupported';
export interface ResolvedValidField {
    field: string;
    fieldType: string;
    category: ReturnType<typeof getFieldCategory>;
}
interface ResolvedErrorField {
    input: string;
    error: string;
}
export type ResolvedField = ResolvedValidField | ResolvedErrorField;
/** Resolves an input (field name or wildcard) to concrete fields or an error */
export declare function resolveInputToConcreteFields(input: string, allFieldNames: string[], fieldNameToTypeMap: Record<string, string | undefined>): ResolvedField[];
/**
 * Field value discovery - returns values/ranges for multiple fields.
 * Batches requests by field type to minimize ES calls.
 * Supports wildcard patterns in field names (e.g., "attributes.*").
 */
export declare function getFieldValuesHandler({ esClient, index, fields, start, end, kqlFilter, }: {
    esClient: IScopedClusterClient;
    index: string;
    fields: string[];
    start: string;
    end: string;
    kqlFilter?: string;
}): Promise<FieldValuesRecordResult>;
export {};
