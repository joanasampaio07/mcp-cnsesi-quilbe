let systems = [
    { id: "SORS", name: "SORS - Sistema de Orçamento", host: "10.0.1.45", db: "SesiSORS", user: "admin_sors", status: "Online" },
    { id: "TOTVS", name: "TOTVS ERP", host: "10.0.1.50", db: "SesiTOTVS", user: "totvs_app", status: "Online" },
    { id: "Financeiro", name: "Financeiro Central", host: "10.0.1.55", db: "SesiFinance", user: "fin_user", status: "Offline" },
    { id: "RH", name: "Recursos Humanos", host: "10.0.1.60", db: "SesiRH", user: "rh_sync", status: "Online" },
    { id: "Patrimonio", name: "Patrimônio", host: "10.0.1.65", db: "SesiAssets", user: "asset_admin", status: "Online" },
    { id: "Impressoras", name: "Impressoras", host: "10.0.1.70", db: "SesiPrint", user: "spooler", status: "Online" }
];

let users = [
    { id: "joana_admin", name: "Joana Sampaio", role: "Admin", token: "admin-joana-secret-123", systems: ["SORS", "TOTVS", "RH", "Financeiro"] }
];

let editingSystem = null;
let editingUser = null;
let currentUser = null;

function attemptLogin() {
    const token = document.getElementById('login-token').value;
    const user = users.find(u => u.token === token);
    if (user) {
        currentUser = user;
        document.body.classList.add('logged-in');
        renderSystems();
        renderUsers();
    } else {
        alert("Acesso negado. Token inválido.");
    }
}

function logout() {
    document.body.classList.remove('logged-in');
    document.getElementById('login-token').value = '';
    currentUser = null;
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    document.getElementById(viewId).classList.add('active');
    const navItems = document.querySelectorAll('.nav-links .nav-item');
    if (viewId === 'dashboard') navItems[0].classList.add('active');
    if (viewId === 'sistemas') navItems[1].classList.add('active');
    if (viewId === 'relatorios') navItems[2].classList.add('active');
    if (viewId === 'usuarios') navItems[3].classList.add('active');
    if (viewId === 'quilbe') navItems[4].classList.add('active');

    const titles = {
        'dashboard': 'Dashboard Operacional',
        'sistemas': 'Gestão de Integrações SQL',
        'relatorios': 'Centro de Relatórios IA',
        'usuarios': 'Gestão de Usuários e Acessos',
        'quilbe': 'Assistente Quilbe CN SESI'
    };
    document.getElementById('view-title').innerText = titles[viewId];
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
    document.getElementById('edit-form').style.display = 'block';
}

function closeEdit() {
    document.getElementById('edit-form').style.display = 'none';
}

function saveSystemConfig() {
    editingSystem.host = document.getElementById('db-host').value;
    editingSystem.db = document.getElementById('db-name').value;
    editingSystem.user = document.getElementById('db-user').value;

    alert(`Integração com ${editingSystem.id} atualizada com sucesso!`);
    closeEdit();
    renderSystems();
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
    document.getElementById('user-role').value = 'Colaborador';
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
    alert(`Usuário ${name} cadastrado com sucesso!`);
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
        renderUsers();
    }
}

// Reports and Chat
async function runReport(systemId) {
    const output = document.getElementById('report-output');
    const content = document.getElementById('report-content');
    const title = document.getElementById('report-title');

    output.style.display = 'block';
    title.innerText = `Gerando Relatório IA: ${systemId}...`;
    content.innerText = "⏳ O Quilbe está processando milhões de registros nos seus bancos de dados...";

    setTimeout(() => {
        title.innerText = `Relatório Executivo CN SESI: ${systemId}`;
        const responses = {
            'SORS': "📈 [Análise de Orçamento] Joana, o SORS indica uma economia de 15% em logística.",
            'TOTVS': "📊 [Análise de ERP] Identificamos um atraso no processamento do módulo de faturamento.",
            'RH': "👥 [Análise de RH] A rotatividade no setor técnico diminuiu 5% nesta gestão SESI."
        };
        content.innerText = responses[systemId] || "Relatório gerado com sucesso.";
    }, 1500);
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const messages = document.getElementById('chat-messages');
    const divUser = document.createElement('div');
    divUser.className = 'message user';
    divUser.innerText = text;
    messages.appendChild(divUser);
    input.value = '';

    const divQuilbe = document.createElement('div');
    divQuilbe.className = 'message quilbe';
    divQuilbe.innerText = "⏳ Analisando...";
    messages.appendChild(divQuilbe);
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
        divQuilbe.innerText = `Joana, verifiquei nos bancos integrados sobre "${text}". Tudo operacional.`;
        messages.scrollTop = messages.scrollHeight;
    }, 1200);
}
