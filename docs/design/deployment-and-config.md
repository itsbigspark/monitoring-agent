# Design — Deployment & Configuration

> **Components:** [M] Deployment & runtime · [N] Config & playbook management
> **Part of:** Sentinel / Mission Control (see `mission-control-vision.md`)
> **Status:** Draft for review
> **Related:** `system-design-overview.md`, `orchestration-core.md`,
> `incident-investigation-agent-proposal.md`

---

## 1. Purpose & goals

Sentinel/Mission Control is **built in-house (bigspark) and deployed per client, fully inside the
client's environment** — one isolated instance each (confirmed hosting decision). This document
defines how we build it so that a deploying engineer can stand it up in **any infrastructure —
on-prem or any cloud** — and **reconfigure it to a client's setup without code changes**.

Goals:
- **Infra-agnostic:** runs identically on a client's on-prem Docker host/VM, or on AWS/Azure/GCP.
- **Config-driven:** a client deployment is a *config bundle + secrets + MCP endpoints*, never a fork.
- **Low-friction onboarding:** an engineer sets it up, connects the MCPs/tools, validates, goes live
  — as a checklist, not a bespoke project.
- **No vendor/cloud lock-in:** depend on open protocols, with adapters for managed equivalents.
- **Air-gap capable:** deployable with no outbound internet where a client requires it.

---

## 2. Core principles

1. **Everything is a container image.** The unit of deployment is versioned images, not machine
   setup — identical behaviour across on-prem and every cloud.
2. **Configuration is the deployment surface.** Onboarding a client = fill a layered config +
   provide secrets + point at their systems. No code change to add a tool, a data source, or a
   playbook.
3. **Depend on open protocols, not proprietary cloud services.** Assume only the lowest common
   denominators available everywhere (Postgres, S3-API, OIDC, OTel); provide adapters when a client
   wants their managed equivalent.
4. **MCP is the tool-portability layer.** Connecting to a client's systems = deploy/point-to the
   relevant MCP servers and register them in config.
5. **One isolated instance per client**, self-contained, no data egress by default.

---

## 3. What gets deployed (runtime footprint)

| Service | Role | Notes |
|---|---|---|
| **Mission Control API** | Backend for the cockpit + orchestration entry | stateless; scale horizontally |
| **Mission Control UI** | Web front-end (review, incidents, dashboards) | static assets behind ingress |
| **Orchestration worker(s)** | Execute investigation runs (Agents SDK pipeline) + the `publish` follow-up job | pulls from the queue; scale by load |
| **Intake/trigger service** | Source adapters (ServiceNow webhook/poll; later Airflow, email) → normalised `Incident` | network-exposed; authenticated |
| **PostgreSQL** | Investigations, reviews, encrypted `Trace`, app catalog, config | self-hosted container or client-managed |
| **Object/artifact store** | Raw logs/diffs/query results (referenced from state/Trace) | S3-compatible (MinIO on-prem) |
| **Sandbox runner** | Isolated reproduce/validate-fix execution (§7) | needs container-execution capability |
| **MCP servers** | Tool access (Splunk ✅, code, DB, Snowflake, S3, client-specific) | bundled + client-specific |
| **Ingress / reverse proxy** | TLS termination, routing, SSO enforcement | e.g. nginx/traefik or client ingress |
| *(optional)* **Queue/cache** | Job queue if not Postgres-backed | Redis, or Postgres-backed queue |
| *(optional)* **OTel collector** | Operational observability | to client's backend |

---

## 4. Portability contract (the key to "runs anywhere")

Abstract every external dependency behind an interface; depend on the **protocol**, with adapters
for the client's managed equivalent:

| Need | Portable default (on-prem & any cloud) | Client may swap in |
|---|---|---|
| Relational store | **PostgreSQL** (self-hosted container) | RDS / Cloud SQL / Azure DB for PostgreSQL |
| Object/artifact store | **S3-compatible API** (MinIO on-prem) | AWS S3 / GCS / Azure Blob |
| Secrets | provider interface (file/env default) | HashiCorp Vault / AWS Secrets Manager / Azure Key Vault |
| Queue / worker | Postgres- or Redis-backed (runs anywhere) | — (avoid SQS/PubSub-specific) |
| LLM | **model gateway** (model-agnostic) | Bedrock / self-hosted (vLLM/TGI) / local (LM Studio/Ollama) |
| Identity (UI SSO) | **OIDC / SAML** | client IdP (Okta / Entra ID / …) |
| Observability | **OpenTelemetry** | client APM / collector |

**Rule of thumb:** if we only assume **Postgres + S3-API + OIDC + OTel**, we run in every
environment. Anything beyond that is an opt-in adapter, never a hard dependency.

---

## 5. Packaging & orchestration — two flavours, same images

Same container images underneath; the orchestration wrapper differs by client capability:

- **Docker Compose** — lightweight path for on-prem single-host, PoCs, and simpler clients. One
  file, one command; ideal for the first PoC and for clients without Kubernetes.
- **Kubernetes via a Helm chart** — primary path for banks (most run K8s). The Helm `values.yaml`
  **is** the per-client reconfiguration surface (replicas, endpoints, secret refs, resource limits,
  ingress, storage classes).
- **Reference IaC (Terraform modules)** — thin, parameterised, *optional*. Provided for teams that
  want managed cloud resources provisioned; the images+config bundle remains the real deliverable so
  IaC is never required (important for on-prem).

**The product deliverable** = versioned images + Helm chart + Compose file + config schema +
bundled MCP servers + onboarding CLI + runbook.

---

## 6. Configuration model (the reconfigurability surface)

A client deployment is defined by a **layered config**: shipped **base defaults** + **per-client
overrides** (env vars + a config file, 12-factor style). Secrets are always *references*, resolved
via the secrets provider — never inline.

Config domains:

- **Application catalog** ([O]) — the apps a team owns + metadata: tier, owners, repos, Splunk
  index, data sources, dashboards, playbook binding, required-document checklist, authoritative
  Confluence links, and documentation index status/freshness.
- **Connections / MCP and content-source registry** — a declarative list of MCP servers/tools and
  indexed content sources (initially Confluence), their transport/endpoints, scopes, permission
  model, refresh policy, and secret references. **The app wires up tools at startup from this
  config** — adding/removing a tool or data source is config, not code. *This is the "connect all
  the MCPs" step, made declarative.*
- **Integrations** — ServiceNow (URL/auth), Git/PR provider, Teams/Slack.
- **Model** — provider, endpoint, model id(s), per-node routing.
- **Playbooks** — per-incident-type behaviour (prompts, allowed tool subset, plan template,
  guardrails, thresholds) as data.
- **Platform** — datastore/object-store/secrets/identity endpoints, redaction policy, retention,
  autonomy thresholds (e.g. Tier-3 auto-approve).

Example (illustrative) MCP registry entry:

```yaml
connections:
  - name: splunk
    kind: mcp
    transport: http
    endpoint: https://splunk-mcp.internal:8443
    secret_ref: secrets/splunk-mcp-token
    scope: read-only
    playbooks: [splunk-app-incident]
```

**Config governance:** the schema is versioned and validated; overrides are additive; changing a
client's setup is a reviewed config change, diffable in git (the config bundle itself can live in a
client-specific repo).

---

## 7. Onboarding & the preflight check

To make setup a checklist rather than a project, ship an **onboarding CLI**:

1. **Validate** the config bundle against the schema (fail fast on typos/missing fields).
2. **Preflight connectivity** — actively test every configured dependency and integration: ping
   each MCP server, ServiceNow, Confluence, the model endpoint, Postgres, the object store, and the
   IdP — and report green/red per item **before go-live**.
3. **Validate the documentation contract** — confirm required Confluence pages exist for each
   application, are accessible to the indexing identity, and meet configured freshness rules;
   report missing/inaccessible/stale items without copying content into Mission Control.
