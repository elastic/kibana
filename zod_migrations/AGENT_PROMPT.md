# Zod v3 to v4 Migration Task Prmopt

## Context
- **Zod v4 Migration Guide**: https://zod.dev/v4/changelog
- **Agent Notes**: @ZOD_MIGRATION_AGENT.md 
- **Packages**:
  - `@kbn/zod` → exports zod v4: @src/platform/packages/shared/kbn-zod/index.ts
  - `@kbn/zod-helpers` → custom helpers: @src/platform/packages/shared/kbn-zod-helpers/index.ts

## Migration Process

### 1. Analyze the File
- Read the target file
- Identify all zod usage patterns
- Check for any `@kbn/zod-helpers` imports
- Check for `zod-to-json-schema` imports (package is deprecated in v4)
- Note any custom error handling or validation logic

### 2. Apply v4 Changes
**CRITICAL**: Always import from `@kbn/zod`, NEVER directly from `zod`:
- ✅ Correct: `import { z } from '@kbn/zod'`
- ❌ Wrong: `import { z } from 'zod'`

**Code Quality**: Do NOT add `any` or `unknown` types during migration. If type compatibility issues arise, investigate proper type solutions rather than loosening types.

Update based on these common patterns:

**String validators:**
- `z.string().email()` → `z.email()`
- `z.string().uuid()` → `z.uuid()`
- `z.string().url()` → `z.url()`
- `z.string().ip()` → `z.union([z.ipv4(), z.ipv6()])` or choose specific one

**Error customization:**
- `{ message: "..." }` → `{ error: "..." }`
- `{ invalid_type_error: "...", required_error: "..." }` → `{ error: (issue) => issue.input === undefined ? "required msg" : "type msg" }`
- `{ errorMap: ... }` → `{ error: ... }`

**Object methods:**
- `.strict()` → `z.strictObject({ ... })`
- `.passthrough()` → `z.looseObject({ ... })`
- `.merge(other)` → `.extend(other.shape)` or `z.object({ ...A.shape, ...B.shape })`

**Other common changes:**
- `z.nativeEnum(MyEnum)` → `z.enum(MyEnum)`
- `z.record(valueSchema)` → `z.record(z.string(), valueSchema)`
- Review `.default()` usage - now applies to output type, not input type

**Remove zod-to-json-schema dependency:**
Zod v4 has native JSON Schema generation. Replace `zod-to-json-schema` usage:

- **Remove import**: `import zodToJsonSchema from 'zod-to-json-schema'`
- **Replace function call**: `zodToJsonSchema(schema, options)` → `schema.toJsonSchema(options)`
- **Options mapping**:
  - `target: 'openApi3'` → `target: 'openApi3'` (same)
  - `$refStrategy: 'none'` → `$refStrategy: 'none'` (same)
  - Most options are compatible, but check Zod v4 docs if using advanced options
- **Example**:
  ```typescript
  // Before (v3 with zod-to-json-schema):
  import zodToJsonSchema from 'zod-to-json-schema';
  const jsonSchema = zodToJsonSchema(mySchema, { target: 'openApi3', $refStrategy: 'none' });
  
  // After (v4 native):
  const jsonSchema = mySchema.toJsonSchema({ target: 'openApi3', $refStrategy: 'none' });
  ```

### 3. Update Helper Functions
If file uses `@kbn/zod-helpers`, verify helper functions are v4 compliant. Check helper source if unsure.

### 4. Handle Edge Cases
If a feature cannot be migrated:
- Add comment at top of file: `// TODO: Zod v4 migration blocked - [reason]`
- Document the specific blocker (missing API, breaking change, etc.)
- DO NOT attempt workarounds
- Report the issue in migration notes

### 5. Validate Changes

**Type checking:**
- Find nearest tsconfig.json from the file
- Run: `node scripts/type_check --project <path/to/tsconfig.json>`
- Ensure type checking passes with **0 errors** (100% success required)
- Fix ALL type errors that emerge (do not ignore errors in dependencies)
- **IMPORTANT**: If you introduced `any` or `unknown` types to fix errors, reconsider the approach. Look for proper type solutions that maintain code quality.

**Test files:**
- Check if test files exist for the migrated file (e.g., `file.test.ts` or `file.spec.ts`)
- If test files exist OR if you migrated helper functions in `@kbn/zod-helpers`, run tests:
  ```bash
  node scripts/jest <path/to/test_file.ts>
  ```
- Ensure all tests pass
- Fix any failing tests caused by the migration
- Do NOT skip or ignore test failures

### 6. Update Migration Log
Update @zod_migrations/AGENT_NOTES.md with:
- Key changes made (bullet list, be concise)
- Any patterns or learnings for future migrations
- Blockers encountered (if any)
- Type check results (must be 100% success)
- Test results (if tests were run)

Update @zod_migrations/AGENT_LOGS.md with:
- files paths migrated

Optionally Update @zod_migrations/AGENT_PROMPT.md with:
Any useful notes for the next agent run to keep in mind. Keep this file with minimal changes and only add very critical issues that you want to tell the next agent

---

## Common v4 API Changes Reference

**Type names:**
- `ZodSchema` → `ZodType`
- `ZodTypeAny` → `ZodType`
- `TypeOf<T>` → `z.output<T>`

**Safe parse types:**
- `SafeParseReturnType` → `ZodSafeParseResult`
- `SafeParseError` → `ZodSafeParseError`
- `SafeParseSuccess` → `ZodSafeParseSuccess`

**Type checking in v4:**
- Old: `ZodFirstPartyTypeKind.ZodString` enum
- New: `schema.type === 'string'` string literal
- Common types: `'string'`, `'number'`, `'object'`, `'array'`, `'union'`, `'intersection'`, `'optional'`, `'default'`, `'pipe'`, `'lazy'`, `'literal'`, `'enum'`

**Internal API changes:**
- `._def` → `.def` (both work, but `.def` is preferred)
- `.def` properties are type-specific, require `as unknown as { prop: Type }` casts
- Examples:
  - Lazy: `(schema.def as unknown as { getter: () => z.ZodType }).getter()`
  - Optional/Default: `(schema.def as unknown as { innerType: z.ZodType }).innerType`
  - Pipe: `(schema.def as unknown as { in: z.ZodType; out: z.ZodType })`

**Methods removed:**
- `.unwrap()` → access `.def.innerType` property
- `.removeDefault()` → access `.def.innerType` property

**Effects/transforms:**
- `ZodEffects` class removed
- Transforms now create `ZodPipe` instances
- Refinements are inline checks on the base schema
- Check type with `schema.type === 'pipe'`

**Custom helper types:**
- Don't extend Zod classes (constructor APIs changed)
- Use composition with `Object.assign()` to add markers
- For complex wrappers (like DeepStrict), use Proxy pattern to intercept `parse`/`safeParse` methods
  - Example: Intercept parse, call original schema, then add additional validation on the result
  - Access original method via `Object.getPrototypeOf(schema)[methodName].call(target, ...)`