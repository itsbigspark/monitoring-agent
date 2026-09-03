#!/usr/bin/env python3
"""Advisory linter for mechanical technical-prose smells.

The linter reports review points, not authorship or quality scores. It exits zero
when warnings are present unless --strict is supplied.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class Rule:
    code: str
    category: str
    pattern: re.Pattern[str]
    message: str


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    column: int
    code: str
    category: str
    message: str
    evidence: str


def compile_rule(code: str, category: str, pattern: str, message: str) -> Rule:
    return Rule(code, category, re.compile(pattern, re.IGNORECASE), message)


RULES = (
    compile_rule(
        "TP001",
        "formulaic",
        r"\bnot\s+(?:just|only)\b.{0,100}\bbut\b",
        "Replace the staged contrast with the positive claim.",
    ),
    compile_rule(
        "TP002",
        "formulaic",
        r"\bin (?:today'?s|the) (?:rapidly )?(?:evolving |changing )?landscape\b",
        "Remove generic scene-setting and state the relevant change.",
    ),
    compile_rule(
        "TP003",
        "claim",
        r"\b(?:stands? as a testament|marks? a pivotal moment|game[- ]changer)\b",
        "Replace significance language with evidence or a concrete consequence.",
    ),
    compile_rule(
        "TP004",
        "claim",
        r"\b(?:significantly|substantially|dramatically) (?:improves?|improved|reduces?|reduced|increases?|increased|better)\b",
        "Support the improvement with a measure or qualify the claim.",
    ),
    compile_rule(
        "TP005",
        "claim",
        r"\b(?:seamless|world[- ]class|cutting[- ]edge|best[- ]in[- ]class)\b",
        "Replace promotional language with a defined property or evidence.",
    ),
    compile_rule(
        "TP006",
        "claim",
        r"\b(?:experts|industry observers|many organisations|many organizations) (?:say|agree|believe|note|argue|suggest)\b",
        "Name the source or remove the vague attribution.",
    ),
    compile_rule(
        "TP007",
        "formulaic",
        r"\b(?:this (?:highlights|underscores|showcases) the (?:importance|need)|it is (?:important|worth) to note)\b",
        "State the implication directly.",
    ),
    compile_rule(
        "TP008",
        "assistant",
        r"\b(?:let'?s dive in|great question|here is a comprehensive overview|hope this helps)\b",
        "Remove assistant framing from the document.",
    ),
    compile_rule(
        "TP009",
        "leak",
        r"(?:citeturn\d+(?:search|view|fetch)\d+|contentReference\[|oai_citation|\[attached_file:\d+\])",
        "Remove leaked chat citation markup and restore a real source if needed.",
    ),
    compile_rule(
        "TP010",
        "leak",
        r"\[(?:TODO|TBD|Your|Insert|Add|Enter|Describe|Specify|Choose)[^\]]*\]",
        "Resolve or explicitly label the placeholder before publication.",
    ),
    compile_rule(
        "TP011",
        "formulaic",
        r"\b(?:furthermore|moreover|additionally),",
        "Check whether the transition adds meaning or can be removed.",
    ),
)

URL_TRACKING_RE = re.compile(
    r"[?&](?:utm_source=(?:chatgpt\.com|copilot\.com|openai|claude\.ai|perplexity\.ai)|referrer=grok\.com)\b",
    re.IGNORECASE,
)
HEADING_RE = re.compile(r"^#{1,6}\s+")
BOLD_RE = re.compile(r"\*\*[^*\n]+\*\*")
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")
WORD_RE = re.compile(r"\b[\w'-]+\b")


def _evidence(line: str, start: int, end: int, width: int = 120) -> str:
    left = max(0, start - 30)
    right = min(len(line), max(end + 30, left + width))
    snippet = line[left:right].strip()
    return snippet if len(snippet) <= width else snippet[: width - 1].rstrip() + "…"


def _line_findings(text: str, path: str) -> Iterable[Finding]:
    in_fence = False
    for line_number, line in enumerate(text.splitlines(), start=1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        scan_line = INLINE_CODE_RE.sub(lambda match: " " * len(match.group()), line)

        for rule in RULES:
            for match in rule.pattern.finditer(scan_line):
                yield Finding(
                    path,
                    line_number,
                    match.start() + 1,
                    rule.code,
                    rule.category,
                    rule.message,
                    _evidence(line, match.start(), match.end()),
                )

        for match in URL_TRACKING_RE.finditer(scan_line):
            yield Finding(
                path,
                line_number,
                match.start() + 1,
                "TP012",
                "leak",
                "Remove the AI-tool tracking parameter from the URL.",
                _evidence(line, match.start(), match.end()),
            )


def _paragraph_findings(text: str, path: str) -> Iterable[Finding]:
    lines = text.splitlines()
    start = 0
    buffer: list[str] = []
    in_fence = False

    def flush() -> Iterable[Finding]:
        if not buffer:
            return ()
        words = WORD_RE.findall(" ".join(buffer))
        if len(words) <= 180:
            return ()
        return (
            Finding(
                path,
                start,
                1,
                "TP101",
                "structure",
                "Review this paragraph for more than one idea or a missing boundary.",
                f"Paragraph contains {len(words)} words.",
            ),
        )

    for line_number, line in enumerate(lines, start=1):
        if line.lstrip().startswith("```"):
            yield from flush()
            buffer.clear()
            in_fence = not in_fence
            continue
        if in_fence or not line.strip() or HEADING_RE.match(line):
            yield from flush()
            buffer.clear()
            continue
        if not buffer:
            start = line_number
        buffer.append(line)
    yield from flush()


def _density_findings(text: str, path: str) -> Iterable[Finding]:
    prose_lines = [line for line in text.splitlines() if line.strip()]
    if len(prose_lines) < 10:
        return ()

    headings = sum(bool(HEADING_RE.match(line)) for line in prose_lines)
    if headings >= 6 and headings / len(prose_lines) > 0.35:
        yield Finding(
            path,
            1,
            1,
            "TP102",
            "formatting",
            "Check whether headings are fragmenting a short connected argument.",
            f"{headings} headings across {len(prose_lines)} non-empty lines.",
        )

    words = WORD_RE.findall(text)
    bold_spans = BOLD_RE.findall(text)
    if len(words) >= 100 and len(bold_spans) >= 8:
        yield Finding(
            path,
            1,
            1,
            "TP103",
            "formatting",
            "Check whether bold is providing decoration instead of hierarchy.",
            f"{len(bold_spans)} bold spans across {len(words)} words.",
        )


def lint_text(text: str, path: str = "<stdin>") -> list[Finding]:
    findings = list(_line_findings(text, path))
    findings.extend(_paragraph_findings(text, path))
    findings.extend(_density_findings(text, path))
    return sorted(
        findings, key=lambda item: (item.path, item.line, item.column, item.code)
    )


def _read_inputs(paths: list[str]) -> list[tuple[str, str]]:
    if not paths:
        return [("<stdin>", sys.stdin.read())]
    inputs: list[tuple[str, str]] = []
    for raw_path in paths:
        path = Path(raw_path)
        inputs.append((str(path), path.read_text(encoding="utf-8")))
    return inputs


def _render_text(findings: list[Finding]) -> str:
    if not findings:
        return "No advisory prose findings."
    lines = []
    for finding in findings:
        lines.append(
            f"{finding.path}:{finding.line}:{finding.column}: "
            f"{finding.code} {finding.category}: {finding.message}"
        )
        lines.append(f"  {finding.evidence}")
    lines.append(f"{len(findings)} advisory finding(s).")
    return "\n".join(lines)


def _self_test() -> None:
    clean = "The workflow builds one image and promotes its digest unchanged."
    assert lint_text(clean) == []

    staged = "This is not just a template, but a transformative platform."
    codes = {finding.code for finding in lint_text(staged)}
    assert {"TP001"}.issubset(codes)

    fenced = "```text\nLet's dive in\n```\nLet's dive in"
    fenced_findings = lint_text(fenced)
    assert len([finding for finding in fenced_findings if finding.code == "TP008"]) == 1

    inline_code = "The literal `let's dive in` appears in a compatibility test."
    assert lint_text(inline_code) == []

    tracked = "See https://example.com/doc?utm_source=chatgpt.com for details."
    assert "TP012" in {finding.code for finding in lint_text(tracked)}

    print("prose_lint: self-test passed")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Report advisory technical-prose smells without assigning an AI score."
    )
    parser.add_argument(
        "paths", nargs="*", help="Markdown or text files; read stdin when omitted"
    )
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 when findings exist; default advisory mode always exits 0",
    )
    parser.add_argument("--self-test", action="store_true", help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.self_test:
        _self_test()
        return 0

    findings: list[Finding] = []
    try:
        for path, text in _read_inputs(args.paths):
            findings.extend(lint_text(text, path))
    except (OSError, UnicodeError) as exc:
        sys.stderr.write(f"prose_lint: {exc}\n")
        return 2

    if args.format == "json":
        print(json.dumps([asdict(finding) for finding in findings], indent=2))
    else:
        print(_render_text(findings))
    return 1 if args.strict and findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
