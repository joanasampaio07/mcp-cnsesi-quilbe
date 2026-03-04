#!/bin/bash
# =============================================================
# MCP CN SESI - Deploy do Backend SQL Server
# Executar no servidor Ubuntu como vboxuser
# =============================================================

echo "🚀 Iniciando instalação do MCP API Backend..."

# 1. Instalar dependências do sistema para pymssql
echo "📦 Instalando dependências do sistema..."
sudo apt-get update -qq
sudo apt-get install -y python3-pip freetds-dev freetds-bin libssl-dev

# 2. Instalar pacotes Python
echo "🐍 Instalando pacotes Python..."
pip3 install flask flask-cors pymssql

# 3. Copiar o arquivo da API
echo "📄 Instalando mcp_api.py..."
sudo cp /var/www/mcp-web/mcp_api.py /home/vboxuser/mcp_api.py
sudo chown vboxuser:vboxuser /home/vboxuser/mcp_api.py

# 4. Criar serviço systemd para o backend
echo "⚙️  Criando serviço systemd..."
sudo tee /etc/systemd/system/mcp-api.service > /dev/null <<EOF
[Unit]
Description=MCP CN SESI - SQL Backend API
After=network.target

[Service]
Type=simple
User=vboxuser
WorkingDirectory=/home/vboxuser
ExecStart=/usr/bin/python3 /home/vboxuser/mcp_api.py
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# 5. Habilitar e iniciar o serviço
sudo systemctl daemon-reload
sudo systemctl enable mcp-api.service
sudo systemctl start mcp-api.service

# 6. Atualizar o NGINX para rotear /api/ para o backend Python
echo "🌐 Atualizando configuração NGINX..."
sudo tee /etc/nginx/sites-available/mcp-api-proxy.conf > /dev/null <<EOF
upstream mcp_api {
    server 127.0.0.1:5000;
}
EOF

# Adicionar bloco location /api/ ao site existente
NGINX_SITE="/etc/nginx/sites-available/default"
if ! grep -q "location /api/" "$NGINX_SITE"; then
    sudo sed -i '/location \/ {/i \    location /api/ {\n        proxy_pass http://127.0.0.1:5000/api/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        add_header '\''Access-Control-Allow-Origin'\'' '\''*'\'';\n    }\n' "$NGINX_SITE"
    echo "✅ Bloco /api/ adicionado ao NGINX"
else
    echo "ℹ️  Bloco /api/ já existe no NGINX"
fi

# 7. Recarregar NGINX
sudo nginx -t && sudo systemctl reload nginx

# 8. Verificar status
echo ""
echo "=== STATUS DOS SERVIÇOS ==="
sudo systemctl status mcp-api.service --no-pager -l | head -20
echo ""
echo "=== TESTE LOCAL DA API ==="
sleep 2
curl -s http://127.0.0.1:5000/api/health | python3 -m json.tool

echo ""
echo "✅ Instalação concluída!"
echo "   Backend API: http://10.100.6.128/api/health"
echo "   Logs: sudo journalctl -u mcp-api.service -f"
