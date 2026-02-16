import { PREINSTALLED_WORKFLOWS_FEATURE_FLAG, PREINSTALLED_WORKFLOWS_FEATURE_FLAG_DEFAULT } from "./constants";

describe('Preinstalled Workflows Feature Flag Constants', () => {
  it('should export the correct feature flag', () => {
    expect(PREINSTALLED_WORKFLOWS_FEATURE_FLAG).toBe('securitySolution:preinstalledWorkflowsEnabled');
  });

  it('should export the correct default value', () => {
    expect(PREINSTALLED_WORKFLOWS_FEATURE_FLAG_DEFAULT).toBe(false);
  });
});