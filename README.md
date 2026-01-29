# Mindflow

> AI-Native Project Management with Buddy Mesh
>
> **"Humans think, Buddies coordinate"**

---

## Vision

Traditional project management tools assume you want to manage tasks.

**Mindflow assumes you want to achieve outcomes without exhaustion.**

Every person gets a personal AI Buddy. Buddies form a mesh network. Humans focus on thinking — Buddies handle coordination.

---

## Core Concepts

| Old Paradigm | Mindflow |
|--------------|----------|
| Tasks | **Outcomes** — what you achieve |
| Deadlines | **Horizons** — flexible time guidance |
| Assignment | **Negotiation** — Buddies discuss, humans approve |
| Status meetings | **Auto-sync** — context flows automatically |
| Feature-rich UI | **Chat-first** — talk to your Buddy |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           HUMAN LAYER                        │
│   You      John    Amy    Tom               │
│     ↕        ↕      ↕      ↕                │
├─────────────────────────────────────────────┤
│           BUDDY LAYER                        │
│   Robin   Nami   Kai   Luna                 │
│     ↕        ↕      ↕      ↕                │
├─────────────────────────────────────────────┤
│           MESH LAYER                         │
│   Shared Context + Message Bus              │
├─────────────────────────────────────────────┤
│           KNOWLEDGE LAYER                    │
│   Mind Graph + Learning System              │
└─────────────────────────────────────────────┘
```

### AI Buddy
- Personal AI that knows you deeply
- Your preferences, patterns, energy levels
- Represents you in the mesh
- Protects your time and attention

### Buddy Mesh
- Network where Buddies coordinate
- Automatic context sharing (privacy controlled)
- Commitment negotiation
- Blocker escalation

### Mind Graph
- Everything is a Node (thoughts, outcomes, actions, people)
- Nodes connect to form your mental model
- AI derives actions from your intentions

---

## Key Features

### For Individuals
- **Chat-first interface** — Talk to achieve, not click to manage
- **Energy-aware** — Buddy knows when you're tired
- **Context-aware** — Knows what you're working on
- **Focus protection** — ADHD-friendly modes

### For Teams
- **No task assignment** — Buddies negotiate commitments
- **No status meetings** — Auto context sync
- **Blocker routing** — Problems find decision makers
- **Conflict resolution** — Buddies escalate, humans decide

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Solo Buddy | 🚧 Planning |
| 2 | Buddy Intelligence | ⏳ Pending |
| 3 | Mesh Foundation | ⏳ Pending |
| 4 | Full Mesh | ⏳ Pending |
| 5 | Polish | ⏳ Pending |

---

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — Full system design
- [Data Models](./docs/DATA-MODELS.md) — TypeScript interfaces
- [User Flows](./docs/FLOWS.md) — Scenarios and edge cases

---

## Philosophy

1. **Humans think, Buddies coordinate**
2. **Outcomes over tasks**
3. **Horizons over deadlines**
4. **Context flows, never lost**
5. **Each brain is different**
6. **Privacy by default**
7. **AI proposes, human decides**

---

## First Principles

> People don't want to manage projects.
> They want to achieve outcomes without exhaustion.

Traditional PM tools add overhead. Mindflow removes it.

---

## Tech Stack

- **Runtime**: Bun + TypeScript
- **Database**: SQLite (local) / Turso (distributed)
- **AI**: Claude API / Local LLM
- **Realtime**: WebSocket / SSE
- **P2P**: Hypercore (optional)

---

## License

MIT

---

*Built with First Principles by Alpha Team*
