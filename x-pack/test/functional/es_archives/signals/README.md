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
