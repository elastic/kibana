/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import type {
  BuilderTypeDefinition,
  GeneratedQuery,
  QueryGenerationInput,
} from '@kbn/alerting-v2-rule-builders';
import {
  customQueryBuilderFieldsSchema,
  type CustomQueryBuilderFields,
} from '../../common/detection_rule_fields';
import { enrichDetectionRuleEvent } from './enrich_detection_rule_event';
import { buildQuotedIndexSource, buildFullTextFilter } from './esql_helpers';

// ---------------------------------------------------------------------------
// Extra validation hook
//
// Rejects a `query` that is only whitespace. The schema ensures `query` is at
// least one character long, but an all-whitespace string passes that check and
// is useless as a query.
//
// Pure, no I/O, no registry access.
//
// Ref: rule-validation.md "The extra validation hook"
// ---------------------------------------------------------------------------

const validateCustomQueryFields = (fields: CustomQueryBuilderFields): string[] => {
  const errors: string[] = [];
  if (fields.query.trim() === '') {
    errors.push('query must not be blank (only whitespace)');
  }
  return errors;
};

// ---------------------------------------------------------------------------
// Compile function
//
// Builds the rule's base query via the @elastic/esql AST builder.
// User-supplied values are always AST literals — never spliced into query
// source text.  Index names are emitted as quoted identifiers so that a
// user-supplied entry cannot inject extra pipeline commands.
//
// language: 'kuery'  => | WHERE KQL("...")
// language: 'lucene' => | WHERE QSTR("...", {"allow_wildcard": TRUE})
//   allow_wildcard is the one option v1 pins that QSTR defaults off.
//   The named-parameter map form is the only valid ES|QL syntax for QSTR
//   options; a binary = or : expression is rejected by Elasticsearch.
//
// max_signals maps to a trailing | LIMIT <n>. When absent, no LIMIT is
// emitted and the deployment-wide cap alone applies.
//
// Ref: rule-execution-logic.md "security.detection.query"
//      rule-execution-logic.md "AST composition is the required pattern"
// ---------------------------------------------------------------------------

const generateCustomQuery = ({
  fields,
}: QueryGenerationInput<CustomQueryBuilderFields>): GeneratedQuery => {
  const commands: ESQLAstCommand[] = [];

  // FROM "index1", "index2", ...
  // Index names are quoted so that user-supplied entries cannot inject extra
  // pipeline commands (e.g. "logs-* | LIMIT 1" would otherwise become two
  // commands).  buildQuotedIndexSource emits a quoted AST source node.
  commands.push(
    Builder.command({
      name: 'from',
      args: fields.index.map(buildQuotedIndexSource),
    })
  );

  // WHERE KQL("...") or WHERE QSTR("...", {"allow_wildcard": TRUE})
  // buildFullTextFilter handles both languages and uses the shared QSTR
  // named-parameter map so both detection types emit identical wraps.
  commands.push(
    Builder.command({ name: 'where', args: [buildFullTextFilter(fields.query, fields.language)] })
  );

  // LIMIT <max_signals> — omitted when the field is absent so the deployment
  // cap alone controls the row budget.
  if (fields.max_signals !== undefined) {
    commands.push(
      Builder.command({
        name: 'limit',
        args: [Builder.expression.literal.integer(fields.max_signals)],
      })
    );
  }

  const breachQuery = BasicPrettyPrinter.multiline(Builder.expression.query(commands), {
    pipeTab: '',
  });

  return {
    query: { base: breachQuery },
  };
};

// ---------------------------------------------------------------------------
// Full BuilderTypeDefinition
//
// A registration carries no manifest: storage reaches the framework on its own
// path, through @kbn/security-detection-rule-builder-fields, and the type's
// schema is checked against those mappings at registration time.
//
// kind is pinned to 'alert' so that every detection produces an episode
// visible on the Alerting v2 Episodes surface.  The companion lifecycle
// configuration (recovery: { strategy: manual }, no_data: { strategy: ignore },
// state_transition: { pending: { count: 0 } }) is sent by the converter in the
// security_detections plugin, not here.  Together the combination is the
// persistent-mode workaround described in alert-modes.md.
//
// Ref: rule-type-registration.md "What a registration declares"
//      builder-type-registration-redesign.md "The registration contract"
//      alert-modes.md "Configuring a persistent mode with what exists today"
// ---------------------------------------------------------------------------

export const securityDetectionQuery: BuilderTypeDefinition<CustomQueryBuilderFields> = {
  type: 'security.detection.query',
  name: 'Custom Query',
  description: 'A detection rule that runs a KQL or Lucene query against specified data sources.',
  kind: 'alert',
  ownership: { solution: 'security', domain: 'detection' },
  compilation: 'execution_time',
  builderFieldsSchema: customQueryBuilderFieldsSchema,
  validateFields: validateCustomQueryFields,
  generateQuery: generateCustomQuery,
  enrichRuleEvent: enrichDetectionRuleEvent,
};
