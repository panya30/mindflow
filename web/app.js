/**
 * Mindflow Web App
 * Client-side JavaScript for the UI
 *
 * Features:
 * - Chat interface with AI Buddy
 * - Outcome management with horizons
 * - Mind Graph visualization
 * - Settings persistence
 */

// ============================================================================
// State Management
// ============================================================================

const state = {
  currentView: 'chat',
  currentHorizon: 'now',
  outcomes: [],
  messages: [],
  graphData: { nodes: [], edges: [] },
  settings: {
    buddyName: 'Buddy',
    humanName: '',
    commStyle: 'direct',
    workStyle: 'context-switch',
    adhdMode: false,
    anxietyMode: false,
    maxCommitments: 3,
  },
  theme: localStorage.getItem('mindflow-theme') || 'dark',
};

// API Base URL
const API_BASE = 'http://localhost:3456';

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.view'),

  // Chat
  chatMessages: document.getElementById('chat-messages'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  quickActions: document.querySelectorAll('.quick-action'),

  // Outcomes
  outcomesList: document.getElementById('outcomes-list'),
  horizonTabs: document.querySelectorAll('.horizon-tab'),
  newOutcomeBtn: document.getElementById('new-outcome-btn'),

  // Outcome Modal
  outcomeModal: document.getElementById('outcome-modal'),
  outcomeForm: document.getElementById('outcome-form'),
  closeOutcomeModal: document.getElementById('close-outcome-modal'),
  cancelOutcome: document.getElementById('cancel-outcome'),
  criteriaList: document.getElementById('criteria-list'),
  addCriterionBtn: document.getElementById('add-criterion'),

  // Graph
  graphCanvas: document.getElementById('graph-canvas'),
  graphSvg: document.getElementById('graph-svg'),
  graphPlaceholder: document.getElementById('graph-placeholder'),
  nodeTypeFilter: document.getElementById('node-type-filter'),

  // Settings
  buddyNameInput: document.getElementById('buddy-name'),
  humanNameInput: document.getElementById('human-name'),
  commStyleSelect: document.getElementById('comm-style'),
  workStyleSelect: document.getElementById('work-style'),
  adhdModeToggle: document.getElementById('adhd-mode'),
  anxietyModeToggle: document.getElementById('anxiety-mode'),
  maxCommitmentsInput: document.getElementById('max-commitments'),

  // Energy
  energyDots: document.querySelectorAll('.energy-dot'),

  // Toast
  toastContainer: document.getElementById('toast-container'),

  // Theme
  themeToggle: document.getElementById('theme-toggle'),
  themeLabel: document.getElementById('theme-label'),

  // Outcome Detail Modal
  outcomeDetailModal: document.getElementById('outcome-detail-modal'),
  closeDetailModal: document.getElementById('close-detail-modal'),
  cancelDetail: document.getElementById('cancel-detail'),
  saveOutcome: document.getElementById('save-outcome'),
  deleteOutcome: document.getElementById('delete-outcome'),
  detailDescription: document.getElementById('detail-description'),
  detailMotivation: document.getElementById('detail-motivation'),
  detailHorizon: document.getElementById('detail-horizon'),
  detailStatus: document.getElementById('detail-status'),
  detailProgress: document.getElementById('detail-progress'),
  detailProgressValue: document.getElementById('detail-progress-value'),
  detailCriteriaList: document.getElementById('detail-criteria-list'),

  // Standup
  standupForm: document.getElementById('standup-form'),
  standupDate: document.getElementById('standup-date'),
  standupSummary: document.getElementById('standup-summary'),
  standupYesterday: document.getElementById('standup-yesterday'),
  standupToday: document.getElementById('standup-today'),
  standupBlockers: document.getElementById('standup-blockers'),
  standupResponse: document.getElementById('standup-response'),
  standupMessage: document.getElementById('standup-message'),

  // Insights
  refreshInsights: document.getElementById('refresh-insights'),
  insightTotal: document.getElementById('insight-total'),
  insightAchieved: document.getElementById('insight-achieved'),
  insightActive: document.getElementById('insight-active'),
  insightBlocked: document.getElementById('insight-blocked'),
  completionBar: document.getElementById('completion-bar'),
  completionLabel: document.getElementById('completion-label'),
  horizonBreakdown: document.getElementById('horizon-breakdown'),
  suggestionsList: document.getElementById('suggestions-list'),
  blockersList: document.getElementById('blockers-list'),

  // Quick Capture
  quickCaptureModal: document.getElementById('quick-capture-modal'),
  closeCaptureModal: document.getElementById('close-capture-modal'),
  cancelCapture: document.getElementById('cancel-capture'),
  submitCapture: document.getElementById('submit-capture'),
  captureText: document.getElementById('capture-text'),

  // Templates
  templatesModal: document.getElementById('templates-modal'),
  closeTemplatesModal: document.getElementById('close-templates-modal'),
  templatesGrid: document.getElementById('templates-grid'),

  // Buddy Selector
  buddySelector: document.getElementById('buddy-selector'),
  buddyCurrent: document.getElementById('buddy-current'),
  buddyDropdown: document.getElementById('buddy-dropdown'),
  currentBuddyEmoji: document.getElementById('current-buddy-emoji'),
  currentBuddyName: document.getElementById('current-buddy-name'),
  currentBuddyTagline: document.getElementById('current-buddy-tagline'),
};

// ============================================================================
// Theme Management
// ============================================================================

function initTheme() {
  // Apply saved theme or default to dark
  const savedTheme = localStorage.getItem('mindflow-theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mindflow-theme', theme);

  // Update label
  if (elements.themeLabel) {
    elements.themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';
  }
}

function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  showToast(`Switched to ${newTheme} mode`, 'info', 2000);
}

// Initialize theme on load
initTheme();

// Theme toggle click handler
if (elements.themeToggle) {
  elements.themeToggle.addEventListener('click', toggleTheme);
}

// ============================================================================
// Toast Notifications
// ============================================================================

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// Navigation
// ============================================================================

function switchView(viewName) {
  state.currentView = viewName;

  // Update nav items
  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update views
  elements.views.forEach(view => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });

  // Load data for the view
  if (viewName === 'outcomes') {
    loadOutcomes();
  } else if (viewName === 'graph') {
    loadGraph();
  } else if (viewName === 'standup') {
    loadStandup();
  } else if (viewName === 'insights') {
    loadInsights();
  } else if (viewName === 'team') {
    loadTeamView();
  }
}

