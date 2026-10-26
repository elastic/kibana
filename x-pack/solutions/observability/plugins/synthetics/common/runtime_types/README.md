# Synthetics runtime types

Everything here is shared by the server and the browser, so how it is laid out
decides what Kibana has to load and keep in memory.

## Layout

| Where                                                 | What goes there                                                                                         | Loads zod? |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `index.ts` (the barrel) and the folders it re-exports | **Types**, enums, constants and plain type guards                                                       | No         |
| `schemas/`                                            | Every zod schema, plus helpers that call `.parse` / `.safeParse` (for example `schemas/ping_guards.ts`) | Yes        |

The barrel is imported by hundreds of files that only need `ConfigKey`,
`MonitorTypeEnum` or a type. It must never pull in a schema, so:

- Import **types, enums and constants** from `common/runtime_types`.
- Import **schemas** from the module that defines them, for example
  `common/runtime_types/schemas/monitor_types`. Only code that actually validates
  should do this.
- A type that is derived from a schema lives next to the other types and uses
  `import type { FooCodec } from '../schemas/foo'` plus
  `export type Foo = SchemaOutput<typeof FooCodec>`. The import is erased at build time.
- Schemas may import enums from the light modules. Light modules may only
  `import type` from `schemas/`.

`barrel_is_light.test.ts` fails if the barrel starts loading `@kbn/zod`.

## Writing schemas

- Wrap every exported schema in `lazySchema(() => …)` from `@kbn/zod`. Importing a
  schema module then only allocates a proxy, and the real schema is built on first
  use and can be garbage collected once nothing holds it.
- Build shared field fragments inside factories (`const commonFields = () => ({…})`),
  not as module-level objects, otherwise they stay pinned for the life of the process.
- Do not chain on an exported schema at module level (`.optional()`, `.extend()`,
  `.and()`). That materializes it and pins it. Do it inside another `lazySchema`.
- Tiny `z.enum(...)` codecs over an enum may stay eager.
- In hot loops, keep a strong reference to what the proxy hands out, not to the proxy
  itself. The proxy only holds a `WeakRef` to the real schema, so
  `const codec = HTTPFieldsCodec` does not stop a GC between calls from forcing a
  rebuild. Hold a bound method (`const { safeParse } = HTTPFieldsCodec`) or a schema
  derived from it (`const exact = HTTPFieldsCodec.strip()`) for the duration of the
  loop instead. `instanceof` checks against these proxies are always `false`.
