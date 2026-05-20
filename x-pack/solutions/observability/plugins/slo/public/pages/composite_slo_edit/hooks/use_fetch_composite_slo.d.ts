import type { CreateCompositeSLOForm } from '../types';
interface Response {
    data: CreateCompositeSLOForm | undefined;
    isLoading: boolean;
    isError: boolean;
}
export declare function useFetchCompositeSlo(compositeSloId: string | undefined): Response;
export {};
