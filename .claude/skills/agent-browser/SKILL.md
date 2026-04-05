---
name: agent-browser
description: Headless browser automation via the agent-browser CLI (Playwright). Use when you need deterministic navigation, DOM interaction, form filling, screenshots/PDFs, or accessibility snapshots with refs for AI-driven selection, especially on JS-heavy pages or scripted browser flows.
---

# Agent Browser

## Setup

Install the CLI and download Chromium:

```bash
npm install -g agent-browser
agent-browser install
```

Set a custom browser binary if needed:

```bash
AGENT_BROWSER_EXECUTABLE_PATH=/path/to/chromium agent-browser open https://example.com
```

## Quick Start

```bash
agent-browser open https://example.com
agent-browser snapshot -i --json
agent-browser click @e2
agent-browser fill @e3 "test@example.com"
agent-browser get text @e1
agent-browser screenshot page.png
agent-browser close
```

## Snapshot + Ref Workflow

1. Open a page with `agent-browser open <url>`.
2. Capture a focused tree with `agent-browser snapshot -i -c -d 5 --json`.
3. Choose refs (`@e1`, `@e2`, ...) from the snapshot and act with `click`, `fill`, `press`, or `hover`.
4. Re-run `snapshot` after navigation or UI changes.
5. Close the session with `agent-browser close`.

## Common Commands

- Navigate: `open`, `wait --url`, `get url`, `get title`
- Interact: `click`, `dblclick`, `fill`, `type`, `press`, `hover`, `scroll`
- Extract: `snapshot`, `get text`, `get html`, `get value`, `get attr`
- Output: `screenshot --full`, `pdf <path>`
- State: `cookies`, `storage local`, `storage session`
- Settings: `set viewport`, `set headers <json>`, `set device`, `set geo`, `set offline`

## Session + Debug

- Use isolated sessions with `--session <name>` or `AGENT_BROWSER_SESSION`.
- Show a visible window with `--headed` for debugging.
- Attach to an existing browser via CDP with `--cdp 9222`.
- Prefer `--json` for machine-readable output.
