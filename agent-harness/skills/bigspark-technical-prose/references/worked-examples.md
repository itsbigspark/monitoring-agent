# Worked editing examples

Apply the editing move, not the example's wording.

## Lead with the governing rule

Before:

> The platform is more than just a set of templates. It represents a new way of
> thinking about software delivery across the organisation.

After:

> Every component enters the platform through a versioned template, publishes a
> repository-local entity record, and uses the shared delivery workflows.

The revision replaces positioning language with the rule that affects engineering
work.

## Preserve implementation status

Before:

> The service catalogue gives agents the ownership and operational context they
> need to make safe changes.

After when the catalogue is still specified:

> The proposed service catalogue would expose ownership and operational context
> to agents. Until it is implemented, agents must read the repository's existing
> ownership files and must not infer missing authority.

The revision stops a design from masquerading as a live capability.

## Replace abstract quality with evidence

Before:

> The shared workflow significantly improves release reliability and provides a
> robust deployment experience.

After when evidence is available:

> The shared workflow builds one image, records its digest, and promotes that
> digest unchanged through each environment. The deployment job rejects an image
> whose signature or provenance cannot be verified.

When evidence is not available, remove or qualify the quality claim rather than
inventing a metric.

## Keep a real trade-off asymmetric

Before:

> On one hand, EKS offers flexibility and scale. On the other hand, ECS offers
> simplicity and cost efficiency. The right choice depends on the organisation's
> needs.

After:

> EKS could consolidate shared ingress and scheduling, but it also introduces a
> cluster control plane, Kubernetes operations, and a larger failure domain. The
> migration is justified only if measured duplication across independently
> isolated environments costs more than operating those shared capabilities.

The revision states the decision condition instead of presenting a balanced but
non-actionable conclusion.

## Use headings as navigation

Before:

```text
## Architecture
## Components
## Benefits
## Conclusion
```

After:

```text
## Repository metadata drives the factory projections
## Shared workflows build once and promote by digest
## Runtime telemetry remains independent of model access
## Current implementation gaps
```

The revised headings expose the document's argument and make the current-state
section difficult to confuse with the target design.
