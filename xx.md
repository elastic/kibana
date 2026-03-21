---

# Elastic Security: Competitive Analysis, Gap Assessment & LLM/Agentic Opportunity Map

## Part 1: Competitive Landscape

### Market Position (Q1 2026)

| Vendor | Gartner Position | Forrester Position | Market Share | AI Flagship |
|---|---|---|---|---|
| **Splunk** (Cisco) | Leader | Leader | ~47% | Splunk AI Assistant |
| **Microsoft Sentinel** | Leader | Leader | Growing fast | Copilot for Security |
| **CrowdStrike** | Visionary | Strong Performer | Fast-growing | Charlotte AI |
| **Palo Alto XSIAM** | Leader | Leader | Growing | Cortex AgentiX |
| **Google SecOps** | Visionary | Contender | Moderate | Gemini in SecOps |
| **SentinelOne** | Challenger | Strong Performer | Growing | Purple AI |
| **Elastic Security** | Visionary | **Leader** | ~4-5% | AI Assistant + Attack Discovery |

Elastic earned **Leader** status in Forrester Wave Security Analytics Q2 2025, recognized for flexible deployment, community-driven detection engineering, Automatic Import, and AI-powered analytics.

---

## Part 2: Gap Analysis vs. Competitors

### CRITICAL GAPS (High business impact, competitors far ahead)

#### Gap 1: Agentic AI Autonomy — CrowdStrike, Palo Alto, SentinelOne lead by 12+ months

| Capability | CrowdStrike | Palo Alto | SentinelOne | Elastic |
|---|---|---|---|---|
| Autonomous alert triage | Charlotte AI: 98% accuracy, 40h/week saved | XSIAM: 99% noise reduction | Purple AI: 60% fewer incidents | Attack Discovery (batch, not real-time) |
| Closed-loop auto-response | Charlotte AI AgentWorks + Agentic SOAR | Cortex AgentiX | Purple AI remediation | Not shipped |
| Agent marketplace/orchestration | Charlotte AI AgentWorks | Cortex AgentiX | Purple AI MCP Server | Agent Builder (early, behind flag) |
| Bounded autonomy controls | ISO 42001 certified | Built-in guardrails | Audit controls | No formal framework |

**Status in Kibana:** Attack Discovery exists but is batch-mode and schedule-based. No real-time autonomous triage. Agent Builder has 7 security tools and 3 skills but is behind experimental flags. No SOAR-equivalent shipped.

**Key issues found:**
- `#256563` — Claude Sonnet 4.6 unreliable with Attack Discovery
- `#258448` — Duplicate discoveries from frequent scheduled runs
- `#247026` — `generateEsql` tool produces incorrect results
- AI Rule Creation has 3 failing Cypress tests (`#253599`, `#253600`, `#253601`)

#### Gap 2: SOAR / Automated Response — No native SOAR offering

| Competitor | SOAR Capability |
|---|---|
| **Palo Alto** | Full Cortex XSOAR (market leader), now integrated into XSIAM |
| **Google SecOps** | Chronicle SOAR with Gemini-generated playbooks |
| **Splunk** | Splunk SOAR (acquired Phantom) |
| **Microsoft** | Logic Apps + Copilot for Security automated workflows |
| **CrowdStrike** | Fusion SOAR + Charlotte AI Agentic SOAR |
| **Elastic** | **None.** Only basic response actions (isolate host, kill process) |

This is the single largest product gap. Every major competitor has native or integrated SOAR. Elastic has no playbook engine, no orchestration layer, no automated investigation workflows.

#### Gap 3: Cloud Security / CNAPP — Not competitive

| Competitor | Cloud Security |
|---|---|
| **CrowdStrike** | Full CNAPP: CSPM, CWPP, CIEM, KSPM |
| **Wiz** | Market-leading CNAPP |
| **Palo Alto** | Prisma Cloud / Cortex Cloud (full CNAPP + AI-SPM) |
| **Microsoft** | Defender for Cloud (CNAPP + CSPM) |
| **Elastic** | Cloud Workload Protection only (basic; ranked 14th in EPP) |

