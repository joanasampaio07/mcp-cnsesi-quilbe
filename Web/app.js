// Load initial data from localStorage or use defaults
let systems = JSON.parse(localStorage.getItem('mcp_systems')) || [
    { id: "SORS", name: "SORS - Sistema de Orçamento", host: "10.0.1.45", db: "SesiSORS", user: "admin_sors", status: "Online" },
    { id: "TOTVS", name: "TOTVS ERP", host: "10.0.1.50", db: "SesiTOTVS", user: "totvs_app", status: "Online" },
    { id: "Financeiro", name: "Financeiro Central", host: "10.0.1.55", db: "SesiFinance", user: "fin_user", status: "Offline" },
    { id: "RH", name: "Recursos Humanos", host: "10.0.1.60", db: "SesiRH", user: "rh_sync", status: "Online" },
    { id: "Patrimonio", name: "Patrimônio", host: "10.0.1.65", db: "SesiAssets", user: "asset_admin", status: "Online" },
    { id: "Impressoras", name: "Impressoras", host: "10.0.1.70", db: "SesiPrint", user: "spooler", status: "Online" },
    { id: "GED", name: "Gestão de Documentos", host: "10.0.1.75", db: "SesiGED", user: "ged_admin", status: "Online" },
    { id: "Projetos", name: "Projetos Estratégicos", host: "10.0.1.80", db: "SesiProjects", user: "pm_user", status: "Online" },
    { id: "Juridico", name: "Consultoria Jurídica", host: "10.0.1.85", db: "SesiLegal", user: "legal_adv", status: "Online" }
];

let users = JSON.parse(localStorage.getItem('mcp_users')) || [
    { id: "joana_admin", name: "Joana Sampaio", role: "Admin", token: "admin-joana-secret-123", systems: ["SORS", "TOTVS", "RH", "Financeiro", "Patrimonio", "Impressoras", "GED", "Projetos", "Juridico"] },
    { id: "gerente_user", name: "Carlos Gerente", role: "Gerente", token: "carlos-123", systems: ["SORS", "TOTVS", "Financeiro", "RH"] },
    { id: "coord_user", name: "Ana Coordenadora", role: "Coordenador", token: "ana-456", systems: ["RH", "Impressoras"] },
    { id: "func_user", name: "Pedro Funcionario", role: "Funcionario", token: "pedro-789", systems: ["SORS"] }
];

function persistData() {
    localStorage.setItem('mcp_systems', JSON.stringify(systems));
    localStorage.setItem('mcp_users', JSON.stringify(users));
}

// Migration: Ensure new systems are added if localStorage exists
if (localStorage.getItem('mcp_systems')) {
    let storedSystems = JSON.parse(localStorage.getItem('mcp_systems'));
    if (!storedSystems.find(s => s.id === "GED")) {
        localStorage.removeItem('mcp_systems');
        localStorage.removeItem('mcp_users');
        location.reload();
    }
}

let editingSystem = null;
let editingUser = null;
let currentUser = null;

