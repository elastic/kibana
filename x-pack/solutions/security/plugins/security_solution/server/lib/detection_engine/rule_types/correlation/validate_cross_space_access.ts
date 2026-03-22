/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

/**
 * Logs cross-space correlation usage for audit trail and monitoring.
 *
 * SECURITY MODEL - Defense in Depth:
 * =================================
 *
 * Cross-space correlation security relies on Elasticsearch document-level security (DLS):
 *
 * 1. PRIMARY SECURITY BOUNDARY: Elasticsearch
 *    - When ES|QL query runs: FROM .alerts-security.alerts-space-a, .alerts-security.alerts-space-b
 *    - Elasticsearch checks user permissions for BOTH indices
 *    - If user lacks access to space-b index:
 *      * Query returns only space-a results (partial results), OR
 *      * Query fails with 403 Forbidden (strict mode)
 *    - This is the AUTHORITATIVE security check
 *
 * 2. SECONDARY (OPTIONAL): Kibana UI/API validation
 *    - Rule creation API could validate space access upfront
 *    - Benefit: Better UX (fail fast at creation time vs execution time)
 *    - Implementation: Requires security plugin in route context (TODO for production)
 *
 * 3. AUDIT TRAIL: Logging
 *    - Log all cross-space correlation attempts
 *    - Helps security teams monitor for unauthorized access attempts
 *    - Alerts can be configured on suspicious patterns
 *
 * DESIGN DECISION:
 * - Spike relies on ES DLS (PRIMARY boundary) + audit logging
 * - Production MAY add Kibana-level validation for better UX
 * - This approach is SECURE because ES is the authority for data access
 *
 * REFERENCES:
 * - Elasticsearch Security: https://www.elastic.co/guide/en/elasticsearch/reference/current/document-level-security.html
 * - Similar pattern: Lens cross-space queries rely on ES index permissions
 * - Entity Analytics: Uses checkPrivileges for index-level access
 *
 * @param targetSpaces - Spaces being queried for correlation
 * @param currentSpaceId - Space where rule is executing
 * @param logger - Rule execution logger for audit trail
 */
export function logCrossSpaceCorrelation(
  targetSpaces: string[] | undefined,
  currentSpaceId: string,
  logger: IRuleExecutionLogForExecutors
): void {
  if (!targetSpaces || targetSpaces.length === 0) {
    return; // No cross-space correlation
  }

  const otherSpaces = targetSpaces.filter((space) => space !== currentSpaceId);
  if (otherSpaces.length === 0) {
    return; // Only correlating within current space
  }

  // Log for audit trail and security monitoring
  logger.info(
    `Cross-space correlation executing: current_space="${currentSpaceId}", ` +
      `target_spaces=[${otherSpaces.join(', ')}]. ` +
      `Elasticsearch document-level security will enforce access control.`
  );

  // Warn if correlating across many spaces (potential over-broad configuration)
  if (otherSpaces.length > 5) {
    logger.warn(
      `Correlation rule targets ${otherSpaces.length} spaces (possibly too broad). ` +
        `Consider narrowing scope for better performance and security.`
    );
  }
}

/**
 * Validates space name format to prevent injection attacks.
 * Note: This is already done in compile_correlation_query.ts (validateSpaceName),
 * but provided here for completeness and route-level validation.
 *
 * @param spaceIds - Space IDs to validate
 * @throws Error if any space ID has invalid format
 */
export function validateSpaceIdFormat(spaceIds: string[]): void {
  const VALID_SPACE_ID = /^[a-z0-9_-]+$/;

  for (const spaceId of spaceIds) {
    if (!VALID_SPACE_ID.test(spaceId)) {
      throw new Error(
        `Invalid space ID format: "${spaceId}". ` +
          `Space IDs must contain only lowercase letters, numbers, underscores, and hyphens.`
      );
    }
  }
}

/*
 * FUTURE ENHANCEMENT (for production):
 * =====================================
 *
 * To add Kibana-level cross-space authorization validation at rule creation time:
 *
 * 1. In rule creation API route (e.g., create_rules_route.ts):
 *
 * ```typescript
 * router.post({
 *   path: '/api/detection_engine/rules',
 *   // ...
 * }, async (context, request, response) => {
 *   const { correlation } = request.body;
 *
 *   if (correlation?.targetSpaces) {
 *     // Validate user has access to target spaces
 *     const { security } = await context.securitySolution;
 *     await validateCrossSpaceAccessAtCreation({
 *       targetSpaces: correlation.targetSpaces,
 *       currentSpaceId: context.spaceId,
 *       security,
 *       request,
 *     });
 *   }
 *
 *   // Proceed with rule creation...
 * });
 * ```
 *
 * 2. Implement validateCrossSpaceAccessAtCreation():
 *
 * ```typescript
 * async function validateCrossSpaceAccessAtCreation({
 *   targetSpaces,
 *   currentSpaceId,
 *   security,
 *   request,
 * }) {
 *   const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
 *
 *   const privilegesToCheck = {
 *     kibana: targetSpaces.map(spaceId => ({
 *       privilege: security.authz.actions.app.get('siem'),
 *       spaces: [spaceId],
 *     })),
 *   };
 *
 *   const { hasAllRequested } = await checkPrivileges(privilegesToCheck);
 *   if (!hasAllRequested) {
 *     throw new Error('Insufficient privileges for cross-space correlation');
 *   }
 * }
 * ```
 *
 * EFFORT: 2-3 hours to implement in routes
 * BENEFIT: Better UX (fail at creation vs execution)
 * PRIORITY: Medium (ES DLS is primary security boundary)
 */

