import type { CreateSLOInput, GetSLOResponse, SLOTemplateResponse, UpdateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import type { CreateSLOForm } from '../types';
export declare function transformSloResponseToFormState(values?: GetSLOResponse): CreateSLOForm | undefined;
export declare function transformCreateSLOFormToCreateSLOInput(values: CreateSLOForm): CreateSLOInput;
export declare function transformValuesToUpdateSLOInput(values: CreateSLOForm): UpdateSLOInput;
export declare function transformPartialSLODataToFormState(values?: RecursivePartial<CreateSLOInput> | SLOTemplateResponse): CreateSLOForm | undefined;