function attemptLogin() {
    const token = document.getElementById('login-token').value;
    const user = users.find(u => u.token === token);
    if (user) {
        currentUser = user;
        document.body.classList.add('logged-in');
        document.body.setAttribute('data-role', user.role);

        // Hide/Show Nav items based on role
        document.querySelectorAll('.nav-item[data-min-role]').forEach(item => {
            const minRole = item.getAttribute('data-min-role');
            if (checkRole(user.role, minRole)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        document.getElementById('welcome-msg').innerText = `Bem-vinda(o), ${user.name}. Acesso nível: ${user.role}.`;

        // Personalize Chatbot
        const chatbotGreeting = document.getElementById('quilbe-greeting');
        if (chatbotGreeting) {
            chatbotGreeting.innerText = `Olá ${user.name}! Estou pronto para processar dados de SORS, TOTVS, RH e seus outros sistemas. O que você precisa analisar agora?`;
        }
        const chatbotInput = document.getElementById('chat-input');
        if (chatbotInput) {
            chatbotInput.placeholder = `${user.name}, pergunte algo sobre seus bancos de dados...`;
        }

        renderSystems();
        renderUsers();
        renderDashboardStats();
        renderReportSelection();
        initDashboard();
        showView('dashboard');
    } else {
        alert("Acesso negado. Token inválido.");
    }
}

function checkRole(current, minimum) {
    const weights = { 'Admin': 4, 'Gerente': 3, 'Coordenador': 2, 'Funcionario': 1 };
    return weights[current] >= weights[minimum];
}

function logout() {
    document.body.classList.remove('logged-in');
    document.body.removeAttribute('data-role');
    document.getElementById('login-token').value = '';
    currentUser = null;
}

function showView(viewId) {
    // Permission check
    const restrictions = {
        'sistemas': 'Admin',
        'usuarios': 'Admin',
        'monitoramento': 'Admin',
        'auditoria': 'Admin',
        'relatorios': 'Funcionario'
    };

    if (restrictions[viewId] && !checkRole(currentUser.role, restrictions[viewId])) {
        alert("Você não tem permissão para acessar esta área.");
        return;
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    // Highlight correct nav item based on the function call
    document.querySelectorAll('.nav-links .nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(`'${viewId}'`)) {
            item.classList.add('active');
        }
    });

    const titles = {
        'dashboard': 'Dashboard Operacional',
        'sistemas': 'Gestão de Integrações SQL',
        'relatorios': 'Centro de Relatórios IA',
        'usuarios': 'Gestão de Usuários e Acessos',
        'monitoramento': 'Dashboard de Infraestrutura & Segurança',
        'quilbe': 'Assistente Quilbe CN SESI',
        'auditoria': '🔍 Central de Auditoria Forense (CAIO)'
    };
    document.getElementById('view-title').innerText = titles[viewId] || 'Portal CN SESI';

    if (viewId === 'auditoria') renderAuditLog();
}

// System Management
function renderSystems() {
    const list = document.getElementById('systems-list');
    list.innerHTML = systems.map(s => `
        <div class="card" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: var(--accent-primary);">${s.name}</strong><br>
                <small>${s.host} | Database: ${s.db} | Link: ${s.status}</small>
            </div>
            <button class="btn btn-secondary" onclick="openEdit('${s.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Configurar</button>
        </div>
    `).join('');
}

function openEdit(id) {
    editingSystem = systems.find(s => s.id === id);
    document.getElementById('edit-title').innerText = `Configurar ${editingSystem.name}`;
    document.getElementById('db-host').value = editingSystem.host;
    document.getElementById('db-name').value = editingSystem.db;
    document.getElementById('db-user').value = editingSystem.user;
    document.getElementById('db-pass').value = '********';
    document.getElementById('connection-test-result').style.color = 'var(--text-muted)';
    document.getElementById('connection-test-result').innerText = "Preencha os campos acima e clique em 'Testar Conexão Real' para validar o acesso ao SQL Server.";
    const form = document.getElementById('edit-form');
    form.style.display = 'block';
    setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function closeEdit() {
    document.getElementById('edit-form').style.display = 'none';
}

function saveSystemConfig() {
    editingSystem.host = document.getElementById('db-host').value;
    editingSystem.db = document.getElementById('db-name').value;
    editingSystem.user = document.getElementById('db-user').value;

    if (document.getElementById('db-pass').value !== '********') {
        editingSystem.password = document.getElementById('db-pass').value;
    }

    alert(`Integração com ${editingSystem.id} atualizada com sucesso!`);
    closeEdit();
    persistData();
    renderSystems();
}

async function testRealConnection() {
    const host = document.getElementById('db-host').value;
    const db = document.getElementById('db-name').value;
    const user = document.getElementById('db-user').value;
    const pass = document.getElementById('db-pass').value;
    const resultEl = document.getElementById('connection-test-result');

    if (!host || !db || !user || !pass || pass === '********') {
        resultEl.style.color = '#f39c12';
        resultEl.innerText = '⚠️ Preencha todos os campos incluindo a senha antes de testar.';
        return;
    }

    resultEl.style.color = '#8b949e';
    resultEl.innerText = '⏳ Testando conexão com o SQL Server...';

    try {
        const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, database: db, user, password: pass })
        });
        const data = await response.json();

        if (data.success) {
            resultEl.style.color = '#2ea043';
            resultEl.innerHTML = `✅ <strong>${data.message}</strong><br><small>Servidor: ${data.details?.server} | Tabelas: ${data.details?.tables} | Versão: ${data.details?.version?.substring(0, 60)}...</small>`;
            // Update system status to Online
            if (editingSystem) {
                editingSystem.status = 'Online';
                persistData();
            }
            logAuditEntry({ intent: `Teste de conexão SQL Server: ${host}/${db}`, status: 'SUCCESS' });
        } else {
            resultEl.style.color = '#f85149';
            resultEl.innerHTML = `❌ <strong>Falha:</strong> ${data.message}`;
            logAuditEntry({ intent: `Teste de conexão SQL Server: ${host}/${db}`, status: 'ERROR', reason: data.message });
        }
    } catch (err) {
        resultEl.style.color = '#f85149';
        resultEl.innerHTML = `❌ <strong>Backend API offline.</strong> Verifique se o mcp_api.py está rodando no servidor Ubuntu.<br><small>${err.message}</small>`;
    }
}

