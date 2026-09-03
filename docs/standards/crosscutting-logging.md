# Logging Standard

Use this standard for application logs, security logs, audit events, and exception handling.

## Defaults

- Use the repo logging abstraction. Do not use `print`, `console.log`, or `System.out` for application behavior unless the repo explicitly allows it for CLI tools.
- Prefer structured fields over interpolated prose where the logging stack supports it.
- Include correlation/request IDs on request-scoped logs.
- Keep log levels meaningful and consistent.
- Do not log secrets, credentials, tokens, session IDs, payment data, or unnecessary personal data.

## What To Log

- Security-relevant events: authentication, authorization denial, privilege changes, sensitive workflow decisions, validation failures with security significance, and administrative actions.
- Operational events: startup/shutdown, dependency health changes, retries exhausted, queue lag, background job failure, and important state transitions.
- Business/audit events only through the repo's audit path, not ad hoc application logs.

## What Not To Log

- Raw request bodies by default.
- Access tokens, API keys, cookies, private keys, or passwords.
- Full personal-data records when an ID, hash, or redacted summary is sufficient.
- Exception messages from untrusted dependencies without review.

## Practices

- Use stable event names where logs are consumed by alerts or dashboards.
- Put high-cardinality values in logs only when useful for investigation and allowed by policy.
- Include enough context to diagnose without joining against sensitive data.
- Test redaction for new logging paths that handle sensitive fields.

## Research Basis

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Python logging documentation](https://docs.python.org/3/library/logging.html)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