elements.navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    // Only prevent default for internal views, allow external links like User Guide
    if (item.dataset.view) {
      e.preventDefault();
      switchView(item.dataset.view);
    }
    // If no data-view, let the link navigate normally (e.g., guide.html)
  });
});

// ============================================================================
// Chat
// ============================================================================

function addMessage(content, role = 'buddy', buddyData = null) {
  const message = {
    content,
    role,
    timestamp: Date.now(),
    buddyName: buddyData?.buddyName || state.activeBuddy?.name,
    buddyEmoji: buddyData?.buddyEmoji || state.activeBuddy?.emoji,
  };

  state.messages.push(message);

  const avatar = role === 'buddy'
    ? (message.buddyEmoji || state.activeBuddy?.emoji || 'B')
    : 'Y';

  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  messageEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      ${role === 'buddy' && message.buddyName ? `<span class="message-buddy-name">${escapeHtml(message.buddyName)}</span>` : ''}
      <p>${escapeHtml(content)}</p>
      <span class="message-time">${formatTime(message.timestamp)}</span>
    </div>
  `;

  elements.chatMessages.appendChild(messageEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message buddy typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="message-avatar">${state.activeBuddy?.emoji || 'B'}</div>
    <div class="message-content">
      <div class="loading-spinner"></div>
    </div>
  `;
  elements.chatMessages.appendChild(indicator);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

async function sendMessage(content) {
  addMessage(content, 'user');
  addTypingIndicator();

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
    });

    removeTypingIndicator();

    if (!response.ok) throw new Error('Failed to send message');

    const data = await response.json();
    addMessage(data.message, 'buddy', {
      buddyName: data.buddyName,
      buddyEmoji: data.buddyEmoji,
    });

    // Handle any suggested actions
    if (data.suggestedActions?.length) {
      // Could show these as buttons
    }
  } catch (error) {
    removeTypingIndicator();
    console.error('Chat error:', error);
    addMessage('Sorry, I had trouble processing that. Make sure the server is running!', 'buddy');
  }
}

// Helper function for buddy greetings
function addMessageToChat(message) {
  addMessage(message.content, message.role || 'buddy', {
    buddyName: message.buddyName,
    buddyEmoji: message.buddyEmoji,
  });
}

elements.chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = elements.chatInput.value.trim();
  if (content) {
    sendMessage(content);
    elements.chatInput.value = '';
  }
});

elements.quickActions.forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const prompts = {
      capture: 'I have a thought: ',
      outcome: 'I want to achieve: ',
      blocker: "I'm stuck on: ",
    };
    elements.chatInput.value = prompts[action] || '';
    elements.chatInput.focus();
  });
});

// ============================================================================
// Outcomes
// ============================================================================

async function loadOutcomes() {
  try {
    const response = await fetch(`${API_BASE}/outcomes?horizon=${state.currentHorizon}`);
    if (!response.ok) throw new Error('Failed to load outcomes');
    state.outcomes = await response.json();
    renderOutcomes();
  } catch (error) {
    console.error('Load outcomes error:', error);
    // Show empty state
    renderOutcomes();
  }
}