function saveAIConfig() {
    const type = document.getElementById('ai-type').value;
    const endpoint = document.getElementById('ai-endpoint').value;
    const key = document.getElementById('ai-key').value;

    alert(`Configuração do Quilbe atualizada!\nTipo: ${type}\nEndpoint: ${endpoint}\nO servidor MCP CN SESI agora enviará as solicitações para este endereço.`);
}

// User Management
function renderUsers() {
    const list = document.getElementById('users-list');
    list.innerHTML = users.map(u => `
        <div class="card" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${u.role === 'Admin' ? 'var(--accent-primary)' : 'var(--accent-secondary)'};">
            <div>
                <strong>${u.name}</strong> <small style="color: var(--text-muted);">(${u.role})</small><br>
                <small>Token: <code>${u.token}</code> | Sistemas: ${u.systems.join(', ')}</small>
            </div>
            <div>
                <button class="btn" onclick="deleteUser('${u.id}')" style="padding: 5px 10px; font-size: 0.8rem; background: #f85149;">Excluir</button>
            </div>
        </div>
    `).join('');
}

function openUserForm() {
    editingUser = null;
    document.getElementById('user-form-title').innerText = "Cadastrar Novo Usuário";
    document.getElementById('user-name').value = '';
    document.getElementById('user-token-input').value = Math.random().toString(36).substring(2, 12);
    document.getElementById('user-role').value = 'Funcionario';
    document.querySelectorAll('#user-form input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('user-form').style.display = 'block';
}

function closeUserForm() {
    document.getElementById('user-form').style.display = 'none';
}

function saveUser() {
    const name = document.getElementById('user-name').value;
    const token = document.getElementById('user-token-input').value;
    const role = document.getElementById('user-role').value;
    const selectedSystems = Array.from(document.querySelectorAll('#user-form input[type="checkbox"]:checked')).map(cb => cb.value);

    if (!name || !token) {
        alert("Preencha o nome e o token.");
        return;
    }

    const newUser = {
        id: Math.random().toString(36).substring(7),
        name,
        token,
        role,
        systems: selectedSystems
    };

    users.push(newUser);
    persistData();
    alert(`Usuário ${name} cadastrado com sucesso!\n\nTOKEN DE ACESSO: ${token}\n\nForneça este token ao usuário para que ele possa entrar.`);
    closeUserForm();
    renderUsers();
}

function deleteUser(id) {
    if (id === 'joana_admin') {
        alert("Você não pode excluir o administrador principal.");
        return;
    }
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
        users = users.filter(u => u.id !== id);
        persistData();
        renderUsers();
    }
}

