# Attack Discovery Agent Builder Eval Suite

Isolated evaluation suite for the Attack Discovery 2.0 Agent Builder integration.

## Routing harness aid

The eval suite passes `configuration_overrides.instructions` to the Agent Builder
`converse` API to force the `attack-discovery-generator` skill during golden-path runs.
This is a temporary harness aid: the default router is not yet deterministic enough
to consistently pick the right skill for narrow eval scenarios (especially live alert
retrieval). The criteria for removing this override are:

1. The skill's natural description reliably routes to it for the eval queries.
2. Live-retrieval runs consistently use the expected tool path without detours.
3. The suite's `ResponseSkillInvocation` and `Trajectory` evaluators pass without the override.
