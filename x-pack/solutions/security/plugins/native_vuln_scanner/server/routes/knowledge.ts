/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  CLOUD_SECURITY_POSTURE_READ_PRIVILEGE,
  KNOWLEDGE_ID_PATTERN,
  KNOWLEDGE_PATH,
  MAX_KNOWLEDGE_ADVISORIES,
  NATIVE_VULN_SCANNER_API_VERSION,
  KNOWLEDGE_ID_MAX_LENGTH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { KNOWLEDGE_INDEX } from '../lib/knowledge';
import type { KnowledgeDoc } from '../lib/knowledge';
import { respondWithError } from './route_error';
import type { RouteDependencies } from './types';
import { withLicense } from './with_license';

const idSchema = schema.string({
  maxLength: KNOWLEDGE_ID_MAX_LENGTH,
  validate: (value) =>
    new RegExp(KNOWLEDGE_ID_PATTERN).test(value)
      ? undefined
      : i18n.translate('xpack.nativeVulnScanner.routes.knowledgeInvalidId', {
          defaultMessage: 'Invalid knowledge id.',
        }),
});

const statusCodeOf = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : undefined;

/**
 * Returns the vendor text for one CVE plus the docs of the advisories that fixed it; `knowledge`
 * is null when only advisory docs exist. The read runs as the caller, so index privileges apply;
 * a missing index or no doc at all answers 404 and the flyout simply hides the vendor sections.
 */
export const registerKnowledgeRoute = ({ router, logger, getLicense }: RouteDependencies) => {
  router.versioned
    .get({
      path: KNOWLEDGE_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [CLOUD_SECURITY_POSTURE_READ_PRIVILEGE] } },
      summary: i18n.translate('xpack.nativeVulnScanner.routes.knowledgeSummary', {
        defaultMessage: 'Get the vendor advisory text for a vulnerability',
      }),
    })
    .addVersion(
      {
        version: NATIVE_VULN_SCANNER_API_VERSION,
        validate: {
          request: {
            params: schema.object({ knowledge_id: idSchema }),
            query: schema.object({
              // The HTTP layer hands one repeated key over as a string and several as an array.
              advisory_ids: schema.maybe(
                schema.oneOf([
                  idSchema,
                  schema.arrayOf(idSchema, { maxSize: MAX_KNOWLEDGE_ADVISORIES }),
                ])
              ),
            }),
          },
        },
      },
      withLicense(getLicense, async (context, request, response) => {
        try {
          const { knowledge_id: knowledgeId } = request.params;
          const requested = request.query.advisory_ids ?? [];
          const advisoryIds = (typeof requested === 'string' ? [requested] : requested).filter(
            (id) => id.startsWith('adv:')
          );
          const { client } = (await context.core).elasticsearch;
          const { docs } = await client.asCurrentUser.mget<KnowledgeDoc>({
            index: KNOWLEDGE_INDEX,
            ids: [knowledgeId, ...new Set(advisoryIds)],
          });
          const [primary, ...rest] = docs.map((doc) =>
            'found' in doc && doc.found ? doc._source : undefined
          );
          const advisories = rest.filter((doc) => doc !== undefined);
          // RHEL OVAL has no per-CVE text for advisory-fixed CVEs, so the CVE doc can be absent
          // while the advisories that fixed it exist; 404 only when nothing was found.
          if (!primary && advisories.length === 0) return response.notFound();
          return response.ok({ body: { knowledge: primary ?? null, advisories } });
        } catch (error) {
          if (statusCodeOf(error) === 404) return response.notFound();
          return respondWithError(error, response, logger);
        }
      })
    );
};