// Reports and Chat
function renderReportSelection() {
    const grid = document.querySelector('#relatorios .stats-grid');
    const authorizedSystems = systems.filter(s => currentUser.systems.includes(s.id));

    grid.innerHTML = authorizedSystems.map(s => `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <h4>${s.name}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Análise dinâmica de dados via Quilbe</p>
            </div>
            <button class="btn btn-secondary" onclick="runReport('${s.id}')" style="width: 100%;">Gerar Relatório</button>
        </div>
    `).join('');

    if (authorizedSystems.length === 0) {
        grid.innerHTML = '<p style="padding: 2rem; color: var(--text-muted);">Nenhum sistema autorizado para seu perfil.</p>';
    }
}

async function runReport(systemId) {
    if (!currentUser.systems.includes(systemId)) {
        alert("Acesso ao sistema negado.");
        return;
    }

    const output = document.getElementById('report-output');
    const content = document.getElementById('report-content');
    const title = document.getElementById('report-title');

    output.style.display = 'block';
    title.innerText = `Gerando Relatório IA: ${systemId}...`;
    content.innerText = `⏳ O Quilbe está processando dados de ${systemId} para ${currentUser.name}...`;

    setTimeout(() => {
        title.innerText = `Relatório Executivo CN SESI: ${systemId}`;
        const responses = {
            'SORS': `📈 [Análise de Orçamento] ${currentUser.name}, o SORS indica uma economia de 15% em logística.`,
            'TOTVS': `📊 [Análise de ERP] Identificamos um atraso no processamento do módulo de faturamento.`,
            'RH': `👥 [Análise de RH] A rotatividade no setor técnico diminuiu 5% nesta gestão SESI.`,
            'Financeiro': `💰 [Financeiro] Saúde financeira estável com projeção de 8% de crescimento.`,
            'Patrimonio': `📦 [Patrimônio] 98% dos ativos rastreados via RFID.`,
            'Impressoras': `🖨️ [Impressoras] Redução de 15% no custo de impressão.`,
            'GED': `📂 [GED] 100% dos documentos legados digitalizados e indexados para IA.`,
            'Projetos': `🚀 [Projetos] 15 projetos estratégicos em andamento, 85% de conclusão.`,
            'Juridico': `⚖️ [Jurídico] Todos os contratos revisados e adequados à LGPD.`
        };
        content.innerText = responses[systemId] || "Relatório gerado com sucesso para seu perfil.";
    }, 1500);
}

// =====================================================================
// FORENSIC AUDIT & SECURITY MODULE (CAIO - Joana Sampaio)
// =====================================================================

const BLOCKED_PATTERNS = [
    /DROP\s+TABLE/i, /DELETE\s+FROM/i, /TRUNCATE\s+TABLE/i,
    /INSERT\s+INTO/i, /UPDATE\s+SET/i, /EXEC\s*\(/i,
    /IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS/i,
    /FORGET\s+EVERYTHING/i, /ACT\s+AS\s+IF/i,
    /JAILBREAK/i, /DAN\s+MODE/i, /\bSYSTEM\b.*\bPROMPT\b/i,
    /<script>/i, /javascript:/i
];

function sanitizeInput(text) {
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(text)) {
            return { safe: false, reason: `Padrão bloqueado detectado: [${pattern.source}]` };
        }
    }
    return { safe: true };
}

function logAuditEntry(entry) {
    const logs = JSON.parse(localStorage.getItem('mcp_audit_log') || '[]');
    const fullEntry = {
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'SYSTEM',
        userName: currentUser?.name || 'SYSTEM',
        userRole: currentUser?.role || 'SYSTEM',
        ...entry
    };
    logs.push(fullEntry);
    localStorage.setItem('mcp_audit_log', JSON.stringify(logs));
    return fullEntry;
}