function renderOutcomes() {
  if (state.outcomes.length === 0) {
    elements.outcomesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#127919;</div>
        <h3>No outcomes yet</h3>
        <p>What would you like to achieve? Start by defining an outcome.</p>
      </div>
    `;
    return;
  }

  elements.outcomesList.innerHTML = state.outcomes.map(outcome => `
    <div class="outcome-card" data-id="${outcome.id}">
      <div class="outcome-card-header">
        <div class="outcome-title">${escapeHtml(outcome.description)}</div>
        <span class="outcome-status ${outcome.status}">${formatStatus(outcome.status)}</span>
      </div>
      <div class="outcome-progress">
        <div class="outcome-progress-bar" style="width: ${outcome.progress}%"></div>
      </div>
      <div class="outcome-meta">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          ${outcome.successCriteria?.length || 0} criteria
        </span>
        ${outcome.blockers?.length > 0 ? `
        <span style="color: var(--error)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          ${outcome.blockers.length} blockers
        </span>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.outcome-card').forEach(card => {
    card.addEventListener('click', () => {
      const outcomeId = card.dataset.id;
      openOutcomeDetailModal(outcomeId);
    });
  });
}

function formatStatus(status) {
  const statusMap = {
    'exploring': 'Exploring',
    'committed': 'Committed',
    'in-progress': 'In Progress',
    'blocked': 'Blocked',
    'achieved': 'Achieved',
    'review': 'Review',
    'abandoned': 'Abandoned',
  };
  return statusMap[status] || status;
}

elements.horizonTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    state.currentHorizon = tab.dataset.horizon;
    elements.horizonTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadOutcomes();
  });
});

// ============================================================================
// Outcome Modal
// ============================================================================

function openOutcomeModal() {
  elements.outcomeModal.classList.add('active');
  document.getElementById('outcome-description').focus();
}

function closeOutcomeModalFn() {
  elements.outcomeModal.classList.remove('active');
  elements.outcomeForm.reset();
  elements.criteriaList.innerHTML = '';
}

// Track current outcome being edited
let currentEditingOutcomeId = null;

function openOutcomeDetailModal(outcomeId) {
  const outcome = state.outcomes.find(o => o.id === outcomeId);
  if (!outcome) {
    showToast('Outcome not found', 'error');
    return;
  }

  currentEditingOutcomeId = outcomeId;

  // Populate form fields
  elements.detailDescription.value = outcome.description || '';
  elements.detailMotivation.value = outcome.motivation || '';
  elements.detailHorizon.value = outcome.horizon?.type || outcome.horizon || 'later';
  elements.detailStatus.value = outcome.status || 'exploring';
  elements.detailProgress.value = outcome.progress || 0;
  elements.detailProgressValue.textContent = `${outcome.progress || 0}%`;

  // Populate criteria
  elements.detailCriteriaList.innerHTML = '';
  if (outcome.successCriteria && outcome.successCriteria.length > 0) {
    outcome.successCriteria.forEach(criterion => {
      const desc = typeof criterion === 'string' ? criterion : criterion.description;
      const met = typeof criterion === 'object' ? criterion.met : false;
      addDetailCriterion(desc, met);
    });
  }

  elements.outcomeDetailModal.classList.add('active');
}

function closeOutcomeDetailModal() {
  elements.outcomeDetailModal.classList.remove('active');
  currentEditingOutcomeId = null;
}

function addDetailCriterion(description = '', met = false) {
  const div = document.createElement('div');
  div.className = 'criterion-input';
  div.innerHTML = `
    <input type="checkbox" ${met ? 'checked' : ''} style="width: 20px; height: 20px; margin-right: 8px;">
    <input type="text" placeholder="Success criterion" value="${escapeHtml(description)}" style="flex: 1;">
    <button type="button" class="criterion-remove">&times;</button>
  `;
  div.querySelector('.criterion-remove').addEventListener('click', () => div.remove());
  elements.detailCriteriaList.appendChild(div);
}

async function saveOutcomeChanges() {
  if (!currentEditingOutcomeId) return;

  const criteriaInputs = elements.detailCriteriaList.querySelectorAll('.criterion-input');
  const successCriteria = Array.from(criteriaInputs).map(div => ({
    description: div.querySelector('input[type="text"]').value.trim(),
    met: div.querySelector('input[type="checkbox"]').checked,
  })).filter(c => c.description);

  const updates = {
    description: elements.detailDescription.value.trim(),
    motivation: elements.detailMotivation.value.trim(),
    horizon: { type: elements.detailHorizon.value },
    status: elements.detailStatus.value,
    progress: parseInt(elements.detailProgress.value, 10),
    successCriteria,
  };

  try {
    const response = await fetch(`${API_BASE}/outcomes/${currentEditingOutcomeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update outcome');

    closeOutcomeDetailModal();
    showToast('Outcome updated!', 'success');
    loadOutcomes();
  } catch (error) {
    console.error('Error updating outcome:', error);
    showToast('Failed to update outcome', 'error');
  }
}

async function deleteOutcomeHandler() {
  if (!currentEditingOutcomeId) return;

  if (!confirm('Are you sure you want to delete this outcome?')) return;

  try {
    const response = await fetch(`${API_BASE}/outcomes/${currentEditingOutcomeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete outcome');

    closeOutcomeDetailModal();
    showToast('Outcome deleted', 'success');
    loadOutcomes();
  } catch (error) {
    console.error('Error deleting outcome:', error);
    showToast('Failed to delete outcome', 'error');
  }
}

// Detail modal event listeners
elements.closeDetailModal.addEventListener('click', closeOutcomeDetailModal);
elements.cancelDetail.addEventListener('click', closeOutcomeDetailModal);
elements.saveOutcome.addEventListener('click', saveOutcomeChanges);
elements.deleteOutcome.addEventListener('click', deleteOutcomeHandler);
elements.outcomeDetailModal.querySelector('.modal-backdrop').addEventListener('click', closeOutcomeDetailModal);

// Update progress value display
elements.detailProgress.addEventListener('input', (e) => {
  elements.detailProgressValue.textContent = `${e.target.value}%`;
});

// Close detail modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && elements.outcomeDetailModal.classList.contains('active')) {
    closeOutcomeDetailModal();
  }
});

function addCriterionInput(value = '') {
  const div = document.createElement('div');
  div.className = 'criterion-input';
  div.innerHTML = `
    <input type="text" placeholder="e.g., All tests pass" value="${escapeHtml(value)}">
    <button type="button" class="criterion-remove">&times;</button>
  `;
  div.querySelector('.criterion-remove').addEventListener('click', () => {
    div.remove();
  });
  elements.criteriaList.appendChild(div);
  div.querySelector('input').focus();
}

elements.newOutcomeBtn.addEventListener('click', openOutcomeModal);
elements.closeOutcomeModal.addEventListener('click', closeOutcomeModalFn);
elements.cancelOutcome.addEventListener('click', closeOutcomeModalFn);
elements.addCriterionBtn.addEventListener('click', () => addCriterionInput());

elements.outcomeModal.querySelector('.modal-backdrop').addEventListener('click', closeOutcomeModalFn);

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && elements.outcomeModal.classList.contains('active')) {
    closeOutcomeModalFn();
  }
});

elements.outcomeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const description = document.getElementById('outcome-description').value.trim();
  const motivation = document.getElementById('outcome-motivation').value.trim();
  const horizon = document.getElementById('outcome-horizon').value;

  const criteriaInputs = elements.criteriaList.querySelectorAll('input');
  const criteria = Array.from(criteriaInputs)
    .map(input => input.value.trim())
    .filter(Boolean);

  if (!description) {
    showToast('Please describe what success looks like', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/outcomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        motivation,
        horizon,
        successCriteria: criteria,
      }),
    });

    if (!response.ok) throw new Error('Failed to create outcome');

    closeOutcomeModalFn();
    showToast('Outcome created!', 'success');

    // Reload outcomes if we're on that view
    if (state.currentView === 'outcomes') {
      loadOutcomes();
    }
  } catch (error) {
    console.error('Create outcome error:', error);
    showToast('Failed to create outcome. Is the server running?', 'error');
  }
});

// ============================================================================
// Mind Graph Visualization
// ============================================================================

async function loadGraph() {
  try {
    const response = await fetch(`${API_BASE}/graph`);
    if (!response.ok) throw new Error('Failed to load graph');
    state.graphData = await response.json();
    renderGraph();
  } catch (error) {
    console.error('Load graph error:', error);
    showGraphPlaceholder();
  }
}

function showGraphPlaceholder() {
  elements.graphPlaceholder.style.display = 'flex';
  elements.graphSvg.innerHTML = '';
}

function renderGraph() {
  const { nodes, edges } = state.graphData;

  // Filter by type if selected
  const filterType = elements.nodeTypeFilter.value;
  const filteredNodes = filterType
    ? nodes.filter(n => n.type === filterType)
    : nodes;

  if (filteredNodes.length === 0) {
    showGraphPlaceholder();
    return;
  }

  elements.graphPlaceholder.style.display = 'none';

  const svg = elements.graphSvg;
  const rect = elements.graphCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Set SVG size
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Calculate node positions using force-directed layout (simple version)
  const nodePositions = calculateNodePositions(filteredNodes, edges, width, height);

  // Create SVG content
  let svgContent = '';

  // Draw edges first (so they're behind nodes)
  edges.forEach(edge => {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    if (fromPos && toPos) {
      svgContent += `
        <line class="graph-edge"
              x1="${fromPos.x}" y1="${fromPos.y}"
              x2="${toPos.x}" y2="${toPos.y}"
              stroke-opacity="${edge.strength || 0.5}"/>
      `;
    }
  });

  // Draw nodes
  filteredNodes.forEach(node => {
    const pos = nodePositions.get(node.id);
    if (pos) {
      const color = getNodeColor(node.type);
      const radius = getNodeRadius(node.type);

      svgContent += `
        <g class="graph-node" data-id="${node.id}" data-type="${node.type}">
          <circle cx="${pos.x}" cy="${pos.y}" r="${radius}"
                  fill="${color}" stroke="${color}" stroke-width="2"
                  fill-opacity="0.2"/>
          <text class="graph-label" x="${pos.x}" y="${pos.y + radius + 16}">
            ${truncate(node.content, 20)}
          </text>
        </g>
      `;
    }
  });

  svg.innerHTML = svgContent;

  // Add click handlers to nodes
  svg.querySelectorAll('.graph-node').forEach(nodeEl => {
    nodeEl.addEventListener('click', () => {
      const nodeId = nodeEl.dataset.id;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        showToast(`${node.type}: ${truncate(node.content, 50)}`, 'info');
      }
    });
  });
}

function calculateNodePositions(nodes, edges, width, height) {
  const positions = new Map();
  const padding = 60;
  const centerX = width / 2;
  const centerY = height / 2;

  // Simple circular layout with some randomness
  const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1);
  const maxRadius = Math.min(width, height) / 2 - padding;

  nodes.forEach((node, i) => {
    // Add some variation to make it look more organic
    const angle = i * angleStep + (Math.random() - 0.5) * 0.5;
    const radiusVariation = 0.6 + Math.random() * 0.4;
    const radius = maxRadius * radiusVariation;

    positions.set(node.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });

  // Simple force simulation (a few iterations)
  for (let iter = 0; iter < 50; iter++) {
    // Apply repulsion between nodes
    nodes.forEach((nodeA, i) => {
      const posA = positions.get(nodeA.id);
      nodes.forEach((nodeB, j) => {
        if (i >= j) return;
        const posB = positions.get(nodeB.id);

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const minDistance = 80;
        if (distance < minDistance) {
          const force = (minDistance - distance) / distance * 0.1;
          posA.x -= dx * force;
          posA.y -= dy * force;
          posB.x += dx * force;
          posB.y += dy * force;
        }
      });
    });

    // Apply attraction along edges
    edges.forEach(edge => {
      const posA = positions.get(edge.from);
      const posB = positions.get(edge.to);
      if (!posA || !posB) return;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      const idealDistance = 150;
      const force = (distance - idealDistance) / distance * 0.05;
      posA.x += dx * force;
      posA.y += dy * force;
      posB.x -= dx * force;
      posB.y -= dy * force;
    });

    // Keep nodes in bounds
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      pos.x = Math.max(padding, Math.min(width - padding, pos.x));
      pos.y = Math.max(padding, Math.min(height - padding, pos.y));
    });
  }

  return positions;
}

function getNodeColor(type) {
  const colors = {
    thought: '#4a9eff',    // Blue
    outcome: '#8b1538',    // Panya primary
    action: '#00d26a',     // Green
    person: '#a855f7',     // Purple
    artifact: '#f97316',   // Orange
    decision: '#ffb800',   // Yellow
    blocker: '#ff4757',    // Red
    context: '#64748b',    // Gray
  };
  return colors[type] || '#666666';
}

function getNodeRadius(type) {
  const radii = {
    outcome: 28,
    person: 24,
    thought: 20,
    action: 20,
    decision: 22,
    blocker: 22,
    artifact: 18,
    context: 16,
  };
  return radii[type] || 20;
}

elements.nodeTypeFilter.addEventListener('change', renderGraph);

// Redraw graph on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (state.currentView === 'graph') {
      renderGraph();
    }
  }, 250);
});

// ============================================================================
// Settings
// ============================================================================

function loadSettings() {
  // Load from localStorage
  const saved = localStorage.getItem('mindflow-settings');
  if (saved) {
    Object.assign(state.settings, JSON.parse(saved));
  }

  // Apply to inputs
  elements.buddyNameInput.value = state.settings.buddyName;
  elements.humanNameInput.value = state.settings.humanName;
  elements.commStyleSelect.value = state.settings.commStyle;
  elements.workStyleSelect.value = state.settings.workStyle;
  elements.adhdModeToggle.checked = state.settings.adhdMode;
  elements.anxietyModeToggle.checked = state.settings.anxietyMode;
  elements.maxCommitmentsInput.value = state.settings.maxCommitments;

  // Update buddy avatar in existing messages
  updateBuddyAvatars();
}

function saveSettings() {
  state.settings = {
    buddyName: elements.buddyNameInput.value || 'Buddy',
    humanName: elements.humanNameInput.value,
    commStyle: elements.commStyleSelect.value,
    workStyle: elements.workStyleSelect.value,
    adhdMode: elements.adhdModeToggle.checked,
    anxietyMode: elements.anxietyModeToggle.checked,
    maxCommitments: parseInt(elements.maxCommitmentsInput.value, 10),
  };

  localStorage.setItem('mindflow-settings', JSON.stringify(state.settings));

  // Sync to server
  fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state.settings),
  }).catch(console.error);

  // Update avatars
  updateBuddyAvatars();

  showToast('Settings saved!', 'success');
}

function updateBuddyAvatars() {
  document.querySelectorAll('.message.buddy .message-avatar').forEach(avatar => {
    avatar.textContent = state.settings.buddyName[0] || 'B';
  });
}

// Auto-save settings on change
[
  elements.buddyNameInput,
  elements.humanNameInput,
  elements.commStyleSelect,
  elements.workStyleSelect,
  elements.adhdModeToggle,
  elements.anxietyModeToggle,
  elements.maxCommitmentsInput,
].forEach(input => {
  input.addEventListener('change', saveSettings);
});

// ============================================================================
// Energy Indicator
// ============================================================================

function updateEnergyIndicator() {
  const hour = new Date().getHours();
  let energy = 'medium';

  // Simple heuristic - can be personalized
  if (hour >= 9 && hour <= 11) energy = 'high';
  else if (hour >= 14 && hour <= 16) energy = 'medium';
  else if (hour >= 20 || hour < 6) energy = 'low';

  elements.energyDots.forEach(dot => {
    dot.classList.remove('active');
    if (dot.classList.contains(energy)) {
      dot.classList.add('active');
    }
  });
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString();
}

function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ============================================================================
// Buddy Management
// ============================================================================

state.activeBuddy = null;
state.buddies = [];

async function loadBuddies() {
  try {
    const response = await fetch(`${API_BASE}/buddies`);
    const data = await response.json();

    state.buddies = data.buddies;

    // Use user's assigned buddy if logged in, otherwise use server default
    if (state.currentUser?.buddyId) {
      state.activeBuddy = data.buddies.find(b => b.id === state.currentUser.buddyId);
    } else {
      state.activeBuddy = data.buddies.find(b => b.id === data.activeId);
    }

    updateBuddyUI();
    renderBuddyDropdown();
  } catch (error) {
    console.error('Failed to load buddies:', error);
  }
}

function updateBuddyUI() {
  if (!state.activeBuddy) return;

  if (elements.currentBuddyEmoji) {
    elements.currentBuddyEmoji.textContent = state.activeBuddy.emoji;
  }
  if (elements.currentBuddyName) {
    elements.currentBuddyName.textContent = state.activeBuddy.name;
  }
  if (elements.currentBuddyTagline) {
    elements.currentBuddyTagline.textContent = state.activeBuddy.tagline;
  }
}

function renderBuddyDropdown() {
  if (!elements.buddyDropdown) return;

  elements.buddyDropdown.innerHTML = state.buddies.map(buddy => `
    <div class="buddy-option ${buddy.isActive ? 'active' : ''}" data-buddy-id="${buddy.id}">
      <span class="buddy-emoji">${buddy.emoji}</span>
      <div class="buddy-option-info">
        <div class="buddy-option-name">${escapeHtml(buddy.name)}</div>
        <div class="buddy-option-specialty">${escapeHtml(buddy.specialty)}</div>
      </div>
      <svg class="buddy-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `).join('');

  // Add click handlers
  elements.buddyDropdown.querySelectorAll('.buddy-option').forEach(option => {
    option.addEventListener('click', () => selectBuddy(option.dataset.buddyId));
  });
}

async function selectBuddy(buddyId) {
  try {
    const response = await fetch(`${API_BASE}/buddies/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buddyId }),
    });

    const data = await response.json();

    if (data.success) {
      state.activeBuddy = data.buddy;
      state.buddies = state.buddies.map(b => ({
        ...b,
        isActive: b.id === buddyId,
      }));

      updateBuddyUI();
      renderBuddyDropdown();
      closeBuddyDropdown();

      showToast(`Switched to ${data.buddy.name}!`, 'success');

      // Add a greeting from the new buddy
      addBuddyGreeting(data.buddy);
    }
  } catch (error) {
    showToast('Failed to switch buddy', 'error');
  }
}

function addBuddyGreeting(buddy) {
  const greetings = {
    robin: "Hey there! I'm Robin. Let's think through things together. What's on your mind?",
    kai: "Yo! Kai here. Ready to get stuff done? What's the first thing we can tackle?",
    luna: "Hello, dreamer. I'm Luna. Let's explore some creative possibilities. What inspires you today?",
    nami: "Hi, I'm Nami. Take a breath. Let's calmly look at what needs attention. How are you feeling?",
  };

  const greeting = greetings[buddy.id] || `Hi! I'm ${buddy.name}. How can I help?`;

  addMessageToChat({
    role: 'buddy',
    content: greeting,
    buddyName: buddy.name,
    buddyEmoji: buddy.emoji,
  });
}

function toggleBuddyDropdown() {
  if (elements.buddySelector) {
    elements.buddySelector.classList.toggle('open');
  }
}

function closeBuddyDropdown() {
  if (elements.buddySelector) {
    elements.buddySelector.classList.remove('open');
  }
}

// Buddy selector event listeners
if (elements.buddyCurrent) {
  elements.buddyCurrent.addEventListener('click', toggleBuddyDropdown);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (elements.buddySelector && !elements.buddySelector.contains(e.target)) {
    closeBuddyDropdown();
  }
});

// Team perspectives for outcomes
async function getTeamPerspectives(outcomeId) {
  try {
    showToast('Getting team perspectives...', 'info');

    const response = await fetch(`${API_BASE}/buddies/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcomeId }),
    });

    const data = await response.json();
    return data.perspectives;
  } catch (error) {
    showToast('Failed to get perspectives', 'error');
    return [];
  }
}

// ============================================================================
// Daily Standup
// ============================================================================

async function loadStandup() {
  // Set today's date
  if (elements.standupDate) {
    elements.standupDate.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  try {
    const response = await fetch(`${API_BASE}/standup`);
    const data = await response.json();

    if (elements.standupSummary) {
      elements.standupSummary.innerHTML = `
        <div class="standup-summary-item">
          <span>Active Outcomes</span>
          <strong>${data.activeOutcomes}</strong>
        </div>
        <div class="standup-summary-item">
          <span>Blocked</span>
          <strong style="color: ${data.blockedOutcomes > 0 ? 'var(--error)' : 'var(--success)'}">${data.blockedOutcomes}</strong>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load standup:', error);
  }
}

if (elements.standupForm) {
  elements.standupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const yesterday = elements.standupYesterday?.value.trim();
    const today = elements.standupToday?.value.trim();
    const blockers = elements.standupBlockers?.value.trim();

    if (!yesterday && !today) {
      showToast('Please fill in at least yesterday or today', 'warning');
      return;
    }

    showToast('Submitting standup...', 'info');

    try {
      const response = await fetch(`${API_BASE}/standup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yesterday, today, blockers }),
      });

      const data = await response.json();

      if (elements.standupResponse) {
        elements.standupResponse.style.display = 'block';
      }
      if (elements.standupMessage) {
        elements.standupMessage.textContent = data.message;
      }

      showToast('Standup submitted!', 'success');
    } catch (error) {
      showToast('Failed to submit standup', 'error');
    }
  });
}

// ============================================================================
// Progress Insights
// ============================================================================

async function loadInsights() {
  try {
    const response = await fetch(`${API_BASE}/insights`);
    const data = await response.json();

    // Update stats
    if (elements.insightTotal) elements.insightTotal.textContent = data.totalOutcomes;
    if (elements.insightAchieved) elements.insightAchieved.textContent = data.achieved;
    if (elements.insightActive) elements.insightActive.textContent = data.byStatus?.['in-progress'] || 0;
    if (elements.insightBlocked) elements.insightBlocked.textContent = data.byStatus?.blocked || 0;

    // Completion rate
    if (elements.completionBar) {
      elements.completionBar.style.width = `${data.completionRate}%`;
    }
    if (elements.completionLabel) {
      elements.completionLabel.textContent = `${data.completionRate}% of completed outcomes were achieved`;
    }

    // Horizon breakdown
    if (elements.horizonBreakdown) {
      const horizons = ['now', 'soon', 'later', 'someday'];
      elements.horizonBreakdown.innerHTML = horizons.map(h => `
        <div class="horizon-stat">
          <div class="horizon-stat-value">${data.byHorizon?.[h] || 0}</div>
          <div class="horizon-stat-label">${h}</div>
        </div>
      `).join('');
    }

    // Suggestions
    if (elements.suggestionsList && data.suggestions) {
      elements.suggestionsList.innerHTML = data.suggestions.map(s => `
        <div class="suggestion-item">${escapeHtml(s)}</div>
      `).join('');
    }

    // Blockers
    if (elements.blockersList) {
      if (data.currentBlockers && data.currentBlockers.length > 0) {
        elements.blockersList.innerHTML = data.currentBlockers.map(b => `
          <div class="blocker-item">
            <div class="blocker-item-title">${escapeHtml(b.description)}</div>
            <div class="blocker-item-blockers">${b.blockers?.join(', ') || 'No details'}</div>
          </div>
        `).join('');
      } else {
        elements.blockersList.innerHTML = '<p class="empty-message">No blockers - great job! 🎉</p>';
      }
    }
  } catch (error) {
    console.error('Failed to load insights:', error);
    showToast('Failed to load insights', 'error');
  }
}

if (elements.refreshInsights) {
  elements.refreshInsights.addEventListener('click', loadInsights);
}

// ============================================================================
// Quick Capture
// ============================================================================

function openQuickCapture() {
  if (elements.quickCaptureModal) {
    elements.quickCaptureModal.classList.add('active');
    elements.captureText?.focus();
  }
}

function closeQuickCapture() {
  if (elements.quickCaptureModal) {
    elements.quickCaptureModal.classList.remove('active');
    if (elements.captureText) elements.captureText.value = '';
  }
}

async function submitQuickCapture() {
  const text = elements.captureText?.value.trim();
  if (!text) {
    showToast('Please enter some text', 'warning');
    return;
  }

  const typeInput = document.querySelector('input[name="capture-type"]:checked');
  const type = typeInput?.value || 'auto';

  showToast('Processing...', 'info');

  try {
    const response = await fetch(`${API_BASE}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type }),
    });

    const data = await response.json();

    closeQuickCapture();
    showToast(`Captured as ${data.type}!`, 'success');

    // Reload relevant view
    if (data.type === 'outcome' && state.currentView === 'outcomes') {
      loadOutcomes();
    } else if (state.currentView === 'graph') {
      loadGraph();
    }
  } catch (error) {
    showToast('Failed to capture', 'error');
  }
}

if (elements.closeCaptureModal) {
  elements.closeCaptureModal.addEventListener('click', closeQuickCapture);
}
if (elements.cancelCapture) {
  elements.cancelCapture.addEventListener('click', closeQuickCapture);
}
if (elements.submitCapture) {
  elements.submitCapture.addEventListener('click', submitQuickCapture);
}
if (elements.quickCaptureModal) {
  elements.quickCaptureModal.querySelector('.modal-backdrop')?.addEventListener('click', closeQuickCapture);
}

// ============================================================================
// Outcome Templates
// ============================================================================

async function loadTemplates() {
  try {
    const response = await fetch(`${API_BASE}/templates`);
    const data = await response.json();

    if (elements.templatesGrid) {
      elements.templatesGrid.innerHTML = data.templates.map(t => `
        <div class="template-card" data-template-id="${t.id}">
          <div class="template-icon">${t.icon}</div>
          <div class="template-name">${escapeHtml(t.name)}</div>
          <div class="template-description">${escapeHtml(t.description)}</div>
        </div>
      `).join('');

      // Add click handlers
      elements.templatesGrid.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => applyTemplate(card.dataset.templateId));
      });
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

function openTemplatesModal() {
  if (elements.templatesModal) {
    elements.templatesModal.classList.add('active');
    loadTemplates();
  }
}

function closeTemplatesModal() {
  if (elements.templatesModal) {
    elements.templatesModal.classList.remove('active');
  }
}

async function applyTemplate(templateId) {
  try {
    const response = await fetch(`${API_BASE}/templates/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    });

    const data = await response.json();

    closeTemplatesModal();
    showToast('Template applied! Opening outcome...', 'success');

    // Open the created outcome in detail modal
    setTimeout(() => {
      loadOutcomes();
      if (data.outcome) {
        state.outcomes.push(data.outcome);
        openOutcomeDetailModal(data.outcome.id);
      }
    }, 500);
  } catch (error) {
    showToast('Failed to apply template', 'error');
  }
}

if (elements.closeTemplatesModal) {
  elements.closeTemplatesModal.addEventListener('click', closeTemplatesModal);
}
if (elements.templatesModal) {
  elements.templatesModal.querySelector('.modal-backdrop')?.addEventListener('click', closeTemplatesModal);
}

// Use Template button in outcome modal
const useTemplateBtn = document.getElementById('use-template-btn');
if (useTemplateBtn) {
  useTemplateBtn.addEventListener('click', () => {
    closeOutcomeModalFn();
    openTemplatesModal();
  });
}

// Get Suggestions button in detail modal
const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
if (getSuggestionsBtn) {
  getSuggestionsBtn.addEventListener('click', () => {
    if (currentEditingOutcomeId) {
      loadActionSuggestions(currentEditingOutcomeId);
    }
  });
}

// ============================================================================
// Action Suggestions (in Outcome Detail Modal)
// ============================================================================

async function loadActionSuggestions(outcomeId) {
  const suggestionsContainer = document.getElementById('action-suggestions-container');
  if (!suggestionsContainer) return;

  suggestionsContainer.innerHTML = '<div class="loading-suggestions">🤖 Generating suggestions...</div>';

  try {
    const response = await fetch(`${API_BASE}/outcomes/${outcomeId}/suggestions`);
    const data = await response.json();

    if (data.suggestions && data.suggestions.length > 0) {
      suggestionsContainer.innerHTML = `
        <div class="action-suggestions">
          ${data.suggestions.map(s => `
            <div class="action-suggestion">
              <span class="action-suggestion-icon">💡</span>
              <span class="action-suggestion-text">${escapeHtml(s)}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      suggestionsContainer.innerHTML = '<p class="empty-message">No suggestions available</p>';
    }
  } catch (error) {
    suggestionsContainer.innerHTML = '<p class="empty-message">Failed to load suggestions</p>';
  }
}

// ============================================================================
// Team View & AI Team Simulation
// ============================================================================

// Team view elements
const teamElements = {
  teamMembers: document.getElementById('team-members'),
  teamActivityFeed: document.getElementById('team-activity-feed'),
  refreshActivity: document.getElementById('refresh-activity'),
  quickTeamMeeting: document.getElementById('quick-team-meeting'),
  quickDelegation: document.getElementById('quick-delegation'),
  teamMeetingSection: document.getElementById('team-meeting-section'),
  teamMeetingContent: document.getElementById('team-meeting-content'),
  delegationSection: document.getElementById('delegation-section'),
  delegationContent: document.getElementById('delegation-content'),
  holdTeamMeetingBtn: document.getElementById('hold-team-meeting-btn'),
  teamMeetingResult: document.getElementById('team-meeting-result'),
};

async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
}

function renderTeamMembersWithUsers(users) {
  if (!teamElements.teamMembers) return;

  teamElements.teamMembers.innerHTML = `
    <div class="team-members-grid">
      ${users.map(user => `
        <div class="team-member-card ${user.id === state.currentUser?.id ? 'active' : ''}" data-user-id="${user.id}">
          <div class="team-member-emoji">${user.avatarEmoji || '👤'}</div>
          <div class="team-member-info">
            <div class="team-member-name">${escapeHtml(user.displayName)}</div>
            <div class="team-member-buddy">
              ${user.buddyEmoji || '🤖'} ${escapeHtml(user.buddyName || 'No buddy')}
            </div>
          </div>
          ${user.id === state.currentUser?.id ? '<span class="team-member-badge">You</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function loadTeamView() {
  // Load real users if available, otherwise show buddies
  const users = await loadAllUsers();
  if (users.length > 0) {
    renderTeamMembersWithUsers(users);
  } else {
    renderTeamMembers();
  }
  // Load activity feed
  await loadTeamActivity();
}

function renderTeamMembers() {
  if (!teamElements.teamMembers || !state.buddies.length) return;

  teamElements.teamMembers.innerHTML = `
    <div class="team-members-grid">
      ${state.buddies.map(buddy => `
        <div class="team-member-card ${buddy.isActive ? 'active' : ''}" data-buddy-id="${buddy.id}">
          <div class="team-member-emoji">${buddy.emoji}</div>
          <div class="team-member-info">
            <div class="team-member-name">${escapeHtml(buddy.name)}</div>
            <div class="team-member-specialty">${escapeHtml(buddy.specialty)}</div>
          </div>
          ${buddy.isActive ? '<span class="team-member-badge">Active</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function loadTeamActivity() {
  if (!teamElements.teamActivityFeed) return;

  try {
    const response = await fetch(`${API_BASE}/team/activity`);
    const data = await response.json();

    if (data.activities && data.activities.length > 0) {
      teamElements.teamActivityFeed.innerHTML = data.activities.map(activity => `
        <div class="activity-item">
          <span class="activity-emoji">${activity.buddyEmoji || '🤖'}</span>
          <div class="activity-content">
            <div class="activity-buddy">${escapeHtml(activity.buddyName || 'System')}</div>
            <div class="activity-text">${escapeHtml(activity.action)}</div>
            <div class="activity-time">${formatTime(new Date(activity.timestamp).getTime())}</div>
          </div>
        </div>
      `).join('');
    } else {
      teamElements.teamActivityFeed.innerHTML = `
        <div class="empty-state">
          <p>No team activity yet. Hold a team meeting to get started!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load team activity:', error);
  }
}

async function holdTeamMeeting(outcomeId = null) {
  const targetContainer = outcomeId
    ? teamElements.teamMeetingResult
    : teamElements.teamMeetingContent;

  if (!targetContainer) return;

  // Show loading state
  if (outcomeId && teamElements.teamMeetingResult) {
    teamElements.teamMeetingResult.style.display = 'block';
    teamElements.teamMeetingResult.innerHTML = `
      <div class="meeting-loading">
        <div class="loading-spinner"></div>
        <p>Gathering team perspectives...</p>
      </div>
    `;
  } else if (teamElements.teamMeetingSection) {
    teamElements.teamMeetingSection.style.display = 'block';
    targetContainer.innerHTML = `
      <div class="meeting-loading">
        <div class="loading-spinner"></div>
        <p>Gathering team perspectives...</p>
      </div>
    `;
  }

  showToast('Holding team meeting...', 'info');

  try {
    const body = outcomeId ? { outcomeId } : {};
    const response = await fetch(`${API_BASE}/team/meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.success) {
      renderTeamMeetingResult(data, targetContainer);
      showToast('Team meeting complete!', 'success');

      // Refresh activity feed
      await loadTeamActivity();
    } else {
      targetContainer.innerHTML = `<p class="error-message">Meeting failed: ${data.error || 'Unknown error'}</p>`;
      showToast('Meeting failed', 'error');
    }
  } catch (error) {
    console.error('Team meeting error:', error);
    targetContainer.innerHTML = `<p class="error-message">Failed to hold meeting. Is the server running?</p>`;
    showToast('Failed to hold meeting', 'error');
  }
}

function renderTeamMeetingResult(data, container) {
  if (!container) return;

  container.innerHTML = `
    <div class="meeting-result">
      ${data.topic ? `<div class="meeting-topic"><strong>Topic:</strong> ${escapeHtml(data.topic)}</div>` : ''}

      <div class="meeting-perspectives">
        <h4>💬 Perspectives</h4>
        ${data.perspectives?.map(p => `
          <div class="perspective-item">
            <div class="perspective-header">
              <span class="perspective-emoji">${p.buddyEmoji || '🤖'}</span>
              <span class="perspective-name">${escapeHtml(p.buddyName)}</span>
            </div>
            <div class="perspective-text">${escapeHtml(p.perspective)}</div>
          </div>
        `).join('') || '<p>No perspectives gathered</p>'}
      </div>

      ${data.consensus ? `
        <div class="meeting-consensus">
          <h4>✅ Team Consensus</h4>
          <p>${escapeHtml(data.consensus)}</p>
        </div>
      ` : ''}

      ${data.nextSteps?.length ? `
        <div class="meeting-next-steps">
          <h4>📋 Suggested Next Steps</h4>
          <ul>
            ${data.nextSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

async function getDelegationSuggestions() {
  if (!teamElements.delegationContent) return;

  teamElements.delegationSection.style.display = 'block';
  teamElements.delegationContent.innerHTML = `
    <div class="meeting-loading">
      <div class="loading-spinner"></div>
      <p>Analyzing tasks for delegation...</p>
    </div>
  `;

  showToast('Getting delegation suggestions...', 'info');

  try {
    const response = await fetch(`${API_BASE}/team/delegate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (data.suggestions && data.suggestions.length > 0) {
      teamElements.delegationContent.innerHTML = `
        <div class="delegation-list">
          ${data.suggestions.map(s => `
            <div class="delegation-item">
              <div class="delegation-task">${escapeHtml(s.task)}</div>
              <div class="delegation-assignment">
                <span class="delegation-buddy-emoji">${s.buddyEmoji}</span>
                <span class="delegation-buddy-name">${escapeHtml(s.buddyName)}</span>
              </div>
              <div class="delegation-reason">${escapeHtml(s.reason)}</div>
            </div>
          `).join('')}
        </div>
      `;
      showToast('Delegation suggestions ready!', 'success');
    } else {
      teamElements.delegationContent.innerHTML = `
        <p class="empty-message">No delegation suggestions available. Create some outcomes first!</p>
      `;
    }
  } catch (error) {
    console.error('Delegation error:', error);
    teamElements.delegationContent.innerHTML = `<p class="error-message">Failed to get suggestions</p>`;
    showToast('Failed to get suggestions', 'error');
  }
}

// Team event listeners
if (teamElements.refreshActivity) {
  teamElements.refreshActivity.addEventListener('click', loadTeamActivity);
}

if (teamElements.quickTeamMeeting) {
  teamElements.quickTeamMeeting.addEventListener('click', () => holdTeamMeeting());
}

if (teamElements.quickDelegation) {
  teamElements.quickDelegation.addEventListener('click', getDelegationSuggestions);
}

// Team Meeting button in Outcome Detail Modal
if (teamElements.holdTeamMeetingBtn) {
  teamElements.holdTeamMeetingBtn.addEventListener('click', () => {
    if (currentEditingOutcomeId) {
      holdTeamMeeting(currentEditingOutcomeId);
    } else {
      showToast('No outcome selected', 'warning');
    }
  });
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + K: Focus chat input
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    switchView('chat');
    elements.chatInput.focus();
  }

  // Cmd/Ctrl + O: Go to outcomes
  if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
    e.preventDefault();
    switchView('outcomes');
  }

  // Cmd/Ctrl + G: Go to graph
  if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
    e.preventDefault();
    switchView('graph');
  }

  // Cmd/Ctrl + N: New outcome (when on outcomes view)
  if ((e.metaKey || e.ctrlKey) && e.key === 'n' && state.currentView === 'outcomes') {
    e.preventDefault();
    openOutcomeModal();
  }

  // Cmd/Ctrl + J: Quick capture
  if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
    e.preventDefault();
    openQuickCapture();
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    closeQuickCapture();
    closeTemplatesModal();
  }
});

// ============================================================================
// User Authentication State
// ============================================================================

state.currentUser = null;

function checkAuth() {
  const userJson = localStorage.getItem('mindflow-user');
  if (!userJson) {
    // Redirect to login
    window.location.href = 'login.html';
    return false;
  }

  try {
    state.currentUser = JSON.parse(userJson);
    // Don't call updateUserUI here - call it after buddies are loaded
    return true;
  } catch {
    localStorage.removeItem('mindflow-user');
    window.location.href = 'login.html';
    return false;
  }
}

function updateUserUI() {
  if (!state.currentUser) return;

  // Update user profile in sidebar
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userBuddyInfo = document.getElementById('user-buddy-info');

  if (userAvatar) {
    userAvatar.textContent = state.currentUser.avatarEmoji || '👤';
  }
  if (userName) {
    userName.textContent = state.currentUser.displayName || state.currentUser.username;
  }
  if (userBuddyInfo) {
    if (state.currentUser.buddyEmoji && state.currentUser.buddyName) {
      userBuddyInfo.textContent = `${state.currentUser.buddyEmoji} ${state.currentUser.buddyName}`;
    } else if (state.currentUser.buddyId) {
      // Try to find buddy from loaded buddies
      const userBuddy = state.buddies?.find(b => b.id === state.currentUser.buddyId);
      if (userBuddy) {
        userBuddyInfo.textContent = `${userBuddy.emoji} ${userBuddy.name}`;
      }
    }
  }

  // Update buddy selector with user's assigned buddy
  if (state.currentUser.buddyId && state.buddies?.length) {
    const userBuddy = state.buddies.find(b => b.id === state.currentUser.buddyId);
    if (userBuddy) {
      state.activeBuddy = userBuddy;
      updateBuddyUI();
    }
  }

  console.log(`Logged in as: ${state.currentUser.displayName}`);
}

function logout() {
  localStorage.removeItem('mindflow-user');
  window.location.href = 'login.html';
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}


// ============================================================================
// Initialize
// ============================================================================

async function init() {
  // Check authentication first
  if (!checkAuth()) return;

  // Setup logout button
  setupLogoutButton();

  loadSettings();

  // Load buddies first, then update user UI
  await loadBuddies();
  updateUserUI();

  updateEnergyIndicator();

  // Update energy every minute
  setInterval(updateEnergyIndicator, 60000);

  // Check server health
  fetch(`${API_BASE}/health`)
    .then(res => res.json())
    .then(() => {
      console.log('Server connected');
    })
    .catch(() => {
      showToast('Server not connected. Run: bun run dev', 'warning', 5000);
    });

  console.log('%c Mindflow initialized', 'color: #8b1538; font-size: 14px; font-weight: bold;');
  console.log('%c Keyboard shortcuts:', 'color: #666');
  console.log('%c   Cmd+K: Focus chat', 'color: #888');
  console.log('%c   Cmd+O: Outcomes', 'color: #888');
  console.log('%c   Cmd+G: Graph', 'color: #888');
  console.log('%c   Cmd+N: New outcome', 'color: #888');
  console.log('%c   Cmd+J: Quick capture', 'color: #888');
}

init();
