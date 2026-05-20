import type { FieldSpec } from '@kbn/data-views-plugin/common';
export interface Option {
    label: string;
    value: string;
}
export declare function createOptionsFromFields(fields: FieldSpec[], filterFn?: (option: Option) => boolean): Option[];
