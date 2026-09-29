/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderQueryParameter,
  type QueryParameter,
  type QueryTemplate,
} from '../models/query_codec';
import type { GeneratedTemplate } from '../templates/deduplicate_templates';
import { templateIdentity } from '../templates/template_identity';
import type { LogSignature } from './extract_log_signatures';

/** Supplies immutable extraction metadata shared by all deterministic template builders. */
export interface TemplateGenerationContext {
  readonly extractorVersion: string;
  readonly repository: string;
  readonly revision: string;
}

/** Describes a generated log template with no runtime source binding. */
const sourceParameter: QueryParameter = {
  description: 'Log stream or index pattern containing the emitted runtime records.',
  example: 'logs-application-*',
  kind: 'source',
  name: 'source',
};
/** Builds deterministic full-text templates from stable segments of extracted logging signatures. */
export const generateLogTemplates = ({
  context,
  signatures,
}: {
  readonly context: TemplateGenerationContext;
  readonly signatures: readonly LogSignature[];
}): readonly GeneratedTemplate[] =>
  signatures.flatMap((signature) => {
    /** Uses every useful static fragment so dynamic substitutions cannot make the query overly broad. */
    const segments: readonly string[] = signature.staticSegments.filter(
      (segment) => segment.length > 0
    );
    if (segments.length === 0) return [];
    /** Retains only the deployment-specific source as a runtime parameter. */
    const parameters: Record<string, QueryParameter> = { source: sourceParameter };
    /** Produces an ANDed MATCH_PHRASE predicate with safely escaped source-derived literals. */
    const clauses: readonly string[] = segments.map((segment) => {
      /** Renders the extracted runtime text as an inline ES|QL string literal. */
      const literal: string = renderQueryParameter({
        description: 'Inline static message segment emitted by the logging site.',
        example: segment,
        kind: 'string',
        name: 'message_segment',
      });
      return `MATCH_PHRASE(message, ${literal})`;
    });
    /** Keeps every dynamic interpolation bounded by its surrounding static anchors. */
    const query: string = `FROM [[source]]\n| WHERE ${clauses.join(' AND ')}`;
    /** Builds the codec-compatible, source-reader-neutral template value. */
    const template: QueryTemplate = {
      description: 'Predictive full-text query for a log message emitted by application source.',
      evidence: signature.evidence,
      parameters,
      query,
      signalType: 'log',
      title: signature.staticPrefix || segments[0],
    };
    /** Preserves query-level identity without writing or validating against external services. */
    return [
      {
        ...template,
        ...context,
        id: templateIdentity({ ...context, query, signalType: template.signalType }),
        logLevel: signature.level,
        severityScore: signature.severity,
      },
    ];
  });
