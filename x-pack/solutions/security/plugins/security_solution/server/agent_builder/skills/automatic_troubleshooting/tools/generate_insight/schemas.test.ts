/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowInsightType } from '../../../../../../common/endpoint/types/workflow_insights';
import { getDefendInsightsOutputSchema } from './schemas';

describe('getDefendInsightsOutputSchema', () => {
  describe('policy_response_failure remediation.link', () => {
    const schema = getDefendInsightsOutputSchema({
      type: WorkflowInsightType.enum.policy_response_failure,
    });

    const insight = (remediation: Record<string, unknown>) => ({
      insights: [
        {
          group: 'configure_malware:::Failed to configure malware protection:::Windows',
          events: [{ id: 'e1', endpointId: 'endpoint-1', value: 'failure' }],
          remediation,
        },
      ],
    });

    it('parses when remediation.link is omitted (now optional)', () => {
      const result = schema.safeParse(insight({ message: 'Reapply the policy.' }));
      expect(result.success).toBe(true);
    });

    it('parses when remediation.link is provided', () => {
      const result = schema.safeParse(
        insight({
          message: 'Reapply the policy.',
          link: 'https://www.elastic.co/docs/solutions/security',
        })
      );
      expect(result.success).toBe(true);
    });

    it('still requires remediation.message', () => {
      const result = schema.safeParse(insight({ link: 'https://www.elastic.co/docs' }));
      expect(result.success).toBe(false);
    });
  });
});