function renderAuditLog() {
    const logs = JSON.parse(localStorage.getItem('mcp_audit_log') || '[]').reverse();
    const container = document.getElementById('audit-log-table');
    const blockedCount = logs.filter(l => l.status === 'BLOCKED').length;
    document.getElementById('audit-blocked-count').innerText = blockedCount;
    document.getElementById('audit-total-count').innerText = logs.length;

    if (logs.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhuma interação registrada ainda. Use o Assistente Quilbe para gerar logs.</td></tr>';
        return;
    }
    container.innerHTML = logs.map(l => {
        const statusColor = l.status === 'SUCCESS' ? '#2ea043' : l.status === 'BLOCKED' ? '#f85149' : '#f39c12';
        const ts = new Date(l.timestamp).toLocaleString('pt-BR');
        return `<tr>
            <td style="font-size:0.75rem;color:var(--text-muted);">${ts}</td>
            <td>${l.userName}</td>
            <td><span style="font-size:0.7rem;background:var(--card-bg);padding:2px 6px;border-radius:4px;">${l.userRole}</span></td>
            <td style="max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.intent}">${l.intent}</td>
            <td><span style="color:${statusColor};font-weight:bold;">${l.status}</span></td>
        </tr>`;
    }).join('');
}

function exportAuditCSV() {
    const logs = JSON.parse(localStorage.getItem('mcp_audit_log') || '[]');
    if (logs.length === 0) { alert('Nenhum log para exportar.'); return; }
    const headers = ['timestamp', 'userId', 'userName', 'userRole', 'intent', 'status'];
    const csvRows = [headers.join(',')];
    logs.forEach(l => {
        csvRows.push(headers.map(h => `"${(l[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mcp_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    logAuditEntry({ intent: 'Exportação de log de auditoria para CSV', status: 'SUCCESS' });
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const sanity = sanitizeInput(text);
    const messages = document.getElementById('chat-messages');
    const divUser = document.createElement('div');
    divUser.className = 'message user';
    divUser.innerText = text;
    messages.appendChild(divUser);
    input.value = '';

    if (!sanity.safe) {
        const divBlocked = document.createElement('div');
        divBlocked.className = 'message quilbe';
        divBlocked.innerHTML = `⛔ <strong>Interação bloqueada pela Política de Segurança MCP</strong>.<br><small style="color:#f85149;">${sanity.reason}</small><br><small>Este evento foi registrado no log de auditoria forense.</small>`;
        messages.appendChild(divBlocked);
        messages.scrollTop = messages.scrollHeight;
        logAuditEntry({ intent: text, status: 'BLOCKED', reason: sanity.reason });
        return;
    }

    const divQuilbe = document.createElement('div');
    divQuilbe.className = 'message quilbe';
    divQuilbe.innerText = "⏳ Quilbe está processando...";
    messages.appendChild(divQuilbe);
    messages.scrollTop = messages.scrollHeight;

    const systemPrompt = `Você é o Quilbe, assistente de inteligência artificial do Conselho Nacional do SESI.
Você está ajudando ${currentUser.name}, que tem o perfil de ${currentUser.role} e acesso aos sistemas: ${currentUser.systems.join(', ')}.
Responda de forma objetiva, profissional e em português. Foque em dados corporativos, RH, financeiro, projetos e conformidade LGPD.`;

    try {
        const response = await fetch('/ollama/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: `${systemPrompt}\n\nPergunta: ${text}`,
                stream: false
            })
        });

        if (!response.ok) throw new Error('Falha na conexão com o Quilbe.');

        const data = await response.json();
        const reply = data.response || 'Sem resposta do Quilbe.';
        divQuilbe.innerText = reply;
        logAuditEntry({ intent: text, status: 'SUCCESS' });
    } catch (err) {
        divQuilbe.innerText = `⚠️ Quilbe temporariamente indisponível. Verifique o servidor Ollama. (${err.message})`;
        logAuditEntry({ intent: text, status: 'ERROR', reason: err.message });
    }

    messages.scrollTop = messages.scrollHeight;
}

function simulateAction(system) {
    alert(`[SIMULAÇÃO] Acessando ${system} em cnsesi.com.br...\n\nO servidor MCP CN SESI está validando a conexão segura com a infraestrutura. Em produção, este botão abrirá o painel real.`);
}

function toggleFullscreenGraphs() {
    const monitoramento = document.getElementById('monitoramento');
    const btn = document.getElementById('btn-expand-graphs');

    if (monitoramento.classList.contains('fullscreen-mode')) {
        monitoramento.classList.remove('fullscreen-mode');
        btn.innerText = 'Expandir Gráficos';
    } else {
        monitoramento.classList.add('fullscreen-mode');
        btn.innerText = 'Restaurar Gráficos';
    }
}

// Live Dashboard Updates
let dashboardInterval = null;

function startDashboardLive() {
    if (dashboardInterval) return;
    dashboardInterval = setInterval(() => {
        const monitorView = document.getElementById('monitoramento');
        if (monitorView && monitorView.classList.contains('active')) {
            // Update CPU/RAM Gauges
            const fills = document.querySelectorAll('.gauge-fill');
            if (fills.length >= 4) {
                // CPU (Semi-random movement)
                const cpuVal = 10 + Math.random() * 5;
                fills[0].style.strokeDashoffset = 188.5 - (1.885 * cpuVal);

                // RAM (Steady)
                fills[1].style.strokeDashoffset = 188.5 - (1.885 * 64.8);
            }

            // Update Big Values
            const bigVals = document.querySelectorAll('.noc-big-val');
            if (bigVals.length >= 2) {
                // Number Process
                bigVals[0].innerText = 140 + Math.floor(Math.random() * 3);
                // Users Logged (Synced with registered users)
                bigVals[1].innerText = users.length;
            }
        }
    }, 2500);
}

function renderDashboardStats() {
    const grid = document.getElementById('dashboard-stats-grid');
    if (!grid || !currentUser) return;

    const authorizedSystems = systems.filter(s => currentUser.systems.includes(s.id));
    const onlineCount = authorizedSystems.filter(s => s.status === 'Online').length;
    const availability = authorizedSystems.length > 0 ? (onlineCount / authorizedSystems.length * 100).toFixed(0) : 0;

    grid.innerHTML = `
        <div class="card">
            <div class="card-title">Sistemas Autorizados</div>
            <div class="card-value">${authorizedSystems.length} / ${systems.length}</div>
        </div>
        <div class="card">
            <div class="card-title">Disponibilidade Média</div>
            <div class="card-value">${availability}%</div>
        </div>
        <div class="card">
            <div class="card-title">Status Operacional</div>
            <div class="card-value" style="font-size: 1.2rem; color: ${availability > 80 ? 'var(--accent-primary)' : '#f85149'};">
                ${availability > 80 ? '✅ Estável' : '⚠️ Atenção'}
            </div>
        </div>
    `;

    // Update AI summary text on dashboard
    const aiSummary = document.getElementById('ai-summary');
    if (aiSummary) {
        if (authorizedSystems.length > 0) {
            aiSummary.innerText = `O Quilbe analisou seus ${authorizedSystems.length} sistemas (${currentUser.systems.join(', ')}) e não detectou anomalias críticas. Clique em 'Relatórios IA' para detalhamento por área.`;
        } else {
            aiSummary.innerText = "Você ainda não possui sistemas vinculados ao seu perfil. Solicite ao administrador a liberação de acesso.";
        }
    }
}

function initDashboard() {
    renderDashboardStats();
    startDashboardLive();
}
