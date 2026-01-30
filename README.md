# Mindflow

> AI-Native Project Management
> Outcomes over Tasks. Horizons over Deadlines. Buddies over Bosses.

## Philosophy

Mindflow reimagines project management for the AI era:

- **Outcomes over Tasks** - Focus on what success looks like, not what to do
- **Horizons over Deadlines** - Now, Soon, Later, Someday (not arbitrary dates)
- **Buddies over Bosses** - AI companions that know you, not surveillance tools
- **Graphs over Lists** - Everything connects; context is king

## Quick Start

```bash
# Install dependencies
bun install

# Start the server
bun run dev

# In another terminal, start the web UI
bun run dev:web

# Run tests
bun test
```

Visit `http://localhost:3000` for the web interface.
API runs at `http://localhost:3456`.

## Architecture

### Mind Graph

Everything is a Node, everything connects:

```typescript
import { MindGraph } from 'mindflow';

const graph = new MindGraph();

// Add a thought
const thought = graph.addNode({
  type: 'thought',
  content: 'What if we could ship faster?',
  createdBy: 'alice',
  status: 'active',
  confidence: 0.7,
  energy: 'medium',
  contributors: [],
  horizon: 'later',
  visibility: 'private',
  tags: ['velocity', 'ideas'],
});

// Turn it into an outcome
const outcome = graph.addNode({
  type: 'outcome',
  content: 'Reduce deploy time from 30min to 5min',
  createdBy: 'alice',
  status: 'active',
  confidence: 0.8,
  energy: 'high',
  contributors: [],
  horizon: 'soon',
  visibility: 'team',
  tags: [],
});

// Connect them
graph.connect(thought.id, outcome.id, 'caused');
```

### AI Buddy

Your personal AI that knows you:

```typescript
import { AIBuddy, MindGraph, MindflowDatabase } from 'mindflow';

const db = new MindflowDatabase();
const graph = db.loadGraph();
const buddy = AIBuddy.createDefault('alice', 'Alice', graph, db);

// Chat naturally
const response = await buddy.chat('I want to ship faster');
console.log(response.message);
// "That's a great goal! What does 'shipping faster' mean to you?
//  What would success look like?"
```

### Outcome Manager

Manage outcomes, not tasks:

```typescript
import { OutcomeManager } from 'mindflow';

const outcomes = new OutcomeManager(db, graph);

// Create an outcome
const outcome = outcomes.create({
  description: 'Deploy time under 5 minutes',
  motivation: 'Developer happiness and faster iterations',
  requestedBy: 'alice',
  horizon: 'soon',
  successCriteria: [
    'CI pipeline runs in under 3 minutes',
    'Deployment takes under 2 minutes',
    'Zero-downtime deploys work',
  ],
});

// Track progress
outcomes.meetCriterion(outcome.id, 'criterion_xxx');

// Handle blockers
outcomes.addBlocker(outcome.id, 'Need to upgrade CI runners');
outcomes.resolveBlocker(outcome.id, 'Need to upgrade CI runners');
```

## Node Types

| Type | Purpose |
|------|---------|
| `thought` | Raw idea, fleeting observation |
| `outcome` | Desired result, success state |
| `action` | Something to do |
| `person` | Team member |
| `artifact` | File, design, document |
| `decision` | Choice made |
| `blocker` | What's stuck |
| `context` | Background info |

## Edge Types

| Type | Meaning |
|------|---------|
| `requires` | A requires B to complete |
| `blocks` | A blocks B |
| `related` | A is related to B |
| `caused` | A caused B |
| `owns` | Person owns outcome |
| `contributes` | Person contributes to |
| `decides` | Person decides on |
| `informs` | A informs B |

## Horizons

Instead of deadlines:

| Horizon | Meaning |
|---------|---------|
| `now` | This week |
| `soon` | This month |
| `later` | This quarter |
| `someday` | No deadline |

## Neurodivergent Support

Mindflow is designed with neurodivergent users in mind:

- **ADHD Mode**: Smaller chunks, celebration of wins, focus assistance
- **Anxiety Aware**: Gentle pacing, no urgency unless necessary
- **Visual Thinker**: Graph visualization, spatial relationships

## API

### Health Check
```
GET /health
```

### Chat
```
POST /chat
{ "message": "What should I work on?" }
```

### Outcomes
```
GET /outcomes?horizon=now
POST /outcomes
GET /outcomes/:id
PUT /outcomes/:id
DELETE /outcomes/:id
```

### Graph
```
GET /graph
POST /graph/nodes
```

### Settings
```
GET /settings
POST /settings
```

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: SQLite (bun:sqlite)
- **AI**: Claude (Anthropic)
- **UI**: Vanilla JS + CSS (Grok-inspired dark theme)

## Design

UI follows Grok's dark theme aesthetic with Panya Core accent color (#8b1538).

## License

MIT
