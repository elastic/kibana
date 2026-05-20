import type { SetupState } from './setup';
export interface ServerlessSetupStateType {
    type: 'serverless';
    setupState: SetupState;
}
export declare function areServerlessResourcesSetup(state: SetupState): boolean;
