<!--
  AUTHORITATIVE INSTRUCTION CONTEXT — review as carefully as SKILL.md
  Protected by CODEOWNERS: @elastic/security-engineering-productivity.
-->

# Domain Knowledge

**Shared tables live at**  
`x-pack/solutions/security/plugins/security_solution/.agents/references/security-domain-knowledge.md`.

Read that file for: team labels, CODEOWNERS handle ↔ `Team:*`, page routes, platform plugin boundaries, test locations, documentation URLs, feature-flag files, privilege patterns, high-bug-density areas.

## Validator-only notes

**When to check docs:** "Expected behavior" says TBD; feature behavior unclear; potential redesign; permission/privilege bug; old bug (filed against an earlier version).

**Flag-gated bugs:** A bug against a flag whose default is `false` affects fewer users. A graduated flag (removed, feature always-on) may have changed the described behavior. See Feature Flags in the shared file.

**Step 1c:** map `kibana.jsonc` `owner` / CODEOWNERS slugs to issue labels using the shared Team Ownership tables. Flag mismatches: no label, wrong team, multi-team, or root cause in a platform plugin (Platform / Cross-Kibana table).
