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
  findingDocumentId,
  generateLogTemplates,
  generateOtelTemplates,
  hasCompleteFinding,
  partitionClassificationResults,
  semanticDigest,
  sha256Digest,
  type CatalogWriteRequest,
  type CatalogWriteResult,
  type CatalogWriter,
  type ClassificationFindingFields,
  type ClassificationWorkflowClient,
  type FindingDocument,
  type FindingsWriteResult,
  type FindingsWriter,
  type FindingType,
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
  type SignalType,
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
  /** Findings written for human review; a findings failure is a diagnostic, not a failed run. */
  readonly findings: FindingsWriteResult;
  readonly generatedTemplates: readonly GeneratedTemplate[];
  readonly validation: ReadonlyMap<string, QueryValidationResult>;
  readonly write: CatalogWriteResult;
}

/** Receives operational warnings that do not change the extraction result. */
export interface ExtractionLogger {
  warn(message: string): void;
}

/** Supplies every environment port and immutable metadata required by one extraction run. */
export interface ExtractRepositoryDependencies {
  readonly catalogWriter: CatalogWriter;
  readonly extractorVersion: string;
  readonly findingsWriter: FindingsWriter;
  readonly logger: ExtractionLogger;
  readonly now: () => string;
  readonly reader: SourceReader;
  readonly repositoryRequest: RepositoryRevisionRequest;
  readonly repositoryResolver: RepositoryResolver;
  readonly validator: QueryValidator;
  readonly workflows: ClassificationWorkflowClient;
}

/** Encodes source text for byte limits enforced by workflow DTO contracts. */
const utf8Encoder = new TextEncoder();
/** Allows 1 request plus 3 retries of whatever a batch still leaves unresolved. */
const workflowBatchAttempts = 4;

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

/**
 * Produces one workflow-safe opaque ID per OTel signal without requiring unique source locations.
 * The ID depends only on the signal's own source facts plus its ordinal among identical signals,
 * so adding a signal elsewhere in the repository does not move the IDs (and therefore the
 * findings) of unchanged signals.
 */