**New gap: AI-SPM** — Wiz and Palo Alto now offer AI Security Posture Management (discovering shadow AI, misconfigured LLM deployments, AI Bill of Materials). Elastic has zero presence here.

#### Gap 4: Detection Coverage Scale

| Vendor | Prebuilt Detections |
|---|---|
| Palo Alto XSIAM | 10,000+ detections, 2,600+ analytics models |
| CrowdStrike | 2,000+ IOAs + ML models |
| Microsoft Sentinel | 1,500+ analytics rules + Fusion ML |
| **Elastic** | ~800 prebuilt rules |

### SIGNIFICANT GAPS (Medium impact, competitors meaningfully ahead)

#### Gap 5: NL-to-Query Parity

| Vendor | NL Query | Rule Generation |
|---|---|---|
| **Microsoft** | Copilot NL -> KQL, full Sentinel integration | Copilot generates analytics rules |
| **Google** | Gemini NL -> UDM/YARA-L | Gemini generates detection rules + playbooks |
| **CrowdStrike** | Charlotte AI NL query | Charlotte AI generates response workflows |
| **Elastic** | AI Assistant NL -> ES|QL (buggy: `#247026`) | AI Rule Creation (behind flag, failing tests) |

#### Gap 6: Identity Threat Detection and Response (ITDR)

| Vendor | ITDR |
|---|---|
| **CrowdStrike** | Falcon Identity Threat Protection (full ITDR) |
| **Microsoft** | Entra ID Protection + Sentinel identity analytics |
| **Palo Alto** | XSIAM identity analytics |
| **Elastic** | Entity Analytics (basic risk scoring, entity store v2 behind flag) |

#### Gap 7: Threat Intelligence Quality and Native Feeds

| Vendor | Threat Intel |
|---|---|
| **CrowdStrike** | CrowdStrike Intel (premium, nation-state tracking) |
| **Microsoft** | Microsoft Threat Intelligence (MSTIC) |
| **Google** | VirusTotal + Mandiant intel integrated |
| **Elastic** | Third-party integrations only (MISP, OTX, etc.), Gartner rates TI at 4.1/5 |

#### Gap 8: UX Intuitiveness and Ease of Deployment

From Gartner Peer Insights:
- "Not very intuitive to use" — requires experienced security team
- "Agents are a big pain to implement"
- "Frequent updates sacrifice stability and maturity"
- Only 389 Gartner ratings vs. 1,024+ for Splunk

### MODERATE GAPS (Real but manageable)

#### Gap 9: Managed LLM Connector Maturity

Elastic shipped a managed LLM as default connector in 8.19, but competitors have had this for 18+ months. Microsoft Copilot, CrowdStrike Charlotte, and Google Gemini are deeply integrated with their own foundation models.

#### Gap 10: Exposure Management / Attack Surface Management

CrowdStrike Falcon Exposure Management, Palo Alto Cortex Xpanse, and Microsoft Defender EASM provide attack surface discovery. Elastic has no equivalent.

---

## Part 3: LLM/Agentic Support Opportunities

### A. LEVERAGING LLM/AI INSIDE THE PRODUCT (improving Elastic Security with AI)

#### A1. Real-Time Agentic Alert Triage (HIGH PRIORITY)

**What:** Evolve Attack Discovery from batch/scheduled to real-time streaming triage that processes alerts as they arrive and auto-classifies them.

**Competitors:** CrowdStrike Charlotte AI Detection Triage (98% accuracy, 40h/week saved), Palo Alto XSIAM (99% noise reduction).

**Existing work:** Attack Discovery exists with scheduling (`x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/schedules/`). Needs evolution from batch to streaming.

**Easy win variant:** Add confidence scoring to existing Attack Discovery results + auto-close low-confidence alerts matching known-good patterns. The hallucination filtering code already exists at `helpers/filter_hallucinated_alerts/`.

**Stakeholder:** `@elastic/security-generative-ai`

#### A2. Agentic SOAR / Playbook Engine (HIGH PRIORITY)

**What:** Build an AI-native response automation layer — LLM-generated playbooks, drag-and-drop workflow builder, pre-built response templates, and autonomous execution with human-in-the-loop gates.

