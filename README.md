# zettel

A terminal-based Zettelkasten knowledge management system.

[한국어](docs/README.ko.md)

## Philosophy

> *"It's not about where you put it, but how it connects."*

This project implements Niklas Luhmann's Zettelkasten methodology in the terminal.

We pursue **connection-based knowledge management** rather than folder-based categorization. Instead of worrying about where to "put" a note, focus on what ideas it "connects" to.

Note type classification follows the modern interpretation systematized in Sönke Ahrens' *"How to Take Smart Notes"* (2017):

| Type | Description |
|------|-------------|
| **Fleeting** | Momentary notes. Promote to Zettel or delete within days |
| **Literature** | External material understood in your own words. Includes source |
| **Zettel** | Atomic ideas. The core of Zettelkasten |

```
[Fleeting] ──promote──→ [Zettel] ←──derive── [Literature]
                           ↕
                       [Zettel]
```

### ID System

Uses Luhmann-style alphanumeric IDs. The ID itself represents derivation relationships:

```
1       First card
1a      Idea derived from 1
1a1     Further derived from 1a
1b      Second derivation from 1
2       Completely new topic
```

### Connections

- **links**: Zettel ↔ Zettel connections (reason required: support, refute, extend, contrast, question)
- **references**: Zettel → Literature references (source citation)

## Installation

```bash
curl -fsSL https://zettel.vincentjang.dev | bash
```

### Requirements

- Linux (x64, arm64) or macOS (x64, arm64)

### Manual Installation

Download binary from [Releases](https://github.com/JangVincent/zettelkasten-cli/releases), then:

```bash
mkdir -p ~/.zettel/bin
chmod +x zettel-*
mv zettel-* ~/.zettel/bin/zettel

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$HOME/.zettel/bin"
```

### Uninstall

```bash
zettel self-delete
# or manually:
rm -rf ~/.zettel
```

## Quick Start

```bash
# Initialize
zettel init

# Create new note (interactive)
zettel new

# List notes
zettel list

# Show note
zettel show 1a

# Search
zettel search "entity"

# Link notes
zettel link 1a 2b

# Promote Fleeting → Zettel
zettel promote fl:1
```

## Commands

| Command | Description |
|---------|-------------|
| `zettel init` | Initialize |
| `zettel new` | Create new note |
| `zettel list` | List notes |
| `zettel show <id>` | Show note details |
| `zettel edit <id>` | Edit note |
| `zettel delete <id>` | Delete note |
| `zettel link <src> <tgt>` | Link notes |
| `zettel unlink <src> <tgt>` | Remove link |
| `zettel promote <id>` | Promote Fleeting → Zettel |
| `zettel search <query>` | Search |
| `zettel index <subcmd>` | Manage index cards |
| `zettel tree <id>` | Visualize connection tree |
| `zettel history` | Show change history |
| `zettel dangling` | Show broken links |
| `zettel config` | Manage settings |
| `zettel export` | Export to markdown |
| `zettel web` | Launch web UI |
| `zettel update` | Update to the latest version |
| `zettel --version` | Show version |

All commands run in **interactive mode** when executed without arguments.

## Web UI

For users who prefer a graphical interface, a web-based UI is available.

```bash
zettel web              # Start on default port 3001
zettel web -p 8080      # Start on custom port
```

Then open `http://localhost:3001` in your browser.

### Features

- **Graph View**: Interactive network visualization of note connections (Cytoscape.js)
- **Note Management**: Create, edit, delete Zettels, Fleeting notes, and Literature notes
- **Link Management**: Create and remove connections with relationship types
- **Index Cards**: Organize notes with index cards
- **Search**: Real-time filtering by title and ID
- **History**: View change history with action types
- **Dual View Modes**: Card grid or list table view

## Data Storage

All data is stored in `~/.zettel/`:

```
~/.zettel/
├── bin/zettel      # Binary
├── web-dist/       # Web UI assets
└── zettel.db       # SQLite database
```

- Full-Text Search support (FTS5)
- All changes recorded in history
- Customize location with `ZETTEL_HOME` environment variable

## Export

```bash
zettel export                     # Default path
zettel export -o ~/backup/zettel  # Custom path
```

Default export path: `~/Documents/zettel/{yymmdd_HHmmss}/`

```
~/Documents/zettel/250129_143042/
├── fleeting/
├── literature/
└── zettel/
```

## Known Limitations

**Unicode Display**: ZWJ (Zero Width Joiner) emoji sequences like 👨‍👩‍👧‍👦 may not align correctly in terminal boxes. Display width varies by terminal emulator. Standard emoji (🎉), CJK characters (한글/中文/日本語), and Arabic/Hebrew text are supported.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript
- **CLI**: [@clack/prompts](https://github.com/bombshell-dev/clack)
- **Storage**: bun:sqlite (built-in SQLite)
- **Search**: SQLite FTS5
- **Web UI**: React, Vite, Tailwind CSS, Radix UI, Cytoscape.js

## Development

```bash
# Install dependencies
bun install

# Dev run
bun run dev

# Web UI development (API + Vite)
bun run dev:web

# Build
bun run build

# Test
bun test
```

### Architecture

Repository pattern + DDD applied to separate domain and infrastructure:

```
src/
├── domain/           # Business logic (no DB dependency)
├── infra/sqlite/     # bun:sqlite based Repository implementation
├── commands/         # CLI commands
├── i18n/             # Internationalization (en-US, ko-KR)
└── utils/            # Utilities
```

## License

MIT
