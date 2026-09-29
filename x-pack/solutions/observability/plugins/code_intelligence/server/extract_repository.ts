/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deduplicateTemplates,
  MAX_CLASSIFICATION_CANDIDATES,
  MAX_CLASSIFICATION_EXCERPT_BYTES,
  MAX_WORKFLOW_REQUEST_BYTES,
  detectOtelInstrumentation,
  discoverLoggingCandidates,
  discoverOtelSignals,
  extractLogSignatures,
  generateLogTemplates,
  generateOtelTemplates,
  semanticDigest,
  sha256Digest,
  validateClassificationCompleteness,
  type CatalogWriteRequest,
  type CatalogWriteResult,
  type CatalogWriter,
  type ClassificationWorkflowClient,
  type GeneratedTemplate,
  type LoggingCandidate,
  type LoggingClassificationCandidate,
  type OperationError,
  type OperationResult,
  type OtelDiscoveryResult,
  type OtelSignal,
  type OtelClassificationCandidate,
  type QueryValidationResult,
  type QueryValidator,
  type RepositoryResolver,
  type RepositoryRevisionRequest,
  type ResolvedRepository,
  type SourceLocation,
  type SourceReader,
  type TemplateGenerationContext,
} from './domain';

/** Reports templates excluded before persistence together with an actionable reason. */
export interface ExtractionDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly templateId?: string;
}

/** Returns the completed extraction outcome without conflating invalid templates with run failure. */
export interface ExtractionRunResult {
  readonly diagnostics: readonly ExtractionDiagnostic[];
  readonly generatedTemplates: readonly GeneratedTemplate[];
  readonly validation: ReadonlyMap<string, QueryValidationResult>;
  readonly write: CatalogWriteResult;
}

/** Supplies every environment port and immutable metadata required by one extraction run. */
export interface ExtractRepositoryDependencies {
  readonly catalogWriter: CatalogWriter;
  readonly extractorVersion: string;
  readonly now: () => string;
  readonly reader: SourceReader;
  readonly repositoryRequest: RepositoryRevisionRequest;
  readonly repositoryResolver: RepositoryResolver;
  readonly validator: QueryValidator;
  readonly workflows: ClassificationWorkflowClient;
}

/** Encodes source text for byte limits enforced by workflow DTO contracts. */
const utf8Encoder = new TextEncoder();
/** Allows one bounded retry for transient or incomplete model classification output. */
const workflowBatchAttempts = 2;

/** Converts an operational source or workflow failure into the orchestrator result shape. */
const failure = <Value>(code: string, message: string): OperationResult<Value> => ({
  error: { code, message, retryable: false },
  status: 'failure',
});

/** Stops orchestration when any discovery diagnostic proves source coverage was incomplete. */
const sourceCoverageFailure = (
  diagnostics: readonly { readonly error: OperationError }[]
): OperationError | undefined =>
  diagnostics.length === 0
    ? undefined
    : {
        code: 'incomplete_source_discovery',
        message: diagnostics.map(({ error }) => error.message).join(' '),
        retryable: diagnostics.some(({ error }) => error.retryable),
      };

/** Produces one workflow-safe opaque ID per OTel signal without requiring unique source locations. */
const otelCandidateId = (signal: OtelSignal, index: number): string => {
  /** Uses stable source facts so repeated runs submit stable classification IDs. */
  const source: string = JSON.stringify({ evidence: signal.evidence, index, signal });
  return `otel-${semanticDigest(source)}`;
};

/** Counts the exact workflow-run JSON envelope bytes enforced by the HTTP workflow adapter. */
const workflowRequestBytes = (input: unknown): number =>
  new TextEncoder().encode(JSON.stringify({ inputs: input })).byteLength;

/** Splits bounded candidate input by both workflow cardinality and exact serialized request size. */
const workflowBatches = <Value>({
  requestFor,
  values,
}: {
  readonly requestFor: (values: readonly Value[]) => unknown;
  readonly values: readonly Value[];
}): OperationResult<readonly (readonly Value[])[]> => {
  /** Retains consecutive requests so no candidate can be skipped or reordered. */
  const batches: Value[][] = [];
  /** Builds the current request until adding another candidate would exceed either contract limit. */
  let current: Value[] = [];
  for (const value of values) {
    /** Tests the candidate in its prospective request envelope, including JSON escaping overhead. */
    const prospective = [...current, value];
    if (
      prospective.length <= MAX_CLASSIFICATION_CANDIDATES &&
      workflowRequestBytes(requestFor(prospective)) <= MAX_WORKFLOW_REQUEST_BYTES
    ) {
      current = prospective;
      continue;
    }
    if (current.length === 0) {
      return failure(
        'workflow_request_too_large',
        'A required workflow candidate exceeds the maximum serialized request size.'
      );
    }
    batches.push(current);
    if (workflowRequestBytes(requestFor([value])) > MAX_WORKFLOW_REQUEST_BYTES) {
      return failure(
        'workflow_request_too_large',
        'A required workflow candidate exceeds the maximum serialized request size.'
      );
    }
    current = [value];
  }
  if (current.length > 0) batches.push(current);
  return { status: 'success', value: batches };
};

