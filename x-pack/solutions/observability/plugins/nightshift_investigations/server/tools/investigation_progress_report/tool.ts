/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  INVESTIGATION_PROGRESS_UI_EVENT,
  investigationStateSchema,
} from '@kbn/significant-events-schema';
import type { InvestigationState } from '@kbn/significant-events-schema';
import dedent from 'dedent';

export const SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID =
  platformSignificantEventsTools.reportInvestigationProgress;

const toolDescription = dedent`
  ${i18n.translate(
    'xpack.nightshiftInvestigations.agentBuilder.tools.investigationProgressReport.description',
    {
      defaultMessage:
        'Report the full current state of the investigation, so the user can see live progress before the investigation finishes. This is a snapshot, not a diff: every call must include every hypothesis considered so far, each with its own confidence and status — not just what changed since the last call.',
    }
  )}

  ${i18n.translate(
    'xpack.nightshiftInvestigations.agentBuilder.tools.investigationProgressReport.description.rules',
    {
      defaultMessage:
        'Call this whenever a hypothesis is added, its confidence changes, or its status changes (investigating, dismissed, confirmed). Keep "title" a short headline naming the affected entity and the problem, sharpening it as the cause becomes clear. Keep "summary" short (one or two sentences) describing what is happening right now. Set "impact" progressively from step 2.5 onward — include it in every snapshot once seeded. This tool does not end the investigation — keep working after calling it.',
    }
  )}
`;

const MULTIPLE_CONFIRMED_WARNING =
  'More than one hypothesis is "confirmed". Report a single root cause for the triggering symptom: merge candidates that jointly produce it, or that are downstream effects of it, into one "confirmed" hypothesis, and mark candidates that do not produce it "dismissed" with a reason saying why. Send a corrected report before your final output.';

const SINGLE_IMPACT_ENTITY_WARNING =
  'The impact lists a single entity. Use the entity form only when two or more entities were affected in different ways: name the service in "impact.summary", move its chart to "impact.evidence", and drop "entities". Send a corrected report before your final output.';

const BOTH_IMPACT_FORMS_WARNING =
  'The impact has both a top-level "evidence" and "entities". Use one or the other: top-level evidence for a single service or no specific component, entities only when two or more were affected in different ways. Send a corrected report before your final output.';

/** Corrections the agent should make before its final output; empty when the report is fine. */
const getReportWarnings = ({ hypotheses, impact }: InvestigationState): string[] => {
  const entities = impact?.entities ?? [];
  const confirmedCount = hypotheses.filter(({ status }) => status === 'confirmed').length;
  return [
    confirmedCount > 1 && MULTIPLE_CONFIRMED_WARNING,
    // Seeded entities carry no evidence yet; only a finalized single entity is a mistake.
    entities.length === 1 && entities[0].evidence && SINGLE_IMPACT_ENTITY_WARNING,
    entities.length > 0 && impact?.evidence && BOTH_IMPACT_FORMS_WARNING,
  ].filter((warning): warning is string => typeof warning === 'string');
};

export const createInvestigationProgressReportTool = ({
  logger,
  availability,
}: {
  logger: Logger;
  availability: ToolAvailabilityConfig;
}): BuiltinToolDefinition<typeof investigationStateSchema> => ({
  id: SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
  type: ToolType.builtin,
  description: toolDescription,
  availability,
  annotations: {
    title: 'Report Investigation Progress',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: investigationStateSchema,
  tags: ['streams', 'investigation'],
  excludeFromMcp: true,
  handler: async (state, context) => {
    context.events.sendUiEvent(INVESTIGATION_PROGRESS_UI_EVENT, state);
    logger.debug('Reported investigation progress');

    const warnings = getReportWarnings(state);

    return {
      results: [
        {
          type: ToolResultType.other,
          data:
            warnings.length > 0
              ? { acknowledged: true, warning: warnings.join(' ') }
              : { acknowledged: true },
        },
      ],
    };
  },
});
