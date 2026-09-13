/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * DetectionRulesClient — the Security-side rules client for Detection Engine v2.
 *
 * This class owns:
 *   - The detection-scope check: a rule is in scope iff its stored ownership
 *     matches `{ managed: true, solution: 'security', domain: 'detection' }`
 *     and its builder_type resolves through the alias map to a known public type.
 *   - Default application (via applyRuleDefaults / applyRuleUpdateDefaults).
 *   - The public ↔ framework conversion (via toFrameworkCreate / toPublicResponse etc.).
 *   - Type immutability enforcement on PUT.
 *   - Read-modify-write for PATCH, with full create-schema validation of the merged result.
 *   - Scoped list, tags, enable, disable.
 *
 * Routes stay thin over this client.  The framework rules client is acquired
 * via `getRulesClientWithRequest(request, { onBehalfOf: { solution: 'security' } })`
 * so that managed-rule writes are allowed.
 *
 * Ref: rule-crud-api.md "Create a rule", "Replace a rule with PUT",
 *      "Patch a rule with PATCH", "Delete a rule", "Validation layering"
 *      rule-fetch-api.md "One rule by object id", "The list endpoint", "The tags endpoint"
 *      rule-actions-api.md "The endpoints", "Semantics"
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import type { RuleResponse, RuleSource } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import type { RulesClientApi, FindRulesArgs } from '@kbn/alerting-v2-plugin/server';

import {
  applyRuleDefaults,
  applyRuleUpdateDefaults,
  toFrameworkCreate,
  toFrameworkReplace,
  toFrameworkPatch,
  toPublicResponse,
  ALIAS_TO_BUILDER_TYPE_ID,
  BUILDER_TYPE_ID_TO_ALIAS,
  ALIAS_MAP,
} from '../common/api';
import type {
  DetectionRuleCreateProps,
  DetectionRuleUpdateProps,
  DetectionRulePatchProps,
  DetectionRuleResponse,
} from '../common/api';

// ---------------------------------------------------------------------------
// Detection-side error codes
//
// Codes for checks the framework does not make.  Kept separate from the
// framework's ALERTING_ERROR_CODES to avoid confusion.
// ---------------------------------------------------------------------------

/**
 * Machine-readable error codes specific to the Detections API.
 *
 * `RULE_TYPE_IMMUTABLE` — returned (409) when a PUT payload's `type` differs
 * from the stored type.  Not to be confused with `RULE_VERSION_CONFLICT`
 * (optimistic-concurrency conflict) — a client retrying on OCC must not loop
 * forever on a type-change attempt.
 */
export const DETECTION_ERROR_CODES = {
  RULE_TYPE_IMMUTABLE: 'RULE_TYPE_IMMUTABLE',
} as const;

// ---------------------------------------------------------------------------
// Scope check constants
// ---------------------------------------------------------------------------

/** The ownership fragment that every stored detection rule carries. */
const DETECTION_OWNERSHIP = {
  managed: true as const,
  solution: 'security',
  domain: 'detection',
};

// ---------------------------------------------------------------------------
// List params and result types
// ---------------------------------------------------------------------------

/**
 * Public sort fields accepted by the Detections API list endpoint.
 * `severity` is deliberately absent — lexicographic order is wrong and the API
 * does not substitute a risk_score sort.
 *
 * Ref: rule-fetch-api.md "Searching and sorting"
 */
export type DetectionRuleListSortField = 'name' | 'enabled' | 'risk_score';

/**
 * Structured filter parameters for the list endpoint.
 * Each parameter filters on one field; values within a parameter are ORed,
 * and separate parameters are ANDed.
 *
 * Ref: rule-fetch-api.md "The list endpoint", "Filtering"
 */