4. **Bootstrap and index** — run DB migrations, seed the application catalog, register MCP tools,
   and build the permission-aware index of approved Confluence content with source metadata.
5. **Smoke test** — run retrieval checks and optionally one investigation end-to-end against a
   sample/historical incident, verifying that citations resolve to authorised source pages.

This tool is the single biggest de-risker for the deploying engineer and for the client's change
process — it turns "did we wire everything correctly?" into an automated, evidenced check.

---

## 8. The hard parts (decide early)

### 8.1 Sandbox portability ([D])
Running fixes/tests in isolation needs **container-execution capability**, which differs by infra:
- **Kubernetes:** schedule ephemeral pods/jobs (clean, well-isolated).
- **Single on-prem VM:** Docker-in-Docker or a dedicated runner host.
Design the sandbox as an **injected "isolated execution" capability** with per-infra backends
(K8s-job backend, Docker backend), selected by config. This is the least portable component — treat
its backend as a first-class deployment variable.

### 8.2 Air-gapped clients
Where a client has no outbound internet:
- **Offline install bundle:** all images exported to a registry the client imports; Helm chart +
  Compose + checksums; no pulls from public registries.
- **No phone-home:** disable Agents SDK tracing egress, telemetry off, no external calls.
- **Self-hosted model mandatory:** Bedrock/OpenAI unreachable → run a local/in-VPC model
  (vLLM/TGI/Ollama). This hard-constrains the model choice, so confirm air-gap status per client.

### 8.3 Updates per instance
One instance per client ⇒ a real release story:
- **Versioned images** with a documented compatibility matrix.
- **Idempotent DB schema migrations** run on upgrade.
- **Backward-compatible config** (additive schema changes).
- **Engineer-runnable upgrade path** (Helm upgrade / Compose pull+migrate) with rollback.

### 8.4 Identity & access
Mission Control UI authenticates via the client's IdP (**OIDC/SAML**); role/team scoping enforced in
the API. The intake endpoint is authenticated (signed webhook / mTLS / allow-list, per [A]/[K]).

---

## 9. Security & compliance alignment (see [K])

- All access **read-only by default**, least-privilege, scoped credentials via the secrets provider.
- **No data egress** by default; the whole instance lives inside the client boundary.
- `Trace` and artifacts **encrypted at rest**; retention configurable.
- Redaction seam configurable per client (§`orchestration-core.md` §10.4).
- Everything reproducible from images + config for auditability.

---

## 10. Deployment flow (per client, summary)

1. Choose orchestration flavour (Compose for on-prem/PoC; Helm for K8s).
2. Provision the portability-contract dependencies (Postgres, object store, secrets, IdP) — client
   managed or bundled.
3. Import images (offline bundle if air-gapped).
4. Author the **config bundle** (catalog, documentation requirements/Confluence scope, MCP and
   content-source registry, integrations, model, playbooks, platform).
5. Deploy the MCP servers and point config at them + the client's systems.
6. Run the **onboarding CLI**: validate → preflight → documentation check → bootstrap/index →
   retrieval and investigation smoke tests.
7. Configure SSO + ingress/TLS.
8. Go live on **Tier-3 systems first** (per rollout strategy); expand.

Maps to the per-client implementation effort in the proposal (§10.2), where security/onboarding
gates and environment promotion dominate elapsed time.

---

## 11. Open decisions

1. **Kubernetes-first vs Compose-first** — are near-term clients predominantly K8s shops, or is a
   VM/Compose path equally first-class?
2. **Air-gap** — is any near-term client truly air-gapped (forcing a self-hosted model)?
3. **Sandbox backend priority** — build the K8s-job backend, the Docker backend, or both first?
4. **Config bundle location** — per-client git repo vs delivered artifact; how secrets are handed
   over.
5. **Bundled vs client-managed** Postgres/object store as the default recommendation.
6. **Update cadence & support model** — who runs upgrades (us vs client), and how often.
7. **Confluence indexing contract** — authentication method, page/space selection, permission
   propagation, refresh/deletion behaviour, and required-document freshness rules.
