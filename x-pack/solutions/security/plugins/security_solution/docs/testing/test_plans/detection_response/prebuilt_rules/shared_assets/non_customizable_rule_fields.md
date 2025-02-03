### Non-customizable rule fields

These are fields in the detection rule schema that cannot be customized for a prebuilt rule

```Gherkin
Examples:
│ Field name                        │ Diffable rule field     │
---------------------------------------------------------------
│ Rule type                         │ type                    │
│ Rule version                      │ version                 │
│ Rule signature id*                │ rule_id                 │
│ Rule author                       │ author                  │
│ Rule license                      │ license                 │

* Rule signature id stays unchanged after rule upgrades.
```