**Competitors:** Every major competitor has this. Google SecOps even has Gemini auto-generating SOAR playbooks.

**Existing work:** The Agent Builder framework (`x-pack/platform/plugins/shared/agent_builder/`) with MCP/A2A support is the foundation. Security has 7 registered tools. But there's no playbook abstraction, no workflow editor, no automated execution chain.

**Easy win variant:** Create pre-built "investigation notebooks" using Agent Builder skills that chain existing tools (alerts -> entity lookup -> risk score -> ES|QL hunt -> case creation). This is achievable with the current Agent Builder + skill infrastructure.

**Stakeholder:** `@elastic/security-generative-ai`, `@elastic/security-threat-hunting`

#### A3. AI-Powered Investigation Copilot (MEDIUM PRIORITY)

**What:** Proactive investigation assistant that, when an alert fires, automatically runs an investigation playbook: pulls related alerts, queries entity risk scores, checks threat intel, and presents a complete investigation brief.

**Competitors:** CrowdStrike Charlotte AI Agentic Response Collaboration, SentinelOne Purple AI guided investigations.

**Existing work:** The AI Assistant tools already exist (alert_counts, open_alerts, entity_risk_score, knowledge_base, esql_generation, security_labs). The `default_assistant_graph` LangGraph is the execution engine. Missing: proactive triggering and structured investigation flow.

**Easy win:** Add "suggested investigation steps" tiles to the alert flyout (already partially done in AI4DSOC EASE flyout `suggested_prompts.tsx`). Extend to auto-execute the first 2-3 steps.

**Stakeholder:** `@elastic/security-threat-hunting:investigations`, `@elastic/security-generative-ai`

#### A4. NL-to-Detection Rule Pipeline (MEDIUM PRIORITY)

**What:** Mature the AI Rule Creation feature from experimental to GA. Allow analysts to describe threats in natural language and get production-ready EQL/ES|QL/KQL rules.

**Competitors:** Google SecOps Gemini generates YARA-L rules from NL. Microsoft Copilot generates Sentinel analytics rules.

**Existing work:** Full LangGraph agent exists at `server/lib/detection_engine/ai_rule_creation/agent/`. Behind `aiRuleCreationEnabled` flag. Has 3 failing Cypress tests blocking progress.

**Easy win:** Fix the 3 failing tests (`#253599-253601`), stabilize the feature, and ship to GA. The hard work is done.

**Stakeholder:** `@elastic/security-detection-engine`

#### A5. Cross-Signal Correlation Engine (MEDIUM PRIORITY)

**What:** AI that correlates alerts across endpoint, cloud, identity, and network to surface complete attack chains (not just individual alerts).

**Competitors:** Palo Alto XSIAM (100% MITRE coverage, cross-domain correlation), CrowdStrike (cross-domain threat graph).

**Existing work:** Attack Discovery does some of this but relies on LLM to find patterns. No graph-based correlation engine. Entity Analytics provides risk scoring but not real-time correlation.

**Easy win:** Enhance Attack Discovery prompts to explicitly request multi-signal correlation and attack chain visualization. Add MITRE ATT&CK technique chaining to discovery results.

**Stakeholder:** `@elastic/security-generative-ai`, `@elastic/security-entity-analytics`

#### A6. AI Value Reporting Expansion (LOW PRIORITY — EASY WIN)

**What:** The AI4DSOC AI Value Reports already exist (`public/reports/pages/ai_value.tsx`) with cost savings, time saved, threats detected metrics. Expand to all tiers, not just AI4DSOC.

**Easy win:** Make the AI Value Report available for all Elastic Security users (not just AI4DSOC tier). Every competitor emphasizes ROI metrics. This is largely a feature-flag/entitlement change.

**Stakeholder:** `@elastic/security-threat-hunting`

#### A7. SIEM Migration Completion (IN PROGRESS — EASY WIN)

**What:** AI-powered translation of Splunk/QRadar rules and dashboards to Elastic is already built and mostly working.

