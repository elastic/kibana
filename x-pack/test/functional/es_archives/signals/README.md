Within this folder is input test data for tests such as:

```ts
security_and_spaces/tests/generating_signals.ts
```

where these are small ECS compliant input indexes that try to express tests that exercise different parts of
the detection engine signals. Compliant meaning that these might contain extra fields but should not clash with ECS.
Nothing stopping anyone from being ECS strict and not having additional extra fields but the extra fields and mappings
are to just try and keep these tests simple and small. Examples are:


This is an ECS document that has a numeric name clash with a signal structure 
```
numeric_name_clash
```

This is an ECS document that has an object name clash with a signal structure
```
object_clash
```

