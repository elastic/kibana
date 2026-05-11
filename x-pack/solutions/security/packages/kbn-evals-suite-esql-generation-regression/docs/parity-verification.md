# Parity Verification — ES|QL Generation Regression

## Evaluator inventory

| Evaluator | Kind | Active | Framework source |
|---|---|---|---|
| ES\|QL Functional Equivalence | `LLM` | ✅ Yes (Phase 1) | `x-pack/platform/packages/shared/kbn-evals/src/evaluators/esql/index.ts` |
| ES\|QL Syntax Validity | `CODE` | ❌ No (Phase 2) | — |
| ES\|QL Execution | `CODE` | ❌ No (Phase 2) | — |
| Result-row parity | `CODE` | ❌ No (Phase 2) | — |

## Score semantics

| Evaluator | Score `1` meaning | Score `0` meaning |
|---|---|---|
| ES\|QL Functional Equivalence | Queries are functionally equivalent (same results, not necessarily same syntax) | Queries are not functionally equivalent |

The LLM judge labels the pair `Equivalent ES|QL query` → `1` or `Non-equivalent ES|QL query` → `0`.
Scores are binary; no partial credit is assigned in Phase 1.

## LangSmith parity

The suite was originally evaluated on LangSmith. The table below maps each LangSmith evaluator to its `@kbn/evals` equivalent.

| LangSmith evaluator | `@kbn/evals` equivalent | Parity status |
|---|---|---|
| ES\|QL Equivalence (LLM-as-judge) | `createEsqlEquivalenceEvaluator` — `ES\|QL Functional Equivalence` | ✅ Full parity (Phase 1) |
| ES\|QL Syntax Validity (deterministic) | `createEsqlSyntaxValidityEvaluator` (planned) | ❌ Phase 2 |
| ES\|QL Execution (live cluster) | `createEsqlExecutionEvaluator` (planned) | ❌ Phase 2 |
| Result-row equivalence | new primitive in `@kbn/evals` (planned) | ❌ Phase 2 |

The dataset covers **76 examples** exported from LangSmith (`ES|QL Generation Regression Suite`,
id `261dcc59-fbe7-4397-a662-ff94042f666c`, cutoff 2026-05-07).