**Existing work:** Full LangGraph agents for rules and dashboards exist. QRadar support added. Dashboard translation shipped. Issues: missing telemetry event (`#253757`), failing integration tests.

**Easy win:** Fix the outstanding bugs, complete telemetry, and heavily market this. This is a major competitive differentiator — no other vendor has AI-powered migration from Splunk.

**Stakeholder:** `@elastic/security-threat-hunting`

---

### B. OFFERING SECURITY CAPABILITIES FOR LLMs/AI (new market opportunity)

This is the most significant greenfield opportunity. The AI security market is exploding and Elastic has unique assets to compete.

#### B1. LLM Security Monitoring & Detection Rules (HIGH PRIORITY — EASY WIN)

**What:** Ship prebuilt detection rules for LLM threats — prompt injection, data exfiltration, model abuse, anomalous token usage, sensitive data leakage.

**Market:** OWASP published Top 10 for LLMs (2025) and Top 10 for Agentic Applications (2026). No SIEM vendor has shipped comprehensive detection rules for these.

**Existing work:** Elastic already has:
- AWS Bedrock integration with LLM invocation logging
- ECS field mappings for LLM data (`elastic_advances_llm_security.md`)
- Security Labs content on OWASP LLM Top 10 detection (`embedding_security_in_llm_workflows.md`)
- Knowledge base articles on LLM security
- `#257824` — Red-teaming and security testing CLI in kbn/evals

**Easy win:** Package the existing Security Labs research into 15-20 prebuilt ES|QL detection rules covering OWASP LLM Top 10. Ship as a new "LLM Security" detection rules package. The ECS mappings and integration already exist. This is detection engineering work, not platform work.

**Example rules:**
- Prompt injection pattern detection (regex + ML-based)
- Anomalous token count per session (Model DoS)
- Sensitive data in LLM responses (PII regex + NER)
- Unusual model invocation patterns (baselining)
- Cross-session prompt chain analysis
- Guardrail bypass attempts

**Stakeholder:** `@elastic/security-detection-engine`, Security Labs team (Mika Ayenson, Dan Kortschak, Jake King)

#### B2. AI Agent Observability & Security (HIGH PRIORITY)

**What:** Monitoring and securing AI agent deployments — MCP server activity, tool-calling patterns, agent decision chains, anomalous autonomous actions.

**Market:** MCP security is the #1 emerging concern. OWASP MCP Top 10 just published. Tool poisoning attacks affect Claude Desktop, Cursor, ChatGPT, VS Code. No major SIEM vendor offers native MCP/agent monitoring.

**What to build:**
1. **MCP Server Activity Integration** — Ingest MCP server logs (tool calls, auth events, context sharing)
2. **Agent Decision Chain Tracing** — Visualize and monitor LangGraph/LangChain execution traces in Elastic Security
3. **Tool Poisoning Detection Rules** — Detect malicious tool descriptions, shadow MCP servers, rug-pull attacks
4. **Autonomous Action Monitoring** — Alert when AI agents perform high-risk actions (file deletion, credential access, network calls)

**Elastic's advantage:** We already have `kbn-langchain`, `kbn-langgraph-checkpoint-saver`, and the Agent Builder framework. We understand agent architectures deeply. This is "eat our own dog food" + ship to customers.

**Easy win:** Create an "AI Agent Security" Elastic integration that ingests OpenTelemetry-compatible LLM traces (LangSmith, Langfuse, and custom OTLP). The existing `gen_ai.*` ECS fields cover most of what's needed. Add 5-10 detection rules for anomalous agent behavior.

**Stakeholder:** `@elastic/security-generative-ai`, `@elastic/obs-ai-team`, `@elastic/security-detection-engine`

#### B3. LLM Firewall / Guardrails Integration (MEDIUM PRIORITY)

**What:** Integrate with or build LLM firewall capabilities — real-time prompt inspection, output sanitization, PII detection, policy enforcement.

**Market:** Google Model Armor, Imperva AI Security, Akamai Firewall for AI, PromptGuard, PromptShield are all shipping products. This is a rapidly growing market.