export interface ListRulesParams {
  /** Filter on enabled/disabled state. */
  enabled?: boolean;
  /** Filter on public type alias — translated through the alias map. */
  type?: Array<'query' | 'threshold'>;
  /** Filter on metadata.builder_fields.severity. */
  severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
  /** Filter on metadata.tags. */
  tags?: string[];
  /** Filter on metadata.signature_id (the stable public rule id). */
  rule_ids?: string[];
  /** Prefix match over rule names and descriptions. Passed straight through. */
  search?: string;
  /** Sort field. `severity` is not accepted. */
  sort_field?: DetectionRuleListSortField;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  /**
   * Public field names to project. Projection runs in the API layer on the
   * converted objects; `id` is always included regardless.
   *
   * Ref: rule-fetch-api.md "Field limitation"
   */
  fields?: string[];
}

/** Response envelope for the list endpoint. */
export interface ListRulesResult {
  page: number;
  per_page: number;
  total: number;
  data: DetectionRuleResponse[];
}

// ---------------------------------------------------------------------------
// KQL scoping helpers
// ---------------------------------------------------------------------------

/**
 * The constant ownership KQL fragment that scopes detection rule queries.
 * All three fields must match for a rule to belong to the Detections API.
 */
const DETECTION_OWNERSHIP_FRAGMENT =
  `metadata.ownership.managed: true and ` +
  `metadata.ownership.solution: "${DETECTION_OWNERSHIP.solution}" and ` +
  `metadata.ownership.domain: "${DETECTION_OWNERSHIP.domain}"`;

/**
 * Builds the full KQL scoping fragment (ownership AND type clause).
 *
 * The type clause is derived from the alias map so a future detection type
 * joins the API by registering — no hardcoded builder type id list to maintain.
 *
 * Ref: rule-fetch-api.md "Scoping: only detection rules, always"
 */
function buildScopingFragment(): string {
  const typeClauses = ALIAS_MAP.map((e) => `metadata.builder_type: "${e.builderTypeId}"`);
  const typeClause = typeClauses.length === 1 ? typeClauses[0] : `(${typeClauses.join(' or ')})`;
  return `(${DETECTION_OWNERSHIP_FRAGMENT}) and ${typeClause}`;
}

/**
 * Escapes a freeform string value for safe embedding inside a KQL
 * double-quoted literal.  KQL uses `\` as the escape character inside a
 * double-quoted string, so both `"` and `\` must be escaped.
 *
 * Without escaping, a tag value such as `say "hi"` produces the unparseable
 * fragment `metadata.tags: "say "hi""` and fromKueryExpression throws.
 */