/** Splits source text without losing UTF-16 code units while keeping every workflow excerpt within its byte limit. */
const workflowExcerptChunks = (source: string): readonly string[] => {
  /** Preserves source characters exactly while bounding the transport representation of each excerpt. */
  const chunks: string[] = [];
  /** Accumulates one UTF-8-bounded excerpt. */
  let chunk = '';
  /** Tracks encoded chunk size incrementally so long fallback lines remain linear-time. */
  let chunkBytes = 0;
  for (const character of source) {
    /** Measures the next code point rather than assuming UTF-16 length matches UTF-8 bytes. */
    const characterBytes = utf8Encoder.encode(character).byteLength;
    if (chunkBytes + characterBytes > MAX_CLASSIFICATION_EXCERPT_BYTES && chunk.length > 0) {
      chunks.push(chunk);
      chunk = character;
      chunkBytes = characterBytes;
    } else {
      chunk += character;
      chunkBytes += characterBytes;
    }
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
};

/** Returns the first workflow-safe excerpt while retaining empty source text as empty. */
const firstWorkflowExcerpt = (source: string): string => workflowExcerptChunks(source)[0] ?? '';

/** Converts source evidence into a workflow-only DTO without changing retained source evidence. */
const workflowEvidence = (evidence: readonly SourceLocation[]): readonly SourceLocation[] =>
  evidence.map((location) => ({ ...location, excerpt: firstWorkflowExcerpt(location.excerpt) }));

/** Runs a classification batch with one bounded retry for transient or incomplete output. */
const classifyWorkflowBatch = async <
  Candidate extends { readonly id: string },
  Decision extends { readonly id: string }
>({
  candidates,
  run,
}: {
  readonly candidates: readonly Candidate[];
  readonly run: () => Promise<OperationResult<readonly Decision[]>>;
}): Promise<OperationResult<readonly Decision[]>> => {
  for (let attempt = 1; attempt <= workflowBatchAttempts; attempt += 1) {
    /** Executes the same immutable candidate batch so a retry cannot alter membership. */
    const classification = await run();
    if (classification.status === 'failure') {
      if (!classification.error.retryable || attempt === workflowBatchAttempts) {
        return classification;
      }
      continue;
    }
    /** Rejects omissions, duplicates, and unknown IDs before model output reaches generation. */
    const complete = validateClassificationCompleteness(candidates, classification.value);
    if (complete.status === 'success' || attempt === workflowBatchAttempts) return complete;
  }
  return failure('workflow_retry_exhausted', 'Workflow classification retry was exhausted.');
};

/** Converts deduplicated validated templates into codec-valid catalog write requests. */
const catalogRequestsFor = ({
  now,
  templates,
  validation,
}: {
  readonly now: () => string;
  readonly templates: readonly GeneratedTemplate[];
  readonly validation: ReadonlyMap<string, QueryValidationResult>;
}): readonly CatalogWriteRequest[] =>
  templates.flatMap((template) => {
    /** Writes only explicit valid or skipped outcomes; invalid templates were excluded earlier. */
    const outcome: QueryValidationResult | undefined = validation.get(template.id);
    if (outcome === undefined || outcome.status === 'invalid') return [];
    /** Uses one timestamp pair so a document represents one orchestration attempt. */
    const timestamp: string = now();
    return [
      {
        document: {
          createdAt: timestamp,
          description: template.description,
          evidence: template.evidence,
          extractorVersion: template.extractorVersion,
          id: template.id,
          ...(template.logLevel === undefined ? {} : { logLevel: template.logLevel }),
          query: template.query,
          repository: template.repository,
          revision: template.revision,
          ...(template.severityScore === undefined
            ? {}
            : { severityScore: template.severityScore }),
          signalType: template.signalType,
          sourceHash: `sha256:${sha256Digest(JSON.stringify(template.evidence))}`,
          title: template.title,
          updatedAt: timestamp,
        },
        validation: outcome,
      },
    ];
  });

/** Composes complete discovery, required workflows, deterministic generation, validation, and catalog persistence. */
export const extractRepository = async (
  dependencies: ExtractRepositoryDependencies
): Promise<OperationResult<ExtractionRunResult>> => {
  /** Resolves the caller-selected branch, tag, or SHA exactly once before any downstream operation. */
  const resolution = await dependencies.repositoryResolver.resolve(dependencies.repositoryRequest);
  if (resolution.status === 'failure') return resolution;
  /** Pins every source, workflow, identity, and catalog operation to the immutable resolved commit. */
  const repository: ResolvedRepository = resolution.value;
  /** Completes the cheap OTel gate before other scans so bounded source adapters are not oversubscribed. */
  const otelDetection = await detectOtelInstrumentation({
    reader: dependencies.reader,
    repository,
  });
  /** Runs complete logging discovery after the instrumentation gate releases its scan capacity. */
  const standardLogging = await discoverLoggingCandidates({
    reader: dependencies.reader,
    repository,
  });
  /** Runs expensive OTel extraction only after complete source evidence proves instrumentation exists. */
  const standardOtel: OtelDiscoveryResult = otelDetection.detection.hasOtel
    ? await discoverOtelSignals({ reader: dependencies.reader, repository })
    : { diagnostics: [], signals: [] };
  /** Any diagnostic means source coverage is incomplete and must prevent classification and writes. */
  const standardCoverageFailure = sourceCoverageFailure([
    ...standardLogging.diagnostics,
    ...otelDetection.diagnostics,
    ...standardOtel.diagnostics,
  ]);
  if (standardCoverageFailure !== undefined) {
    return { error: standardCoverageFailure, status: 'failure' };
  }

  /** Keeps complete standard discovery results; a successful empty repository yields zero templates. */
  const loggingCandidates: readonly LoggingCandidate[] = standardLogging.candidates;
  const otelSignals: readonly OtelSignal[] = standardOtel.signals;

  /** Supplies immutable context shared by deterministic generators. */
  const context: TemplateGenerationContext = {
    extractorVersion: dependencies.extractorVersion,
    repository: repository.repository,
    revision: repository.commitSha,
  };
  /** Keeps original logging source candidates paired with workflow-safe transport DTOs. */
  const loggingWorkflowCandidates: readonly (LoggingClassificationCandidate & {
    readonly source: LoggingCandidate;
  })[] = loggingCandidates.map((candidate) => ({
    evidence: workflowEvidence(candidate.evidence),
    excerpt: firstWorkflowExcerpt(candidate.excerpt),
    id: candidate.id,
    source: candidate,
  }));
  /** Splits every logging candidate by both cardinality and exact workflow wire-size limits. */
  const loggingBatches = workflowBatches<
    LoggingClassificationCandidate & { readonly source: LoggingCandidate }
  >({
    requestFor: (candidates) => ({
      candidates: candidates.map(({ source: _source, ...candidate }) => candidate),
    }),
    values: loggingWorkflowCandidates,
  });
  if (loggingBatches.status === 'failure') return loggingBatches;
  /** Retains source-backed templates only after every required logging batch succeeds. */
  const loggingTemplates: GeneratedTemplate[] = [];
  for (const candidates of loggingBatches.value) {
    /** Requires one complete workflow response per candidate, with one bounded retry. */
    const complete = await classifyWorkflowBatch({
      candidates,
      run: () =>
        dependencies.workflows.classifyLogging({
          candidates: candidates.map(({ source: _source, ...candidate }) => candidate),
        }),
    });
    if (complete.status === 'failure') return complete;
    /** Resolves source candidates only after strict decision coverage has been proven. */
    const decisions = new Map(complete.value.map((decision) => [decision.id, decision]));
    for (const candidate of candidates) {
      /** Complete workflow contracts ensure this branch is defensive rather than permissive. */
      const decision = decisions.get(candidate.id);
      if (decision?.keep !== true) continue;
      /** Classifier text is optional; source extraction remains the deterministic fallback. */
      const signatures = extractLogSignatures({
        ...(decision.level !== undefined && decision.staticMessage !== undefined
          ? {
              classified: { level: decision.level, staticMessage: decision.staticMessage },
              content: candidate.source.excerpt,
            }
          : { content: candidate.source.excerpt }),
        evidence: candidate.source.evidence,
      });
      loggingTemplates.push(...generateLogTemplates({ context, signatures }));
    }
  }

  /** Assigns stable opaque IDs so multiple signals from one source line remain independently classifiable. */
  const otelCandidates = otelSignals.map((signal, index) => ({
    id: otelCandidateId(signal, index),
    signal,
  }));
  /** Converts OTel source signals into workflow DTOs before exact byte-budget batching. */
  const otelWorkflowCandidates: readonly (OtelClassificationCandidate & {
    readonly source: OtelSignal;
  })[] = otelCandidates.map(({ id, signal }) => ({
    evidence: workflowEvidence(signal.evidence),
    id,
    signal: {
      kind: signal.kind,
      ...(signal.metricKind === undefined ? {} : { metricKind: signal.metricKind }),
      ...(signal.templated === undefined ? {} : { templated: signal.templated }),
      ...(signal.value === undefined ? {} : { value: signal.value }),
      ...(signal.valueHint === undefined ? {} : { valueHint: signal.valueHint }),
    },
    source: signal,
  }));
  /** Splits every OTel candidate by both cardinality and exact workflow wire-size limits. */
  const otelBatches = workflowBatches<
    OtelClassificationCandidate & { readonly source: OtelSignal }
  >({
    requestFor: (candidates) => ({
      candidates: candidates.map(({ source: _source, ...candidate }) => candidate),
    }),
    values: otelWorkflowCandidates,
  });
  if (otelBatches.status === 'failure') return otelBatches;
  /** Retains source-backed templates only after every required OTel batch succeeds. */
  const otelTemplates: GeneratedTemplate[] = [];
  for (const candidates of otelBatches.value) {
    /** Sends source-derived signal facts with one bounded retry for incomplete output. */
    const complete = await classifyWorkflowBatch({
      candidates,
      run: () =>
        dependencies.workflows.classifyOtel({
          candidates: candidates.map(({ source: _source, ...candidate }) => candidate),
        }),
    });
    if (complete.status === 'failure') return complete;
    /** Resolves source candidates only after strict decision coverage has been proven. */
    const decisions = new Map(complete.value.map((decision) => [decision.id, decision]));
    for (const candidate of candidates) {
      /** Complete workflow contracts ensure this branch is defensive rather than permissive. */
      const decision = decisions.get(candidate.id);
      if (decision?.keep !== true) continue;
      /** Workflow metadata enriches presentation only; query text and evidence remain deterministic source facts. */
      otelTemplates.push(
        ...generateOtelTemplates({ context, signals: [candidate.source] }).map((template) => ({
          ...template,
          ...(decision.description === undefined ? {} : { description: decision.description }),
          ...(decision.severityScore === undefined
            ? {}
            : { severityScore: decision.severityScore }),
          ...(decision.title === undefined ? {} : { title: decision.title }),
        }))
      );
    }
  }

  /** Merges identical deterministic templates before validation and persistence. */
  const templates = deduplicateTemplates([...loggingTemplates, ...otelTemplates]);
  /** Retains validation results for every deduplicated template. */
  const validation = new Map<string, QueryValidationResult>();
  /** Explains invalid template exclusion without converting it into a required workflow failure. */
  const diagnostics: ExtractionDiagnostic[] = [];
  for (const template of templates) {
    try {
      const outcome = await dependencies.validator.validate(template.query);
      validation.set(template.id, outcome);
      if (outcome.status === 'invalid') {
        diagnostics.push({
          code: 'invalid_template',
          message: outcome.diagnostics.join(' ') || 'Query validation failed.',
          templateId: template.id,
        });
      }
    } catch (_error: unknown) {
      /** A validator exception excludes the template and remains visible to callers as a diagnostic. */
      diagnostics.push({
        code: 'template_validation_failure',
        message: 'Query validation failed unexpectedly.',
        templateId: template.id,
      });
    }
  }
  /** Empty valid output intentionally performs no catalog call, preserving the previous catalog unchanged. */
  const requests = catalogRequestsFor({ now: dependencies.now, templates, validation });
  if (requests.length === 0) {
    return {
      status: 'success',
      value: {
        diagnostics,
        generatedTemplates: templates,
        validation,
        write: { failures: [], writtenIds: [] },
      },
    };
  }
  /** Catalog writes happen only after all required source and workflow stages have completed successfully. */
  const write = await dependencies.catalogWriter.write(requests);
  if (write.status === 'failure') return write;
  return {
    status: 'success',
    value: { diagnostics, generatedTemplates: templates, validation, write: write.value },
  };
};