**What to build:**
1. **Guardrails Integration** — Ingest logs from existing LLM firewalls (Model Armor, Imperva) into Elastic Security
2. **Detection Rules for Guardrail Bypass** — Detect when guardrails are circumvented
3. **Native Prompt Classification** — Use ELSER or ML models to classify prompt intent (benign, injection attempt, jailbreak, data extraction)

**Easy win:** Create Elastic integrations for Google Model Armor and AWS Bedrock Guardrails. These are log ingestion + dashboard + rules — the standard Elastic integration pattern.

**Stakeholder:** `@elastic/security-scalability` (owns Automatic Import), `@elastic/security-detection-engine`

#### B4. AI Security Posture Management (AI-SPM) (MEDIUM-HIGH PRIORITY)

**What:** Discover and assess the security posture of AI/LLM deployments — shadow AI detection, misconfigured AI services, AI Bill of Materials, training data exposure risks.

**Market:** Wiz and Palo Alto Prisma Cloud already ship AI-SPM. This is becoming a mandatory CNAPP feature.

**What to build:**
1. **AI Service Discovery** — Scan cloud environments for AI services (SageMaker, Bedrock, Vertex AI, Azure OpenAI)
2. **Configuration Assessment** — Check for misconfigured guardrails, open model endpoints, overly permissive IAM
3. **AI-BOM** — Inventory of models, SDKs, libraries, dependencies
4. **Data Flow Mapping** — Where does training data come from? Where do outputs go?

**Existing work:** Elastic has cloud security benchmarks (CIS). Extending to AI-specific benchmarks is incremental.

**Easy win:** Add AI-specific CIS-style benchmark rules for AWS Bedrock, Azure OpenAI, and Google Vertex AI configuration assessment. Ship as part of existing Cloud Security Posture Management.

**Stakeholder:** Cloud Security team, `@elastic/security-detection-engine`

#### B5. RAG Pipeline Security (MEDIUM PRIORITY)

**What:** Secure Retrieval-Augmented Generation pipelines — detect data poisoning in knowledge bases, unauthorized document access, context injection attacks.

**Market:** RAG is the most common enterprise LLM pattern. Security for RAG pipelines is an emerging need with no dominant solution.

**Elastic's advantage:** Elastic IS the vector database for many RAG deployments. We have unique visibility into the retrieval layer.

**What to build:**
1. **Knowledge Base Integrity Monitoring** — Detect unauthorized modifications to RAG document stores
2. **Context Injection Detection** — Flag when retrieved documents contain adversarial content
3. **Access Pattern Analysis** — Detect anomalous query patterns against RAG indexes

**Easy win:** Ship a "RAG Security" dashboard that monitors Elasticsearch vector search patterns for anomalies — unusual query volumes, embedding similarity distribution shifts, cross-user context leakage.

**Stakeholder:** `@elastic/security-generative-ai` (owns knowledge base), `@elastic/ml-team`

#### B6. AI Compliance and Governance (LOW-MEDIUM PRIORITY)

**What:** Help organizations meet emerging AI regulations (EU AI Act, NIST AI RMF, ISO 42001).

**What to build:**
1. **AI Audit Trail** — Complete logging of all AI decision chains for compliance
2. **Model Usage Reporting** — Who used what model, when, for what purpose
3. **Bias and Fairness Monitoring** — Track model outputs for discriminatory patterns
4. **EU AI Act Compliance Dashboard** — Risk categorization and documentation

**Easy win:** Create an "AI Governance" Kibana dashboard that aggregates LLM invocation logs with user identity, showing model usage patterns, cost, and decision audit trails.

---

## Part 4: Easy Wins Summary (Ranked by Impact/Effort)