function escapeKqlValue(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Builds one OR-joined KQL clause from an array of terms.
 * Returns a bare clause for a single term, or a parenthesised OR for multiple.
 */
function orClause(terms: string[]): string {
  if (terms.length === 1) return terms[0];
  return `(${terms.join(' or ')})`;
}

/**
 * Composes the structured list filters into one KQL string and ANDs in the
 * scoping fragment.  Returns only the scoping fragment when no caller filters
 * are supplied.
 *
 * Ref: rule-fetch-api.md "Filtering"
 */
function buildListFilter(params: ListRulesParams): string {
  const parts: string[] = [];

  if (params.enabled !== undefined) {
    parts.push(`enabled: ${params.enabled}`);
  }

  if (params.type && params.type.length > 0) {
    parts.push(
      orClause(
        params.type.map((alias) => `metadata.builder_type: "${ALIAS_TO_BUILDER_TYPE_ID[alias]}"`)
      )
    );
  }

  if (params.severity && params.severity.length > 0) {
    parts.push(orClause(params.severity.map((s) => `metadata.builder_fields.severity: "${s}"`)));
  }

  if (params.tags && params.tags.length > 0) {
    parts.push(
      orClause(params.tags.map((t) => `metadata.tags: "${escapeKqlValue(t)}"`))
    );
  }

  if (params.rule_ids && params.rule_ids.length > 0) {
    parts.push(
      orClause(params.rule_ids.map((rid) => `metadata.signature_id: "${escapeKqlValue(rid)}"`))
    );
  }

  const scoping = buildScopingFragment();
  if (parts.length === 0) {
    return scoping;
  }
  return `(${parts.join(') and (')}) and (${scoping})`;
}

/**
 * Maps the Detections API public sort field to the framework's FindRulesSortField.
 * Throws 400 for `severity` (explicitly not sortable).
 *
 * Ref: rule-fetch-api.md "Searching and sorting"
 */
const DETECTION_SORT_FIELD_TO_FRAMEWORK: Record<
  DetectionRuleListSortField,
  FindRulesArgs['sortField']
> = {
  name: 'name',
  enabled: 'enabled',
  risk_score: 'builder_fields.risk_score',
};

/**
 * Projects a converted public rule to only the requested fields, always
 * keeping `id`.  Runs at the API layer, after the framework returned full rules.
 *
 * Ref: rule-fetch-api.md "Field limitation"
 */
function projectFields(rule: DetectionRuleResponse, fields: string[]): DetectionRuleResponse {
  const keep = new Set(['id', ...fields]);
  return Object.fromEntries(
    Object.entries(rule as Record<string, unknown>).filter(([k]) => keep.has(k))
  ) as DetectionRuleResponse;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the rule's stored ownership and builder_type are both
 * in scope for this API.
 *
 * A rule is in scope when:
 *   1. Its `metadata.ownership` matches the DETECTION_OWNERSHIP fragment.
 *   2. Its `metadata.builder_type` resolves through the alias map to a known
 *      public type alias.
 *
 * The second check excludes detection rules whose type was written by a newer
 * deployment that this one does not know yet (rollback scenario).
 *
 * Ref: rule-fetch-api.md "One rule by object id"
 *      rule-fetch-api.md "Scoping: only detection rules, always"
 */
function isInScope(rule: RuleResponse): boolean {
  const ownership = rule.metadata?.ownership as
    | { managed: boolean; solution?: string; domain?: string }
    | undefined;

  if (
    !ownership ||
    ownership.managed !== true ||
    ownership.solution !== DETECTION_OWNERSHIP.solution ||
    ownership.domain !== DETECTION_OWNERSHIP.domain
  ) {
    return false;
  }

  const builderType = rule.metadata?.builder_type;
  if (!builderType || !BUILDER_TYPE_ID_TO_ALIAS[builderType]) {
    return false;
  }

  return true;
}

/**
 * Throw a 404 RULE_NOT_FOUND Boom error.  Used both when the id does not
 * exist (re-thrown from the framework) and when the rule is out of scope.
 */
function throwNotFound(id: string): never {
  throw Boom.notFound(`Detection rule with id "${id}" not found`, {
    code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
    details: { rule_id: id },
  });
}

// ---------------------------------------------------------------------------
// DetectionRulesClient
// ---------------------------------------------------------------------------

export interface DetectionRulesClientDeps {
  frameworkClient: RulesClientApi;
  logger: Logger;
}

export class DetectionRulesClient {
  private readonly framework: RulesClientApi;
  private readonly logger: Logger;

  constructor({ frameworkClient, logger }: DetectionRulesClientDeps) {
    this.framework = frameworkClient;
    this.logger = logger;
  }

  // -------------------------------------------------------------------------
  // Create (POST)
  // -------------------------------------------------------------------------

  /**
   * Create a detection rule.
   *
   * Applies defaults, resolves the alias entry, converts to the framework
   * shape, and calls `createRule`.  Passes `enabled` through the phase 7
   * `options.enabled` option so the rule starts disabled by default (v1's
   * contract) while the framework's default is enabled.
   *
   * Two framework fields are the API's decision, not the caller's:
   *   - `recovery_strategy: 'none'` and `no_data_strategy: 'none'` — the
   *     converter sends these explicitly so stored detection rules are uniform
   *     even if the framework default ever changes.
   *   - No `grouping` — for threshold rules the framework derives it at write
   *     time from `threshold.field`.
   *
   * Ref: rule-crud-api.md "Create a rule"
   */
  public async createRule(props: DetectionRuleCreateProps): Promise<DetectionRuleResponse> {
    const withDefaults = applyRuleDefaults(props);

    // Resolve the alias entry for the requested type.
    const builderTypeId = ALIAS_TO_BUILDER_TYPE_ID[props.type];
    if (!builderTypeId) {
      // Should be caught by the route schema; defensive guard.
      throw Boom.badRequest(`Unknown detection rule type: '${props.type}'`, {
        code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
      });
    }

    const frameworkData = toFrameworkCreate(withDefaults);

    // `enabled` comes from the caller (defaulted to false by applyRuleDefaults).
    const enabled = withDefaults.enabled;

    const result = await this.framework.createRule({
      data: frameworkData,
      options: {
        enabled,
        validateBuilderFields: true,
      },
    });

    return toPublicResponse(result);
  }

  // -------------------------------------------------------------------------
  // Replace (PUT)
  // -------------------------------------------------------------------------

  /**
   * Full replace of a detection rule.
   *
   * PUT reads first to:
   *   1. Give the 404 — this endpoint never creates.
   *   2. Check type immutability — a differing `type` is 409.
   *   3. Supply the concurrency token.
   *
   * The payload plus defaults becomes the entire new user-controllable state.
   * An omitted defaultable field resets to its default; an omitted optional
   * field clears.  Identity, ownership, and `enabled` are not in the payload.
   * `metadata.source` is restated with the stored type and id plus the
   * payload's `version` (omitted version keeps the stored one, as v1 does).
   *
   * Ref: rule-crud-api.md "Replace a rule with PUT"
   */
  public async replaceRule(
    id: string,
    props: DetectionRuleUpdateProps
  ): Promise<DetectionRuleResponse> {
    // Read first — gives 404 and the concurrency token.
    const existing = await this.getInScopeRule(id);
    const storedSource = existing.metadata?.source as RuleSource;

    // Type immutability: the payload's `type` must match the stored type.
    // RULE_TYPE_IMMUTABLE is the detection-side code; RULE_VERSION_CONFLICT is
    // reserved for optimistic-concurrency conflicts and must not be reused here
    // (a client that retries on OCC would loop forever on a type-change attempt).
    const storedPublicType = BUILDER_TYPE_ID_TO_ALIAS[existing.metadata?.builder_type ?? ''];
    if (storedPublicType !== props.type) {
      throw Boom.conflict(
        `Cannot change rule type from '${storedPublicType}' to '${props.type}'. ` +
          `Rule type is immutable.`,
        {
          code: DETECTION_ERROR_CODES.RULE_TYPE_IMMUTABLE,
          details: { rule_id: id },
        }
      );
    }

    // Apply defaults to the PUT payload (same as create, minus `enabled`).
    const withDefaults = applyRuleUpdateDefaults(props);

    // An omitted `version` keeps the stored one (v1's contract).
    const version =
      withDefaults.version !== undefined ? withDefaults.version : storedSource?.version ?? 1;

    const frameworkData = toFrameworkReplace({ ...withDefaults, version }, storedSource);

    // Grab the concurrency token from the framework result.
    const occVersion = (existing as RuleResponse & { version?: string }).version;

    const result = await this.framework.updateRule({
      id,
      data: frameworkData,
      options: {
        version: occVersion,
        validateBuilderFields: true,
      },
    });

    return toPublicResponse(result);
  }

  // -------------------------------------------------------------------------
  // Patch (PATCH)
  // -------------------------------------------------------------------------

  /**
   * Partial update of a detection rule — read-modify-write.
   *
   * Steps:
   *   1. Read and scope-check.
   *   2. Convert the stored rule to its public form.
   *   3. Merge the patch over the public form (`null` clears an optional field).
   *   4. Validate the merged result against the stored type's full create schema.
   *      Foreign fields (belonging to the other type) become 400 errors.
   *   5. Convert and write through `updateRule` with the whole `builder_fields`
   *      and the concurrency token.
   *
   * An empty PATCH body is accepted (a no-op beyond the framework's mutation
   * sequence).  There is no type change through PATCH.
   *
   * Ref: rule-crud-api.md "Patch a rule with PATCH"
   */
  public async patchRule(
    id: string,
    patch: DetectionRulePatchProps
  ): Promise<DetectionRuleResponse> {
    // Step 1: Read and scope-check.
    const existing = await this.getInScopeRule(id);
    const storedPublicType = BUILDER_TYPE_ID_TO_ALIAS[existing.metadata?.builder_type ?? ''];
    const storedSource = existing.metadata?.source as RuleSource;

    // rule_id immutability: if the patch includes rule_id, it must match the stored value.
    // PUT enforces this via the framework's assertSignatureIdUnchanged, which surfaces as
    // IMMUTABLE_FIELDS_CHANGED with details.fields = ['metadata.signature_id'].  PATCH
    // runs the same check here (because buildPatchedInput drops rule_id and the framework
    // never sees a mismatched signature_id through this path) and raises the same code so
    // clients see one machine-readable code for a rule_id mismatch regardless of the verb.
    // RULE_TYPE_IMMUTABLE is reserved for a PUT payload's type change.
    if (patch.rule_id !== undefined) {
      const storedRuleId = existing.metadata?.signature_id;
      if (patch.rule_id !== storedRuleId) {
        throw Boom.conflict(
          `Cannot change rule_id from '${storedRuleId ?? '(not set)'}' to '${patch.rule_id}'. ` +
            `rule_id (metadata.signature_id) is immutable.`,
          {
            code: ALERTING_ERROR_CODES.IMMUTABLE_FIELDS_CHANGED,
            details: { fields: ['metadata.signature_id'] },
          }
        );
      }
    }

    // Step 2: Convert the stored rule to its public form.
    const currentPublic = toPublicResponse(existing);

    // Step 3: Merge the patch over the public form.
    const merged = mergePatch(currentPublic, patch);

    // Step 4: Validate the merged result against the stored type's full create schema.
    //
    // The merged object comes from toPublicResponse, which includes response-only
    // fields (id, revision, source, created_at, etc.) that are not in the create
    // schema. Strip them before validating so they do not cause false rejections.
    //
    // The create schema is used in strict mode so that type-specific fields from
    // the other type (e.g. `threshold` on a query rule) are rejected with a 400
    // instead of silently stripped. The alias map types `createSchema` as ZodType
    // for flexibility; cast to ZodObject to access .strict().
    const aliasEntry = ALIAS_MAP.find((e) => e.alias === storedPublicType);
    if (!aliasEntry) {
      // Should never happen: the scope check already validated the type.
      throw Boom.internal(`No alias entry for stored type '${storedPublicType}'`);
    }

    // Fields that appear in the response but not in the create schema.
    const RESPONSE_ONLY_KEYS = new Set([
      'id',
      'revision',
      'source',
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
    ]);
    const writableFields = Object.fromEntries(
      Object.entries(merged).filter(([k]) => !RESPONSE_ONLY_KEYS.has(k))
    );

    // Cast to ZodObject to access .strict(); alias map entries are always
    // ZodObject instances (built via .merge() chains on z.object()).
    const strictSchema = (aliasEntry.createSchema as z.ZodObject<z.ZodRawShape>).strict();
    const parseResult = strictSchema.safeParse(writableFields);
    if (!parseResult.success) {
      // A field that doesn't belong to the rule's actual type surfaces here as a 400.
      // Zod v4 uses `.issues` (not `.errors`) on the ZodError object.
      const issues = parseResult.error.issues;
      const message = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw Boom.badRequest(`Patch validation failed: ${message}`, {
        code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
        details: { rule_id: id, issues },
      });
    }

    // Step 5: Convert and write.
    // The merged result has all fields fully resolved; build the patched input.
    const patchedInput = buildPatchedInput(merged, patch, storedSource);
    const occVersion = (existing as RuleResponse & { version?: string }).version;

    // The concurrency token goes to options.version (not inside the data body).
    // The framework's updateRuleDataSchema is strict and rejects a top-level version key.
    const frameworkData = toFrameworkPatch(patchedInput);

    const result = await this.framework.updateRule({
      id,
      data: frameworkData,
      options: {
        version: occVersion,
        validateBuilderFields: true,
      },
    });

    return toPublicResponse(result);
  }

  // -------------------------------------------------------------------------
  // Delete (DELETE)
  // -------------------------------------------------------------------------

  /**
   * Delete a detection rule and return its last state.
   *
   * Reads the rule first (giving the 404 and the scope check for free), then
   * deletes it, then returns the converted last-state response.
   *
   * Deletion cascades as the framework defines it: the executor task goes, the
   * change history closes.
   *
   * Ref: rule-crud-api.md "Delete a rule"
   */
  public async deleteRule(id: string): Promise<DetectionRuleResponse> {
    // Read, scope-check, and capture the last state before deletion.
    const existing = await this.getInScopeRule(id);
    const lastState = toPublicResponse(existing);

    await this.framework.deleteRule({ id });

    return lastState;
  }

  // -------------------------------------------------------------------------
  // Get (GET /rules/{id})
  // -------------------------------------------------------------------------

  /**
   * Fetch one detection rule by its Kibana object id.
   *
   * Returns 404 RULE_NOT_FOUND for a missing id, a rule outside the detection
   * scope, and a detection rule whose builder_type this build does not know
   * (rollback scenario — logged with a warning).
   *
   * Reads never validate builder fields; validation is opt-in per call.
   *
   * Ref: rule-fetch-api.md "One rule by object id"
   */
  public async getRule(id: string): Promise<DetectionRuleResponse> {
    const rule = await this.getInScopeRule(id);
    return toPublicResponse(rule);
  }

  // -------------------------------------------------------------------------
  // List (GET /rules)
  // -------------------------------------------------------------------------

  /**
   * List detection rules.
   *
   * Composes the structured filters (OR within a parameter, AND across
   * parameters) into one KQL string and ANDs in the scoping fragment before
   * passing to the framework's findRules.  `search` passes straight through.
   *
   * The framework's scoping fragment ANDed into every find is what the list
   * endpoint means by "only detection rules, always": it includes the ownership
   * fragment plus a builder_type clause derived from the alias map, so unknown-
   * type detection rules (rollback state) are naturally excluded.
   *
   * Field projection runs in the API layer after conversion.  The sort field is
   * validated here: `severity` is explicitly rejected.
   *
   * Ref: rule-fetch-api.md "The list endpoint", "Filtering", "Searching and
   *      sorting", "Field limitation"
   */
  public async listRules(params: ListRulesParams = {}): Promise<ListRulesResult> {
    // Validate sort field: severity is not sortable.
    if ((params.sort_field as string) === 'severity') {
      throw Boom.badRequest(
        `'severity' is not a valid sort field. Use 'risk_score' as a practical stand-in, ` +
          `or sort by 'name' or 'enabled'.`,
        { code: ALERTING_ERROR_CODES.INVALID_RULE_DATA }
      );
    }

    const frameworkSortField = params.sort_field
      ? DETECTION_SORT_FIELD_TO_FRAMEWORK[params.sort_field]
      : undefined;

    const filter = buildListFilter(params);

    const result = await this.framework.findRules({
      filter,
      search: params.search,
      sortField: frameworkSortField,
      sortOrder: params.sort_order,
      page: params.page,
      perPage: params.per_page,
    });

    // Convert each framework rule to the public shape.
    let data: DetectionRuleResponse[] = result.items.map((r) => toPublicResponse(r));

    // Apply fields projection in the API layer.
    if (params.fields && params.fields.length > 0) {
      data = data.map((r) => projectFields(r, params.fields!));
    }

    return {
      page: result.page,
      per_page: result.per_page,
      total: result.total,
      data,
    };
  }

  // -------------------------------------------------------------------------
  // Tags (GET /tags)
  // -------------------------------------------------------------------------

  /**
   * Fetch distinct tags across the caller's detection rules.
   *
   * Uses the phase 7 filter option on getTags, filled with the ownership
   * fragment so the aggregation is scoped to detection rules only.
   *
   * Ref: rule-fetch-api.md "The tags endpoint"
   */
  public async getDetectionTags(): Promise<string[]> {
    return this.framework.getTags({ filter: buildScopingFragment() });
  }

  // -------------------------------------------------------------------------
  // Enable / disable
  // -------------------------------------------------------------------------

  /**
   * Enable a detection rule.
   *
   * Scope-checks first (404 for out-of-scope), then calls the framework's
   * enableRule untouched.  The framework semantics are preserved exactly:
   *   - Re-enabling an already-enabled rule is not short-circuited.
   *   - The mutation sequence moves and updated_at changes.
   *   - revision does not move (enable is not a meaningful edit).
   *   - The enabling user's API key is stamped on the executor task.
   *   - Enable does not validate detection logic.
   *
   * Ref: rule-actions-api.md "Semantics", "What enable does not check"
   */
  public async enableRule(id: string): Promise<DetectionRuleResponse> {
    await this.getInScopeRule(id);
    const result = await this.framework.enableRule({ id });
    return toPublicResponse(result);
  }

  /**
   * Disable a detection rule.
   *
   * Scope-checks first (404 for out-of-scope), then calls the framework's
   * disableRule untouched.  Same idempotent-outcome / not-short-circuited
   * semantics as enable; revision never moves.
   *
   * Ref: rule-actions-api.md "Semantics"
   */
  public async disableRule(id: string): Promise<DetectionRuleResponse> {
    await this.getInScopeRule(id);
    const result = await this.framework.disableRule({ id });
    return toPublicResponse(result);
  }

  // -------------------------------------------------------------------------
  // Shared scope check helper
  // -------------------------------------------------------------------------

  /**
   * Fetch a rule from the framework and verify it is a Security detection rule.
   *
   * Returns the `RuleResponse` when the rule is in scope. Throws 404
   * `RULE_NOT_FOUND` when:
   *   - The id does not exist (re-thrown from the framework's 404).
   *   - The id names a rule that is not a detection rule (out-of-scope rules
   *     are treated as non-existent to avoid leaking their presence).
   *   - The id names a detection rule whose `builder_type` this build does not
   *     know (rollback scenario — the rule is served by the generic Alerting
   *     surface in this state).
   *
   * Ref: rule-fetch-api.md "One rule by object id"
   */
  public async getInScopeRule(id: string): Promise<RuleResponse> {
    let rule: RuleResponse;
    try {
      rule = await this.framework.getRule({ id });
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 404) {
        // The framework already threw RULE_NOT_FOUND; re-throw as-is.
        throw e;
      }
      throw e;
    }

    if (!isInScope(rule)) {
      // Log a warning for the rollback case (known detection rule, unknown type).
      const builderType = rule.metadata?.builder_type;
      const knownType = builderType ? BUILDER_TYPE_ID_TO_ALIAS[builderType] : undefined;
      if (
        rule.metadata?.ownership &&
        (rule.metadata.ownership as { managed?: boolean }).managed === true &&
        !knownType
      ) {
        this.logger.warn(
          `Detection rule ${id} has builder_type '${builderType}' which is not known ` +
            `to this build. The rule is excluded from the Detections API. ` +
            `This is expected after a downgrade; upgrade to restore access.`
        );
      }
      throwNotFound(id);
    }

    return rule;
  }
}

// ---------------------------------------------------------------------------
// Merge and build helpers (module-private)
// ---------------------------------------------------------------------------

/**
 * Merge the PATCH payload over the current public rule form.
 *
 * Rules:
 *   - A field present in the patch replaces the stored value.
 *   - A field absent in the patch keeps the stored value.
 *   - `null` in the patch clears an optional field (the merged result omits
 *     the key, as if the field was never set).
 */
function mergePatch(
  current: DetectionRuleResponse,
  patch: DetectionRulePatchProps
): Record<string, unknown> {
  // Start from the current public form.
  const merged: Record<string, unknown> = { ...current };

  // Apply each key from the patch.
  for (const key of Object.keys(patch) as Array<keyof DetectionRulePatchProps>) {
    const value = patch[key];
    if (value === undefined) {
      // Field absent in patch — keep stored value.
      continue;
    }
    if (value === null) {
      // null clears the field: remove it from the merged object.
      delete merged[key];
    } else if (key === 'schedule') {
      // Schedule is a nested object — merge interval and lookback individually.
      const storedSchedule = (current.schedule ?? {}) as {
        interval?: string;
        lookback?: string;
      };
      const patchSchedule = value as { interval?: string; lookback?: string | null };
      const newSchedule: Record<string, unknown> = { ...storedSchedule };
      if (patchSchedule.interval !== undefined) {
        newSchedule.interval = patchSchedule.interval;
      }
      if (patchSchedule.lookback !== undefined) {
        if (patchSchedule.lookback === null) {
          delete newSchedule.lookback;
        } else {
          newSchedule.lookback = patchSchedule.lookback;
        }
      }
      merged.schedule = newSchedule;
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Build a `DetectionRulePatchedInput` from the merged public form plus the
 * raw patch (to detect explicit null on lookback) and the stored source.
 */
function buildPatchedInput(
  merged: Record<string, unknown>,
  patch: DetectionRulePatchProps,
  storedSource: RuleSource
) {
  const schedule = (merged.schedule ?? {}) as { interval?: string; lookback?: string };

  // Determine the lookback situation:
  //   - The patch explicitly set lookback to null → send null (clear).
  //   - The merged schedule has a lookback string → send it.
  //   - Neither → leave undefined (don't touch the stored value).
  let lookback: string | null | undefined;
  if (patch.schedule?.lookback === null) {
    lookback = null;
  } else if (schedule.lookback !== undefined) {
    lookback = schedule.lookback;
  } else {
    lookback = undefined;
  }

  // Restate source with caller's new version if provided; otherwise keep stored version.
  const version =
    typeof merged.version === 'number' ? (merged.version as number) : storedSource.version ?? 1;
  const updatedSource: RuleSource = { ...storedSource, version };

  return {
    name: merged.name as string,
    description: merged.description as string,
    version,
    tags: (merged.tags as string[]) ?? [],
    severity: merged.severity as string,
    risk_score: merged.risk_score as number,
    max_signals: merged.max_signals as number | undefined,
    threat: merged.threat as unknown[] | undefined,
    setup: merged.setup as string | undefined,
    note: merged.note as string | undefined,
    references: merged.references as string[] | undefined,
    false_positives: merged.false_positives as string[] | undefined,
    author: merged.author as string[] | undefined,
    license: merged.license as string | undefined,
    related_integrations: merged.related_integrations as unknown[] | undefined,
    required_fields: merged.required_fields as unknown[] | undefined,
    schedule: {
      interval: (schedule.interval ?? '5m') as string,
      lookback,
    },
    language: merged.language as string,
    index: merged.index as string[],
    query: merged.query as string,
    threshold: merged.threshold as unknown,
    source: updatedSource,
  };
}
