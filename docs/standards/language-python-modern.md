# Modern Python Development

Use this standard for Python services, libraries, scripts, and test suites.

## Defaults

- Prefer `pyproject.toml` for build metadata and tool configuration.
- Use the repo's chosen environment manager; do not mix package managers in one change.
- Use Ruff or the repo formatter/linter as the formatting authority.
- Use type hints for new or changed public functions and domain boundaries.
- Use pytest for new tests unless the repo has a different established runner.

## Code

- Follow PEP 8 where it applies, with repo formatter settings taking precedence for mechanical style.
- Keep modules focused. Avoid large files that mix transport, domain, persistence, and configuration.
- Prefer `pathlib`, context managers, dataclasses or typed models where they make ownership clearer.
- Avoid mutable default arguments, broad `except Exception`, implicit global state, and import-time side effects.
- Treat `None` as an explicit state. Use `Optional`/`| None` in type signatures and validate inputs at boundaries.

## Typing

- Add annotations at new or changed public boundaries.
- Prefer precise collection and protocol types over `Any`.
- If the repo uses mypy or pyright, keep suppressions narrow and justified.
- For existing untyped code, improve typing incrementally rather than forcing unrelated churn.

## Testing

- Use pytest discovery conventions and keep tests readable from behavior names.
- Prefer fixtures for shared setup only when they improve clarity.
- Use `src/` layout for new package-style projects when practical.
- Isolate network, filesystem, environment, time, and randomness.

## Runtime Concerns

- Use `logging`, not `print`, for application behavior.
- Log structured event fields where the repo logging stack supports them.
- Keep secrets and personal data out of logs, exceptions, and snapshots.

## Research Basis

- [PEP 8](https://peps.python.org/pep-0008/)
- [Python Packaging User Guide: pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [Ruff Linter](https://docs.astral.sh/ruff/linter/)
- [Ruff Formatter](https://docs.astral.sh/ruff/formatter/)
- [mypy documentation](https://mypy.readthedocs.io/)
- [pytest good integration practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html)
- [Python logging documentation](https://docs.python.org/3/library/logging.html)