| # | Opportunity | Effort | Impact | Existing Code | Status |
|---|---|---|---|---|---|
| 1 | **Ship OWASP LLM Top 10 detection rules** | Low (2-3 weeks) | High | ECS mappings + Bedrock integration exist | No issues found — new work |
| 2 | **Fix AI Rule Creation and ship to GA** | Low (fix 3 tests) | High | Full LangGraph agent built | `#253599-253601` blocking |
| 3 | **Make AI Value Reports available to all tiers** | Low (flag change) | Medium | Complete UI exists in AI4DSOC | No issues found |
| 4 | **Create MCP/Agent Security integration** | Medium (4-6 weeks) | Very High | OTel + gen_ai ECS fields exist | `#257824` (red-teaming CLI) |
| 5 | **Pre-built investigation notebooks via Agent Builder** | Medium (3-4 weeks) | High | 7 tools + 3 skills registered | Agent Builder is early |
| 6 | **Add confidence scoring to Attack Discovery** | Low (1-2 weeks) | Medium | Hallucination filtering exists | `#258448` (duplicates) |
| 7 | **Cloud AI service config benchmarks** | Medium (3-4 weeks) | High | CSPM framework exists | No issues found |
| 8 | **Complete SIEM Migration polish** | Low (bug fixes) | High | Full feature built | `#253757`, `#257554` |
| 9 | **RAG Security monitoring dashboard** | Low (2-3 weeks) | Medium | Vector search + KB exist | No issues found |
| 10 | **LLM firewall log integrations** | Medium (4-6 weeks) | Medium | Integration framework exists | No issues found |

---

## Part 5: Existing Work & Duplication Check

### Features Already Built (avoid duplication)

| Feature | Status | Team | Flag |
|---|---|---|---|
| Attack Discovery | **GA** (schedules, bulk ops, UI) | `@elastic/security-generative-ai` | Shipped |
| AI Assistant | **GA** (11 tools, LangGraph, RAG) | `@elastic/security-generative-ai` | Shipped |
| SIEM Migrations | **GA** (Splunk + QRadar rules + dashboards) | `@elastic/security-threat-hunting` | `siemMigrationsDisabled: false` |
| Automatic Import | **GA** | `@elastic/security-scalability` | Shipped |
| AI4DSOC (EASE flyout, value reports) | **GA (serverless)** | `@elastic/security-threat-hunting:investigations` | Tier-gated |
| Managed LLM Connector | **GA** (8.19+) | `@elastic/security-generative-ai` | Shipped |
| LLM Security KB content | **Shipped** (380+ articles) | Security Labs | N/A |
| AWS Bedrock LLM integration | **Shipped** | `@elastic/security-scalability` | N/A |

### Features Behind Flags (in development, not GA)

| Feature | Flag | Team |
|---|---|---|
| AI Rule Creation | `aiRuleCreationEnabled: false` | `@elastic/security-detection-engine` |
| Trial Companion | `trialCompanionEnabled: false` | SecuritySolution |
| Entity Store v2 | `entityAnalyticsEntityStoreV2: false` | `@elastic/security-entity-analytics` |
| Lead Generation | `leadGenerationEnabled: false` | `@elastic/security-entity-analytics` |
| Automatic Troubleshooting Skill | `automaticTroubleshootingSkill: false` | SecuritySolution |
| Alerts/Attacks Alignment | `enableAlertsAndAttacksAlignment: false` | SecuritySolution |

### Active Issues to Be Aware Of

| Issue | Title | Team | Relevance |
|---|---|---|---|
| `#257824` | kbn/evals Phase 3: Red-teaming and security testing CLI | `@elastic/agent-builder` | Directly relevant to LLM security testing |
| `#257821` | Extend @kbn/evals with advanced evaluation capabilities | `@elastic/agent-builder` | Foundation for AI quality |
| `#255820` | kbn/evals <-> Agent Builder eval feature completeness | Agent Builder | Eval integration |
| `#247026` | `generateEsql` tool produces incorrect results | `@elastic/security-detection-engine` | Core AI tool quality |
| `#256563` | Claude Sonnet 4.6 unreliable with Attack Discovery | `@elastic/security-generative-ai` | Model reliability |
| `#258448` | Duplicate discoveries from frequent scheduled runs | `@elastic/security-generative-ai` | Attack Discovery quality |

---

## Part 6: Stakeholder Map

### Primary Teams to Engage

