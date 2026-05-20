import type { GetSLOResponse } from '@kbn/slo-schema';
import type { CreateSLOForm } from '../types';
export interface UseSloFormValuesResponse {
    initialValues: CreateSLOForm | undefined;
    isLoading: boolean;
    isEditMode: boolean;
    slo: GetSLOResponse | undefined;
}
export declare function useSloFormValues(sloId?: string): UseSloFormValuesResponse;
