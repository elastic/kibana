import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { RepairActionsGroupResult } from '@kbn/slo-schema';
import type { SLODefinition } from '../../server/domain/models';
type ServerError = IHttpFetchError<ResponseErrorBody>;
export declare function useRepairSlo({ id, name }: Pick<SLODefinition, 'id' | 'name'>): import("@kbn/react-query").UseMutationResult<RepairActionsGroupResult[], ServerError, void, unknown>;
export {};
