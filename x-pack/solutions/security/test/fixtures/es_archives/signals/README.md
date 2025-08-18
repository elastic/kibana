Within this folder is input test data for tests such as:

```ts
security_and_spaces / tests / generating_signals.ts;
```

where these are small ECS compliant input indexes that try to express tests that exercise different parts of
the detection engine signals. Compliant meaning that these might contain extra fields but should not clash with ECS.
Nothing stopping anyone from being ECS strict and not having additional extra fields but the extra fields and mappings
are to just try and keep these tests simple and small. Examples include:

#### `signals/numeric_name_clash`

An ECS document that has a numeric name clash with a signal structure

#### `signals/object_clash`

An ECS document that has an object name clash with a signal structure

#### `signals/legacy_signals_index`

A legacy signals index. It has no migration metadata fields and a very old mapping version.

#### `signals/outdated_signals_index`

A signals index that had previously been updated but is now out of date. It has migration metadata fields and a recent mapping version.

#### `signals/index_alias_clash`

An index that has the .siem-signals alias, but is NOT a signals index. Used for simulating an alerts-as-data index, which will have the .siem-signals alias but different mappings. This way we can test that functionality that needs to target only signals indices (e.g. mapping updates to apply field aliases) work correctly in the presence of alerts-as-data indices.