| Team | Owns | Relevant For | Key Contact Pattern |
|---|---|---|---|
| **`@elastic/security-generative-ai`** | AI Assistant, Attack Discovery, LLM connectors, AI4DSOC privileges | Agentic SOC, real-time triage, investigation copilot, MCP security | Core partner for all AI initiatives |
| **`@elastic/security-threat-hunting`** | Agent Builder (security), SIEM Migrations, anonymization | SOAR alternative, investigation workflows, migration completion | Investigation automation, Agent Builder skills |
| **`@elastic/security-threat-hunting:investigations`** | Alert flyouts, investigations, timelines, EASE flyout | AI investigation copilot, suggested investigation steps | UX layer for AI-powered investigations |
| **`@elastic/security-detection-engine`** | Detection rules, AI Rule Creation, `kbn-evals-suite-security-ai-rules` | LLM detection rules, NL-to-rule pipeline, OWASP LLM rules | Detection content for AI security |
| **`@elastic/security-entity-analytics`** | Entity Analytics, risk scoring, Entity Store, lead generation | Cross-signal correlation, identity security, AI-enhanced entity risk | Entity-level AI enrichment |
| **`@elastic/obs-ai-team`** | kbn-evals, evals plugin, AI observability | AI agent observability, LLM monitoring integration | LLM observability crossover |
| **`@elastic/security-scalability`** | Automatic Import, AWS integrations | LLM firewall integrations, cloud AI service integrations | Integration development |
| **`@elastic/agent-builder` / `@elastic/workchat-eng`** | Agent Builder framework, MCP, A2A | Agentic workflows, MCP security, tool orchestration | Platform-level agent security |
| **Security Labs** (Mika Ayenson, Jake King, Dan Kortschak, Susan Chang) | Research, ECS LLM fields, OWASP detection content | LLM security rules, research-to-product pipeline | Research backing for LLM security features |

### Cross-Team Initiatives to Propose

1. **"LLM Security Detection Pack"** — Security Labs + Detection Engine + Security Scalability
   - Package existing research into shippable detection rules
   
2. **"Agentic SOC"** — Security Generative AI + Threat Hunting + Agent Builder
   - Real-time triage + automated investigation + response orchestration
   
3. **"AI Agent Observability"** — Obs AI Team + Security Generative AI + Detection Engine
   - Monitor and secure AI agent deployments using Elastic's existing strengths

4. **"SOAR-lite via Agent Builder"** — Agent Builder + Threat Hunting + Security Generative AI
   - Pre-built investigation/response workflows using Agent Builder skills as the orchestration layer

---

## Part 7: Strategic Summary

### Where Elastic is Strong
- **Data platform** — Search, analytics, and ES|QL are best-in-class for security analytics
- **Open detection engineering** — Community-driven, transparent rules with full MITRE mapping
- **Flexible deployment** — Air-gapped, hybrid, multi-cloud without feature gating
- **AI foundation** — LangGraph agent architecture, managed LLM, Attack Discovery, SIEM migrations are solid
- **Forrester Leader** — Recognized for the above strengths

### Where Elastic Must Invest
1. **SOAR** — The #1 existential gap. Every competitor has it. Without it, we lose deals.
2. **Real-time agentic triage** — Batch Attack Discovery won't compete with CrowdStrike's 98% autonomous triage.
3. **LLM/AI security as a new market** — First-mover advantage is available NOW. No SIEM vendor has shipped comprehensive LLM threat detection. Elastic has the research, the ECS mappings, and the integrations to be first.
4. **AI-SPM** — Cloud security table stakes are shifting. AI posture management is becoming mandatory.

### The Biggest Untapped Opportunity

**Elastic Security for AI** — Position Elastic as the security platform for the AI era. Not just "AI in security" (which everyone is doing), but "security FOR AI" (which almost nobody is doing well in the SIEM space). The combination of:
- Elasticsearch as the RAG vector database (unique visibility)
- ECS fields for LLM data (already defined)
- Detection engine for AI threats (already capable)
- Agent Builder for AI security automation (platform exists)
- Security Labs research on LLM threats (published and recognized)

...creates a defensible competitive moat that CrowdStrike, Palo Alto, and Microsoft can't easily replicate because they don't have the search/analytics platform underneath.