export const otelCandidatesFor = (
  signals: readonly OtelSignal[]
): readonly { readonly id: string; readonly signal: OtelSignal }[] => {
  /** Counts identical signals seen so far so duplicates stay distinct in a stable order. */
  const seen = new Map<string, number>();
  return signals.map((signal) => {
    const source: string = JSON.stringify({ evidence: signal.evidence, signal });
    const ordinal = seen.get(source) ?? 0;
    seen.set(source, ordinal + 1);
    return {
      id: `otel-${semanticDigest(ordinal === 0 ? source : `${source}#${ordinal}`)}`,
      signal,
    };
  });
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

/** Caps the share of a repository's candidates that may stay unclassified before the run fails. */
const maxUnclassifiedShare = 0.05;

/** Returns how many candidates may stay unclassified while the run still counts as complete. */
const allowedUnclassified = (candidates: number): number =>
  Math.min(candidates - 1, Math.max(1, Math.floor(candidates * maxUnclassifiedShare)));

/** Holds one decision per classified candidate and the candidates the workflow never decided. */
interface ClassifiedBatch<Decision> {
  readonly decisions: readonly Decision[];
  readonly unclassifiedIds: readonly string[];
}

/** Candidate fields used to describe a skipped candidate and its neighbours in the batch. */
interface DescribableCandidate {
  readonly evidence: readonly SourceLocation[];
  readonly id: string;
}

/** Describes one skipped candidate so a merge with a look-alike neighbour is visible in the log. */
const describeSkippedCandidate = (
  candidates: readonly DescribableCandidate[],
  answerCounts: ReadonlyMap<string, number>,
  id: string
): string => {
  const index = candidates.findIndex((candidate) => candidate.id === id);
  const candidate = candidates[index];
  const answers = answerCounts.get(id) ?? 0;
  const location = candidate?.evidence[0];
  const excerpts = new Set(candidate?.evidence.map(({ excerpt }) => excerpt));
  const neighbour = (label: string, other: DescribableCandidate | undefined): string =>
    other === undefined
      ? `${label} none`
      : `${label} ${other.id}${
          other.evidence.some(({ excerpt }) => excerpts.has(excerpt)) ? ' (same excerpt)' : ''
        }`;
  return [
    `${id} ${answers === 0 ? 'omitted' : `answered ${answers} times`}`,
    `at ${index + 1}/${candidates.length}`,
    ...(location === undefined ? [] : [`${location.path}:${location.line}`]),
    neighbour('previous', candidates[index - 1]),
    neighbour('next', candidates[index + 1]),
  ].join(', ');
};

/**
 * Sends batch-local IDs such as `c1` so the model cannot rewrite path-like IDs, then maps answers
 * back to the original candidate IDs. Answers with an ID outside the batch are dropped.
 */
const runWithShortIds = async <
  Candidate extends { readonly id: string },
  Decision extends { readonly id: string }
>(
  candidates: readonly Candidate[],
  run: (candidates: readonly Candidate[]) => Promise<OperationResult<readonly Decision[]>>
): Promise<OperationResult<readonly Decision[]>> => {
  const originalIds = new Map(candidates.map(({ id }, index) => [`c${index + 1}`, id]));
  const result = await run(
    candidates.map((candidate, index) => ({ ...candidate, id: `c${index + 1}` } as Candidate))
  );
  if (result.status === 'failure') return result;
  return {
    status: 'success',
    value: result.value.flatMap((decision) => {
      const id = originalIds.get(decision.id);
      return id === undefined ? [] : [{ ...decision, id } as Decision];
    }),
  };
};

/**
 * Runs a classification batch and retries only the candidates still unresolved, whether the
 * model skipped them or the whole request failed transiently. Only a non-retryable failure stops
 * the repository; anything left after the last attempt is reported as unclassified.
 */
const classifyWorkflowBatch = async <
  Candidate extends DescribableCandidate,
  Decision extends { readonly id: string }
>({
  candidates,
  logger,
  repository,
  run,
  workflow,
}: {
  readonly candidates: readonly Candidate[];
  readonly logger: ExtractionLogger;
  readonly repository: string;
  readonly run: (candidates: readonly Candidate[]) => Promise<OperationResult<readonly Decision[]>>;
  readonly workflow: string;
}): Promise<OperationResult<ClassifiedBatch<Decision>>> => {
  const decisions: Decision[] = [];
  let pending: readonly Candidate[] = candidates;
  /** Describes what the first request left unresolved, so the warning shows why retries ran. */
  let firstTry: { readonly pending: number; readonly summary: string } | undefined;
  for (let attempt = 1; attempt <= workflowBatchAttempts && pending.length > 0; attempt += 1) {
    const classification = await runWithShortIds(pending, run);
    if (classification.status === 'failure') {
      if (!classification.error.retryable) return classification;
      if (attempt === 1) {
        firstTry = {
          pending: pending.length,
          summary: `failed for ${pending.length} candidates on the first try. ${classification.error.message}`,
        };
      }
      continue;
    }
    const partition = partitionClassificationResults(pending, classification.value);
    decisions.push(...partition.results);
    if (attempt === 1 && partition.unresolvedIds.length > 0) {
      const answerCounts = new Map<string, number>();
      for (const { id } of classification.value) {
        answerCounts.set(id, (answerCounts.get(id) ?? 0) + 1);
      }
      firstTry = {
        pending: partition.unresolvedIds.length,
        summary: `skipped ${partition.unresolvedIds.length} of ${
          candidates.length
        } candidates on the first try. ${partition.unresolvedIds
          .map((id) => describeSkippedCandidate(candidates, answerCounts, id))
          .join('; ')}.`,
      };
    }
    const unresolved = new Set(partition.unresolvedIds);
    pending = pending.filter(({ id }) => unresolved.has(id));
  }
  if (firstTry !== undefined) {
    logger.warn(
      `The ${workflow} classification workflow for ${repository} ${
        firstTry.summary
      } Retries recovered ${firstTry.pending - pending.length}; ${
        pending.length
      } still unclassified.`
    );
  }
  return {
    status: 'success',
    value: { decisions, unclassifiedIds: pending.map(({ id }) => id) },
  };
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

/** A finding collected during classification, before run metadata and timestamps are attached. */
interface FindingDraft {
  readonly candidateId: string;
  /** IDs of the templates generated from the same candidate; filtered to persisted ones later. */
  readonly catalogDocumentIds: readonly string[];
  readonly cataloged: boolean;
  readonly evidence: readonly SourceLocation[];
  readonly findingType: FindingType;
  readonly logLevel?: string;
  readonly signalType: SignalType;
  readonly summary: string;
  readonly title: string;
}

/** Builds a finding from a classifier decision when it carries all 3 finding fields. */
const findingDraftFor = ({
  candidateId,
  decision,
  evidence,
  logLevel,
  signalType,
  templates,
}: {
  readonly candidateId: string;
  readonly decision: ClassificationFindingFields & { readonly keep: boolean };
  readonly evidence: readonly SourceLocation[];
  readonly logLevel?: string;
  readonly signalType: SignalType;
  readonly templates: readonly GeneratedTemplate[];
}): FindingDraft | undefined =>
  hasCompleteFinding(decision)
    ? {
        candidateId,
        catalogDocumentIds: templates.map(({ id }) => id),
        cataloged: decision.keep,
        evidence,
        findingType: decision.findingType,
        ...(logLevel === undefined ? {} : { logLevel }),
        signalType,
        summary: decision.findingSummary,
        title: decision.findingTitle,
      }
    : undefined;

/** Converts collected drafts into codec-valid finding documents pinned to this run. */
const findingDocumentsFor = ({
  drafts,
  extractorVersion,
  now,
  persistedTemplateIds,
  repository,
}: {
  readonly drafts: readonly FindingDraft[];
  readonly extractorVersion: string;
  readonly now: () => string;
  readonly persistedTemplateIds: ReadonlySet<string>;
  readonly repository: ResolvedRepository;
}): readonly FindingDocument[] =>
  drafts.map((draft) => {
    /** Uses one timestamp pair so a document represents one orchestration attempt. */
    const timestamp: string = now();
    return {
      candidateId: draft.candidateId,
      /** Only templates that reached the catalog are linked, so a reviewer never follows a dead ID. */
      catalogDocumentIds: draft.catalogDocumentIds.filter((id) => persistedTemplateIds.has(id)),
      cataloged: draft.cataloged,
      createdAt: timestamp,
      evidence: draft.evidence,
      extractorVersion,
      findingType: draft.findingType,
      id: findingDocumentId({
        candidateId: draft.candidateId,
        findingType: draft.findingType,
        repository: repository.repository,
      }),
      ...(draft.logLevel === undefined ? {} : { logLevel: draft.logLevel }),
      repository: repository.repository,
      revision: repository.commitSha,
      signalType: draft.signalType,
      summary: draft.summary,
      title: draft.title,
      updatedAt: timestamp,
    };
  });

/** Maps an OTel signal to the catalog signal type its templates would carry. */
const otelFindingSignalType = (signal: OtelSignal): SignalType =>
  signal.kind === 'metric_name' ? 'metric' : 'trace';

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
  /** Counts candidates the workflow never decided; they produce no templates and block the prune. */
  let unclassifiedLogging = 0;
  /** Retains source-backed templates from every batch; only a non-retryable workflow failure stops the run. */
  const loggingTemplates: GeneratedTemplate[] = [];
  /** Collects review findings from both classifiers; `keep` and a finding are independent. */
  const findingDrafts: FindingDraft[] = [];
  for (const candidates of loggingBatches.value) {
    const classified = await classifyWorkflowBatch({
      candidates,
      logger: dependencies.logger,
      repository: repository.repository,
      run: (batch) =>
        dependencies.workflows.classifyLogging({
          candidates: batch.map(({ source: _source, ...candidate }) => candidate),
        }),
      workflow: 'logging',
    });
    if (classified.status === 'failure') return classified;
    unclassifiedLogging += classified.value.unclassifiedIds.length;
    const decisions = new Map(
      classified.value.decisions.map((decision) => [decision.id, decision])
    );
    for (const candidate of candidates) {
      /** Unclassified candidates have no decision and produce neither templates nor findings. */
      const decision = decisions.get(candidate.id);
      if (decision === undefined) continue;
      /** Rejected candidates generate nothing for the catalog but may still carry a finding. */
      const generated: readonly GeneratedTemplate[] =
        decision.keep === true
          ? generateLogTemplates({
              context,
              /** Classifier text is optional; source extraction remains the deterministic fallback. */
              signatures: extractLogSignatures({
                ...(decision.level !== undefined && decision.staticMessage !== undefined
                  ? {
                      classified: { level: decision.level, staticMessage: decision.staticMessage },
                      content: candidate.source.sourceWindow,
                    }
                  : { content: candidate.source.sourceWindow }),
                evidence: candidate.source.evidence,
                matchedLineIndex: candidate.source.matchedLineIndex,
              }),
            })
          : [];
      loggingTemplates.push(...generated);
      const finding = findingDraftFor({
        candidateId: candidate.id,
        decision,
        evidence: candidate.source.evidence,
        ...(decision.level === undefined ? {} : { logLevel: decision.level }),
        signalType: 'log',
        templates: generated,
      });
      if (finding !== undefined) findingDrafts.push(finding);
    }
  }

  /** Assigns stable opaque IDs so multiple signals from one source line remain independently classifiable. */
  const otelCandidates = otelCandidatesFor(otelSignals);
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
  let unclassifiedOtel = 0;
  /** Retains source-backed templates from every batch; only a non-retryable workflow failure stops the run. */
  const otelTemplates: GeneratedTemplate[] = [];
  for (const candidates of otelBatches.value) {
    const classified = await classifyWorkflowBatch({
      candidates,
      logger: dependencies.logger,
      repository: repository.repository,
      run: (batch) =>
        dependencies.workflows.classifyOtel({
          candidates: batch.map(({ source: _source, ...candidate }) => candidate),
        }),
      workflow: 'OTel',
    });
    if (classified.status === 'failure') return classified;
    unclassifiedOtel += classified.value.unclassifiedIds.length;
    const decisions = new Map(
      classified.value.decisions.map((decision) => [decision.id, decision])
    );
    for (const candidate of candidates) {
      /** Unclassified candidates have no decision and produce neither templates nor findings. */
      const decision = decisions.get(candidate.id);
      if (decision === undefined) continue;
      /** Workflow metadata enriches presentation only; query text and evidence remain deterministic source facts. */
      const generated: readonly GeneratedTemplate[] =
        decision.keep === true
          ? generateOtelTemplates({ context, signals: [candidate.source] }).map((template) => ({
              ...template,
              ...(decision.description === undefined ? {} : { description: decision.description }),
              ...(decision.severityScore === undefined
                ? {}
                : { severityScore: decision.severityScore }),
              ...(decision.title === undefined ? {} : { title: decision.title }),
            }))
          : [];
      otelTemplates.push(...generated);
      const finding = findingDraftFor({
        candidateId: candidate.id,
        decision,
        evidence: candidate.source.evidence,
        signalType: otelFindingSignalType(candidate.source),
        templates: generated,
      });
      if (finding !== undefined) findingDrafts.push(finding);
    }
  }

  /** Merges identical deterministic templates before validation and persistence. */
  const templates = deduplicateTemplates([...loggingTemplates, ...otelTemplates]);
  /** Retains validation results for every deduplicated template. */
  const validation = new Map<string, QueryValidationResult>();
  /** Explains invalid template exclusion without converting it into a required workflow failure. */
  const diagnostics: ExtractionDiagnostic[] = [];
  const unclassified = unclassifiedLogging + unclassifiedOtel;
  const classifiable = loggingCandidates.length + otelSignals.length;
  /** A large repository-wide gap signals a broken workflow rather than an occasional skipped ID. */
  const incompleteClassification = (written: boolean): OperationResult<never> => ({
    error: {
      code: 'incomplete_classification',
      message: `The classification workflow left ${unclassified} of ${classifiable} candidates unclassified after retries. ${
        written
          ? 'The classified entries were written, but documents from earlier extractions of this repository were kept and may be stale.'
          : 'No catalog documents were produced, so documents from earlier extractions of this repository were kept.'
      }`,
      retryable: true,
    },
    status: 'failure',
  });
  const classificationIncomplete =
    unclassified > 0 && unclassified > allowedUnclassified(classifiable);
  if (unclassified > 0) {
    diagnostics.push({
      code: 'unclassified_candidates',
      message: `The classification workflow skipped ${unclassifiedLogging} logging and ${unclassifiedOtel} OTel candidates even after retries, so they were left out of the catalog.`,
    });
  }
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
  const findingDocuments = findingDocumentsFor({
    drafts: findingDrafts,
    extractorVersion: dependencies.extractorVersion,
    now: dependencies.now,
    persistedTemplateIds: new Set(requests.map(({ document }) => document.id)),
    repository,
  });
  /** Findings never fail the run: the catalog outcome is already decided, so a findings problem is a diagnostic. */
  const writeFindings = async (): Promise<FindingsWriteResult> => {
    if (findingDocuments.length === 0) return { failures: [], writtenIds: [] };
    const written = await dependencies.findingsWriter.write(findingDocuments);
    if (written.status === 'failure') {
      diagnostics.push({
        code: 'findings_write_failure',
        message: `${findingDocuments.length} findings could not be written, so findings from earlier extractions of this repository were kept and may be stale. ${written.error.message}`,
      });
      return { failures: [], writtenIds: [] };
    }
    if (written.value.failures.length > 0) {
      diagnostics.push({
        code: 'findings_write_failure',
        message: `Elasticsearch rejected ${written.value.failures.length} of ${findingDocuments.length} findings, so findings from earlier extractions of this repository were kept and may be stale.`,
      });
    }
    return written.value;
  };
  /** Removes findings whose source line is gone; only runs when this run saw every candidate. */
  const pruneFindings = async (findings: FindingsWriteResult): Promise<void> => {
    if (
      unclassified > 0 ||
      findings.failures.length > 0 ||
      findings.writtenIds.length !== findingDocuments.length
    ) {
      return;
    }
    const prune = await dependencies.findingsWriter.prune({
      keepIds: findings.writtenIds,
      repository: repository.repository,
    });
    if (prune.status === 'failure') {
      diagnostics.push({
        code: 'findings_prune_failure',
        message: `Findings were written, but stale findings from earlier extractions could not be removed. ${prune.error.message}`,
      });
    }
  };
  if (requests.length === 0) {
    /** Findings are written even when every candidate was rejected for the catalog. */
    const findings = await writeFindings();
    if (classificationIncomplete) return incompleteClassification(false);
    diagnostics.push({
      code: 'prune_skipped_no_documents',
      message:
        'No catalog documents were produced, so documents from earlier extractions of this repository were kept and may be stale.',
    });
    await pruneFindings(findings);
    return {
      status: 'success',
      value: {
        diagnostics,
        findings,
        generatedTemplates: templates,
        validation,
        write: { failures: [], writtenIds: [] },
      },
    };
  }
  /** Classified entries are written even when too many candidates stayed unclassified, so 1 bad batch cannot empty a repository. */
  const write = await dependencies.catalogWriter.write(requests);
  if (write.status === 'failure') return write;
  const findings = await writeFindings();
  if (classificationIncomplete) return incompleteClassification(true);
  /** Skipped candidates may match documents from earlier extractions, so those must not be pruned. */
  if (write.value.failures.length === 0 && unclassified > 0) {
    diagnostics.push({
      code: 'prune_skipped_unclassified_candidates',
      message:
        'Some candidates were not classified, so documents from earlier extractions of this repository were kept and may be stale.',
    });
  }
  /** Prunes only after a fully successful write, so a partial write never removes the previous catalog. */
  if (write.value.failures.length === 0 && unclassified === 0) {
    const prune = await dependencies.catalogWriter.prune({
      keepIds: write.value.writtenIds,
      repository: repository.repository,
    });
    if (prune.status === 'failure') {
      return {
        error: {
          code: 'catalog_prune_failure',
          message: `Catalog documents were written, but stale documents from earlier extractions could not be removed, so the catalog may mix revisions. Run the extraction again to repair it. ${prune.error.message}`,
          retryable: prune.error.retryable,
        },
        status: 'failure',
      };
    }
    /** Findings follow the catalog prune so both indexes describe the same revision. */
    await pruneFindings(findings);
  }
  return {
    status: 'success',
    value: {
      diagnostics,
      findings,
      generatedTemplates: templates,
      validation,
      write: write.value,
    },
  };
};
