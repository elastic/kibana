import type { FormState, UseFormGetFieldState, UseFormGetValues, UseFormWatch } from 'react-hook-form';
import type { CreateSLOForm } from '../types';
interface Props {
    getFieldState: UseFormGetFieldState<CreateSLOForm>;
    getValues: UseFormGetValues<CreateSLOForm>;
    formState: FormState<CreateSLOForm>;
    watch: UseFormWatch<CreateSLOForm>;
}
export declare function useSectionFormValidation({ getFieldState, getValues, formState, watch }: Props): {
    isIndicatorSectionValid: boolean;
    isObjectiveSectionValid: boolean;
    isDescriptionSectionValid: boolean;
};
export {};
